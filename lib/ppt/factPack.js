// lib/ppt/factPack.js
// -----------------------------------------------------------------------------
// Shared hard-rule preprocessing for PPT generation.
// This module is intentionally environment-agnostic so it can run on both:
// - server (worker pipeline)
// - browser (offline validation preview logs)
// -----------------------------------------------------------------------------

export const FIXED_OUTLINE = [
  'Company Overview',
  'Our Services',
  'Design Expertise',
  'Regional Experience & Clients',
  'Selected Projects',
  'Awards & Recognition',
  'Team & Leadership',
  'Design & Build Capability',
  'Compliance & Quality',
  'Contact',
];

const SECTION_KEYWORDS = {
  'Company Overview': [
    'company',
    'profile',
    'overview',
    'founded',
    'established',
    'headquarter',
    'business',
    'capital',
    'employee',
    'office',
    '公司',
    '成立',
    '概覽',
    '概况',
    '辦公',
  ],
  'Our Services': [
    'service',
    'offering',
    'scope',
    'solution',
    'design & build',
    '服務',
    '服务',
    '方案',
    '能力',
  ],
  'Design Expertise': [
    'design',
    'style',
    'software',
    'bim',
    'expertise',
    '設計',
    '设计',
    '風格',
    '风格',
  ],
  'Regional Experience & Clients': [
    'regional',
    'region',
    'country',
    'city',
    'client',
    'market',
    'asia',
    '地區',
    '地区',
    '客戶',
    '客户',
  ],
  'Selected Projects': [
    'project',
    'case',
    'portfolio',
    'highlight',
    'area',
    'sqft',
    'sqm',
    '項目',
    '项目',
    '案例',
  ],
  'Awards & Recognition': [
    'award',
    'recognition',
    'accolade',
    'certification',
    '奖',
    '獎',
    '榮譽',
    '荣誉',
  ],
  'Team & Leadership': [
    'team',
    'leadership',
    'manager',
    'designer',
    'organization',
    'personnel',
    '團隊',
    '团队',
    '人員',
    '人员',
  ],
  'Design & Build Capability': [
    'd&b',
    'design & build',
    'capacity',
    'concurrent',
    'delivery',
    'construction',
    '施工',
    '承接',
  ],
  'Compliance & Quality': [
    'compliance',
    'quality',
    'safety',
    'insurance',
    'iso',
    'incident',
    'litigation',
    'governance',
    '合規',
    '合规',
    '質量',
    '质量',
    '保險',
    '保险',
  ],
  Contact: [
    'contact',
    'email',
    'phone',
    'tel',
    'website',
    'address',
    'linkedin',
    '聯絡',
    '联系',
    '電郵',
    '电话',
  ],
};

const IMAGE_EXT_RE = /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i;
const DIGIT_RE = /-?\d+(?:[.,]\d+)?%?/g;
const CJK_RE = /[\u3400-\u9FFF]/g;
const MISSING_VALUE_RE =
  /^(?:n\/?a|na|none|null|nil|unknown|not provided|not available|tbd|pending|missing|unavailable|--?)$/i;
const NEGATIVE_TEXT_RE =
  /(lawsuit|litigation|dispute|penalty|fine|incident|accident|injury|fatal|complaint|delay|overdue|defect|failure|breach|non[-\s]?compliance|risk|issue|problem|weakness|shortage|debt|loss|bankrupt|negative)/i;
const NEGATIVE_FIELD_RE =
  /(risk|issue|problem|incident|accident|complaint|litigation|lawsuit|penalty|delay|defect|breach|non[-\s]?compliance|loss|debt)/i;
const ZERO_RE = /^0+(?:\.0+)?%?$/;

function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function toEnglishSafeText(text) {
  const cleaned = String(text || '')
    .replace(CJK_RE, ' ')
    .replace(/[，。；：、（）【】《》“”‘’「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function isMissingLikeText(text) {
  const normalized = normalizeSpace(toEnglishSafeText(text)).toLowerCase();
  if (!normalized) return true;
  if (MISSING_VALUE_RE.test(normalized)) return true;
  if (/^(?:no|none|without|not\s+available|not\s+provided|not\s+applicable)$/i.test(normalized)) {
    return true;
  }
  return false;
}

function keyToLabel(key) {
  const normalized = String(key || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s*\/\s*/g, ' / ')
  ;
  const englishOnly = toEnglishSafeText(normalized);
  return normalizeSpace(englishOnly);
}

function findFirstValueByExactKey(input, targetKey) {
  if (!targetKey) return '';
  const stack = [input];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push(node[i]);
      continue;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === targetKey && (typeof value === 'string' || typeof value === 'number')) {
        const safe = normalizeSpace(toEnglishSafeText(value));
        if (safe) return safe;
      }
      if (value && typeof value === 'object') stack.push(value);
    }
  }
  return '';
}

