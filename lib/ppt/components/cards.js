// lib/ppt/components/cards.js

import { getIconDataUri } from '../../assets/icons/icons';
import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawCard,
  normalizeBulletTextList,
  safeString,
  toArray,
} from './shared';

export function renderCardsSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme);

  const cards = toArray(plan?.boxes?.cards);
  const bulletTexts = normalizeBulletTextList(slide.bullets);
  const iconCycle = ['briefcase', 'layout-grid', 'chart-bar', 'users', 'target', 'checkcircle'];

  cards.forEach((card, idx) => {
    drawCard(slideObj, card, theme, {
      cardColor: theme.colors.surface,
      borderColor: theme.colors.cardStroke,
    });

    const iconName = toArray(slide.icons)[idx]?.name
      || toArray(slide.icons)[0]?.name
      || iconCycle[idx % iconCycle.length];
    const iconData = getIconDataUri(iconName, theme.colors.accent);

    slideObj.addShape('roundRect', {
      x: card.x + 0.14,
      y: card.y + 0.12,
      w: 0.34,
      h: 0.34,
      radius: theme.radius.badge,
      fill: { color: theme.colors.accentSoft },
      line: { color: theme.colors.accentSoft, transparency: 100 },
    });

    slideObj.addImage({
      data: iconData,
      x: card.x + 0.19,
      y: card.y + 0.17,
      w: 0.24,
      h: 0.24,
    });

    slideObj.addText(`${idx + 1}`, {
      x: card.x + card.w - 0.42,
      y: card.y + 0.15,
      w: 0.26,
      h: 0.2,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.caption,
      bold: true,
      color: theme.colors.muted,
      align: 'right',
      valign: 'mid',
    });

    const bodyText = safeString(card.text || bulletTexts[idx] || 'Unknown');
    slideObj.addText(bodyText, {
      x: card.x + 0.14,
      y: card.y + 0.54,
      w: card.w - 0.28,
      h: card.h - 0.66,
      fontFace: theme.fonts.body,
      fontSize: theme.scale.body,
      color: theme.colors.text,
      fit: 'shrink',
      valign: 'top',
      breakLine: true,
    });
  });

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
