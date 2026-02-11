// lib/ppt/validateLayout.js
// -----------------------------------------------------------------------------
// Post-layout validator + deterministic fallback.
// Ensures draw boxes stay inside canvas and text density remains readable.
// -----------------------------------------------------------------------------

import { buildLayoutPlans, estimateOverflowRisk } from './layoutEngine';

function flattenBoxes(boxes) {
  const output = [];

  const push = (box) => {
    if (!box || typeof box !== 'object') return;
    if (
      Number.isFinite(box.x) &&
      Number.isFinite(box.y) &&
      Number.isFinite(box.w) &&
      Number.isFinite(box.h)
    ) {
      output.push(box);
    }
  };

  Object.values(boxes || {}).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === 'object') {
          push(item);
          Object.values(item).forEach((inner) => push(inner));
        }
      });
      return;
    }
    push(value);
  });

  return output;
}

function estimateCharsPerLine(widthIn, fontSizePt) {
  const avgCharIn = (fontSizePt * 0.55) / 72;
  return Math.max(10, Math.floor(widthIn / avgCharIn));
}

function estimateTitleLines(title, box, size) {
  const charsPerLine = estimateCharsPerLine(box.w, size);
  const words = String(title || '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 0;

  let lines = 1;
  let current = 0;
  words.forEach((word) => {
    if (current === 0) {
      current = word.length;
      return;
    }
    if (current + 1 + word.length > charsPerLine) {
      lines += 1;
      current = word.length;
      return;
    }
    current += 1 + word.length;
  });

  return lines;
}

export function validateLayout(plannedSlides, theme) {
  const issues = [];

  plannedSlides.forEach((planned) => {
    const slideIndex = planned.index;

    flattenBoxes(planned?.plan?.boxes).forEach((box) => {
      if (
        box.x < -0.001 ||
        box.y < -0.001 ||
        box.x + box.w > theme.page.width + 0.001 ||
        box.y + box.h > theme.page.height + 0.001
      ) {
        issues.push({
          slideIndex,
          code: 'OUT_OF_BOUNDS',
          message: `Slide ${slideIndex} has an element outside page bounds.`,
        });
      }
    });

    const titleBox = planned?.plan?.boxes?.title;
    if (titleBox) {
      const lines = estimateTitleLines(
        planned?.slide?.title || '',
        titleBox,
        planned?.plan?.sizes?.title || theme.scale.h2
      );

      if (lines > 2) {
        issues.push({
          slideIndex,
          code: 'TITLE_OVER_2_LINES',
          message: `Slide ${slideIndex} title exceeds two lines.`,
        });
      }
    }

    if (estimateOverflowRisk(planned)) {
      issues.push({
        slideIndex,
        code: 'BODY_OVERFLOW',
        message: `Slide ${slideIndex} body text is likely overflowing.`,
      });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}

const LAYOUT_FALLBACK_CHAINS = {
  'split-image': ['image-top', 'text'],
  'image-top': ['text'],
  profile: ['split-image', 'image-top', 'text'],
  'big-number': ['cards', 'text'],
  timeline: ['text'],
  quote: ['text'],
  cards: ['text'],
  text: ['cards', 'text'],
  summary: ['text'],
  agenda: ['text'],
  'hero-cover': ['text'],
};

function pickFallbackLayout(layout, issueCode) {
  const key = layout || 'text';
  const chain = LAYOUT_FALLBACK_CHAINS[key] || ['text'];

  // Enforce requested overflow fallback preference for bullet-heavy pages.
  if (issueCode === 'BODY_OVERFLOW' && key === 'text') {
    return 'cards';
  }

  return chain[0] || 'text';
}

export function applyLayoutFallback(plannedSlides, theme) {
  let currentPlans = plannedSlides;

  for (let pass = 0; pass < 3; pass += 1) {
    const check = validateLayout(currentPlans, theme);
    if (check.ok) return currentPlans;

    const forcedLayouts = {};
    check.issues.forEach((issue) => {
      const index = Number(issue?.slideIndex);
      if (!Number.isInteger(index) || index < 0) return;

      const currentLayout = currentPlans[index]?.layout;
      if (!currentLayout) return;

      const fallback = pickFallbackLayout(currentLayout, issue.code);
      if (!fallback || fallback === currentLayout) return;
      forcedLayouts[index] = fallback;
    });

    if (Object.keys(forcedLayouts).length === 0) {
      return currentPlans;
    }

    const sourceSlides = currentPlans.map((planned) => planned.slide);
    currentPlans = buildLayoutPlans(sourceSlides, theme, { forcedLayouts });
  }

  return currentPlans;
}
