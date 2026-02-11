// lib/ppt/gammaPayloadBuilder.js
// -----------------------------------------------------------------------------
// Builds Gamma Generate API payload from existing prompt + supplier JSON.
// -----------------------------------------------------------------------------

import { buildHardRuleDraft, FIXED_OUTLINE } from './factPack';
import { getGammaConfig } from './gammaClient';

const CJK_RE = /[\u3400-\u9FFF]/g;
const MISSING_RE =
  /^(?:n\/?a|na|none|null|nil|unknown|not provided|not available|tbd|pending|missing|unavailable|--?)$/i;
const MAX_FACT_VALUE_CHARS = 150;
const MAX_BULLETS_PER_CARD = 5;
const COVER_AI_BG_ENABLED =
  String(process.env.GAMMA_COVER_AI_BACKGROUND || 'true').toLowerCase() !== 'false';

function toEnglishSafeText(text) {
  return String(text || '')
    .replace(CJK_RE, ' ')
    .replace(/[，。；：、（）【】《》“”‘’「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? toEnglishSafeText(value).trim() : '';
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLine(text) {
  return toEnglishSafeText(safeString(text)).replace(/\s+/g, ' ').trim();
}

function sanitizeFactValue(value) {
  const text = normalizeLine(value);
  if (!text || MISSING_RE.test(text)) return '';
  return text.length > MAX_FACT_VALUE_CHARS ? `${text.slice(0, MAX_FACT_VALUE_CHARS)}...` : text;
}

function trimSentence(text, maxChars = 180) {
  const normalized = normalizeLine(text);
  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;
  const sliced = normalized.slice(0, maxChars);
  const cut = sliced.lastIndexOf(' ');
  return `${(cut > 60 ? sliced.slice(0, cut) : sliced).trim()}...`;
}

function factToNarrativeLine(fact, index = 0) {
  const key = normalizeLine(fact?.key || 'Data point');
  const value = sanitizeFactValue(fact?.value);
  if (!value) return '';
  const verbs = ['Strengthen', 'Expand', 'Accelerate', 'Consolidate', 'Improve'];
  const verb = verbs[index % verbs.length];
  return `- ${trimSentence(`${verb} execution with ${key.toLowerCase()} at ${value}.`, 170)}`;
}

function factToEvidenceLine(fact) {
  const key = normalizeLine(fact?.key || 'Data point');
  const value = sanitizeFactValue(fact?.value);
  if (!value) return '';
  return `- ${trimSentence(`${key}: ${value}`, 160)}`;
}

function chunkSectionFacts(sectionFacts, chunkSize = 4, maxChunks = 5) {
  const facts = toArray(sectionFacts);
  const chunks = [];
  if (facts.length === 0) return [];
  for (let i = 0; i < facts.length; i += chunkSize) {
    chunks.push(facts.slice(i, i + chunkSize));
    if (chunks.length >= maxChunks) break;
  }
  return chunks;
}

function pickField(inputJson, paths = []) {
  for (const rawPath of paths) {
    const keys = String(rawPath || '').split('.');
    let cursor = inputJson;
    let ok = true;
    for (const key of keys) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) {
        ok = false;
        break;
      }
      cursor = cursor[key];
    }
    if (!ok) continue;
    if (typeof cursor === 'string' || typeof cursor === 'number') {
      const safe = normalizeLine(cursor);
      if (safe) return safe;
    }
  }
  return '';
}

function findFirstValueByExactKeys(input, exactKeys = []) {
  const keySet = new Set((exactKeys || []).map((k) => String(k || '')).filter(Boolean));
  if (keySet.size === 0) return '';
  const stack = [input];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push(node[i]);
      continue;
    }
    for (const [key, value] of Object.entries(node)) {
      if (keySet.has(key) && (typeof value === 'string' || typeof value === 'number')) {
        const safe = normalizeLine(value);
        if (safe) return safe;
      }
      if (value && typeof value === 'object') stack.push(value);
    }
  }
  return '';
}

function buildCoverInfo(inputJson) {
  return {
    contactName:
      findFirstValueByExactKeys(inputJson, ['Contact person / 聯絡人', 'Contact Person / 联系人']) ||
      pickField(inputJson, ['contact.name', 'contact.person', 'contactPerson', 'representative', 'salesContact']),
    email:
      findFirstValueByExactKeys(inputJson, ['Email / 電郵', 'Email / 邮箱']) ||
      pickField(inputJson, ['contact.email', 'email']),
    phone:
      findFirstValueByExactKeys(inputJson, ['Contact Number / 聯繫電話', 'Contact Number / 联系电话']) ||
      pickField(inputJson, ['contact.phone', 'phone', 'tel']),
    website:
      findFirstValueByExactKeys(inputJson, ['Or enter company website / 或輸入公司網站', 'Company Website / 公司網站']) ||
      pickField(inputJson, ['contact.website', 'website', 'web']),
    address:
      findFirstValueByExactKeys(inputJson, ['Office Address / 辦公地址', 'Address / 地址']) ||
      pickField(inputJson, ['contact.address', 'address']),
  };
}

