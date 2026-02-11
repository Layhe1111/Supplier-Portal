// lib/ppt/components/shared.js
// -----------------------------------------------------------------------------
// Shared rendering helpers for PPT components.
// -----------------------------------------------------------------------------

import { getIconDataUri } from '../../assets/icons/icons';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

export function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeBulletTextList(bullets) {
  return toArray(bullets)
    .map((item) => {
      if (typeof item === 'string') return safeString(item);
      if (item && typeof item === 'object') return safeString(item.text || item.value || item.label);
      return '';
    })
    .filter(Boolean);
}

export function collectSourceKeys(slide) {
  const keys = toArray(slide?.bullets)
    .flatMap((item) => {
      if (item && typeof item === 'object' && Array.isArray(item.sourceKeys)) {
        return item.sourceKeys;
      }
      return [];
    })
    .map((k) => safeString(k))
    .filter(Boolean);

  return Array.from(new Set(keys));
}

export function addSpeakerNotes(slideObj, slideData, enabled = true) {
  if (!enabled) return;

  const explicit = safeString(slideData?.speakerNotes);
  if (explicit && typeof slideObj.addNotes === 'function') {
    slideObj.addNotes(explicit);
    return;
  }

  const keys = collectSourceKeys(slideData);
  if (keys.length === 0) return;

  if (typeof slideObj.addNotes === 'function') {
    slideObj.addNotes(`Data source: ${keys.join(', ')}`);
  }
}

export function estimateCharsPerLine(widthIn, fontSizePt) {
  const avgCharIn = (fontSizePt * 0.55) / 72;
  return Math.max(10, Math.floor(widthIn / avgCharIn));
}

export function wrapTextByChars(text, maxCharsPerLine) {
  const input = safeString(text);
  if (!input) return '';
  if (input.length <= maxCharsPerLine) return input;

  const words = input.split(/\s+/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharsPerLine) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines.join('\n');
}

export function estimateLines(text, widthIn, fontSizePt) {
  const wrapped = wrapTextByChars(text, estimateCharsPerLine(widthIn, fontSizePt));
  return wrapped.split('\n').filter(Boolean).length;
}

export function drawBaseBackground(slideObj, theme, options = {}) {
  const mode = safeString(options.mode || theme?.background?.mode, 'flat');
  const accentLineColor = options.accentLineColor || theme.colors.accent;
  const backgroundAlt = theme?.colors?.backgroundAlt || theme.colors.surfaceAlt;

  slideObj.background = { color: theme.colors.background };
  slideObj.addShape('rect', {
    x: 0,
    y: 0,
    w: theme.page.width,
    h: theme.page.height,
    fill: { color: theme.colors.background },
    line: { color: theme.colors.background, transparency: 100 },
  });

  if (mode === 'gradient-soft') {
    slideObj.addShape('rect', {
      x: 0,
      y: 0,
      w: theme.page.width,
      h: theme.page.height * 0.62,
      fill: { color: backgroundAlt, transparency: 58 },
      line: { color: backgroundAlt, transparency: 100 },
    });
    slideObj.addShape('rect', {
      x: theme.page.width * 0.32,
      y: theme.page.height * 0.2,
      w: theme.page.width * 0.68,
      h: theme.page.height * 0.8,
      fill: { color: theme.colors.accentSoft, transparency: 82 },
      line: { color: theme.colors.accentSoft, transparency: 100 },
    });
  }

  if (mode === 'split-panel') {
    const ratio = Math.max(0.16, Math.min(0.45, Number(theme?.background?.panelWidthRatio) || 0.25));
    slideObj.addShape('rect', {
      x: theme.page.width * (1 - ratio),
      y: 0,
      w: theme.page.width * ratio,
      h: theme.page.height,
      fill: { color: backgroundAlt, transparency: 35 },
      line: { color: backgroundAlt, transparency: 100 },
    });
  }

  if (mode === 'dark-section') {
    slideObj.addShape('rect', {
      x: 0,
      y: 0,
      w: theme.page.width,
      h: theme.page.height,
      fill: { color: theme.colors.background, transparency: 0 },
      line: { color: theme.colors.background, transparency: 100 },
    });
    slideObj.addShape('rect', {
      x: 0,
      y: theme.page.height * 0.62,
      w: theme.page.width,
      h: theme.page.height * 0.38,
      fill: { color: backgroundAlt, transparency: 65 },
      line: { color: backgroundAlt, transparency: 100 },
    });
  }

  if (options.showAccentLine !== false) {
    slideObj.addShape('rect', {
      x: 0,
      y: 0,
      w: theme.page.width,
      h: theme.background.accentLineHeight,
      fill: { color: accentLineColor },
      line: { color: accentLineColor, transparency: 100 },
    });
  }
}

