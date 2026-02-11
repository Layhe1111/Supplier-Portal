// lib/agent/runAgent.js
// -----------------------------------------------------------------------------
// High-quality PPT agent workflow with strict fact tracing.
//
// Pipeline:
// 1) Planner
// 2) Storyboard
// 3) CopyPolish
// 4) Icon selection
// 5) Critic/FactRepair loop (max 3)
// 6) Final compose (cover + paginated agenda + content)
// -----------------------------------------------------------------------------

import { chatJson } from '../ppt/llmClient';
import { buildHardRuleDraft, collectNumbersFromGeneratedSlides } from '../ppt/factPack';
import { validateSlideSpec } from '../ppt/validateSlideSpec';
import { validateFacts, buildFactIndex } from './factValidation';
import { copyPolish } from './copyPolish';
import { pickIcons } from '../assets/icons/picker';
import {
  buildPlannerPrompt,
  buildStoryboardPrompt,
  buildCriticRevisePatchPrompt,
  buildFactRepairPrompt,
} from './prompts';

const DEFAULT_MAX_BULLETS = 6;
const DEFAULT_MAX_BULLET_CHARS = 40;
const MAX_CRITIC_ROUNDS = 2;
const FACT_RELATED_CODES = new Set([
  'KEY_MESSAGE_SOURCE_MISSING',
  'MISSING_SOURCE_KEYS',
  'SOURCE_PATH_NOT_FOUND',
  'NUMBER_NOT_IN_SOURCE',
  'INSIGHT_PREFIX_REQUIRED',
  'INSIGHT_UNSUPPORTED',
]);

const ALLOWED_DENSITY = ['low', 'medium', 'high'];
const ALLOWED_TONES = ['clinical', 'business', 'pitch', 'report'];
const ALLOWED_LAYOUT_HINTS = new Set([
  'agenda',
  'hero-cover',
  'split-image',
  'cards',
  'profile',
  'big-number',
  'timeline',
  'text',
  'summary',
  'quote',
  'image-left',
  'image-right',
  'image-top',
  'full-bleed-image',
]);

