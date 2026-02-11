// lib/ppt/renderPpt.js
// -----------------------------------------------------------------------------
// Kimi-style renderer entrypoint.
// theme -> layoutEngine -> validateLayout/fallback -> components -> pptx buffer
// -----------------------------------------------------------------------------

import PptxGenJS from 'pptxgenjs';
import { resolveTheme } from './themeSystem';
import { buildLayoutPlans } from './layoutEngine';
import { validateLayout, applyLayoutFallback } from './validateLayout';
import { createGradientPlaceholderDataUri, createIconPlaceholderDataUri } from '../assets/placeholders';

import { renderAgendaSlide } from './components/agenda';
import { renderHeroSlide } from './components/hero';
import { renderCardsSlide } from './components/cards';
import { renderProfileSlide } from './components/profile';
import { renderSplitImageSlide } from './components/splitImage';
import { renderBigNumberSlide } from './components/bigNumber';
import { renderTimelineSlide } from './components/timeline';
import { renderTextSlide, renderQuoteSlide } from './components/text';

const IMAGE_EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createRenderContext(renderContext, slideSpec) {
  const raw = renderContext && typeof renderContext === 'object' ? renderContext : {};
  const styleHint = safeString(raw.styleHint || slideSpec?.styleHint, 'corporate');
  const tone = safeString(raw.tone || toArray(slideSpec?.slides)[0]?.tone, 'business');

  const theme = resolveTheme({
    themeName: safeString(raw.themeName || slideSpec?.themeName),
    styleHint,
    tone,
  });

  return {
    theme,
    styleHint,
    tone,
    imageFetchTimeoutMs: Math.max(1000, Number(raw.imageFetchTimeoutMs) || 9000),
    maxImagesPerSlide: Math.max(1, Math.min(2, Number(raw.maxImagesPerSlide) || 2)),
    imageCache: raw.imageCache instanceof Map ? raw.imageCache : new Map(),
    selfCheck: raw.selfCheck !== false,
    showSourceInNotes: raw.showSourceInNotes !== false,
  };
}

function guessMimeByUrl(url) {
  try {
    const pathname = new URL(url).pathname || '';
    const ext = pathname.split('.').pop();
    if (!ext) return null;
    return IMAGE_EXT_TO_MIME[ext.toLowerCase()] || null;
  } catch {
    return null;
  }
}

