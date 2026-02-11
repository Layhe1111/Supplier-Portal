// lib/ppt/components/agenda.js

import { getIconDataUri } from '../../assets/icons/icons';
import {
  addSpeakerNotes,
  drawBaseBackground,
  drawTitleAndKeyMessage,
  drawCard,
  safeString,
  toArray,
} from './shared';

export function renderAgendaSlide(slideObj, plannedSlide, renderCtx) {
  const { theme, showSourceInNotes } = renderCtx;
  const { slide, plan } = plannedSlide;

  drawBaseBackground(slideObj, theme);
  drawTitleAndKeyMessage(slideObj, plan, slide, theme, {
    titleSize: Math.max(theme.scale.agendaTitle, 40),
    keySize: theme.scale.keyMessage,
  });

  const items = toArray(plan?.boxes?.agendaItems);
  const iconCycle = ['layout-grid', 'presentation', 'target', 'briefcase', 'timeline', 'shield-check'];
  items.forEach((item, idx) => {
    drawCard(slideObj, item.card, theme, {
      cardColor: theme.colors.surface,
      borderColor: theme.colors.cardStroke,
    });

    slideObj.addShape('roundRect', {
      x: item.badge.x,
      y: item.badge.y,
      w: item.badge.w,
      h: item.badge.h,
      radius: theme.radius.badge,
      fill: { color: theme.colors.accent },
      line: { color: theme.colors.accent, transparency: 100 },
    });

    slideObj.addText(String(item.index), {
      x: item.badge.x,
      y: item.badge.y,
      w: item.badge.w,
      h: item.badge.h,
      fontFace: theme.fonts.body,
      fontSize: Math.max(theme.scale.bodySmall, 11),
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'mid',
      fit: 'shrink',
    });

    slideObj.addText(safeString(item.text), {
      x: item.textBox.x,
      y: item.textBox.y,
      w: item.textBox.w,
      h: item.textBox.h,
      fontFace: theme.fonts.body,
      fontSize: Math.max(theme.scale.agendaItem, 20),
      color: theme.colors.text,
      valign: 'mid',
      fit: 'shrink',
      breakLine: true,
    });

    if (item.iconBox) {
      const iconName = toArray(slide.icons)[idx]?.name
        || toArray(slide.icons)[0]?.name
        || iconCycle[idx % iconCycle.length];
      const iconData = getIconDataUri(iconName, theme.colors.accent);
      slideObj.addImage({
        data: iconData,
        x: item.iconBox.x,
        y: item.iconBox.y,
        w: item.iconBox.w,
        h: item.iconBox.h,
      });
    }
  });

  addSpeakerNotes(slideObj, slide, showSourceInNotes);
}