const ALLOWED_TYPES = new Set([
  'title',
  'section',
  'summary',
  'agenda',
  'cards',
  'profile',
  'split-image',
  'bigNumber',
  'timeline',
  'quote',
  'text',
  'bullets',
  'twoColumn',
]);

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactJson(value, maxChars = 24000) {
  let text = '';
  try {
    text = JSON.stringify(value);
  } catch {
    text = String(value || '');
  }
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

function truncateString(value, maxChars = 160) {
  const text = safeString(value);
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

function compactFactIndexForPrompt(factIndexObject, maxEntries = 220) {
  const entries = Object.entries(factIndexObject || {});
  const limited = entries.slice(0, maxEntries).map(([key, value]) => [key, truncateString(value, 180)]);
  return Object.fromEntries(limited);
}

function parseStyleHint(prompt) {
  const text = String(prompt || '').toLowerCase();
  if (/medical|hospital|clinic|health/.test(text)) return 'medical clean';
  if (/pitch|roadshow|investor/.test(text)) return 'pitch';
  if (/tech|technology|ai|saas/.test(text)) return 'corporate tech';
  return 'corporate';
}

function normalizePath(path) {
  return safeString(path)
    .split(/[>.]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join('.');
}

function extractNumericTokens(text) {
  const matches = String(text || '').match(/-?\d+(?:[.,]\d+)?%?/g) || [];
  return matches.map((x) => x.replace(/,/g, ''));
}

function numberGuardIssues(slides, sourceNumbers) {
  const issues = [];
  const sourceSet = new Set(toArray(sourceNumbers).map((v) => String(v)));
  if (sourceSet.size === 0) return issues;

  const generated = collectNumbersFromGeneratedSlides(slides);
  generated.forEach((tokenRaw) => {
    const token = String(tokenRaw);
    const normalizedDigits = token.replace(/[^\d]/g, '');
    const meaningful = normalizedDigits.length >= 3 || token.includes('%');
    if (!meaningful) return;
    if (sourceSet.has(token)) return;

    issues.push({
      slideIndex: -1,
      code: 'NUMBER_NOT_IN_SOURCE',
      message: `Number \"${token}\" is not present in source JSON.`,
    });
  });

  return issues;
}

function pushRegexRanges(text, regex, out) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  let match = re.exec(text);
  while (match) {
    out.push([match.index, match.index + match[0].length]);
    if (re.lastIndex === match.index) re.lastIndex += 1;
    match = re.exec(text);
  }
}

function getProtectedRangesForKeyMessage(text) {
  const ranges = [];
  pushRegexRanges(text, /https?:\/\/\S+/i, ranges);
  [
    /\be\.g\./i,
    /\bi\.e\./i,
    /\betc\./i,
    /\bvs\./i,
    /\bU\.S\./,
    /\bU\.K\./,
    /\bU\.N\./,
  ].forEach((re) => pushRegexRanges(text, re, ranges));
  pushRegexRanges(text, /(?:\b[A-Za-z]\.){2,}/, ranges);
  pushRegexRanges(text, /\b\d+\.\d+%?\b/, ranges);
  return ranges;
}

function isProtectedIndex(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function coerceSingleSentenceKeyMessage(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const ranges = getProtectedRangesForKeyMessage(normalized);
  const re = /[.!?。！？]+/g;
  let match = re.exec(normalized);

  while (match) {
    const boundaryIndex = match.index;
    if (isProtectedIndex(boundaryIndex, ranges)) {
      match = re.exec(normalized);
      continue;
    }

    const nextIndex = boundaryIndex + match[0].length;
    const tail = normalized.slice(nextIndex);
    if (!/^(?:\s|$|["'”’)\]])/.test(tail)) {
      match = re.exec(normalized);
      continue;
    }

    return normalized.slice(0, nextIndex).trim();
  }

  return normalized;
}

function normalizeSourceKeys(keys, validPathSet, fallback = []) {
  const out = [];

  toArray(keys).forEach((key) => {
    const normalized = normalizePath(key);
    if (!normalized) return;
    if (!validPathSet.has(normalized)) return;
    if (out.includes(normalized)) return;
    out.push(normalized);
  });

  if (out.length > 0) return out;

  const fallbackOut = [];
  toArray(fallback).forEach((key) => {
    const normalized = normalizePath(key);
    if (!normalized) return;
    if (!validPathSet.has(normalized)) return;
    if (fallbackOut.includes(normalized)) return;
    fallbackOut.push(normalized);
  });

  return fallbackOut;
}

function ensureInsightPrefix(text) {
  const value = safeString(text);
  if (!value) return value;
  if (/^(Suggestion:|Potential implication:)/i.test(value)) return value;
  return `Suggestion: ${value}`;
}

function normalizeBulletText(text, maxChars = DEFAULT_MAX_BULLET_CHARS) {
  const cleaned = safeString(text)
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ' ')
    .replace(/^According to[^,]*,\s*/i, '')
    .replace(/^Based on data[^,]*,\s*/i, '')
    .replace(/^Based on[^,]*,\s*/i, '')
    .replace(/^Highlight\s+/i, '')
    .trim();

  if (!cleaned) return '';
  if (cleaned.length <= maxChars) return cleaned;

  const sliced = cleaned.slice(0, maxChars + 1);
  const cut = Math.max(sliced.lastIndexOf(','), sliced.lastIndexOf(';'), sliced.lastIndexOf(' '));
  if (cut >= Math.floor(maxChars * 0.65)) {
    return `${sliced.slice(0, cut).trim()}.`;
  }
  return `${cleaned.slice(0, maxChars).trim()}...`;
}

function normalizeBullet(item, fallbackSourceKeys, validPathSet) {
  if (typeof item === 'string') {
    const text = normalizeBulletText(item);
    if (!text) return null;
    return {
      text,
      sourceKeys: normalizeSourceKeys([], validPathSet, fallbackSourceKeys),
      kind: 'fact',
    };
  }

  if (!item || typeof item !== 'object') return null;

  const kind = safeString(item.kind, 'fact').toLowerCase() === 'insight' ? 'insight' : 'fact';
  let text = normalizeBulletText(item.text || item.value || item.label || '');
  if (!text) return null;
  if (kind === 'insight') {
    text = ensureInsightPrefix(text);
  }

  const sourceKeys = normalizeSourceKeys(item.sourceKeys, validPathSet, fallbackSourceKeys);

  return {
    text,
    sourceKeys,
    kind,
  };
}

function normalizeEmphasis(emphasis, validPathSet, fallbackSourceKeys) {
  const source = emphasis && typeof emphasis === 'object' ? emphasis : {};

  const phrases = toArray(source.phrases)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          text: safeString(item),
          sourceKeys: normalizeSourceKeys([], validPathSet, fallbackSourceKeys),
        };
      }
      if (!item || typeof item !== 'object') return null;
      const text = safeString(item.text);
      if (!text) return null;
      return {
        text,
        sourceKeys: normalizeSourceKeys(item.sourceKeys, validPathSet, fallbackSourceKeys),
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  const numbers = toArray(source.numbers)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const value = safeString(item.value);
      const label = safeString(item.label);
      if (!value || !label) return null;
      return {
        value,
        label,
        sourceKeys: normalizeSourceKeys(item.sourceKeys, validPathSet, fallbackSourceKeys),
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  return { phrases, numbers };
}

function normalizeImageArray(slide, allowedImageSet) {
  const out = [];
  const seen = new Set();

  const push = (value) => {
    const url = safeString(value);
    if (!/^https?:\/\//i.test(url)) return;
    if (allowedImageSet && !allowedImageSet.has(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  toArray(slide?.images).forEach(push);
  push(slide?.visual?.imageUrl);
  push(slide?.imagePlan?.imageUrl);

  return out.slice(0, 2);
}

function pickLayoutHint(slide, hasImage) {
  const requested = safeString(slide.layoutHint || slide?.visual?.layoutHint);
  if (ALLOWED_LAYOUT_HINTS.has(requested)) return requested;

  const type = safeString(slide.type);
  if (type === 'agenda') return 'agenda';
  if (type === 'title') return hasImage ? 'hero-cover' : 'text';
  if (type === 'cards') return 'cards';
  if (type === 'profile') return 'profile';
  if (type === 'split-image') return 'split-image';
  if (type === 'bigNumber') return 'big-number';
  if (type === 'timeline') return 'timeline';
  if (type === 'quote') return 'quote';
  if (type === 'summary') return 'summary';

  return hasImage ? 'split-image' : 'text';
}

function pickTone(slide, styleHint) {
  const requested = safeString(slide.tone).toLowerCase();
  if (ALLOWED_TONES.includes(requested)) return requested;

  const hint = String(styleHint || '').toLowerCase();
  if (/medical|clinical|hospital/.test(hint)) return 'clinical';
  if (/pitch|roadshow|investor/.test(hint)) return 'pitch';
  if (/report|analysis/.test(hint)) return 'report';
  return 'business';
}

function pickDensity(slide) {
  const requested = safeString(slide.density).toLowerCase();
  if (ALLOWED_DENSITY.includes(requested)) return requested;

  const bulletsCount = toArray(slide.bullets).length;
  if (bulletsCount >= 6) return 'high';
  if (bulletsCount <= 2) return 'low';
  return 'medium';
}

function normalizeSlideType(type, bullets, emphasisNumbers) {
  const requested = safeString(type);
  if (ALLOWED_TYPES.has(requested)) return requested;
  if (emphasisNumbers.length > 0 && bullets.length <= 2) return 'bigNumber';
  if (bullets.length >= 6) return 'cards';
  return 'text';
}

function normalizeSlide(slide, sectionContext, options) {
  const { validPathSet, allowedImageSet, styleHint, defaultSourceKeys } = options;

  const fallbackTitle = sectionContext?.title || 'Untitled Section';
  const fallbackKeyMessage = sectionContext?.keyMessage || 'Not provided.';

  const sectionBulletObjects = toArray(sectionContext?.bulletObjects);
  const fallbackBulletTexts = sectionBulletObjects.map((item) => safeString(item?.text)).filter(Boolean);
  const fallbackSourceKeys = sectionBulletObjects
    .flatMap((item) => toArray(item?.sourceKeys))
    .map((key) => normalizePath(key))
    .filter((key) => key && validPathSet.has(key))
    .slice(0, 3);

  if (fallbackSourceKeys.length === 0) {
    toArray(defaultSourceKeys)
      .slice(0, 3)
      .forEach((key) => {
        if (!fallbackSourceKeys.includes(key)) fallbackSourceKeys.push(key);
      });
  }

  const images = normalizeImageArray(slide, allowedImageSet);

  let rawBullets = toArray(slide?.bullets);
  if (rawBullets.length === 0 && fallbackBulletTexts.length > 0) {
    rawBullets = fallbackBulletTexts.map((text) => ({
      text,
      sourceKeys: fallbackSourceKeys,
      kind: 'fact',
    }));
  }

  const bullets = rawBullets
    .map((item) => normalizeBullet(item, fallbackSourceKeys, validPathSet))
    .filter(Boolean)
    .slice(0, DEFAULT_MAX_BULLETS);

  const keyMessage = coerceSingleSentenceKeyMessage(
    safeString(slide?.keyMessage, fallbackKeyMessage)
  );

  const keyMessageSourceKeys = normalizeSourceKeys(
    slide?.keyMessageSourceKeys,
    validPathSet,
    fallbackSourceKeys.length > 0 ? fallbackSourceKeys : defaultSourceKeys
  );

  const emphasis = normalizeEmphasis(slide?.emphasis, validPathSet, keyMessageSourceKeys);
  if (emphasis.phrases.length === 0 && keyMessage) {
    emphasis.phrases.push({
      text: keyMessage,
      sourceKeys: keyMessageSourceKeys,
    });
  }

  const type = normalizeSlideType(slide?.type, bullets, emphasis.numbers);
  const density = pickDensity({ ...slide, bullets });
  const tone = pickTone(slide, styleHint);
  const layoutHint = pickLayoutHint(slide, images.length > 0);

  const normalized = {
    type,
    title: safeString(slide?.title, fallbackTitle),
    keyMessage: keyMessage || fallbackKeyMessage,
    keyMessageSourceKeys,
    density,
    tone,
    layoutHint,
    bullets,
    emphasis,
    imagePlan: {
      mode: safeString(slide?.imagePlan?.mode, images.length > 0 ? 'inline' : 'none'),
      query: safeString(slide?.imagePlan?.query),
      style: safeString(slide?.imagePlan?.style, /medical/i.test(styleHint) ? 'medical' : 'corporate'),
      placement: safeString(slide?.imagePlan?.placement, images.length > 0 ? 'right' : ''),
      overlay: safeString(slide?.imagePlan?.overlay, images.length > 0 ? 'dark-40' : 'null'),
      focalPoint: safeString(slide?.imagePlan?.focalPoint, 'center'),
    },
    icons: toArray(slide?.icons)
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = safeString(item.name);
        const placement = safeString(item.placement, 'card');
        if (!name) return null;
        return { name, placement };
      })
      .filter(Boolean)
      .slice(0, 6),
    constraints: {
      maxBulletsPerSlide: Math.max(
        3,
        Math.min(8, Number(slide?.constraints?.maxBulletsPerSlide) || DEFAULT_MAX_BULLETS)
      ),
      maxCharsPerBullet: Math.max(
        24,
        Math.min(120, Number(slide?.constraints?.maxCharsPerBullet) || DEFAULT_MAX_BULLET_CHARS)
      ),
    },
    images,
    visual: {
      layoutHint,
      imageUrl: images[0] || '',
      imageQuery: safeString(slide?.visual?.imageQuery || slide?.imagePlan?.query),
    },
  };

  if (type === 'title' || type === 'section') {
    const subtitle = safeString(slide?.subtitle);
    if (subtitle) normalized.subtitle = subtitle;
  }

  if (type === 'bigNumber') {
    const number = safeString(slide?.number || emphasis?.numbers?.[0]?.value, 'Not provided');
    normalized.number = number;
    normalized.caption = safeString(slide?.caption, normalized.keyMessage);
  }

  if (type === 'twoColumn') {
    normalized.left = toArray(slide?.left).map((v) => safeString(v)).filter(Boolean).slice(0, 6);
    normalized.right = toArray(slide?.right).map((v) => safeString(v)).filter(Boolean).slice(0, 6);
  }

  return normalized;
}

function buildSectionContexts(draft) {
  return toArray(draft.sections).map((section) => ({
    title: section.title,
    keyMessage: section.keyMessage,
    bulletObjects: toArray(section.bulletObjects),
    sectionFacts: toArray(section.sectionFacts),
    images: toArray(section.images),
  }));
}

function defaultPlannerSections(draft, validPathSet) {
  return toArray(draft.sections).map((section) => ({
    title: section.title,
    goal: section.keyMessage,
    keyMessage: section.keyMessage,
    requiredFields: toArray(section.sectionFacts)
      .map((fact) => normalizePath(fact?.sourcePath || ''))
      .filter((path) => path && validPathSet.has(path)),
    missingFields: [],
  }));
}

function mergePlannerSections(plannerOutput, draft, validPathSet) {
  const fallback = defaultPlannerSections(draft, validPathSet);
  const outputSections = toArray(plannerOutput?.sections);
  if (outputSections.length === 0) return fallback;

  const byTitle = new Map();
  outputSections.forEach((item) => {
    const title = safeString(item?.title).toLowerCase();
    if (!title) return;
    byTitle.set(title, item);
  });

  return toArray(draft.sections).map((section) => {
    const matched = byTitle.get(section.title.toLowerCase()) || {};
    return {
      title: section.title,
      goal: safeString(matched.goal, section.keyMessage),
      keyMessage: coerceSingleSentenceKeyMessage(safeString(matched.keyMessage, section.keyMessage)),
      requiredFields: toArray(matched.requiredFields)
        .map((path) => normalizePath(path))
        .filter((path) => path && validPathSet.has(path)),
      missingFields: toArray(matched.missingFields).map((v) => safeString(v)).filter(Boolean),
    };
  });
}

function defaultSectionSlides(sectionContexts, styleHint, options) {
  return sectionContexts.map((section) =>
    normalizeSlide(
      {
        type: toArray(section.images).length > 0 ? 'split-image' : 'text',
        title: section.title,
        keyMessage: section.keyMessage,
        bullets: toArray(section.bulletObjects).slice(0, 5),
        images: toArray(section.images).slice(0, 2),
        layoutHint: toArray(section.images).length > 0 ? 'split-image' : 'text',
        density: toArray(section.bulletObjects).length >= 6 ? 'high' : 'medium',
        tone: /medical/i.test(styleHint) ? 'clinical' : 'business',
      },
      section,
      options
    )
  );
}

function normalizeSlidesFromModel(rawSlides, sectionContexts, options) {
  const normalized = [];
  sectionContexts.forEach((section, index) => {
    const candidate = rawSlides[index] || {};
    normalized.push(normalizeSlide(candidate, section, options));
  });
  return normalized;
}

function applyPatches(currentSlides, patches, sectionContexts, options) {
  if (!Array.isArray(patches) || patches.length === 0) return currentSlides;

  const next = [...currentSlides];
  patches.forEach((patch) => {
    const index = Number.isInteger(patch?.index) ? patch.index : -1;
    if (index < 0 || index >= next.length) return;
    const section = sectionContexts[index] || sectionContexts[0];
    next[index] = normalizeSlide(patch?.slide || {}, section, options);
  });

  return next;
}

function composeSpeakerNotes(slide, showSourceInNotes, autoReduced) {
  if (!showSourceInNotes) {
    if (autoReduced) return 'auto-reduced to fit constraints';
    return '';
  }

  const keys = [
    ...toArray(slide.keyMessageSourceKeys),
    ...toArray(slide.bullets).flatMap((bullet) => toArray(bullet?.sourceKeys)),
    ...toArray(slide?.emphasis?.numbers).flatMap((item) => toArray(item?.sourceKeys)),
  ]
    .map((k) => normalizePath(k))
    .filter(Boolean);

  const unique = Array.from(new Set(keys));
  const lines = [];
  if (unique.length > 0) lines.push(`Data source: ${unique.join(', ')}`);
  if (autoReduced) lines.push('auto-reduced to fit constraints');
  return lines.join('\n');
}

function buildCoverSlide(draft, styleHint, defaultSourceKeys) {
  const hasImage = toArray(draft.coverImages).length > 0;
  return {
    type: 'title',
    title: safeString(draft.presentationTitle, 'Business Presentation'),
    subtitle: 'Generated from source-backed records',
    keyMessage: 'Use validated facts to support strategic decision-making.',
    keyMessageSourceKeys: toArray(defaultSourceKeys),
    density: 'low',
    tone: /medical/i.test(styleHint) ? 'clinical' : 'business',
    layoutHint: hasImage ? 'hero-cover' : 'text',
    bullets: [],
    emphasis: { phrases: [], numbers: [] },
    imagePlan: {
      mode: hasImage ? 'bg' : 'none',
      style: /medical/i.test(styleHint) ? 'medical' : 'corporate',
      placement: hasImage ? 'full-bleed' : '',
      overlay: hasImage ? 'dark-55' : 'null',
      focalPoint: 'center',
    },
    images: hasImage ? toArray(draft.coverImages).slice(0, 1) : [],
    icons: [{ name: 'presentation', placement: 'title' }],
    constraints: { maxBulletsPerSlide: 4, maxCharsPerBullet: 50 },
  };
}

function buildAgendaSlides(contentSlides, defaultSourceKeys) {
  const agendaBullets = contentSlides.map((slide, index) => ({
    text: `${index + 1}. ${safeString(slide.title, 'Untitled')}`,
    sourceKeys:
      toArray(slide.keyMessageSourceKeys).length > 0
        ? toArray(slide.keyMessageSourceKeys)
        : toArray(defaultSourceKeys),
    kind: 'fact',
  }));

  const chunks = [];
  for (let i = 0; i < agendaBullets.length; i += 8) {
    chunks.push(agendaBullets.slice(i, i + 8));
  }

  if (chunks.length === 0) chunks.push([]);

  return chunks.map((chunk, index) => ({
    type: 'agenda',
    title: index === 0 ? 'Agenda' : 'Agenda (cont.)',
    keyMessage: 'Navigate the storyline from baseline facts to execution priorities.',
    keyMessageSourceKeys: toArray(defaultSourceKeys),
    density: chunk.length > 6 ? 'high' : 'medium',
    tone: 'business',
    layoutHint: 'agenda',
    bullets: chunk,
    emphasis: { phrases: [], numbers: [] },
    imagePlan: { mode: 'none', style: 'corporate', placement: '', overlay: 'null', focalPoint: 'center' },
    images: [],
    icons: [{ name: 'layout-grid', placement: 'title' }],
    constraints: { maxBulletsPerSlide: 8, maxCharsPerBullet: 60 },
  }));
}

function reduceSlidesForSafety(slides, options) {
  const { validPathSet, defaultSourceKeys, showSourceInNotes } = options;

  return toArray(slides).map((slide) => {
    const keyMessageSourceKeys = normalizeSourceKeys(
      slide?.keyMessageSourceKeys,
      validPathSet,
      defaultSourceKeys
    );

    const bullets = toArray(slide?.bullets)
      .map((item) => {
        const normalized = normalizeBullet(item, keyMessageSourceKeys, validPathSet);
        if (!normalized) return null;

        // Drop unsupported facts aggressively in safe mode.
        if (toArray(normalized.sourceKeys).length === 0) return null;
        return normalized;
      })
      .filter(Boolean)
      .slice(0, DEFAULT_MAX_BULLETS);

    const safeSlide = {
      ...slide,
      keyMessageSourceKeys,
      keyMessage: coerceSingleSentenceKeyMessage(safeString(slide?.keyMessage, 'Not provided.')),
      bullets,
    };

    safeSlide.speakerNotes = composeSpeakerNotes(safeSlide, showSourceInNotes, true);
    return safeSlide;
  });
}

function buildValidationReport(validation, factValidation, numberIssues) {
  const schemaIssues = toArray(validation?.issues);
  const factIssues = toArray(factValidation?.issues);
  const numericIssues = toArray(numberIssues);

  return {
    schema: {
      ok: schemaIssues.length === 0,
      issues: schemaIssues.slice(0, 30),
    },
    facts: {
      ok: factIssues.length === 0,
      issues: factIssues.slice(0, 30),
    },
    numbers: {
      ok: numericIssues.length === 0,
      issues: numericIssues.slice(0, 30),
    },
  };
}

function shouldUseFactRepair(issues) {
  return toArray(issues).some((issue) => FACT_RELATED_CODES.has(issue?.code));
}

async function callJsonStage({ builder, payload, temperature, timeoutMs }) {
  const { system, user } = builder(payload);
  return chatJson({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    timeoutMs,
  });
}

export async function runPptAgentWorkflow({
  prompt,
  inputJson,
  onProgress,
  strictAccuracy = true,
  polishStyle = 'clinical-professional',
  showSourceInNotes = true,
  agentBudgetMs = 26_000,
}) {
  const progress = (value, stage) => {
    if (typeof onProgress === 'function') onProgress(value, stage);
  };

  const styleHint = parseStyleHint(prompt);
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;
  const remainingMs = () => Math.max(0, agentBudgetMs - elapsedMs());
  const canSpend = (expectedMs, reserveMs = 2_500) => remainingMs() >= expectedMs + reserveMs;
  const stageTimeoutMs = (capMs, minMs = 2_000, reserveMs = 1_500) => {
    const available = remainingMs() - reserveMs;
    if (available < minMs) return 0;
    return Math.max(minMs, Math.min(capMs, available));
  };

  progress(8, 'fact-pack');
  const draft = buildHardRuleDraft({
    prompt,
    inputJson,
    maxImagesPerSlide: 2,
    skipMissingSections: true,
  });

  const factIndexMap = buildFactIndex(inputJson);
  const factIndexObject = Object.fromEntries(
    Array.from(factIndexMap.entries()).map(([path, value]) => [path, value.text])
  );
  const promptFactIndex = compactFactIndexForPrompt(factIndexObject, 180);

  const validPathSet = new Set(Array.from(factIndexMap.keys()));
  const defaultSourceKeys = Array.from(validPathSet).slice(0, 3);
  const allowedImageSet = new Set(toArray(draft.allowedImageUrls));
  const sectionContexts = buildSectionContexts(draft);
  const promptSections = sectionContexts.map((section) => ({
    title: section.title,
    keyMessage: section.keyMessage,
    bulletObjects: toArray(section.bulletObjects).slice(0, 6),
    sectionFacts: toArray(section.sectionFacts).slice(0, 8),
    images: toArray(section.images).slice(0, 2),
  }));

  let plannerSections = defaultPlannerSections(draft, validPathSet);
  progress(18, 'planner');

  if (canSpend(4_500, 4_500)) {
    const timeoutMs = stageTimeoutMs(5_500, 2_500, 3_500);
    if (timeoutMs > 0) {
      try {
        const plannerOutput = await callJsonStage({
          builder: buildPlannerPrompt,
          payload: {
            userPrompt: prompt,
            styleHint,
            factIndex: promptFactIndex,
            fixedOutline: toArray(draft.fixedOutline),
          },
          temperature: 0.05,
          timeoutMs,
        });
        plannerSections = mergePlannerSections(plannerOutput, draft, validPathSet);
      } catch {
        // Keep deterministic planner fallback.
      }
    }
  }

  let contentSlides = defaultSectionSlides(sectionContexts, styleHint, {
    validPathSet,
    allowedImageSet,
    styleHint,
    defaultSourceKeys,
  });

  progress(30, 'storyboard');
  if (canSpend(5_000, 3_500)) {
    const timeoutMs = stageTimeoutMs(6_000, 2_500, 2_500);
    if (timeoutMs > 0) {
      try {
        const storyboardOutput = await callJsonStage({
          builder: buildStoryboardPrompt,
          payload: {
            userPrompt: prompt,
            styleHint,
            plannerOutput: { sections: plannerSections },
            sections: promptSections,
          },
          temperature: 0.1,
          timeoutMs,
        });

        const rawSlides = toArray(storyboardOutput?.slides);
        if (rawSlides.length > 0) {
          contentSlides = normalizeSlidesFromModel(rawSlides, sectionContexts, {
            validPathSet,
            allowedImageSet,
            styleHint,
            defaultSourceKeys,
          });
        }
      } catch {
        // Keep deterministic fallback.
      }
    }
  }

  progress(42, 'copy-polish');
  let copyPolishMeta = { ok: true, retried: false, error: '' };
  if (canSpend(7_000, 3_000)) {
    const timeoutMs = stageTimeoutMs(4_500, 2_000, 2_000);
    const compactInputForPolish = {
      facts: promptFactIndex,
      fixedOutline: toArray(draft.fixedOutline),
    };

    if (timeoutMs > 0) {
      const polished = await copyPolish({
        slideSpec: { slides: contentSlides },
        inputJson: compactInputForPolish,
        userPrompt: prompt,
        style: polishStyle,
        timeoutMs,
      });

      copyPolishMeta = {
        ok: polished.ok,
        retried: polished.retried,
        error: polished.error || '',
      };

      if (polished.ok && toArray(polished.slides).length > 0) {
        contentSlides = normalizeSlidesFromModel(polished.slides, sectionContexts, {
          validPathSet,
          allowedImageSet,
          styleHint,
          defaultSourceKeys,
        });
      }
    }
  }

  contentSlides = pickIcons({ slides: contentSlides }).slides;

  const validateMerged = (slides) => {
    const slideSpec = {
      presentationTitle: draft.presentationTitle,
      slides,
    };

    const schemaValidation = validateSlideSpec(slideSpec, {
      strictAccuracy,
      allowedImageUrls: toArray(draft.allowedImageUrls),
      minBulletsPerPage: 1,
      enforcePptCopyRules: true,
      maxImagesPerSlide: 2,
    });

    const factValidation = validateFacts(slideSpec, inputJson, {
      strictAccuracy,
      enforceInsightPrefix: true,
    });

    const numericIssues = numberGuardIssues(slides, draft.sourceNumbers);
    const mergedIssues = [
      ...toArray(schemaValidation.issues),
      ...toArray(factValidation.issues),
      ...toArray(numericIssues),
    ];

    return {
      schemaValidation,
      factValidation,
      numericIssues,
      mergedIssues,
    };
  };

  progress(58, 'critic');
  let validationBundle = validateMerged(contentSlides);

  for (let round = 0; round < MAX_CRITIC_ROUNDS; round += 1) {
    if (validationBundle.mergedIssues.length === 0) break;
    if (!canSpend(3_200, 2_500)) break;

    const timeoutMs = stageTimeoutMs(3_800, 1_800, 2_000);
    if (timeoutMs <= 0) break;

    const useFactRepair = shouldUseFactRepair(validationBundle.mergedIssues);

    try {
      const response = await callJsonStage({
        builder: useFactRepair ? buildFactRepairPrompt : buildCriticRevisePatchPrompt,
        payload: {
          userPrompt: prompt,
          styleHint,
          slides: contentSlides,
          issues: validationBundle.mergedIssues.slice(0, 24),
          factIndex: promptFactIndex,
        },
        temperature: 0.05,
        timeoutMs,
      });

      contentSlides = applyPatches(contentSlides, response?.patches, sectionContexts, {
        validPathSet,
        allowedImageSet,
        styleHint,
        defaultSourceKeys,
      });

      contentSlides = pickIcons({ slides: contentSlides }).slides;
      validationBundle = validateMerged(contentSlides);
    } catch {
      break;
    }
  }

  if (validationBundle.mergedIssues.length > 0) {
    contentSlides = reduceSlidesForSafety(contentSlides, {
      validPathSet,
      defaultSourceKeys,
      showSourceInNotes,
    });

    contentSlides = pickIcons({ slides: contentSlides }).slides;
    validationBundle = validateMerged(contentSlides);
  }

  if (validationBundle.mergedIssues.length > 0) {
    const top = validationBundle.mergedIssues
      .slice(0, 8)
      .map((issue) => `${issue.code}@${issue.slideIndex}`)
      .join(', ');
    throw new Error(`slideSpec validation failed after critic: ${top}`);
  }

  const coverSlide = buildCoverSlide(draft, styleHint, defaultSourceKeys);
  const agendaSlides = buildAgendaSlides(contentSlides, defaultSourceKeys);

  const fullSlides = [coverSlide, ...agendaSlides, ...contentSlides].map((slide) => ({
    ...slide,
    keyMessage: coerceSingleSentenceKeyMessage(slide.keyMessage),
    speakerNotes: composeSpeakerNotes(slide, showSourceInNotes, false),
  }));

  const finalBundle = (() => {
    const slideSpec = {
      presentationTitle: draft.presentationTitle,
      slides: fullSlides,
    };

    const schemaValidation = validateSlideSpec(slideSpec, {
      strictAccuracy,
      allowedImageUrls: toArray(draft.allowedImageUrls),
      minBulletsPerPage: 1,
      enforcePptCopyRules: false,
      maxImagesPerSlide: 2,
    });

    const factValidation = validateFacts(slideSpec, inputJson, {
      strictAccuracy,
      enforceInsightPrefix: true,
    });

    const numericIssues = numberGuardIssues(fullSlides, draft.sourceNumbers);
    const mergedIssues = [
      ...toArray(schemaValidation.issues),
      ...toArray(factValidation.issues),
      ...toArray(numericIssues),
    ];

    return {
      schemaValidation,
      factValidation,
      numericIssues,
      mergedIssues,
    };
  })();

  if (finalBundle.mergedIssues.length > 0) {
    const top = finalBundle.mergedIssues
      .slice(0, 8)
      .map((issue) => `${issue.code}@${issue.slideIndex}`)
      .join(', ');
    throw new Error(`final slideSpec validation failed: ${top}`);
  }

  progress(76, 'render-ready');

  return {
    sectionsPlan: plannerSections,
    validationReport: buildValidationReport(
      finalBundle.schemaValidation,
      finalBundle.factValidation,
      finalBundle.numericIssues
    ),
    slideSpec: {
      presentationTitle: draft.presentationTitle,
      styleHint,
      slides: fullSlides,
      meta: {
        fixedOutline: toArray(draft.fixedOutline),
        finalOutline: fullSlides.map((slide) => slide.title),
        skippedSections: toArray(draft.skippedSections),
        imageAssignments: fullSlides.map((slide) => ({
          title: slide.title,
          images: toArray(slide.images),
          layoutHint: slide.layoutHint || slide?.visual?.layoutHint || 'text',
          density: slide.density || 'medium',
        })),
        copyPolish: copyPolishMeta,
        promptTemplates: {
          planner: compactJson(
            buildPlannerPrompt({
              userPrompt: prompt,
              styleHint,
              factIndex: promptFactIndex,
              fixedOutline: toArray(draft.fixedOutline),
            })
          ),
          storyboard: compactJson(
            buildStoryboardPrompt({
              userPrompt: prompt,
              styleHint,
              plannerOutput: { sections: plannerSections },
              sections: promptSections,
            })
          ),
        },
      },
    },
    validation: {
      ok: true,
      issues: [],
    },
  };
}
