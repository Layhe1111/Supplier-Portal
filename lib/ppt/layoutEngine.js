// lib/ppt/layoutEngine.js
// -----------------------------------------------------------------------------
// Constraint-based layout engine.
// Applies deterministic rules similar to smart-design systems:
// 1) shrink font (to min threshold)
// 2) switch layout
// 3) split slide
// -----------------------------------------------------------------------------

import { ALLOWED_LAYOUT_HINTS } from './validateSlideSpec';

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBulletText(item) {
  if (typeof item === 'string') return safeString(item);
  if (!item || typeof item !== 'object') return '';
  return safeString(item.text || item.value || item.label);
}

function normalizeBullets(value) {
  return toArray(value).map(normalizeBulletText).filter(Boolean);
}

function estimateCharsPerLine(widthIn, fontSizePt) {
  const avgCharIn = (fontSizePt * 0.55) / 72;
  return Math.max(10, Math.floor(widthIn / avgCharIn));
}

function wrapLineByChars(text, maxCharsPerLine) {
  const input = safeString(text);
  if (!input) return '';
  if (input.length <= maxCharsPerLine) return input;

  const words = input.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) lines.push(current);
  return lines.join('\n');
}

function estimateLines(text, widthIn, fontSizePt) {
  const wrapped = wrapLineByChars(text, estimateCharsPerLine(widthIn, fontSizePt));
  return wrapped.split('\n').filter(Boolean).length;
}

export function estimateTextHeight(textOrLines, fontSizePt, widthIn, options = {}) {
  const lineHeight = Number(options.lineHeight) || 1.32;
  const paraGap = Number(options.paraGap) || 0.05;

  const lines = Array.isArray(textOrLines)
    ? textOrLines
        .map((line) => estimateLines(line, widthIn, fontSizePt))
        .reduce((sum, count) => sum + count, 0)
    : estimateLines(String(textOrLines || ''), widthIn, fontSizePt);

  const base = lines * ((fontSizePt * lineHeight) / 72);
  const paragraphExtra = Math.max(0, lines - 1) * paraGap;
  return base + paragraphExtra;
}

function normalizeSlideType(type, hasNumbers, hasImages, bulletCount) {
  const requested = safeString(type);
  if (requested) return requested;
  if (hasNumbers) return 'bigNumber';
  if (hasImages) return 'split-image';
  if (bulletCount >= 6) return 'cards';
  return 'text';
}

function normalizeLayoutHint(slideType, slide, hasImages, bulletCount) {
  const requested = safeString(slide.layoutHint || slide?.visual?.layoutHint);
  if (ALLOWED_LAYOUT_HINTS.includes(requested)) return requested;

  if (slideType === 'agenda') return 'agenda';
  if (slideType === 'title') return hasImages ? 'hero-cover' : 'text';
  if (slideType === 'cards') return 'cards';
  if (slideType === 'profile') return 'profile';
  if (slideType === 'split-image') return 'split-image';
  if (slideType === 'timeline') return 'timeline';
  if (slideType === 'quote') return 'quote';
  if (slideType === 'bigNumber') return 'big-number';
  if (slideType === 'summary') return 'summary';

  if (hasImages) return 'split-image';
  if (bulletCount >= 6) return 'cards';
  return 'text';
}

