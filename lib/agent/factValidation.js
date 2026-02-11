// lib/agent/factValidation.js
// -----------------------------------------------------------------------------
// Fact tracing validator for high-accuracy PPT mode.
// Validates whether sourceKeys in slideSpec are traceable to inputJson paths.
// -----------------------------------------------------------------------------

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSegment(segment) {
  return String(segment || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .trim();
}

function normalizePath(path) {
  return safeString(path)
    .split(/[>.]/)
    .map((p) => normalizeSegment(p))
    .filter(Boolean)
    .join('.');
}

export function buildFactIndex(inputJson) {
  const index = new Map();

  function write(path, value) {
    const normalizedPath = normalizePath(path.join('.'));
    if (!normalizedPath) return;

    index.set(normalizedPath, {
      value,
      type: Array.isArray(value) ? 'array' : typeof value,
      text: typeof value === 'string' ? value : JSON.stringify(value),
    });
  }

  function walk(node, path = []) {
    if (node == null) return;

    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      write(path, node);
      return;
    }

    if (Array.isArray(node)) {
      write(path, node);
      node.forEach((item, idx) => walk(item, [...path, String(idx)]));
      return;
    }

    if (typeof node === 'object') {
      write(path, node);
      Object.entries(node).forEach(([key, value]) => {
        walk(value, [...path, key]);
        const normalized = normalizeSegment(key);
        if (normalized && normalized !== key) {
          walk(value, [...path, normalized]);
        }
      });
    }
  }

  walk(inputJson || {}, []);
  return index;
}

function normalizeSourceKeys(sourceKeys) {
  return toArray(sourceKeys)
    .map((k) => normalizePath(k))
    .filter(Boolean);
}

function extractNumericTokens(text) {
  const raw = String(text || '').match(/-?\d+(?:[.,]\d+)?%?/g) || [];
  return raw.map((token) => token.replace(/,/g, ''));
}

function gatherValuesByKeys(keys, factIndex) {
  return keys
    .map((key) => factIndex.get(key))
    .filter(Boolean)
    .map((entry) => String(entry.text || entry.value || ''));
}

function numbersAreBackedBySource(text, sourceKeys, factIndex) {
  const tokens = extractNumericTokens(text).filter((token) => {
    const digits = token.replace(/[^\d]/g, '');
    return token.includes('%') || digits.length >= 3;
  });
  if (tokens.length === 0) return true;
  if (sourceKeys.length === 0) return false;

  const values = gatherValuesByKeys(sourceKeys, factIndex).join(' ');
  const normalized = values.replace(/,/g, '');

  return tokens.every((token) => normalized.includes(token));
}

function normalizeBullets(slide) {
  return toArray(slide?.bullets)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          text: safeString(item),
          kind: 'fact',
          sourceKeys: [],
        };
      }

      if (!item || typeof item !== 'object') {
        return {
          text: '',
          kind: 'fact',
          sourceKeys: [],
        };
      }

      return {
        text: safeString(item.text),
        kind: safeString(item.kind || 'fact').toLowerCase() === 'insight' ? 'insight' : 'fact',
        sourceKeys: normalizeSourceKeys(item.sourceKeys),
      };
    })
    .filter((item) => item.text);
}

