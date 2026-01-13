const sanitizeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');

const ORIG_MARKER = '__orig__';

const toBase64 = (value: string) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(value)));
};

const fromBase64 = (value: string) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(value)));
};

const encodeBase64Url = (value: string) =>
  toBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = padded.length % 4;
  const normalized = padLength ? padded + '='.repeat(4 - padLength) : padded;
  return fromBase64(normalized);
};

const splitFilename = (filename: string) => {
  const normalized = filename.normalize('NFKD').replace(/[\\/]+/g, '');
  const lastDot = normalized.lastIndexOf('.');
  const baseRaw = lastDot >= 0 ? normalized.slice(0, lastDot) : normalized;
  const extRaw = lastDot >= 0 ? normalized.slice(lastDot + 1) : '';
  return { baseRaw, extRaw };
};

export const sanitizeFilename = (filename: string) => {
  const { baseRaw, extRaw } = splitFilename(filename);
  const base = sanitizeSegment(baseRaw) || 'file';
  const ext = sanitizeSegment(extRaw);

  return ext ? `${base}.${ext}` : base;
};

export const buildStorageFileName = (originalName: string) => {
  const { baseRaw, extRaw } = splitFilename(originalName);
  const base = sanitizeSegment(baseRaw) || 'file';
  const ext = sanitizeSegment(extRaw);
  const encoded = encodeBase64Url(originalName);
  const baseWithMeta = encoded ? `${base}${ORIG_MARKER}${encoded}` : base;
  return ext ? `${baseWithMeta}.${ext}` : baseWithMeta;
};

export const extractOriginalFilename = (pathOrName: string) => {
  const base = pathOrName.split('/').pop() || pathOrName;
  const withoutPrefix = base.replace(/^\d{10,}-/, '');
  const lastDot = withoutPrefix.lastIndexOf('.');
  const basePart = lastDot >= 0 ? withoutPrefix.slice(0, lastDot) : withoutPrefix;
  const markerIndex = basePart.indexOf(ORIG_MARKER);

  if (markerIndex >= 0) {
    const encoded = basePart.slice(markerIndex + ORIG_MARKER.length);
    try {
      const decoded = decodeBase64Url(encoded);
      if (decoded) return decoded;
    } catch {
      return withoutPrefix;
    }
  }

  return withoutPrefix;
};