function joinPath(path) {
  return path.filter(Boolean).join(' > ');
}

function isIntegerString(value) {
  return /^\d+$/.test(String(value || ''));
}

function deriveFactKey(path) {
  const last = path[path.length - 1] || '';
  if (!isIntegerString(last)) return keyToLabel(last || 'Value');

  // For primitive array items, use parent label as the semantic key.
  const parent = path[path.length - 2] || 'Value';
  return keyToLabel(parent || 'Value');
}

function containsCjk(text) {
  return /[\u3400-\u9FBF]/.test(String(text || ''));
}

function scoreByKeywords(text, keywords) {
  const lowered = String(text || '').toLowerCase();
  let score = 0;
  keywords.forEach((kw) => {
    if (!kw) return;
    if (containsCjk(kw)) {
      if (text.includes(kw)) score += 2;
    } else if (lowered.includes(kw.toLowerCase())) {
      score += 1;
    }
  });
  return score;
}

function pickOutlineSectionFromText(text) {
  let best = '';
  let bestScore = 0;

  FIXED_OUTLINE.forEach((section) => {
    const score = scoreByKeywords(text, SECTION_KEYWORDS[section] || []);
    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  });

  if (bestScore <= 0) return '';
  return best;
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value.trim());
}

function isLikelyImageUrl(value, pathText = '') {
  if (!isHttpUrl(value)) return false;
  try {
    const u = new URL(value);
    const pathname = u.pathname || '';
    if (IMAGE_EXT_RE.test(pathname)) return true;
  } catch {
    return false;
  }

  const loweredPath = String(pathText || '').toLowerCase();
  if (/(image|photo|picture|logo|gallery|圖|图|照片|相片)/i.test(loweredPath)) {
    return true;
  }

  return false;
}

function collectFactNodes(value, path = [], out = []) {
  if (value == null) return out;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const raw = normalizeSpace(value);
    const sourcePath = joinPath(path);
    const safeSourcePath = normalizeSpace(toEnglishSafeText(sourcePath));

    if (!raw) return out;
    if (typeof value === 'boolean' && value === false) return out;
    if (typeof value === 'string' && isHttpUrl(raw)) {
      if (isLikelyImageUrl(raw, safeSourcePath)) return out;
      if (!/(website|web|linkedin|url|contact)/i.test(safeSourcePath)) return out;
    }

    const englishRaw = typeof value === 'string' ? toEnglishSafeText(raw) : raw;
    const normalizedValue = normalizeSpace(englishRaw);
    const key = deriveFactKey(path);
    const safeKey = normalizeSpace(toEnglishSafeText(key)) || 'Data Point';

    if (!normalizedValue && typeof value === 'string') return out;
    const finalValue = typeof value === 'boolean' ? 'Yes' : normalizedValue;
    out.push({
      key: safeKey,
      value: finalValue,
      text: `${safeKey}: ${finalValue}`,
      sourcePath: safeSourcePath,
      tokens: `${safeKey} ${finalValue} ${safeSourcePath}`,
      rawType: typeof value,
      rawValue: value,
    });
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      collectFactNodes(item, [...path, String(idx)], out);
    });
    return out;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      collectFactNodes(v, [...path, keyToLabel(k)], out);
    });
  }

  return out;
}

function collectImageNodes(value, path = [], out = []) {
  if (value == null) return out;

  if (typeof value === 'string') {
    const sourcePath = joinPath(path);
    if (isLikelyImageUrl(value, sourcePath)) {
      out.push({
        url: value.trim(),
        sourcePath,
      });
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => collectImageNodes(item, [...path, String(idx)], out));
    return out;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      collectImageNodes(v, [...path, keyToLabel(k)], out);
    });
  }

  return out;
}

function extractNumbersFromText(text) {
  const matches = String(text || '').match(DIGIT_RE) || [];
  return matches.map((x) => x.replace(/,/g, ''));
}

