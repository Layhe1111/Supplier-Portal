// lib/ppt/components/profile.js

import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawBulletList,
  drawCard,
} from './shared';

export function renderProfileSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, resolveImageForBox, getPlaceholderImage, showSourceInNotes } = renderCtx;
  const { slide, plan, images } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  if (plan?.boxes?.profileImage) {
    resolveImageForBox(slideObj, images[0] || null, plan.boxes.profileImage, {
      fallbackData: getPlaceholderImage('profile', theme),
      cover: true,
      roundness: theme.radius.image,
      overlay: null,
      focalPoint: 'center',
    });
  }

  if (plan?.boxes?.profileBody) {
    drawCard(slideObj, plan.boxes.profileBody, theme, {
      cardColor: theme.colors.surface,
      borderColor: theme.colors.cardStroke,
    });

    drawBulletList(slideObj, slide.bullets, {
      x: plan.boxes.profileBody.x + 0.16,
      y: plan.boxes.profileBody.y + 0.16,
      w: plan.boxes.profileBody.w - 0.32,
      h: plan.boxes.profileBody.h - 0.32,
    }, theme, {
      maxItems: 6,
      fontSize: theme.scale.body,
    });
  }

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
