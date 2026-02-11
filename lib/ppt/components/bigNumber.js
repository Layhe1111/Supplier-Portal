// lib/ppt/components/bigNumber.js

import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawBulletList,
  safeString,
} from './shared';

export function renderBigNumberSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  if (plan?.boxes?.number) {
    slideObj.addText(safeString(slide.number || slide?.emphasis?.numbers?.[0]?.value || 'Unknown'), {
      x: plan.boxes.number.x,
      y: plan.boxes.number.y,
      w: plan.boxes.number.w,
      h: plan.boxes.number.h,
      fontFace: theme.fonts.title,
      fontSize: plan?.sizes?.number || theme.scale.number,
      color: theme.colors.accent,
      bold: true,
      align: 'center',
      valign: 'mid',
      fit: 'shrink',
    });
  }

  if (plan?.boxes?.caption) {
    slideObj.addText(safeString(slide.caption || slide.keyMessage), {
      x: plan.boxes.caption.x,
      y: plan.boxes.caption.y,
      w: plan.boxes.caption.w,
      h: plan.boxes.caption.h,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.keyMessage,
      color: theme.colors.text,
      align: 'center',
      valign: 'mid',
      fit: 'shrink',
      breakLine: true,
    });
  }

  if (plan?.boxes?.body) {
    drawBulletList(slideObj, slide.bullets, plan.boxes.body, theme, {
      maxItems: 4,
      fontSize: theme.scale.bodySmall,
    });
  }

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