function factToDraftBullet(fact) {
  const key = normalizeSpace(fact.key);
  const value = normalizeSpace(fact.value);
  if (isHttpUrl(value)) {
    return {
      text: normalizeSpace(`Use the provided image asset to support ${key.toLowerCase()} communication.`),
      sourceKeys: [fact.sourcePath],
      kind: 'fact',
    };
  }

  const normalizedKey = key.toLowerCase();
  return {
    text: normalizeSpace(`Present ${normalizedKey} as ${value}.`),
    sourceKeys: [fact.sourcePath],
    kind: 'fact',
  };
}

function buildSectionKeyMessage(sectionTitle, sectionFacts) {
  const first = (sectionFacts || [])[0];
  if (!first) return `${sectionTitle} demonstrates clear execution capability.`;
  const key = normalizeSpace(first.key).toLowerCase();
  const value = normalizeSpace(first.value);
  return normalizeSpace(`${sectionTitle} is supported by ${key} (${value}).`);
}

function dedupeBy(array, keyFn) {
  const seen = new Set();
  const out = [];
  array.forEach((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(item);
  });
  return out;
}

function isUndesirableFact(fact) {
  const keyText = normalizeSpace(`${fact?.key || ''} ${fact?.sourcePath || ''}`.toLowerCase());
  const valueText = normalizeSpace(String(fact?.value || ''));
  const lowerValue = valueText.toLowerCase();

  if (!valueText) return true;
  if (isMissingLikeText(valueText)) return true;
  if (fact?.rawType === 'boolean' && fact?.rawValue !== true) return true;
  if (NEGATIVE_FIELD_RE.test(keyText)) return true;
  if (NEGATIVE_TEXT_RE.test(`${keyText} ${lowerValue}`)) return true;

  if (ZERO_RE.test(lowerValue)) {
    if (/(project|client|award|team|employee|office|service|capability|experience|year|revenue|turnover|headcount)/i.test(keyText)) {
      return true;
    }
  }

  if (/^(?:no|none|without|not\s+)/i.test(lowerValue)) return true;
  return false;
}

function scoreFactForSection(fact, sectionTitle) {
  const section = String(sectionTitle || '');
  const haystack = `${fact?.key || ''} ${fact?.sourcePath || ''} ${fact?.value || ''}`;
  let score = scoreByKeywords(haystack, SECTION_KEYWORDS[section] || []);

  if (/\d/.test(String(fact?.value || ''))) score += 2;
  if (isHttpUrl(fact?.value)) score -= 3;
  if (String(fact?.value || '').length > 130) score -= 1;
  if (/(award|recognition|project|service|capability|client|team|leadership|quality|compliance|contact|email|phone|website|address|founded|established)/i.test(haystack)) {
    score += 2;
  }
  return score;
}

function buildSectionFactBuckets(facts) {
  const buckets = new Map();
  FIXED_OUTLINE.forEach((section) => buckets.set(section, []));

  const displayFacts = (facts || []).filter((fact) => !isUndesirableFact(fact));

  displayFacts.forEach((fact) => {
    const section = pickOutlineSectionFromText(`${fact.tokens} ${fact.text}`);
    if (section) {
      buckets.get(section).push(fact);
    } else {
      buckets.get('Company Overview').push(fact);
    }
  });

  // Trim each bucket to avoid huge prompt payloads.
  FIXED_OUTLINE.forEach((section) => {
    const list = buckets.get(section) || [];
    const sorted = [...list].sort((a, b) => scoreFactForSection(b, section) - scoreFactForSection(a, section));
    buckets.set(section, sorted.slice(0, 36));
  });

  return buckets;
}

function buildSectionImageBuckets(images) {
  const buckets = new Map();
  FIXED_OUTLINE.forEach((section) => buckets.set(section, []));

  images.forEach((img) => {
    const section = pickOutlineSectionFromText(img.sourcePath || '');
    if (section) {
      buckets.get(section).push(img);
    }
  });

  return buckets;
}

function scoreImageForSection(url, sourcePath, sectionTitle) {
  const pathText = String(sourcePath || '').toLowerCase();
  const section = String(sectionTitle || '').toLowerCase();
  let score = 0;

  if (section === 'selected projects') {
    if (/(project|case|portfolio|site|施工|项目|案例)/i.test(pathText)) score += 4;
    if (/(interior|office|hotel|retail|workplace)/i.test(pathText)) score += 2;
  }

  if (section === 'team & leadership') {
    if (/(team|leadership|people|staff|member|headshot|portrait|人員|团队|成员)/i.test(pathText)) {
      score += 3;
    }
  }

  if (/(logo|brand|identity|商標|标识)/i.test(pathText)) score -= 3;
  if (/(svg|logo)/i.test(String(url || '').toLowerCase())) score -= 2;
  return score;
}

