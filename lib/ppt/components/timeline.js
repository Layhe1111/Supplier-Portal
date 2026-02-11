// lib/ppt/components/timeline.js

import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  normalizeBulletTextList,
  safeString,
  toArray,
} from './shared';

export function renderTimelineSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  const steps = toArray(plan?.boxes?.timelineSteps);
  if (steps.length > 0) {
    const lineX = steps[0].dot.x + steps[0].dot.w / 2;
    const top = steps[0].dot.y;
    const bottom = steps[steps.length - 1].dot.y + steps[steps.length - 1].dot.h;

    slideObj.addShape('line', {
      x: lineX,
      y: top,
      w: 0,
      h: Math.max(0.2, bottom - top),
      line: {
        color: theme.colors.accent,
        pt: 1.2,
      },
    });
  }

  const bulletTexts = normalizeBulletTextList(slide.bullets);
  steps.forEach((step, idx) => {
    slideObj.addShape('ellipse', {
      x: step.dot.x,
      y: step.dot.y,
      w: step.dot.w,
      h: step.dot.h,
      fill: { color: theme.colors.accent },
      line: { color: theme.colors.accent, transparency: 100 },
    });

    slideObj.addText(`${idx + 1}`, {
      x: step.badge.x,
      y: step.badge.y,
      w: step.badge.w,
      h: step.badge.h,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.caption,
      bold: true,
      color: theme.colors.muted,
      align: 'center',
      valign: 'mid',
    });

    slideObj.addText(safeString(step.text || bulletTexts[idx] || ''), {
      x: step.textBox.x,
      y: step.textBox.y,
      w: step.textBox.w,
      h: step.textBox.h,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.body,
      color: theme.colors.text,
      fit: 'shrink',
      valign: 'mid',
      breakLine: true,
    });
  });

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
