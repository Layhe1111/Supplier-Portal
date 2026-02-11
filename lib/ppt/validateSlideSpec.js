// lib/ppt/validateSlideSpec.js
// -----------------------------------------------------------------------------
// Strict + backward-compatible slideSpec validator.
// - Supports legacy slide types and extended Kimi-style layout fields.
// - Enforces high-accuracy guardrails when strictAccuracy=true.
// - Keeps keyMessage single-sentence check robust (URL/decimal/abbreviation safe).
// -----------------------------------------------------------------------------

export const ALLOWED_SLIDE_TYPES = [
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
  // legacy compatibility
  'bullets',
  'twoColumn',
];

export const ALLOWED_LAYOUT_HINTS = [
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
  // legacy compatibility
  'image-left',
  'image-right',
  'image-top',
  'full-bleed-image',
];

const ALLOWED_DENSITY = ['low', 'medium', 'high'];
const ALLOWED_TONE = ['clinical', 'business', 'pitch', 'report', 'consulting', 'product', 'education'];
const ALLOWED_BULLET_KIND = ['fact', 'insight'];
const ALLOWED_IMAGE_MODE = ['none', 'bg', 'inline', 'both'];
const ALLOWED_IMAGE_STYLE = ['clean', 'modern', 'medical', 'corporate'];
const ALLOWED_IMAGE_PLACEMENT = ['full-bleed', 'left', 'right', 'top'];
const ALLOWED_IMAGE_OVERLAY = ['dark-40', 'dark-55', 'light-20', 'null', null];
const ALLOWED_FOCAL_POINT = ['center', 'top', 'left', 'right'];

const COMMON_VERBS = new Set([
  'accelerate',
  'align',
  'build',
  'connect',
  'coordinate',
  'clarify',
  'close',
  'consolidate',
  'define',
  'demonstrate',
  'deliver',
  'design',
  'drive',
  'elevate',
  'enable',
  'establish',
  'expand',
  'improve',
  'increase',
  'launch',
  'lead',
  'maintain',
  'manage',
  'optimize',
  'present',
  'prioritize',
  'provide',
  'reduce',
  'scale',
  'secure',
  'simplify',
  'standardize',
  'strengthen',
  'streamline',
  'show',
  'summarize',
  'support',
  'use',
  'validate',
]);

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isNonEmptyString(value) {
  return safeString(value).length > 0;
}

function textLen(value) {
  return safeString(value).length;
}

function cjkCount(text) {
  const matched = String(text || '').match(/[\u3400-\u9FFF]/g);
  return matched ? matched.length : 0;
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(safeString(value));
}