function assignImagesToSections({ sections, imageBuckets, maxImagesPerSlide }) {
  const used = new Set();
  const imageSections = new Set(['Selected Projects', 'Team & Leadership']);
  const teamSectionCap = 1;

  return sections.map((section) => {
    if (!imageSections.has(section.title)) {
      return {
        ...section,
        images: [],
      };
    }

    const directNodes = dedupeBy(imageBuckets.get(section.title) || [], (x) => x.url);
    const sortedNodes = [...directNodes].sort((a, b) => {
      const left = scoreImageForSection(a.url, a.sourcePath, section.title);
      const right = scoreImageForSection(b.url, b.sourcePath, section.title);
      return right - left;
    });

    const direct = sortedNodes.map((x) => x.url);
    const picked = [];
    const cap =
      section.title === 'Team & Leadership'
        ? Math.min(teamSectionCap, maxImagesPerSlide)
        : maxImagesPerSlide;

    direct.forEach((url) => {
      if (picked.length >= cap) return;
      if (used.has(url)) return;
      picked.push(url);
      used.add(url);
    });

    return {
      ...section,
      images: picked,
    };
  });
}

function pickCoverImages(allImages, sectionSlides) {
  const used = new Set(
    (sectionSlides || []).flatMap((s) => (Array.isArray(s.images) ? s.images : []))
  );
  const logos = (allImages || [])
    .filter((img) => {
      const source = String(img?.sourcePath || '').toLowerCase();
      const url = String(img?.url || '').toLowerCase();
      return /(logo|brand|identity|商標|标识)/i.test(source) || /(logo)/i.test(url);
    })
    .map((img) => img.url)
    .filter((url) => !used.has(url));

  if (logos.length > 0) return [logos[0]];
  return [];
}

export function buildFactPack(inputJson) {
  const facts = dedupeBy(collectFactNodes(inputJson), (x) => `${x.sourcePath}|${x.value}`);
  const images = dedupeBy(collectImageNodes(inputJson), (x) => x.url);
  const factBuckets = buildSectionFactBuckets(facts);
  const imageBuckets = buildSectionImageBuckets(images);

  const sourceNumbers = dedupeBy(
    facts.flatMap((fact) => extractNumbersFromText(fact.value)),
    (x) => x
  );

  return {
    facts,
    images,
    sourceNumbers,
    factBuckets,
    imageBuckets,
    allowedImageUrls: images.map((x) => x.url),
  };
}

function buildSectionDraft(sectionTitle, sectionFacts) {
  const bulletObjects = sectionFacts.slice(0, 6).map(factToDraftBullet);
  if (bulletObjects.length === 0) return null;

  const bullets = bulletObjects.map((x) => x.text);
  const keyMessage = buildSectionKeyMessage(sectionTitle, sectionFacts);
  return {
    title: sectionTitle,
    keyMessage,
    bullets,
    bulletObjects,
    sectionFacts: sectionFacts.slice(0, 30).map((fact) => ({
      key: fact.key,
      value: fact.value,
      sourcePath: fact.sourcePath,
      text: fact.text,
    })),
    facts: sectionFacts.slice(0, 30).map((x) => x.text),
  };
}