function normalizeSlide(slide) {
  const bulletText = normalizeBullets(slide?.bullets);
  const hasNumbers = toArray(slide?.emphasis?.numbers).length > 0 || safeString(slide?.number).length > 0;
  const images = toArray(slide?.images)
    .map((url) => safeString(url))
    .filter((url) => /^https?:\/\//i.test(url));

  const type = normalizeSlideType(slide?.type, hasNumbers, images.length > 0, bulletText.length);
  const layoutHint = normalizeLayoutHint(type, slide, images.length > 0, bulletText.length);

  return {
    ...slide,
    type,
    title: safeString(slide?.title, 'Untitled Slide'),
    keyMessage: safeString(slide?.keyMessage, 'Not provided.'),
    subtitle: safeString(slide?.subtitle),
    density: ['low', 'medium', 'high'].includes(slide?.density) ? slide.density : 'medium',
    tone: safeString(slide?.tone, 'business'),
    bullets: toArray(slide?.bullets),
    _bulletText: bulletText,
    _images: images,
    _layoutHint: layoutHint,
    constraints: {
      maxBulletsPerSlide: Math.max(3, Math.min(8, Number(slide?.constraints?.maxBulletsPerSlide) || 6)),
      maxCharsPerBullet: Math.max(24, Math.min(120, Number(slide?.constraints?.maxCharsPerBullet) || 40)),
    },
  };
}

function paginateAgendaSlide(slide) {
  if (slide.type !== 'agenda') return [slide];
  const items = slide._bulletText;
  if (items.length <= 8) return [slide];

  const chunks = [];
  for (let i = 0; i < items.length; i += 8) {
    chunks.push(items.slice(i, i + 8));
  }

  return chunks.map((chunk, index) => {
    const mappedBullets = chunk.map((text, localIndex) => {
      const raw = toArray(slide.bullets)[index * 8 + localIndex];
      if (raw && typeof raw === 'object') return { ...raw, text };
      return text;
    });

    return {
      ...slide,
      title: index === 0 ? slide.title : `${slide.title} (cont.)`,
      bullets: mappedBullets,
      _bulletText: chunk,
      _images: [],
      _layoutHint: 'agenda',
    };
  });
}

function splitSlideByBullets(slide) {
  const texts = toArray(slide._bulletText);
  if (texts.length <= 1) return [slide];

  const maxItems = Math.max(3, Math.min(6, slide.constraints.maxBulletsPerSlide || 6));
  const chunks = [];

  for (let i = 0; i < texts.length; i += maxItems) {
    chunks.push(texts.slice(i, i + maxItems));
  }

  if (chunks.length <= 1) {
    const wrapped = texts.map((line) => wrapLineByChars(line, slide.constraints.maxCharsPerBullet || 40));
    return [{ ...slide, _bulletText: wrapped }];
  }

  return chunks.map((chunk, index) => {
    const mappedBullets = chunk.map((text, localIndex) => {
      const raw = toArray(slide.bullets)[index * maxItems + localIndex];
      if (raw && typeof raw === 'object') return { ...raw, text };
      return text;
    });

    return {
      ...slide,
      title: index === 0 ? slide.title : `${slide.title} (cont.)`,
      bullets: mappedBullets,
      _bulletText: chunk,
      _images: index === 0 ? slide._images : [],
      _layoutHint: index === 0 ? slide._layoutHint : 'text',
    };
  });
}

function makeGrid(theme) {
  const safeX = theme.grid.safeMarginX;
  const safeY = theme.grid.safeMarginY;
  const safeW = theme.page.width - safeX * 2;
  const safeH = theme.page.height - safeY * 2;
  const cols = theme.grid.columns;
  const gutter = theme.grid.gutter;
  const colWidth = (safeW - gutter * (cols - 1)) / cols;

  const colX = (start) => safeX + (start - 1) * (colWidth + gutter);
  const spanW = (span) => colWidth * span + gutter * (span - 1);

  return {
    page: theme.page,
    safe: { x: safeX, y: safeY, w: safeW, h: safeH },
    colX,
    spanW,
  };
}

function getTypeSizes(slide, theme) {
  const density = slide.density;
  let body = theme.scale.body;
  if (density === 'high') body -= 1;
  if (density === 'low') body += 1;

  return {
    title: density === 'low' ? theme.scale.h1 : theme.scale.h2,
    keyMessage: theme.scale.keyMessage,
    body: Math.max(14, Math.min(20, body)),
    number: theme.scale.number,
    subtitle: Math.max(24, theme.scale.h2),
  };
}

function baseHeaderBoxes(grid, theme, sizes) {
  const titleHeight = sizes.title >= 38 ? 1.02 : 0.84;
  const keyHeight = 0.56;

  const title = {
    x: grid.safe.x,
    y: grid.safe.y,
    w: grid.safe.w,
    h: titleHeight,
  };

  const keyMessage = {
    x: grid.safe.x,
    y: title.y + title.h + theme.spacing.sectionGap,
    w: grid.safe.w,
    h: keyHeight,
  };

  const contentTop = keyMessage.y + keyMessage.h + theme.spacing.sectionGap;
  return { title, keyMessage, contentTop };
}

function planHero(slide, grid, theme, sizes) {
  const inset = 0.66;
  return {
    layout: 'hero-cover',
    boxes: {
      image: { x: 0, y: 0, w: theme.page.width, h: theme.page.height },
      title: { x: inset, y: theme.page.height - 2.25, w: theme.page.width - inset * 2, h: 1.0 },
      keyMessage: { x: inset, y: theme.page.height - 1.22, w: theme.page.width - inset * 2, h: 0.6 },
      subtitle: { x: inset, y: theme.page.height - 0.66, w: theme.page.width - inset * 2, h: 0.34 },
    },
    sizes: {
      ...sizes,
      title: Math.max(48, theme.scale.h0),
      subtitle: Math.max(24, sizes.subtitle || 24),
    },
    fallback: ['text'],
  };
}

function planAgenda(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, {
    ...sizes,
    title: Math.max(36, theme.scale.agendaTitle),
  });

  const items = slide._bulletText;
  const columns = 2;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const gapX = 0.22;
  const gapY = 0.16;
  const cardHeight = Math.max(
    0.76,
    (grid.safe.y + grid.safe.h - header.contentTop - gapY * (rows - 1)) / rows
  );
  const cardWidth = (grid.safe.w - gapX) / 2;

  const agendaItems = items.map((text, idx) => {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    const cardX = grid.safe.x + col * (cardWidth + gapX);
    const cardY = header.contentTop + row * (cardHeight + gapY);

    return {
      card: { x: cardX, y: cardY, w: cardWidth, h: cardHeight },
      badge: { x: cardX + 0.12, y: cardY + 0.2, w: 0.36, h: 0.28 },
      textBox: { x: cardX + 0.56, y: cardY + 0.12, w: cardWidth - 0.68, h: cardHeight - 0.2 },
      iconBox: { x: cardX + cardWidth - 0.46, y: cardY + 0.18, w: 0.24, h: 0.24 },
      index: idx + 1,
      text,
    };
  });

  return {
    layout: 'agenda',
    boxes: {
      ...header,
      agendaItems,
    },
    sizes: {
      ...sizes,
      title: Math.max(36, theme.scale.agendaTitle),
      body: Math.max(20, theme.scale.agendaItem),
    },
    fallback: ['text'],
  };
}

