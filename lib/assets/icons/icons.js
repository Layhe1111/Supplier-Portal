// lib/assets/icons/icons.js
// -----------------------------------------------------------------------------
// Local icon catalog (SVG data URIs).
// No runtime network dependency, stable in serverless environments.
// -----------------------------------------------------------------------------

function iconTemplate(paths, color = '#2563EB') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const BASE_PATHS = {
  building:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8.2 13.8-1.4 6.2L12 17l5.2 3-1.4-6.2"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.3 8.4-7 10-3.7-1.6-7-5-7-10V6l7-3z"/>',
  'shield-check':
    '<path d="M12 3l7 3v5c0 5-3.3 8.4-7 10-3.7-1.6-7-5-7-10V6l7-3z"/><path d="m9 12 2 2 4-4"/>',
  'chart-bar':
    '<path d="M4 20h16"/><rect x="6" y="10" width="3" height="8"/><rect x="11" y="6" width="3" height="12"/><rect x="16" y="13" width="3" height="5"/>',
  'chart-line': '<path d="M4 19h16"/><path d="m5 15 4-4 3 2 6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.8 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.3-1.3a2 2 0 0 1 2.1-.5c.8.4 1.7.7 2.6.8A2 2 0 0 1 22 16.9z"/>',
  'map-pin':
    '<path d="M12 22s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11z"/><circle cx="12" cy="11" r="2.5"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.2a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.2a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.2a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/>',
  handshake:
    '<path d="M11 6 8 9a2 2 0 0 0 0 3l3 3"/><path d="M13 18 8 13"/><path d="m14 7 3 3a2 2 0 0 1 0 3l-3 3"/><path d="M3 9l3-3 3 3-3 3-3-3zM15 15l3-3 3 3-3 3-3-3z"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><rect x="5" y="5" width="14" height="16" rx="2"/>',
  'clipboard-check':
    '<rect x="8" y="3" width="8" height="4" rx="1"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="m9 14 2 2 4-4"/>',
  stethoscope:
    '<path d="M7 3v5a5 5 0 0 0 10 0V3"/><path d="M17 13a4 4 0 1 1-8 0"/><circle cx="19.5" cy="10.5" r="2.5"/><path d="M17 11h1"/>',
  hospital: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7v6M9 10h6M8 21v-4h8v4"/>',
  pill: '<path d="M8 3a5 5 0 0 0 0 10l8 8a5 5 0 1 0 7-7l-8-8A5 5 0 0 0 8 3z"/><path d="m9 14 5-5"/>',
  activity: '<polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/>',
  'file-text':
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h3"/>',
  'bar-chart-3': '<path d="M3 3v18h18"/><path d="M7 15v3M12 11v7M17 7v11"/>',
  presentation: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
  'layout-grid':
    '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  'user-check': '<circle cx="9" cy="7" r="4"/><path d="M17 11l2 2 4-4"/><path d="M2 21a7 7 0 0 1 14 0"/>',
  network:
    '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 12h10M12 7v10"/>',
  sparkles:
    '<path d="m12 3 1.5 3 3 1.5-3 1.5L12 12l-1.5-3L7.5 7.5l3-1.5L12 3z"/><path d="m5 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/><path d="m19 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>',
  timeline: '<path d="M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z"/><path d="M9 7h6M12 9v6M9 17h6"/>',
  flag: '<path d="M5 3v18"/><path d="M5 4h11l-2 3 2 3H5z"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  'alert-triangle': '<path d="M12 3 2 21h20L12 3z"/><path d="M12 9v4M12 17h.01"/>',
  star:
    '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2z"/><path d="M4 5v14a2 2 0 0 0 2 2"/>',
  wallet: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M16 12h3"/>',
  truck: '<rect x="1" y="8" width="12" height="8" rx="1"/><path d="M13 10h4l2 2v4h-6z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  wrench: '<path d="m14 7 3-3 3 3-3 3z"/><path d="M4 20l8-8"/>',
  leaf: '<path d="M5 21c8 0 14-6 14-14-8 0-14 6-14 14z"/><path d="M5 21c2-3 4-5 7-7"/>',
  'cpu-chip': '<rect x="7" y="7" width="10" height="10" rx="1.2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
  microscope: '<path d="M8 4h5M10 4v7"/><path d="M10 11 6 15"/><path d="M6 15h8a4 4 0 1 1 0 8H5"/><path d="M3 23h16"/>',
  checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-5"/>',
};

const ALIASES = {
  company: 'building',
  office: 'building',
  architecture: 'building',
  interior: 'layout-grid',
  design: 'layout-grid',
  services: 'briefcase',
  service: 'briefcase',
  capability: 'chart-bar',
  capabilities: 'chart-bar',
  analytics: 'bar-chart-3',
  growth: 'chart-line',
  performance: 'chart-line',
  team: 'users',
  leadership: 'user-check',
  people: 'users',
  clients: 'handshake',
  customer: 'handshake',
  compliance: 'shield-check',
  safety: 'shield',
  quality: 'checkcircle',
  governance: 'clipboard-check',
  audit: 'clipboard-check',
  legal: 'shield',
  insurance: 'shield',
  procurement: 'wallet',
  operations: 'settings',
  engineering: 'wrench',
  construction: 'truck',
  sustainability: 'leaf',
  energy: 'leaf',
  region: 'globe',
  location: 'map-pin',
  contact: 'mail',
  email: 'mail',
  phonecall: 'phone',
  website: 'globe',
  projects: 'presentation',
  portfolio: 'presentation',
  awards: 'award',
  recognition: 'award',
  timelinephase: 'timeline',
  roadmap: 'timeline',
  schedule: 'calendar',
  meeting: 'calendar',
  note: 'file-text',
  report: 'file-text',
  summary: 'book',
  risk: 'alert-triangle',
  warning: 'alert-triangle',
  success: 'check',
  target: 'target',
  innovation: 'sparkles',
  network: 'network',
  healthcare: 'stethoscope',
  hospital: 'hospital',
  medicine: 'pill',
  diagnostics: 'activity',
  laboratory: 'microscope',
  finance: 'wallet',
  revenue: 'chart-bar',
  profitability: 'chart-line',
  strategy: 'flag',
  milestone: 'timeline',
};

const PATHS = { ...BASE_PATHS };
Object.entries(ALIASES).forEach(([alias, base]) => {
  if (BASE_PATHS[base]) {
    PATHS[alias] = BASE_PATHS[base];
  }
});

export function getIconNames() {
  return Object.keys(PATHS);
}

export function getIconDataUri(name, color = '#2563EB') {
  const key = Object.prototype.hasOwnProperty.call(PATHS, name) ? name : 'layout-grid';
  const svg = iconTemplate(PATHS[key], color);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