function looksJsonStyleText(text) {
  const v = safeString(text);
  if (!v) return false;
  if (/^[\[{]/.test(v)) return true;
  if (/"\s*:\s*/.test(v)) return true;
  if (/\b[A-Za-z0-9_]+\s*:\s*[\[{"\d]/.test(v)) return true;
  return false;
}

function titleTooLong(text) {
  const cjk = cjkCount(text);
  if (cjk > 18) return true;
  const words = wordCount(text);
  if (words > 16) return true;
  return textLen(text) > 110;
}

function bulletTooLong(text) {
  const cjk = cjkCount(text);
  if (cjk > 45) return true;
  const words = wordCount(text);
  if (words > 26) return true;
  return textLen(text) > 200;
}

function normalizeKeyMessageForSentenceCheck(text) {
  let v = safeString(text);
  if (!v) return '';

  // Remove URLs so dots inside domains do not look like sentence endings.
  v = v.replace(/https?:\/\/\S+/gi, ' URLTOKEN ');

  // Protect common abbreviations.
  v = v
    .replace(/\be\.g\./gi, ' e<ABBR_DOT>g<ABBR_DOT> ')
    .replace(/\bi\.e\./gi, ' i<ABBR_DOT>e<ABBR_DOT> ')
    .replace(/\betc\./gi, ' etc<ABBR_DOT> ')
    .replace(/\bvs\./gi, ' vs<ABBR_DOT> ')
    .replace(/\bU\.S\./g, ' U<ABBR_DOT>S<ABBR_DOT> ')
    .replace(/\bU\.K\./g, ' U<ABBR_DOT>K<ABBR_DOT> ')
    .replace(/\bU\.N\./g, ' U<ABBR_DOT>N<ABBR_DOT> ');

  // Protect acronym dot chains like A.B.C.
  v = v.replace(/(?:\b[A-Za-z]\.){2,}/g, (m) => m.replace(/\./g, '<ABBR_DOT>'));

  // Protect decimal points.
  v = v.replace(/(\d)\.(\d)/g, '$1<DEC_DOT>$2');

  return v;
}

function countSentenceBoundaries(text) {
  const normalized = normalizeKeyMessageForSentenceCheck(text);
  if (!normalized) return 0;
  const matches = normalized.match(/[.!?。！？]+(?=(?:\s|$|["'”’)\]]))/g) || [];
  return matches.length;
}

function keyMessageLooksMultiSentence(text) {
  const v = safeString(text);
  if (!v) return true;
  return countSentenceBoundaries(v) > 1;
}

function firstWord(text) {
  const matched = safeString(text).toLowerCase().match(/^[a-z]+/);
  return matched ? matched[0] : '';
}

function startsWithLikelyVerb(text) {
  const w = firstWord(text);
  if (!w) return false;
  if (COMMON_VERBS.has(w)) return true;
  return w.endsWith('ize') || w.endsWith('ise') || w.endsWith('ate') || w.endsWith('fy');
}

function checkParallelStructure(lines) {
  const starters = lines.map((line) => firstWord(line)).filter(Boolean).slice(0, 6);
  if (starters.length < 3) return true;
  return new Set(starters).size <= Math.min(3, starters.length);
}

function normalizeBulletItem(item) {
  if (typeof item === 'string') {
    return {
      text: safeString(item),
      sourceKeys: [],
      kind: 'fact',
      _legacyString: true,
    };
  }

  if (!item || typeof item !== 'object') {
    return { text: '', sourceKeys: [], kind: 'fact' };
  }

  const sourceKeys = Array.isArray(item.sourceKeys)
    ? item.sourceKeys.map((k) => safeString(k)).filter(Boolean)
    : [];

  return {
    text: safeString(item.text),
    sourceKeys,
    kind: ALLOWED_BULLET_KIND.includes(item.kind) ? item.kind : 'fact',
  };
}

function getSlideBullets(slide) {
  if (Array.isArray(slide.bullets)) return slide.bullets.map(normalizeBulletItem);
  return [];
}

function getSlideTextCollection(slide) {
  const parts = [];
  if (isNonEmptyString(slide.title)) parts.push(slide.title);
  if (isNonEmptyString(slide.keyMessage)) parts.push(slide.keyMessage);
  if (isNonEmptyString(slide.subtitle)) parts.push(slide.subtitle);
  if (isNonEmptyString(slide.caption)) parts.push(slide.caption);
  if (isNonEmptyString(slide.number)) parts.push(slide.number);

  getSlideBullets(slide).forEach((b) => {
    if (isNonEmptyString(b.text)) parts.push(b.text);
  });

  if (Array.isArray(slide.left)) {
    slide.left.forEach((v) => {
      if (isNonEmptyString(v)) parts.push(v);
    });
  }
  if (Array.isArray(slide.right)) {
    slide.right.forEach((v) => {
      if (isNonEmptyString(v)) parts.push(v);
    });
  }

  return parts.join(' ');
}

function validateImageArray(urls, index, issues, allowedImageSet, maxImagesPerSlide) {
  if (!Array.isArray(urls)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_URL_INVALID',
      message: 'images must be an array of URL strings.',
    });
    return;
  }

  if (urls.length > maxImagesPerSlide) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_COUNT_EXCEEDED',
      message: `images length must be <= ${maxImagesPerSlide}.`,
    });
  }

  urls.forEach((url, imageIndex) => {
    const normalized = safeString(url);
    if (!isHttpUrl(normalized)) {
      issues.push({
        slideIndex: index,
        code: 'IMAGE_URL_INVALID',
        message: `images[${imageIndex}] must be valid http/https URL.`,
      });
      return;
    }

    if (allowedImageSet && !allowedImageSet.has(normalized)) {
      issues.push({
        slideIndex: index,
        code: 'IMAGE_NOT_FROM_SOURCE',
        message: `images[${imageIndex}] is not in source image URL set.`,
      });
    }
  });
}

function validateImagePlan(slide, index, issues) {
  const plan = slide.imagePlan;
  if (!plan) return;
  if (typeof plan !== 'object') {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: 'imagePlan must be object when provided.',
    });
    return;
  }

  if (plan.mode && !ALLOWED_IMAGE_MODE.includes(plan.mode)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: `imagePlan.mode must be one of: ${ALLOWED_IMAGE_MODE.join(', ')}`,
    });
  }

  if (plan.style && !ALLOWED_IMAGE_STYLE.includes(plan.style)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: `imagePlan.style must be one of: ${ALLOWED_IMAGE_STYLE.join(', ')}`,
    });
  }

  if (plan.placement && !ALLOWED_IMAGE_PLACEMENT.includes(plan.placement)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: `imagePlan.placement must be one of: ${ALLOWED_IMAGE_PLACEMENT.join(', ')}`,
    });
  }

  if (typeof plan.overlay !== 'undefined' && !ALLOWED_IMAGE_OVERLAY.includes(plan.overlay)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: `imagePlan.overlay must be one of: ${ALLOWED_IMAGE_OVERLAY
        .map((v) => String(v))
        .join(', ')}`,
    });
  }

  if (plan.focalPoint && !ALLOWED_FOCAL_POINT.includes(plan.focalPoint)) {
    issues.push({
      slideIndex: index,
      code: 'IMAGE_PLAN_INVALID',
      message: `imagePlan.focalPoint must be one of: ${ALLOWED_FOCAL_POINT.join(', ')}`,
    });
  }
}

