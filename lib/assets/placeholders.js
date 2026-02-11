// lib/assets/placeholders.js
// -----------------------------------------------------------------------------
// Built-in placeholder/gradient assets (as data URI SVG).
// Used when no source image URL is available.
// -----------------------------------------------------------------------------

export function createGradientPlaceholderDataUri(options = {}) {
  const width = Number(options.width) || 1280;
  const height = Number(options.height) || 720;
  const c1 = options.color1 || '#E2E8F0';
  const c2 = options.color2 || '#CBD5E1';
  const c3 = options.color3 || '#DBEAFE';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="52%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M0 40h80M40 0v80" stroke="#FFFFFF" stroke-opacity="0.18"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#p)"/>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function createIconPlaceholderDataUri(options = {}) {
  const width = Number(options.width) || 1280;
  const height = Number(options.height) || 720;
  const bg = options.background || '#E2E8F0';
  const fg = options.foreground || '#475569';
  const label = String(options.label || 'Source image not provided').replace(/[<>]/g, '');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>
  <g fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.65">
    <rect x="${width * 0.34}" y="${height * 0.27}" width="${width * 0.32}" height="${height * 0.3}" rx="24"/>
    <path d="M${width * 0.37} ${height * 0.5}l${width * 0.09} -${height * 0.1} ${width * 0.08} ${height * 0.08} ${width * 0.1} -${height * 0.12} ${width * 0.08} ${height * 0.14}"/>
  </g>
  <text x="50%" y="76%" text-anchor="middle" fill="${fg}" opacity="0.9" style="font-family:Calibri,Arial,sans-serif;font-size:42px;">${label}</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
