// lib/ppt/components/hero.js

import { addSpeakerNotes, drawBaseBackground, safeString } from './shared';

export function renderHeroSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, resolveImageForBox, getPlaceholderImage, showSourceInNotes } = renderCtx;
  const { slide, plan, images } = plannedSlide;

  drawBaseBackground(slideObj, theme);

  const imageBox = plan?.boxes?.image;
  if (imageBox) {
    const heroImage = images[0] || null;
    resolveImageForBox(slideObj, heroImage, imageBox, {
      fallbackData: getPlaceholderImage('hero', theme),
      cover: true,
      roundness: 0,
      overlay: slide?.imagePlan?.overlay || 'dark-55',
      focalPoint: slide?.imagePlan?.focalPoint || 'center',
    });
  }

  const titleColor = theme.name === 'dark-hero' ? theme.colors.title : 'FFFFFF';
  const keyColor = theme.name === 'dark-hero' ? theme.colors.accent : 'FFFFFF';

  if (plan?.boxes?.title) {
    slideObj.addText(safeString(slide.title), {
      x: plan.boxes.title.x,
      y: plan.boxes.title.y,
      w: plan.boxes.title.w,
      h: plan.boxes.title.h,
      fontFace: theme.fonts.title,
      fontSize: Math.max(theme.scale.h0, 42),
      bold: true,
      color: titleColor,
      valign: 'mid',
      fit: 'shrink',
      breakLine: true,
    });
  }

  if (plan?.boxes?.keyMessage) {
    slideObj.addText(safeString(slide.keyMessage), {
      x: plan.boxes.keyMessage.x,
      y: plan.boxes.keyMessage.y,
      w: plan.boxes.keyMessage.w,
      h: plan.boxes.keyMessage.h,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.keyMessage,
      color: keyColor,
      bold: true,
      valign: 'mid',
      fit: 'shrink',
      breakLine: true,
    });
  }

  if (plan?.boxes?.subtitle && safeString(slide.subtitle)) {
    slideObj.addText(safeString(slide.subtitle), {
      x: plan.boxes.subtitle.x,
      y: plan.boxes.subtitle.y,
      w: plan.boxes.subtitle.w,
      h: plan.boxes.subtitle.h,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.bodySmall,
      color: titleColor,
      fit: 'shrink',
      valign: 'mid',
    });
  }

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