function planSplitImage(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const words = slide._bulletText.join(' ').split(/\s+/).filter(Boolean).length;
  let imageRatio = 0.45;
  if (words > 88 || slide.density === 'high') imageRatio = 0.4;
  if (words < 34 || slide.density === 'low') imageRatio = 0.5;

  const contentHeight = grid.safe.y + grid.safe.h - header.contentTop;
  const imageWidth = grid.safe.w * imageRatio;
  const bodyWidth = grid.safe.w - imageWidth - 0.2;
  const imageOnLeft = slide._layoutHint === 'image-left' || safeString(slide?.imagePlan?.placement) === 'left';

  const image = {
    x: imageOnLeft ? grid.safe.x : grid.safe.x + bodyWidth + 0.2,
    y: header.contentTop,
    w: imageWidth,
    h: contentHeight,
  };

  const body = {
    x: imageOnLeft ? image.x + image.w + 0.2 : grid.safe.x,
    y: header.contentTop,
    w: bodyWidth,
    h: contentHeight,
  };

  return {
    layout: 'split-image',
    boxes: {
      ...header,
      image,
      body,
    },
    sizes,
    fallback: ['image-top', 'text'],
  };
}

function planImageTop(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const imageHeight = slide.density === 'high' ? 2.0 : 2.35;

  return {
    layout: 'split-image',
    boxes: {
      ...header,
      image: {
        x: grid.safe.x,
        y: header.contentTop,
        w: grid.safe.w,
        h: imageHeight,
      },
      body: {
        x: grid.safe.x,
        y: header.contentTop + imageHeight + theme.spacing.blockGap,
        w: grid.safe.w,
        h: grid.safe.y + grid.safe.h - (header.contentTop + imageHeight + theme.spacing.blockGap),
      },
    },
    sizes,
    fallback: ['text'],
  };
}

function planCards(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const items = slide._bulletText.slice(0, 6);
  const count = items.length;
  const columns = count <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(count / columns));
  const gap = 0.18;
  const cardWidth = (grid.safe.w - gap * (columns - 1)) / columns;
  const cardHeight = Math.max(
    1.2,
    (grid.safe.y + grid.safe.h - header.contentTop - gap * (rows - 1)) / rows
  );

  const cards = items.map((text, idx) => {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    const x = grid.safe.x + col * (cardWidth + gap);
    const y = header.contentTop + row * (cardHeight + gap);

    return {
      x,
      y,
      w: cardWidth,
      h: cardHeight,
      text,
      iconBox: { x: x + 0.18, y: y + 0.16, w: 0.24, h: 0.24 },
    };
  });

  return {
    layout: 'cards',
    boxes: {
      ...header,
      cards,
    },
    sizes,
    fallback: ['text'],
  };
}

function planProfile(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const contentHeight = grid.safe.y + grid.safe.h - header.contentTop;
  const imageWidth = 3.9;

  return {
    layout: 'profile',
    boxes: {
      ...header,
      profileImage: {
        x: grid.safe.x,
        y: header.contentTop,
        w: imageWidth,
        h: contentHeight,
      },
      profileBody: {
        x: grid.safe.x + imageWidth + 0.24,
        y: header.contentTop,
        w: grid.safe.w - imageWidth - 0.24,
        h: contentHeight,
      },
    },
    sizes,
    fallback: ['split-image', 'text'],
  };
}