function buildCoverCard({ presentationTitle, coverLogo, coverInfo }) {
  const lines = [`# ${safeString(presentationTitle, 'Company')}`];

  if (COVER_AI_BG_ENABLED) {
    lines.push('## Visual Direction');
    lines.push('- Create one abstract white background image for this cover only.');
  }

  const contactLines = [];
  if (coverInfo.contactName) contactLines.push(`- Contact Person: ${coverInfo.contactName}`);
  if (coverInfo.email) contactLines.push(`- Email: ${coverInfo.email}`);
  if (coverInfo.phone) contactLines.push(`- Phone: ${coverInfo.phone}`);
  if (coverInfo.website) contactLines.push(`- Website: ${coverInfo.website}`);
  if (coverInfo.address) contactLines.push(`- Address: ${coverInfo.address}`);

  if (contactLines.length > 0) {
    lines.push('## Contact');
    lines.push(...contactLines);
  }

  if (coverLogo) {
    lines.push('## Company Logo (place at top-right)');
    lines.push(coverLogo);
  }
  return lines.join('\n');
}

function buildAgendaCard(sectionTitles) {
  const lines = ['# Table of Contents'];
  sectionTitles.forEach((title, index) => {
    lines.push(`${index + 1}. ${title}`);
  });
  return lines.join('\n');
}

function buildSectionCard(section, factChunk, chunkIndex = 0) {
  const baseTitle = safeString(section?.title, 'Section');
  const title = chunkIndex > 0 ? `${baseTitle} (Continued ${chunkIndex + 1})` : baseTitle;
  const keyMessage =
    chunkIndex > 0
      ? trimSentence(`Additional source-backed highlights for ${baseTitle}.`, 120)
      : trimSentence(safeString(section?.keyMessage, `${baseTitle} supports business delivery outcomes.`), 130);
  const narrativeLines = factChunk
    .slice(0, MAX_BULLETS_PER_CARD)
    .map((fact, idx) => factToNarrativeLine(fact, idx))
    .filter(Boolean);

  const evidenceLines = factChunk
    .slice(0, 3)
    .map((fact) => factToEvidenceLine(fact))
    .filter(Boolean);

  const lines = [
    `# ${title}`,
    `## Key Message`,
    keyMessage,
    '## Highlights',
    ...narrativeLines,
  ];

  if (evidenceLines.length > 0) {
    lines.push('## Key Facts');
    lines.push(...evidenceLines);
  }

  const images = chunkIndex === 0 ? toArray(section?.images).slice(0, 2) : [];
  lines.push('## Image Rule');
  lines.push('- Do not generate AI images for this card.');
  if (images.length > 0) {
    lines.push('- Use only the source URLs below if an image is needed.');
    lines.push('## Visual References');
    images.forEach((url) => {
      lines.push(url);
    });
  } else {
    lines.push('- No source image is provided for this card; keep this card without images.');
  }

  return lines.join('\n');
}

function buildAdditionalInstructions({
  userPrompt,
  fixedOutline,
  skippedSections,
  imageAssignments,
}) {
  const lines = [
    'Generate a professional English business presentation.',
    'Do not invent any facts, numbers, dates, clients, awards, institutions, or certifications.',
    'If source data is missing, skip the unsupported point. Do not fabricate.',
    'Use only positive and capability-forward facts from the input. Omit risks, incidents, disputes, and missing capability statements.',
    'Keep the first card as cover and second card as agenda. Both pages are mandatory.',
    `Use section order exactly as: ${fixedOutline.join(' | ')}`,
    'Use only image URLs present in inputText for non-cover pages. Do not add any extra non-cover images.',
    'Only the cover page may use one AI-generated abstract white background.',
    'Place images mainly in project pages or where imagery clearly supports the content.',
    'Avoid repeating the same image across many pages.',
    'If logo URL exists, place company logo at top-right of the cover.',
    'Team/personnel images are optional; use only when layout fit is good.',
    'Cover page must use the real company name from source data, not generic placeholders.',
    'Make wording presentation-ready and richer, connecting facts into coherent business statements.',
    'Do not output raw JSON-style key-value formatting.',
    'All output text must be in English only.',
    'Prevent crowded slides: keep each content card concise, with at most 5 bullets.',
    'For content-heavy sections, add continuation cards instead of overloading one card.',
    'Use clean hierarchy: title, key message, highlights, key facts.',
  ];

  const cleanPrompt = normalizeLine(userPrompt);
  if (cleanPrompt) {
    lines.push(`User emphasis: ${cleanPrompt}`);
  }

  if (toArray(skippedSections).length > 0) {
    lines.push(
      `Skipped sections due to missing facts: ${skippedSections
        .map((item) => safeString(item?.title))
        .filter(Boolean)
        .join(', ')}`
    );
  }

  if (toArray(imageAssignments).length > 0) {
    lines.push(
      `Image assignment reference: ${imageAssignments
        .map((item) => `${safeString(item?.title)} -> ${(toArray(item?.images).length || 0)} images`)
        .join('; ')}`
    );
  }

  return lines.join('\n');
}