export function drawTitleAndKeyMessage(slideObj, plan, slideData, theme, options = {}) {
  const titleBox = plan?.boxes?.title;
  const keyBox = plan?.boxes?.keyMessage;
  if (!titleBox || !keyBox) return;

  const title = safeString(slideData.title, 'Untitled Slide');
  const requestedTitleSize = options.titleSize || plan?.sizes?.title || theme.scale.h2;
  let titleSize = requestedTitleSize;
  for (let size = requestedTitleSize; size >= 18; size -= 1) {
    if (estimateLines(title, titleBox.w, size) <= (options.maxTitleLines || theme.rules.maxTitleLines)) {
      titleSize = size;
      break;
    }
  }

  slideObj.addText(title, {
    x: titleBox.x,
    y: titleBox.y,
    w: titleBox.w,
    h: titleBox.h,
    fontFace: theme.fonts.title,
    fontSize: titleSize,
    bold: true,
    color: options.titleColor || theme.colors.title,
    valign: 'mid',
    fit: 'shrink',
  });

  const titleIcon = toArray(slideData?.icons).find((item) => safeString(item?.placement) === 'title');
  if (titleIcon && titleBox.w >= 3.2) {
    const iconSize = 0.26;
    const iconX = titleBox.x + titleBox.w - iconSize - 0.02;
    const iconY = titleBox.y + 0.08;
    slideObj.addShape('roundRect', {
      x: iconX - 0.05,
      y: iconY - 0.04,
      w: iconSize + 0.1,
      h: iconSize + 0.08,
      radius: theme.radius.badge,
      fill: { color: theme.colors.accentSoft },
      line: { color: theme.colors.accentSoft, transparency: 100 },
    });
    slideObj.addImage({
      data: getIconDataUri(safeString(titleIcon.name, 'layout-grid'), theme.colors.accent),
      x: iconX,
      y: iconY,
      w: iconSize,
      h: iconSize,
    });
  }

  const keyText = safeString(slideData.keyMessage);
  if (keyText) {
    slideObj.addShape('roundRect', {
      x: keyBox.x,
      y: keyBox.y,
      w: keyBox.w,
      h: keyBox.h,
      radius: theme.radius.badge,
      fill: { color: theme.colors.accentSoft, transparency: 0 },
      line: { color: theme.colors.accentSoft, transparency: 100 },
    });

    slideObj.addText(keyText, {
      x: keyBox.x + 0.12,
      y: keyBox.y + 0.04,
      w: keyBox.w - 0.24,
      h: keyBox.h - 0.08,
      fontFace: theme.fonts.body,
      fontSize: options.keySize || plan?.sizes?.keyMessage || theme.scale.keyMessage,
      color: options.keyColor || theme.colors.accent,
      bold: true,
      fit: 'shrink',
      valign: 'mid',
      breakLine: true,
    });
  }
}

export function drawBulletList(slideObj, bullets, box, theme, options = {}) {
  if (!box) return;

  const rows = normalizeBulletTextList(bullets)
    .slice(0, options.maxItems || 8)
    .map((line) => ({
      text: line,
      options: {
        bullet: { indent: options.indent || 12 },
      },
    }));

  if (rows.length === 0) return;

  slideObj.addText(rows, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fontFace: theme.fonts.body,
    fontSize: options.fontSize || theme.scale.body,
    color: options.color || theme.colors.text,
    fit: 'shrink',
    valign: options.valign || 'top',
    paraSpaceAfterPt: options.paraSpaceAfterPt || theme.spacing.bulletParaSpacePt,
    breakLine: true,
  });
}

export function drawCard(slideObj, card, theme, options = {}) {
  slideObj.addShape('roundRect', {
    x: card.x,
    y: card.y,
    w: card.w,
    h: card.h,
    radius: theme.radius.card,
    fill: { color: options.cardColor || theme.colors.surface },
    line: { color: options.borderColor || theme.colors.cardStroke },
    shadow: options.shadow || theme.shadow.card,
  });
}

export function drawDivider(slideObj, x, y, w, color) {
  slideObj.addShape('line', {
    x,
    y,
    w,
    h: 0,
    line: {
      color,
      pt: 1,
    },
  });
}
