// lib/ppt/theme.js
// -----------------------------------------------------------------------------
// PPT design system.
// Provides reusable theme tokens so rendering logic is configurable.
// -----------------------------------------------------------------------------

const BASE_PAGE = {
  width: 13.333,
  height: 7.5,
};

const BASE_THEME = {
  name: 'corporate',
  page: BASE_PAGE,
  grid: {
    columns: 12,
    gutter: 0.16,
    safeMarginX: 0.58,
    safeMarginY: 0.34,
  },
  fonts: {
    title: 'Calibri',
    body: 'Calibri',
    mono: 'Consolas',
  },
  scale: {
    h0: 44,
    h1: 34,
    h2: 26,
    keyMessage: 17,
    body: 13,
    bodySmall: 11,
    caption: 10,
    number: 56,
    agendaTitle: 42,
    agendaItem: 21,
  },
  colors: {
    background: 'F8FAFC',
    backgroundAlt: 'EFF4FF',
    surface: 'FFFFFF',
    surfaceAlt: 'F1F5F9',
    title: '0F172A',
    text: '334155',
    muted: '64748B',
    accent: '2563EB',
    accentSoft: 'DBEAFE',
    danger: 'B91C1C',
    cardStroke: 'E2E8F0',
    darkOverlay: '0F172A',
    divider: 'CBD5E1',
  },
  spacing: {
    sectionGap: 0.2,
    blockGap: 0.16,
    cardGap: 0.14,
    bulletParaSpacePt: 8,
    lineHeightPt: 1.2,
  },
  radius: {
    card: 0.08,
    image: 0.08,
    badge: 0.06,
  },
  shadow: {
    card: {
      type: 'outer',
      color: '000000',
      opacity: 0.09,
      blur: 3,
      offset: 1,
      angle: 45,
    },
    image: {
      type: 'outer',
      color: '000000',
      opacity: 0.12,
      blur: 6,
      offset: 2,
      angle: 45,
    },
  },
  rules: {
    maxTitleLines: 2,
    maxBulletsPerSlide: 6,
    maxCharsPerBullet: 40,
  },
  background: {
    mode: 'gradient-soft',
    accentLineHeight: 0.08,
    panelWidthRatio: 0.28,
  },
};

const PRESETS = {
  corporate: {
    name: 'corporate',
    colors: {
      background: 'F8FAFC',
      backgroundAlt: 'E7EEF9',
      surface: 'FFFFFF',
      surfaceAlt: 'EEF2FF',
      title: '0F172A',
      text: '334155',
      muted: '64748B',
      accent: '1D4ED8',
      accentSoft: 'DBEAFE',
      cardStroke: 'E2E8F0',
      darkOverlay: '0B1220',
      divider: 'CBD5E1',
    },
    background: {
      mode: 'split-panel',
      accentLineHeight: 0.08,
      panelWidthRatio: 0.25,
    },
  },
  'medical-clean': {
    name: 'medical-clean',
    colors: {
      background: 'F5F8FC',
      backgroundAlt: 'E9F4FF',
      surface: 'FFFFFF',
      surfaceAlt: 'EAF3FF',
      title: '0D1B2A',
      text: '1F3B57',
      muted: '4E6E8F',
      accent: '0EA5E9',
      accentSoft: 'DFF3FF',
      cardStroke: 'CFE6F8',
      darkOverlay: '0B1D2D',
      divider: 'BFD8EB',
    },
    background: {
      mode: 'gradient-soft',
      accentLineHeight: 0.08,
      panelWidthRatio: 0.22,
    },
  },
  'dark-hero': {
    name: 'dark-hero',
    colors: {
      background: '0F172A',
      backgroundAlt: '1E293B',
      surface: '111827',
      surfaceAlt: '1F2937',
      title: 'F8FAFC',
      text: 'E2E8F0',
      muted: '94A3B8',
      accent: '38BDF8',
      accentSoft: '0B253D',
      cardStroke: '334155',
      darkOverlay: '020617',
      divider: '475569',
    },
    background: {
      mode: 'dark-section',
      accentLineHeight: 0.08,
      panelWidthRatio: 0.3,
    },
  },
  // backward-compatible aliases
  businessMinimal: {
    name: 'corporate',
  },
  techBlue: {
    name: 'medical-clean',
  },
  pitchContrast: {
    name: 'dark-hero',
    scale: {
      h0: 50,
      h1: 38,
      h2: 28,
      keyMessage: 18,
      agendaTitle: 46,
      agendaItem: 22,
      number: 62,
    },
  },
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const output = Array.isArray(base) ? [...base] : { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(base?.[key] || {}, value);
      return;
    }
    output[key] = value;
  });

  return output;
}

function inferPresetFromHint(themeName, styleHint, tone) {
  const requested = String(themeName || '').trim();
  if (requested && PRESETS[requested]) return requested;

  const hint = `${styleHint || ''} ${tone || ''}`.toLowerCase();
  if (/medical|hospital|clinic|clinical/.test(hint)) return 'medical-clean';
  if (/pitch|roadshow|investor|hero|dark/.test(hint)) return 'dark-hero';
  return 'corporate';
}

export function resolveTheme(options = {}) {
  const presetName = inferPresetFromHint(options.themeName, options.styleHint, options.tone);
  return deepMerge(BASE_THEME, PRESETS[presetName]);
}

export function getThemePresets() {
  return Object.keys(PRESETS);
}
