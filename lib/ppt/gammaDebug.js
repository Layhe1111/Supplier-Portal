// lib/ppt/gammaDebug.js
// -----------------------------------------------------------------------------
// Helper utilities to keep Gamma debug logs and persisted metadata safe.
// -----------------------------------------------------------------------------

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncate(value, maxChars = 800) {
  const text = safeString(value);
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function maskApiKey(value) {
  const key = safeString(value);
  if (!key) return '';
  if (key.length <= 12) return `${key.slice(0, 3)}***`;
  return `${key.slice(0, 9)}****${key.slice(-2)}`;
}

export function shallowGammaResponseSnapshot(payload, maxTextLen = 1200) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = Array.isArray(payload) ? [...payload] : { ...payload };

  const redactField = (obj, field) => {
    if (!Object.prototype.hasOwnProperty.call(obj, field)) return;
    if (typeof obj[field] === 'string') {
      obj[field] = truncate(obj[field], maxTextLen);
    }
  };

  if (Array.isArray(copy.data)) {
    copy.data = copy.data.slice(0, 6);
  }

  redactField(copy, 'inputText');
  redactField(copy, 'prompt');
  redactField(copy, 'additionalInstructions');
  redactField(copy, 'message');
  redactField(copy, 'error');

  if (isObject(copy.data)) {
    const data = { ...copy.data };
    redactField(data, 'inputText');
    redactField(data, 'prompt');
    redactField(data, 'additionalInstructions');
    copy.data = data;
  }

  return copy;
}

export function makeGammaDebugMeta({
  generationId = '',
  providerStatus = '',
  gammaUrl = '',
  exportUrl = '',
  error = '',
  raw = null,
}) {
  return {
    generationId: safeString(generationId),
    providerStatus: safeString(providerStatus),
    gammaUrl: safeString(gammaUrl),
    exportUrl: safeString(exportUrl),
    error: truncate(error, 500),
    raw: shallowGammaResponseSnapshot(raw),
    updatedAt: new Date().toISOString(),
  };
}