function planBigNumber(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  return {
    layout: 'big-number',
    boxes: {
      ...header,
      number: { x: grid.safe.x, y: header.contentTop + 0.15, w: grid.safe.w, h: 1.68 },
      caption: { x: grid.safe.x + 0.7, y: header.contentTop + 1.88, w: grid.safe.w - 1.4, h: 0.96 },
      body: {
        x: grid.safe.x,
        y: header.contentTop + 2.92,
        w: grid.safe.w,
        h: grid.safe.y + grid.safe.h - (header.contentTop + 2.92),
      },
    },
    sizes,
    fallback: ['cards', 'text'],
  };
}

function planTimeline(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const items = slide._bulletText.slice(0, 6);
  const gap = 0.15;
  const rowHeight = Math.max(
    0.5,
    (grid.safe.y + grid.safe.h - header.contentTop - gap * Math.max(0, items.length - 1)) /
      Math.max(1, items.length)
  );

  const timelineSteps = items.map((text, idx) => {
    const y = header.contentTop + idx * (rowHeight + gap);
    return {
      dot: { x: grid.safe.x + 0.12, y: y + rowHeight * 0.5 - 0.06, w: 0.12, h: 0.12 },
      badge: { x: grid.safe.x + 0.26, y, w: 0.24, h: rowHeight },
      textBox: { x: grid.safe.x + 0.56, y, w: grid.safe.w - 0.56, h: rowHeight },
      text,
    };
  });

  return {
    layout: 'timeline',
    boxes: {
      ...header,
      timelineSteps,
    },
    sizes,
    fallback: ['text'],
  };
}

function planQuote(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  return {
    layout: 'quote',
    boxes: {
      ...header,
      quote: {
        x: grid.safe.x + 0.65,
        y: header.contentTop + 0.34,
        w: grid.safe.w - 1.3,
        h: grid.safe.y + grid.safe.h - (header.contentTop + 0.4),
      },
    },
    sizes,
    fallback: ['text'],
  };
}

function planText(slide, grid, theme, sizes) {
  const header = baseHeaderBoxes(grid, theme, sizes);
  const body = {
    x: grid.safe.x,
    y: header.contentTop,
    w: grid.safe.w,
    h: grid.safe.y + grid.safe.h - header.contentTop,
  };

  const shouldTwoColumn = slide.density === 'high' || slide._bulletText.length > 5;
  if (!shouldTwoColumn) {
    return {
      layout: 'text',
      boxes: { ...header, body },
      sizes,
      fallback: [],
    };
  }

  const gap = 0.24;
  const colWidth = (body.w - gap) / 2;

  return {
    layout: 'text',
    boxes: {
      ...header,
      body,
      bodyColumns: [
        { x: body.x, y: body.y, w: colWidth, h: body.h },
        { x: body.x + colWidth + gap, y: body.y, w: colWidth, h: body.h },
      ],
    },
    sizes,
    fallback: ['cards'],
  };
}

function getPlanByLayout(slide, grid, theme, sizes, layout) {
  switch (layout) {
    case 'hero-cover':
      return planHero(slide, grid, theme, sizes);
    case 'agenda':
      return planAgenda(slide, grid, theme, sizes);
    case 'split-image':
    case 'image-left':
    case 'image-right':
      return planSplitImage(slide, grid, theme, sizes);
    case 'image-top':
      return planImageTop(slide, grid, theme, sizes);
    case 'cards':
      return planCards(slide, grid, theme, sizes);
    case 'profile':
      return planProfile(slide, grid, theme, sizes);
    case 'big-number':
      return planBigNumber(slide, grid, theme, sizes);
    case 'timeline':
      return planTimeline(slide, grid, theme, sizes);
    case 'quote':
      return planQuote(slide, grid, theme, sizes);
    case 'summary':
    case 'text':
    default:
      return planText(slide, grid, theme, sizes);
  }
}

function flattenBoxes(boxes) {
  const out = [];

  const push = (box) => {
    if (!box || typeof box !== 'object') return;
    if (
      Number.isFinite(box.x) &&
      Number.isFinite(box.y) &&
      Number.isFinite(box.w) &&
      Number.isFinite(box.h)
    ) {
      out.push(box);
    }
  };

  Object.values(boxes || {}).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        push(entry);
        Object.values(entry).forEach((inner) => push(inner));
      });
      return;
    }
    push(value);
  });

  return out;
}