export function buildGammaGenerationPayload({ prompt, inputJson }, options = {}) {
  const gamma = getGammaConfig();
  const compactMode = Boolean(options?.compactMode);
  const draft = buildHardRuleDraft({
    prompt,
    inputJson,
    maxImagesPerSlide: 2,
    skipMissingSections: true,
  });
  const coverInfo = buildCoverInfo(inputJson);

  const sections = toArray(draft.sections);
  const coverLogo = toArray(draft.coverImages)[0] || '';
  const sectionCards = sections.flatMap((section) => {
    const chunks = chunkSectionFacts(
      section?.sectionFacts,
      compactMode ? 4 : 4,
      compactMode ? 2 : 6
    );
    return chunks.map((chunk, idx) => ({
      title: idx > 0
        ? `${safeString(section?.title, 'Section')} (Continued ${idx + 1})`
        : safeString(section?.title, 'Section'),
      text: buildSectionCard(section, chunk, idx),
      images: idx === 0 ? toArray(section?.images).slice(0, 2) : [],
    }));
  });
  const sectionTitles = sections
    .map((section) => safeString(section?.title))
    .filter(Boolean);

  const cards = [
    buildCoverCard({
      presentationTitle: draft.presentationTitle,
      coverLogo,
      coverInfo,
    }),
    buildAgendaCard(sectionTitles),
    ...sectionCards.map((card) => card.text),
  ];

  const inputText = cards.join('\n---\n');
  const imageAssignments = [
    { title: draft.presentationTitle, images: coverLogo ? [coverLogo] : [] },
    { title: 'Agenda', images: [] },
    ...sectionCards.map((card) => ({
      title: safeString(card.title, 'Section'),
      images: toArray(card.images).slice(0, 2),
    })),
  ];

  const request = {
    inputText,
    textMode: gamma.textMode || 'preserve',
    format: 'presentation',
    cardSplit: 'inputTextBreaks',
    exportAs: gamma.exportAs || 'pptx',
    cardOptions: {
      dimensions: '16x9',
    },
    textOptions: {
      language: 'en',
      amount: compactMode ? 'medium' : 'detailed',
      tone: 'professional, concise, business',
      audience: 'business stakeholders and decision makers',
    },
    imageOptions: {
      // Requirement: only cover page can use one AI background.
      // Non-cover images must come from source URLs embedded in inputText.
      source: COVER_AI_BG_ENABLED ? 'aiGenerated' : 'noImages',
      ...(COVER_AI_BG_ENABLED
        ? { style: 'minimal, white, clean, abstract gradient background' }
        : {}),
    },
    additionalInstructions: buildAdditionalInstructions({
      userPrompt: prompt,
      fixedOutline: FIXED_OUTLINE,
      skippedSections: draft.skippedSections,
      imageAssignments,
    }),
  };

  if (gamma.themeId) {
    request.themeId = gamma.themeId;
  }
  if (gamma.folderIds.length > 0) {
    request.folderIds = gamma.folderIds.slice(0, 10);
  }

  const meta = {
    provider: 'gamma',
    compactMode,
    fixedOutline: FIXED_OUTLINE,
    finalOutline: [draft.presentationTitle, 'Agenda', ...sectionTitles],
    skippedSections: toArray(draft.skippedSections),
    imageAssignments,
    sourceImageCount: toArray(draft.allowedImageUrls).length,
    cardsPlanned: clamp(cards.length, 1, 75),
    mode: 'generate',
  };

  return {
    request,
    meta,
  };
}