function validateEmphasis(slide, index, issues, strictAccuracy) {
  if (!slide.emphasis) return;
  if (typeof slide.emphasis !== 'object') {
    issues.push({
      slideIndex: index,
      code: 'EMPHASIS_INVALID',
      message: 'emphasis must be an object when provided.',
    });
    return;
  }

  if (slide.emphasis.phrases && !Array.isArray(slide.emphasis.phrases)) {
    issues.push({
      slideIndex: index,
      code: 'EMPHASIS_INVALID',
      message: 'emphasis.phrases must be an array.',
    });
  }

  if (slide.emphasis.numbers && !Array.isArray(slide.emphasis.numbers)) {
    issues.push({
      slideIndex: index,
      code: 'EMPHASIS_INVALID',
      message: 'emphasis.numbers must be an array.',
    });
    return;
  }

  if (Array.isArray(slide.emphasis.numbers)) {
    slide.emphasis.numbers.forEach((item, numberIndex) => {
      if (!item || typeof item !== 'object') {
        issues.push({
          slideIndex: index,
          code: 'EMPHASIS_INVALID',
          message: `emphasis.numbers[${numberIndex}] must be object.`,
        });
        return;
      }

      if (!isNonEmptyString(item.value) || !isNonEmptyString(item.label)) {
        issues.push({
          slideIndex: index,
          code: 'EMPHASIS_INVALID',
          message: `emphasis.numbers[${numberIndex}] requires value and label.`,
        });
      }

      if (strictAccuracy) {
        const sourceKeys = Array.isArray(item.sourceKeys)
          ? item.sourceKeys.map((k) => safeString(k)).filter(Boolean)
          : [];
        if (sourceKeys.length === 0) {
          issues.push({
            slideIndex: index,
            code: 'MISSING_SOURCE_KEYS',
            message: `emphasis.numbers[${numberIndex}] must include sourceKeys in strict mode.`,
          });
        }
      }
    });
  }
}