export function validateFacts(slideSpec, inputJson, options = {}) {
  const strictAccuracy = options.strictAccuracy !== false;
  const enforceInsightPrefix = options.enforceInsightPrefix !== false;
  const issues = [];

  const factIndex = buildFactIndex(inputJson);

  const slides = toArray(slideSpec?.slides);
  slides.forEach((slide, slideIndex) => {
    const isAgendaLike = safeString(slide?.type) === 'agenda';
    const keyMessage = safeString(slide?.keyMessage);
    const keyMessageSourceKeys = normalizeSourceKeys(slide?.keyMessageSourceKeys);

    if (strictAccuracy && keyMessage && keyMessageSourceKeys.length === 0) {
      issues.push({
        slideIndex,
        code: 'KEY_MESSAGE_SOURCE_MISSING',
        message: 'keyMessageSourceKeys is required in strict mode.',
      });
    }

    keyMessageSourceKeys.forEach((key) => {
      if (!factIndex.has(key)) {
        issues.push({
          slideIndex,
          code: 'SOURCE_PATH_NOT_FOUND',
          message: `keyMessageSourceKeys path not found: ${key}`,
          path: key,
        });
      }
    });

    if (
      strictAccuracy &&
      !isAgendaLike &&
      keyMessage &&
      !numbersAreBackedBySource(keyMessage, keyMessageSourceKeys, factIndex)
    ) {
      issues.push({
        slideIndex,
        code: 'NUMBER_NOT_IN_SOURCE',
        message: 'Numeric token in keyMessage is not backed by keyMessageSourceKeys values.',
      });
    }

    const bullets = normalizeBullets(slide);
    bullets.forEach((bullet, bulletIndex) => {
      const sourceKeys = bullet.sourceKeys;

      if (strictAccuracy && sourceKeys.length === 0) {
        issues.push({
          slideIndex,
          code: 'MISSING_SOURCE_KEYS',
          message: `bullet[${bulletIndex}] is missing sourceKeys.`,
        });
      }

      sourceKeys.forEach((key) => {
        if (!factIndex.has(key)) {
          issues.push({
            slideIndex,
            code: 'SOURCE_PATH_NOT_FOUND',
            message: `bullet[${bulletIndex}] source path not found: ${key}`,
            path: key,
          });
        }
      });

      if (strictAccuracy && !isAgendaLike && !numbersAreBackedBySource(bullet.text, sourceKeys, factIndex)) {
        issues.push({
          slideIndex,
          code: 'NUMBER_NOT_IN_SOURCE',
          message: `bullet[${bulletIndex}] has numeric token not backed by source keys.`,
        });
      }

      if (bullet.kind === 'insight') {
        if (strictAccuracy && sourceKeys.length === 0) {
          issues.push({
            slideIndex,
            code: 'INSIGHT_UNSUPPORTED',
            message: `insight bullet[${bulletIndex}] must include sourceKeys.`,
          });
        }

        if (
          enforceInsightPrefix &&
          !/^(Suggestion:|Potential implication:)/i.test(bullet.text)
        ) {
          issues.push({
            slideIndex,
            code: 'INSIGHT_PREFIX_REQUIRED',
            message: `insight bullet[${bulletIndex}] must start with \"Suggestion:\" or \"Potential implication:\".`,
          });
        }
      }
    });

    const emphasisNumbers = toArray(slide?.emphasis?.numbers);
    emphasisNumbers.forEach((numberItem, numberIndex) => {
      if (!numberItem || typeof numberItem !== 'object') return;
      const sourceKeys = normalizeSourceKeys(numberItem.sourceKeys);

      if (strictAccuracy && sourceKeys.length === 0) {
        issues.push({
          slideIndex,
          code: 'MISSING_SOURCE_KEYS',
          message: `emphasis.numbers[${numberIndex}] is missing sourceKeys.`,
        });
      }

      sourceKeys.forEach((key) => {
        if (!factIndex.has(key)) {
          issues.push({
            slideIndex,
            code: 'SOURCE_PATH_NOT_FOUND',
            message: `emphasis.numbers[${numberIndex}] source path not found: ${key}`,
            path: key,
          });
        }
      });

      const value = safeString(numberItem.value);
      if (strictAccuracy && value && !numbersAreBackedBySource(value, sourceKeys, factIndex)) {
        issues.push({
          slideIndex,
          code: 'NUMBER_NOT_IN_SOURCE',
          message: `emphasis.numbers[${numberIndex}] value is not backed by source keys.`,
        });
      }
    });
  });

  return {
    ok: issues.length === 0,
    issues,
    factIndex,
  };
}
