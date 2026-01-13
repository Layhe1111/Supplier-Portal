const URL_REGEX =
  /^(https?:\/\/)(localhost|(\d{1,3}(?:\.\d{1,3}){3})|([a-z0-9-]+(?:\.[a-z0-9-]+)+))(?:\:\d{2,5})?(?:\/[^\s]*)?$/i;

export const validateOptionalUrl = (value: unknown, label = 'URL') => {
  if (value == null) {
    return { ok: true as const, normalized: null };
  }

  if (typeof value !== 'string') {
    return {
      ok: false as const,
      error: `Invalid ${label} / ${label} 格式錯誤`,
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true as const, normalized: null };
  }

  if (!URL_REGEX.test(trimmed)) {
    return {
      ok: false as const,
      error: `Invalid ${label} format, please include http(s):// / ${label} 格式錯誤，請包含 http(s)://`,
    };
  }

  return { ok: true as const, normalized: trimmed };
};