function validateBullets(slide, index, issues, options) {
  const {
    strictAccuracy,
    enforcePptCopyRules,
    minBulletsPerPage,
    exemptSourceKeyTypes,
  } = options;

  const bulletRequiredTypes = new Set([
    'text',
    'summary',
    'cards',
    'profile',
    'split-image',
    'timeline',
    'bullets',
  ]);

  if (!bulletRequiredTypes.has(slide.type)) return;

  const bullets = getSlideBullets(slide);
  if (bullets.length === 0) {
    issues.push({
      slideIndex: index,
      code: 'MISSING_BULLETS',
      message: 'bullets must be non-empty array.',
    });
    return;
  }

  if (bullets.length < minBulletsPerPage && !['agenda', 'title', 'section'].includes(slide.type)) {
    issues.push({
      slideIndex: index,
      code: 'CONTENT_TOO_THIN',
      message: `bullets should be >= ${minBulletsPerPage}.`,
    });
  }

  if (bullets.length > 10) {
    issues.push({
      slideIndex: index,
      code: 'TOO_MANY_BULLETS',
      message: 'bullets should be <= 10 before renderer splitting.',
    });
  }

  const plainTexts = bullets.map((b) => b.text);

  let verbLeadCount = 0;

  bullets.forEach((bullet, bulletIndex) => {
    if (!isNonEmptyString(bullet.text)) {
      issues.push({
        slideIndex: index,
        code: 'EMPTY_BULLET',
        message: `bullet[${bulletIndex}] text is required.`,
      });
      return;
    }

    if (!ALLOWED_BULLET_KIND.includes(bullet.kind)) {
      issues.push({
        slideIndex: index,
        code: 'BULLET_KIND_INVALID',
        message: `bullet[${bulletIndex}].kind must be fact|insight.`,
      });
    }

    if (strictAccuracy && !exemptSourceKeyTypes.has(slide.type)) {
      if (!Array.isArray(bullet.sourceKeys) || bullet.sourceKeys.length === 0) {
        issues.push({
          slideIndex: index,
          code: 'MISSING_SOURCE_KEYS',
          message: `bullet[${bulletIndex}] requires sourceKeys in strict mode.`,
        });
      }
    }

    if (bullet.kind === 'insight' && !/^(Suggestion:|Potential implication:)/i.test(bullet.text)) {
      issues.push({
        slideIndex: index,
        code: 'INSIGHT_PREFIX_REQUIRED',
        message: `bullet[${bulletIndex}] with kind=insight must start with Suggestion: or Potential implication:.`,
      });
    }

    if (textLen(bullet.text) > 280) {
      issues.push({
        slideIndex: index,
        code: 'BULLET_TOO_LONG',
        message: `bullet[${bulletIndex}] exceeds 280 chars.`,
      });
    }

    if (enforcePptCopyRules && bulletTooLong(bullet.text)) {
      issues.push({
        slideIndex: index,
        code: 'BULLET_PPT_TOO_LONG',
        message: `bullet[${bulletIndex}] is too long for PPT readability.`,
      });
    }

    if (looksJsonStyleText(bullet.text)) {
      issues.push({
        slideIndex: index,
        code: 'RAW_JSON_STYLE_TEXT',
        message: `bullet[${bulletIndex}] looks like raw JSON/key-value text.`,
      });
    }

    if (startsWithLikelyVerb(bullet.text)) {
      verbLeadCount += 1;
    }
  });

  if (enforcePptCopyRules) {
    const minVerbLead = Math.max(1, Math.floor(bullets.length / 2));
    if (verbLeadCount < minVerbLead) {
      issues.push({
        slideIndex: index,
        code: 'BULLET_NOT_VERB_LEAD',
        message: `At least ${minVerbLead} bullets should start with an action verb.`,
      });
    }
  }

  if (enforcePptCopyRules && !checkParallelStructure(plainTexts)) {
    issues.push({
      slideIndex: index,
      code: 'BULLET_NOT_PARALLEL',
      message: 'Bullets should keep parallel structure.',
    });
  }
}

