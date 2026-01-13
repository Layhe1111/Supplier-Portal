type PhoneRule = {
  min: number;
  max: number;
};

const PHONE_RULES: Record<string, PhoneRule> = {
  '+852': { min: 8, max: 8 }, // Hong Kong
  '+86': { min: 11, max: 11 }, // China
  '+853': { min: 8, max: 8 }, // Macau
  '+886': { min: 9, max: 10 }, // Taiwan
  '+65': { min: 8, max: 8 }, // Singapore
  '+60': { min: 9, max: 10 }, // Malaysia
  '+81': { min: 9, max: 10 }, // Japan
  '+82': { min: 9, max: 10 }, // South Korea
  '+44': { min: 10, max: 10 }, // United Kingdom
  '+1': { min: 10, max: 10 }, // US/Canada
  '+61': { min: 9, max: 9 }, // Australia
  '+971': { min: 9, max: 9 }, // UAE
};

const COUNTRY_CODES = Object.keys(PHONE_RULES).sort((a, b) => b.length - a.length);

const normalizeDigits = (value: string) => value.replace(/\D/g, '');
const PHONE_INPUT_REGEX = /^[0-9\s()-]+$/;

const formatRule = (rule: PhoneRule) =>
  rule.min === rule.max ? `${rule.min}` : `${rule.min}-${rule.max}`;

export const getPhoneRule = (countryCode: string) => PHONE_RULES[countryCode] || null;

export const buildPhoneLengthError = (countryCode: string) => {
  const rule = getPhoneRule(countryCode);
  if (!rule) {
    return `Unsupported country code: ${countryCode}`;
  }
  const lengthLabel = formatRule(rule);
  return `Phone number should be ${lengthLabel} digits for ${countryCode} / ${countryCode} 需 ${lengthLabel} 位數字`;
};

export const validateLocalPhone = (countryCode: string, phone: string) => {
  const rule = getPhoneRule(countryCode);
  if (!rule) {
    return { ok: false as const, error: `Unsupported country code: ${countryCode}` };
  }
  if (typeof phone !== 'string') {
    return { ok: false as const, error: 'Invalid phone number' };
  }
  const trimmed = phone.trim();
  if (!trimmed) {
    return { ok: false as const, error: buildPhoneLengthError(countryCode) };
  }
  if (!PHONE_INPUT_REGEX.test(trimmed)) {
    return {
      ok: false as const,
      error: 'Invalid phone number format / 電話號碼格式錯誤',
    };
  }
  const digits = normalizeDigits(phone);
  if (digits.length < rule.min || digits.length > rule.max) {
    return { ok: false as const, error: buildPhoneLengthError(countryCode) };
  }
  return {
    ok: true as const,
    digits,
    countryCode,
    normalized: `${countryCode}${digits}`,
  };
};

export const validateE164Phone = (phone: string) => {
  if (typeof phone !== 'string') {
    return { ok: false as const, error: 'Invalid phone number' };
  }
  const trimmed = phone.trim();
  if (!trimmed) {
    return { ok: false as const, error: 'Invalid phone number' };
  }
  const normalized = trimmed.replace(/[^+\d]/g, '');
  if (!normalized.startsWith('+')) {
    return { ok: false as const, error: 'Invalid phone number' };
  }

  const countryCode = COUNTRY_CODES.find((code) => normalized.startsWith(code));
  if (!countryCode) {
    return { ok: false as const, error: 'Unsupported country code' };
  }

  const digits = normalized.slice(countryCode.length).replace(/\D/g, '');
  const rule = getPhoneRule(countryCode);
  if (!rule) {
    return { ok: false as const, error: 'Unsupported country code' };
  }
  if (digits.length < rule.min || digits.length > rule.max) {
    return { ok: false as const, error: `Invalid phone number length for ${countryCode}` };
  }

  return {
    ok: true as const,
    countryCode,
    digits,
    normalized: `${countryCode}${digits}`,
  };
};
