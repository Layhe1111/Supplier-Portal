// lib/assets/icons/picker.js
// -----------------------------------------------------------------------------
// Deterministic icon picker by slide keyword matching.
// -----------------------------------------------------------------------------

import { getIconNames } from './icons';

const ICON_KEYWORDS = [
  { icon: 'building', words: ['company', 'overview', 'office', 'hq', 'facility', '建筑', '公司'] },
  { icon: 'briefcase', words: ['service', 'offering', 'scope', 'proposal', '服务'] },
  { icon: 'design', words: ['design', 'expertise', 'style', 'layout', 'space', '设计'] },
  { icon: 'globe', words: ['region', 'regional', 'country', 'asia', 'global', '市场', '地区'] },
  { icon: 'presentation', words: ['project', 'case', 'portfolio', 'selected', '案例', '项目'] },
  { icon: 'award', words: ['award', 'recognition', 'accolade', 'honor', '奖项', '荣誉'] },
  { icon: 'users', words: ['team', 'leadership', 'people', 'staff', '组织', '团队'] },
  { icon: 'capability', words: ['capability', 'capacity', 'performance', 'delivery', '能力'] },
  { icon: 'shield-check', words: ['compliance', 'quality', 'safety', 'insurance', '合规', '质量'] },
  { icon: 'mail', words: ['contact', 'email', 'mail', 'phone', 'address', '联系'] },
  { icon: 'healthcare', words: ['medical', 'clinical', 'hospital', 'health', '医疗', '医院'] },
  { icon: 'timeline', words: ['timeline', 'roadmap', 'phase', 'milestone', '流程', '里程碑'] },
  { icon: 'analytics', words: ['chart', 'metric', 'analysis', 'kpi', 'trend', 'dashboard'] },
  { icon: 'strategy', words: ['strategy', 'plan', 'objective', 'goal', 'vision'] },
  { icon: 'sustainability', words: ['sustainable', 'esg', 'carbon', 'green', 'energy'] },
  { icon: 'risk', words: ['risk', 'warning', 'issue', 'alert'] },
  { icon: 'finance', words: ['finance', 'cost', 'budget', 'expense', 'margin', 'revenue'] },
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slideText(slide) {
  const bulletText = toArray(slide?.bullets)
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.text;
      return '';
    })
    .filter(Boolean)
    .join(' ');

  return `${safeString(slide?.title)} ${safeString(slide?.keyMessage)} ${bulletText}`.toLowerCase();
}

function findIconByText(text) {
  for (const item of ICON_KEYWORDS) {
    if (item.words.some((word) => text.includes(word.toLowerCase()))) {
      return item.icon;
    }
  }
  return 'layout-grid';
}

export function pickIcons(slideSpec, options = {}) {
  const iconNames = new Set(getIconNames());
  const maxIconsPerSlide = Math.max(1, Math.min(6, Number(options.maxIconsPerSlide) || 3));

  const slides = toArray(slideSpec?.slides).map((slide) => {
    const text = slideText(slide);
    const suggested = findIconByText(text);

    const existing = toArray(slide?.icons)
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = safeString(item.name);
        const placement = safeString(item.placement, 'card');
        if (!name || !iconNames.has(name)) return null;
        return { name, placement };
      })
      .filter(Boolean);

    if (existing.length > 0) {
      return {
        ...slide,
        icons: existing.slice(0, maxIconsPerSlide),
      };
    }

    const defaultPlacement = slide?.type === 'agenda'
      ? 'bullet'
      : (slide?.type === 'title' || slide?.type === 'section' ? 'title' : 'card');

    return {
      ...slide,
      icons: [
        {
          name: iconNames.has(suggested) ? suggested : 'layout-grid',
          placement: defaultPlacement,
        },
      ],
    };
  });

  return {
    ...slideSpec,
    slides,
  };
}