function validateKeyMessageSourceKeys(slide, index, issues, strictAccuracy) {
  const keys = Array.isArray(slide?.keyMessageSourceKeys)
    ? slide.keyMessageSourceKeys.map((k) => safeString(k)).filter(Boolean)
    : [];

  if (strictAccuracy && keys.length === 0) {
    issues.push({
      slideIndex: index,
      code: 'KEY_MESSAGE_SOURCE_MISSING',
      message: 'keyMessageSourceKeys is required in strict mode.',
    });
  }
}

function validateLegacyColumns(slide, index, issues) {
  if (slide.type !== 'twoColumn') return;
  const left = Array.isArray(slide.left) ? slide.left : [];
  const right = Array.isArray(slide.right) ? slide.right : [];

  if (left.length === 0 || right.length === 0) {
    issues.push({
      slideIndex: index,
      code: 'MISSING_COLUMNS',
      message: 'twoColumn requires non-empty left and right arrays.',
    });
    return;
  }

  [...left, ...right].forEach((text, columnIndex) => {
    if (!isNonEmptyString(text)) {
      issues.push({
        slideIndex: index,
        code: 'INVALID_COLUMN_ITEM',
        message: `column item[${columnIndex}] must be non-empty string.`,
      });
      return;
    }

    if (bulletTooLong(text)) {
      issues.push({
        slideIndex: index,
        code: 'COLUMN_ITEM_TOO_LONG',
        message: `column item[${columnIndex}] is too long for PPT readability.`,
      });
    }

    if (looksJsonStyleText(text)) {
      issues.push({
        slideIndex: index,
        code: 'RAW_JSON_STYLE_TEXT',
        message: `column item[${columnIndex}] looks like raw JSON/key-value text.`,
      });
    }
  });
}

