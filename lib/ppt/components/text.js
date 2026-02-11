// lib/ppt/components/text.js

import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawBulletList,
  normalizeBulletTextList,
  safeString,
} from './shared';

export function renderTextSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  if (plan?.boxes?.bodyColumns?.length === 2) {
    const items = normalizeBulletTextList(slide.bullets);
    const midpoint = Math.ceil(items.length / 2);
    drawBulletList(slideObj, items.slice(0, midpoint), plan.boxes.bodyColumns[0], theme, {
      maxItems: 5,
      fontSize: theme.scale.body,
    });
    drawBulletList(slideObj, items.slice(midpoint), plan.boxes.bodyColumns[1], theme, {
      maxItems: 5,
      fontSize: theme.scale.body,
    });
  } else {
    drawBulletList(slideObj, slide.bullets, plan?.boxes?.body, theme, {
      maxItems: 6,
      fontSize: theme.scale.body,
    });
  }

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}

export function renderQuoteSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  const box = plan?.boxes?.quote || plan?.boxes?.body;
  if (box) {
    slideObj.addShape('roundRect', {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      radius: theme.radius.card,
      fill: { color: theme.colors.surfaceAlt },
      line: { color: theme.colors.cardStroke },
      shadow: theme.shadow.card,
    });

    slideObj.addText(`“${safeString(slide.keyMessage)}”`, {
      x: box.x + 0.3,
      y: box.y + 0.25,
      w: box.w - 0.6,
      h: box.h - 0.5,
      fontFace: theme.fonts.body,
      fontSize: Math.max(theme.scale.h2 - 2, 20),
      italic: true,
      color: theme.colors.title,
      align: 'center',
      valign: 'mid',
      fit: 'shrink',
      breakLine: true,
    });
  }

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
