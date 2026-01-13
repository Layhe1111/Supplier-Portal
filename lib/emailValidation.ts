const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (value: unknown, label = 'Email') => {
  if (typeof value !== 'string') {
    return { ok: false as const, error: `Invalid ${label} / ${label} 格式錯誤` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false as const, error: `${label} is required / 請填寫${label}` };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      ok: false as const,
      error: `Invalid ${label} format / ${label} 格式錯誤`,
    };
  }

  return { ok: true as const, normalized: trimmed };
};

export const validateOptionalEmail = (value: unknown, label = 'Email') => {
  if (value == null) {
    return { ok: true as const, normalized: null };
  }

  if (typeof value !== 'string') {
    return { ok: false as const, error: `Invalid ${label} / ${label} 格式錯誤` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true as const, normalized: null };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      ok: false as const,
      error: `Invalid ${label} format / ${label} 格式錯誤`,
    };
  }

  return { ok: true as const, normalized: trimmed };
};