async function fetchImageAsDataUrl(url, context) {
  const cache = context.imageCache;
  if (cache.has(url)) return cache.get(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), context.imageFetchTimeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      cache.set(url, null);
      return null;
    }

    const headerMime = (response.headers.get('content-type') || '').split(';')[0].trim();
    const mime = headerMime || guessMimeByUrl(url) || 'image/jpeg';
    const data = await response.arrayBuffer();
    const base64 = Buffer.from(data).toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    cache.set(url, dataUrl);
    return dataUrl;
  } catch {
    cache.set(url, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSlideImages(plannedSlide, context) {
  const urls = [];
  const seen = new Set();

  const push = (url) => {
    const value = safeString(url);
    if (!/^https?:\/\//i.test(value)) return;
    if (seen.has(value)) return;
    seen.add(value);
    urls.push(value);
  };

  toArray(plannedSlide?.slide?._images).forEach(push);
  push(plannedSlide?.slide?.imagePlan?.imageUrl);
  push(plannedSlide?.slide?.visual?.imageUrl);

  const limited = urls.slice(0, context.maxImagesPerSlide);
  const out = [];

  for (const url of limited) {
    const data = await fetchImageAsDataUrl(url, context);
    if (data) {
      out.push({ url, data });
    }
  }

  return out;
}

function getOverlayTransparency(overlay) {
  if (overlay === 'dark-55') return 45;
  if (overlay === 'dark-40') return 60;
  if (overlay === 'light-20') return 80;
  return null;
}

function createImageHelpers(context) {
  const gradientPlaceholder = createGradientPlaceholderDataUri({
    color1: context.theme.colors.surfaceAlt,
    color2: context.theme.colors.accentSoft,
    color3: context.theme.colors.background,
  });

  const iconPlaceholder = createIconPlaceholderDataUri({
    background: context.theme.colors.surfaceAlt,
    foreground: context.theme.colors.muted,
    label: 'Source image unavailable',
  });

  const resolveImageForBox = (slideObj, image, box, options = {}) => {
    if (!box) return;

    const data = image?.data || options.fallbackData || null;
    if (!data) {
      slideObj.addShape('roundRect', {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        radius: options.roundness || context.theme.radius.image,
        fill: { color: context.theme.colors.surfaceAlt },
        line: { color: context.theme.colors.cardStroke },
      });
      return;
    }

    const imageOptions = {
      data,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      shadow: context.theme.shadow.image,
    };

    if (options.cover !== false) {
      imageOptions.sizing = {
        type: 'cover',
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
      };
    }

    slideObj.addImage(imageOptions);

    if (options.overlay) {
      const transparency = getOverlayTransparency(options.overlay);
      if (transparency != null) {
        slideObj.addShape('rect', {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          fill: { color: context.theme.colors.darkOverlay, transparency },
          line: { color: context.theme.colors.darkOverlay, transparency: 100 },
        });
      }
    }

    if (options.roundness) {
      slideObj.addShape('roundRect', {
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        radius: options.roundness,
        fill: { color: 'FFFFFF', transparency: 100 },
        line: { color: context.theme.colors.cardStroke, transparency: 100 },
      });
    }
  };

  const getPlaceholderImage = (kind) => {
    if (kind === 'hero') return gradientPlaceholder;
    if (kind === 'split' || kind === 'profile') return iconPlaceholder;
    return gradientPlaceholder;
  };

  return { resolveImageForBox, getPlaceholderImage };
}

function chooseRenderer(layout, slideType) {
  if (layout === 'hero-cover') return renderHeroSlide;
  if (layout === 'agenda' || slideType === 'agenda') return renderAgendaSlide;
  if (layout === 'cards' || slideType === 'cards') return renderCardsSlide;
  if (layout === 'profile' || slideType === 'profile') return renderProfileSlide;
  if (layout === 'split-image' || ['split-image', 'image-left', 'image-right', 'image-top'].includes(layout)) {
    return renderSplitImageSlide;
  }
  if (layout === 'big-number' || slideType === 'bigNumber') return renderBigNumberSlide;
  if (layout === 'timeline' || slideType === 'timeline') return renderTimelineSlide;
  if (layout === 'quote' || slideType === 'quote') return renderQuoteSlide;
  return renderTextSlide;
}

export async function renderPpt(slideSpec, renderContext = {}) {
  const context = createRenderContext(renderContext, slideSpec);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Hidden PPT Agent';
  pptx.company = 'Supplier Portal';
  pptx.subject = 'Auto-generated presentation';
  pptx.title = safeString(slideSpec?.presentationTitle, 'Generated Presentation');
  pptx.lang = 'en-US';

  const rawSlides = toArray(slideSpec?.slides);
  let plannedSlides = buildLayoutPlans(rawSlides, context.theme);

  if (context.selfCheck) {
    for (let pass = 0; pass < 3; pass += 1) {
      const check = validateLayout(plannedSlides, context.theme);
      if (check.ok) break;
      plannedSlides = applyLayoutFallback(plannedSlides, context.theme);
    }
  }

  const imageHelpers = createImageHelpers(context);

  for (const planned of plannedSlides) {
    const slideObj = pptx.addSlide();
    const images = await resolveSlideImages(planned, context);

    const renderer = chooseRenderer(planned.layout, planned.slide.type);
    renderer(slideObj, { ...planned, images }, {
      ...context,
      ...imageHelpers,
    });
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer;
}