export function buildHardRuleDraft({
  prompt,
  inputJson,
  maxImagesPerSlide = 2,
  skipMissingSections = true,
}) {
  const safeMaxImages = Math.max(1, Math.min(2, Number(maxImagesPerSlide) || 2));
  const factPack = buildFactPack(inputJson);

  const includedSections = [];
  const skippedSections = [];

  FIXED_OUTLINE.forEach((title) => {
    const sectionFacts = factPack.factBuckets.get(title) || [];
    const draft = buildSectionDraft(title, sectionFacts);
    if (!draft) {
      skippedSections.push({ title, reason: 'No source-backed facts were found.' });
      return;
    }
    includedSections.push(draft);
  });

  const sections = skipMissingSections
    ? includedSections
    : [
        ...includedSections,
        ...skippedSections.map((x) => ({
          title: x.title,
          keyMessage: x.reason,
          bullets: [x.reason],
          bulletObjects: [{ text: x.reason, sourceKeys: [], kind: 'insight' }],
          sectionFacts: [],
          facts: [],
        })),
      ];

  if (sections.length === 0) {
    sections.push({
      title: 'Company Overview',
      keyMessage: 'Source JSON is available but lacks structured business facts for fixed sections.',
      bullets: ['Please enrich source JSON fields to generate detailed section pages.'],
      bulletObjects: [
        {
          text: 'Please enrich source JSON fields to generate detailed section pages.',
          sourceKeys: [],
          kind: 'insight',
        },
      ],
      sectionFacts: [],
      facts: ['No section-matched facts found from source JSON.'],
    });
  }

  const sectionsWithImages = assignImagesToSections({
    sections,
    imageBuckets: factPack.imageBuckets,
    maxImagesPerSlide: safeMaxImages,
  });

  const titleCandidate = pickPresentationTitle(inputJson, prompt, factPack.facts);
  const coverImages = pickCoverImages(factPack.images, sectionsWithImages);

  return {
    presentationTitle: titleCandidate,
    coverImages,
    sections: sectionsWithImages,
    skippedSections,
    fixedOutline: FIXED_OUTLINE,
    allowedImageUrls: factPack.allowedImageUrls,
    sourceNumbers: factPack.sourceNumbers,
  };
}

function isPlausibleCompanyName(text) {
  const safe = normalizeSpace(toEnglishSafeText(text));
  if (!safe) return false;
  if (safe.length < 2 || safe.length > 100) return false;
  if (!/[A-Za-z]/.test(safe)) return false;
  if (/^(company|profile|overview|not provided|unknown|n\/a)$/i.test(safe)) return false;
  return true;
}

function pickPresentationTitle(inputJson, _prompt, facts = []) {
  // Hard rule from product requirement:
  // company title must be sourced from the exact field:
  // "Company English Name / 公司英文名"
  const exactCompanyName = findFirstValueByExactKey(
    inputJson,
    'Company English Name / 公司英文名'
  );
  if (isPlausibleCompanyName(exactCompanyName)) {
    return exactCompanyName;
  }

  const factCandidates = (Array.isArray(facts) ? facts : [])
    .filter((fact) =>
      /(company.*name|legal.*name|supplier.*name|vendor.*name|firm.*name|business.*name|studio.*name|organization|organisation)/i.test(
        `${fact?.key || ''} ${fact?.sourcePath || ''}`
      )
    )
    .map((fact) => ({
      value: normalizeSpace(toEnglishSafeText(fact?.value)),
      score: /(english|legal|company)/i.test(String(fact?.sourcePath || '')) ? 3 : 1,
    }))
    .filter((x) => isPlausibleCompanyName(x.value))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.value);

  const allCandidates = [...factCandidates].filter(Boolean);
  if (allCandidates.length > 0) return allCandidates[0];
  return 'Company';
}

export function buildDraftPreviewForBrowser(inputJson, prompt) {
  const draft = buildHardRuleDraft({
    prompt,
    inputJson,
    maxImagesPerSlide: 2,
    skipMissingSections: true,
  });

  return {
    fixedOutline: draft.fixedOutline,
    finalOutline: [draft.presentationTitle, 'Agenda', ...draft.sections.map((s) => s.title)],
    skippedSections: draft.skippedSections,
    imageAssignments: [
      { title: draft.presentationTitle, images: draft.coverImages || [] },
      { title: 'Agenda', images: [] },
      ...draft.sections.map((s) => ({ title: s.title, images: s.images || [] })),
    ],
  };
}

export function collectNumbersFromGeneratedSlides(slides) {
  const text = (Array.isArray(slides) ? slides : [])
    .map((slide) => {
      const bulletText = (Array.isArray(slide?.bullets) ? slide.bullets : [])
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.text;
          return '';
        })
        .filter(Boolean);

      const parts = [
        slide?.title,
        slide?.keyMessage,
        slide?.subtitle,
        slide?.caption,
        slide?.number,
        ...bulletText,
        ...(Array.isArray(slide?.left) ? slide.left : []),
        ...(Array.isArray(slide?.right) ? slide.right : []),
      ];
      return parts.filter(Boolean).join(' ');
    })
    .join(' ');

  const textWithoutUrls = text.replace(/https?:\/\/\S+/gi, ' ');

  return dedupeBy(extractNumbersFromText(textWithoutUrls), (x) => x);
}