export function validateSlideSpec(slideSpec, options = {}) {
  const issues = [];
  const strictAccuracy = options.strictAccuracy !== false;
  const enforcePptCopyRules = options.enforcePptCopyRules !== false;
  const minBulletsPerPage = Math.max(1, Number(options.minBulletsPerPage) || 2);
  const maxImagesPerSlide = Math.max(1, Math.min(3, Number(options.maxImagesPerSlide) || 2));

  const exemptSourceKeyTypes = new Set([]);
  const allowedImageSet = Array.isArray(options.allowedImageUrls)
    ? new Set(options.allowedImageUrls.map((u) => safeString(u)).filter(Boolean))
    : null;

  if (!slideSpec || typeof slideSpec !== 'object') {
    return {
      ok: false,
      issues: [{ slideIndex: -1, code: 'INVALID_ROOT', message: 'slideSpec must be an object.' }],
    };
  }

  if (!Array.isArray(slideSpec.slides) || slideSpec.slides.length === 0) {
    return {
      ok: false,
      issues: [{ slideIndex: -1, code: 'NO_SLIDES', message: 'slideSpec.slides must be non-empty.' }],
    };
  }

  slideSpec.slides.forEach((slide, index) => {
    if (!slide || typeof slide !== 'object') {
      issues.push({ slideIndex: index, code: 'INVALID_SLIDE', message: 'Slide must be object.' });
      return;
    }

    if (!ALLOWED_SLIDE_TYPES.includes(slide.type)) {
      issues.push({
        slideIndex: index,
        code: 'INVALID_TYPE',
        message: `slide.type must be one of: ${ALLOWED_SLIDE_TYPES.join(', ')}`,
      });
    }

    if (!isNonEmptyString(slide.title)) {
      issues.push({ slideIndex: index, code: 'MISSING_TITLE', message: 'title is required.' });
    }

    if (!isNonEmptyString(slide.keyMessage)) {
      issues.push({
        slideIndex: index,
        code: 'MISSING_KEY_MESSAGE',
        message: 'keyMessage is required.',
      });
    }

    if (titleTooLong(slide.title || '')) {
      issues.push({
        slideIndex: index,
        code: 'TITLE_PPT_TOO_LONG',
        message: 'title is too long for PPT readability.',
      });
    }

    if (textLen(slide.keyMessage) > 220) {
      issues.push({
        slideIndex: index,
        code: 'KEY_MESSAGE_TOO_LONG',
        message: 'keyMessage exceeds 220 chars.',
      });
    }

    if (keyMessageLooksMultiSentence(slide.keyMessage || '')) {
      issues.push({
        slideIndex: index,
        code: 'MULTIPLE_KEY_MESSAGE',
        message: 'keyMessage should stay a single sentence.',
      });
    }

    validateKeyMessageSourceKeys(slide, index, issues, strictAccuracy);

    if (slide.density && !ALLOWED_DENSITY.includes(slide.density)) {
      issues.push({
        slideIndex: index,
        code: 'DENSITY_INVALID',
        message: `density must be one of: ${ALLOWED_DENSITY.join(', ')}`,
      });
    }

    if (slide.tone && !ALLOWED_TONE.includes(slide.tone)) {
      issues.push({
        slideIndex: index,
        code: 'TONE_INVALID',
        message: `tone must be one of: ${ALLOWED_TONE.join(', ')}`,
      });
    }

    if (slide.layoutHint && !ALLOWED_LAYOUT_HINTS.includes(slide.layoutHint)) {
      issues.push({
        slideIndex: index,
        code: 'LAYOUT_HINT_INVALID',
        message: `layoutHint must be one of: ${ALLOWED_LAYOUT_HINTS.join(', ')}`,
      });
    }

    if (slide.visual && typeof slide.visual !== 'object') {
      issues.push({
        slideIndex: index,
        code: 'VISUAL_INVALID',
        message: 'visual must be object when provided.',
      });
    }

    const visualHint = safeString(slide?.visual?.layoutHint);
    if (visualHint && !ALLOWED_LAYOUT_HINTS.includes(visualHint)) {
      issues.push({
        slideIndex: index,
        code: 'LAYOUT_HINT_INVALID',
        message: `visual.layoutHint must be one of: ${ALLOWED_LAYOUT_HINTS.join(', ')}`,
      });
    }

    const visualImage = safeString(slide?.visual?.imageUrl);
    if (visualImage) {
      if (!isHttpUrl(visualImage)) {
        issues.push({
          slideIndex: index,
          code: 'IMAGE_URL_INVALID',
          message: 'visual.imageUrl must be valid http/https URL.',
        });
      } else if (allowedImageSet && !allowedImageSet.has(visualImage)) {
        issues.push({
          slideIndex: index,
          code: 'IMAGE_NOT_FROM_SOURCE',
          message: 'visual.imageUrl is not from source image URL set.',
        });
      }
    }

    if (typeof slide.images !== 'undefined') {
      validateImageArray(slide.images, index, issues, allowedImageSet, maxImagesPerSlide);
    }

    validateImagePlan(slide, index, issues);
    validateEmphasis(slide, index, issues, strictAccuracy);
    validateBullets(slide, index, issues, {
      strictAccuracy,
      enforcePptCopyRules,
      minBulletsPerPage,
      exemptSourceKeyTypes,
    });

    validateLegacyColumns(slide, index, issues);

    if (slide.type === 'bigNumber') {
      if (!isNonEmptyString(slide.number)) {
        issues.push({ slideIndex: index, code: 'MISSING_NUMBER', message: 'bigNumber requires number.' });
      }
      if (!isNonEmptyString(slide.caption)) {
        issues.push({ slideIndex: index, code: 'MISSING_CAPTION', message: 'bigNumber requires caption.' });
      }
    }

    const allText = getSlideTextCollection(slide);
    if (allText.length > 1500) {
      issues.push({
        slideIndex: index,
        code: 'SLIDE_TEXT_OVERLOAD',
        message: 'Slide total text exceeds readability threshold.',
      });
    }

    if (looksJsonStyleText(allText)) {
      issues.push({
        slideIndex: index,
        code: 'RAW_JSON_STYLE_TEXT',
        message: 'Slide text resembles raw JSON notation.',
      });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}