function isPlanInBounds(plan, theme) {
  return flattenBoxes(plan.boxes).every((box) => {
    if (box.w < 0 || box.h < 0) return false;
    if (box.x < -0.001 || box.y < -0.001) return false;
    if (box.x + box.w > theme.page.width + 0.001) return false;
    if (box.y + box.h > theme.page.height + 0.001) return false;
    return true;
  });
}

function titleWithinTwoLines(slide, plan, theme) {
  const box = plan?.boxes?.title;
  if (!box) return true;
  const lines = estimateLines(slide.title, box.w, plan.sizes.title);
  return lines <= theme.rules.maxTitleLines;
}

function bodyWithinHeight(slide, plan) {
  const bodyBox = plan?.boxes?.body;
  if (!bodyBox) return true;

  const bulletText = toArray(slide._bulletText);
  if (bulletText.length === 0) return true;

  const needed = estimateTextHeight(
    bulletText,
    plan?.sizes?.body || 14,
    bodyBox.w,
    { paraGap: 0.06 }
  );

  return needed <= bodyBox.h + 0.12;
}

function buildSinglePlan(slide, theme, forcedLayout = '') {
  const grid = makeGrid(theme);
  const baseSizes = getTypeSizes(slide, theme);

  const preferred = forcedLayout || slide._layoutHint;
  const layoutFallback = [];

  if (!forcedLayout) {
    if (preferred === 'split-image') layoutFallback.push('image-top', 'text');
    if (preferred === 'cards') layoutFallback.push('text');
    if (preferred === 'profile') layoutFallback.push('split-image', 'text');
    if (preferred === 'big-number') layoutFallback.push('cards', 'text');
    if (preferred === 'timeline') layoutFallback.push('text');
    if (preferred === 'text') layoutFallback.push('cards');
  }

  const layouts = [preferred, ...layoutFallback, 'text'].filter((item, idx, arr) => arr.indexOf(item) === idx);

  // Hard order: shrink font -> switch layout -> split
  for (const layout of layouts) {
    for (let bodySize = baseSizes.body; bodySize >= 14; bodySize -= 1) {
      const sizes = { ...baseSizes, body: bodySize };
      const plan = getPlanByLayout(slide, grid, theme, sizes, layout);

      const valid =
        isPlanInBounds(plan, theme) &&
        titleWithinTwoLines(slide, plan, theme) &&
        bodyWithinHeight(slide, plan);

      if (valid) {
        return {
          ...plan,
          chosenLayout: layout,
          requiresSplit: false,
        };
      }
    }
  }

  const fallbackPlan = getPlanByLayout(slide, grid, theme, { ...baseSizes, body: 14 }, 'text');
  return {
    ...fallbackPlan,
    chosenLayout: 'text',
    requiresSplit: true,
  };
}

export function buildLayoutPlans(slides, theme, options = {}) {
  const forcedLayouts = options.forcedLayouts || {};

  const normalizedSlides = toArray(slides)
    .map((slide) => normalizeSlide(slide))
    .flatMap((slide) => paginateAgendaSlide(slide));

  const planned = [];

  normalizedSlides.forEach((slide) => {
    const forcedLayout = safeString(forcedLayouts[planned.length]);
    const firstPlan = buildSinglePlan(slide, theme, forcedLayout);

    if (!firstPlan.requiresSplit) {
      planned.push({ slide, plan: firstPlan, layout: firstPlan.chosenLayout });
      return;
    }

    const splitSlides = splitSlideByBullets(slide);
    if (splitSlides.length <= 1) {
      planned.push({ slide, plan: firstPlan, layout: firstPlan.chosenLayout });
      return;
    }

    splitSlides.forEach((chunkSlide) => {
      const chunkPlan = buildSinglePlan(chunkSlide, theme, forcedLayout);
      planned.push({ slide: chunkSlide, plan: chunkPlan, layout: chunkPlan.chosenLayout });
    });
  });

  return planned.map((entry, index) => ({
    index,
    slide: entry.slide,
    plan: entry.plan,
    layout: entry.layout,
  }));
}

export function estimateOverflowRisk(plannedSlide) {
  const slide = plannedSlide?.slide;
  const plan = plannedSlide?.plan;
  if (!slide || !plan) return false;

  const body = plan?.boxes?.body;
  if (!body) return false;

  const lines = toArray(slide?._bulletText || slide?.bullets).map(normalizeBulletText).filter(Boolean);
  if (lines.length === 0) return false;

  const needed = estimateTextHeight(lines, plan?.sizes?.body || 14, body.w, {
    paraGap: 0.06,
  });

  return needed > body.h + 0.12;
}
