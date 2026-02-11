// lib/ppt/components/splitImage.js

import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawBulletList,
} from './shared';

export function renderSplitImageSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, resolveImageForBox, getPlaceholderImage, showSourceInNotes } = renderCtx;
  const { slide, plan, images } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  if (plan?.boxes?.image) {
    resolveImageForBox(slideObj, images[0] || null, plan.boxes.image, {
      fallbackData: getPlaceholderImage('split', theme),
      cover: true,
      roundness: theme.radius.image,
      overlay: null,
      focalPoint: slide?.imagePlan?.focalPoint || 'center',
    });
  }

  drawBulletList(slideObj, slide.bullets, plan?.boxes?.body, theme, {
    fontSize: theme.scale.body,
    maxItems: 6,
  });

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
