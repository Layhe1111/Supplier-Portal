// lib/ppt/promptTemplates.js
// -----------------------------------------------------------------------------
// Centralized prompt templates for the multi-step PPT agent workflow.
// Keeping prompts in one file makes iteration easy and prevents logic/prompt drift.
// -----------------------------------------------------------------------------

function asJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || '');
  }
}

export function buildStoryboardPrompt({ userPrompt, styleHint, draftSections }) {
  const system = [
    'You are the Storyboard Agent for executive-grade business presentations.',
    'Goal: transform section facts into a clean slide storyboard that is factual and presentation-friendly.',
    'You must never invent facts, names, numbers, certifications, clients, or timelines.',
    'Write in concise professional English.',
  ].join('\n');

  const user = [
    'Task: generate one content slide per section in the same order.',
    'Output strictly JSON only, no markdown, no explanation.',
    '',
    'Hard rules:',
    '1) Keep exact section titles and order from input.',
    '2) Use only source facts from each section.',
    '3) Each slide must include one single keyMessage (one sentence).',
    '4) Prefer bullet lines that start with action verbs and parallel structure.',
    '5) Choose slide type from: bullets | twoColumn | bigNumber | summary | section | title.',
    '6) Preserve provided image URLs only, never create new image links.',
    '7) If a section has no image, keep images as an empty array.',
    '',
    'Style preference:',
    styleHint || 'consulting minimal',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Input sections JSON:',
    asJson(draftSections),
    '',
    'Return schema:',
    '{"slides":[{"type":"bullets|twoColumn|bigNumber|summary|section|title","title":"string","keyMessage":"string","bullets?": ["string"],"left?": ["string"],"right?": ["string"],"number?": "string","caption?": "string","images": ["https://..."],"speakerNotes?": "string"}]}'
  ].join('\n');

  return { system, user };
}

export function buildPolishLayoutIntentPrompt({ userPrompt, styleHint, storyboardSlides }) {
  const system = [
    'You are the Polish+LayoutIntent Agent for a high-end PPT generation system.',
    'Goal: rewrite content into PPT-ready concise language and add layout intent metadata.',
    'Do not invent facts. Keep all entities and numbers source-backed.',
  ].join('\n');

  const user = [
    'Task: polish every slide and add layout-intent fields.',
    'Output strictly JSON only.',
    '',
    'Language and writing rules:',
    '1) Professional consulting tone, concise and punchy.',
    '2) keyMessage: one sentence only, outcome-oriented.',
    '3) bullets: concise, less verbose, avoid JSON/key-value style wording.',
    '4) Keep factual consistency with input; no new facts.',
    '',
    'Schema extension rules (must apply):',
    '1) Add density: low | medium | high.',
    '2) Add emphasis: { phrases: string[], numbers: string[] }.',
    '3) Add visual: { layoutHint: "text|image-left|image-right|image-top|full-bleed-image|cards|timeline|quote", imageQuery?: string, imageUrl?: string }.',
    '4) Add tone: consulting | product | report | education.',
    '5) Add constraints: { maxBulletsPerSlide?: number, maxCharsPerBullet?: number }.',
    '6) Keep compatibility fields from input slide.',
    '7) Keep images only from input; never fabricate image URLs.',
    '',
    'Style preference:',
    styleHint || 'consulting minimal',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Input storyboard slides JSON:',
    asJson(storyboardSlides),
    '',
    'Return schema:',
    '{"slides":[{"type":"bullets|twoColumn|bigNumber|summary|section|title","title":"string","keyMessage":"string","bullets?": ["string"],"left?": ["string"],"right?": ["string"],"number?": "string","caption?": "string","images?": ["https://..."],"speakerNotes?": "string","density":"low|medium|high","emphasis":{"phrases":["..."],"numbers":["..."]},"visual":{"layoutHint":"text|image-left|image-right|image-top|full-bleed-image|cards|timeline|quote","imageQuery?":"string","imageUrl?":"https://..."},"tone":"consulting|product|report|education","constraints":{"maxBulletsPerSlide?":6,"maxCharsPerBullet?":120}}]}'
  ].join('\n');

  return { system, user };
}

export function buildCriticPrompt({ userPrompt, styleHint, currentSlides, issues }) {
  const system = [
    'You are the Critic Agent for PPT quality control.',
    'You receive slide JSON and issue list. You must return only minimal patches for invalid slides.',
    'Never change valid slides.',
    'Never invent facts.',
  ].join('\n');

  const user = [
    'Task: fix only problematic slides by index.',
    'Output JSON only.',
    '',
    'Critic requirements to satisfy while patching:',
    '1) title length must be PPT-friendly (short).',
    '2) bullet length should be concise and readable.',
    '3) each slide has exactly one keyMessage sentence.',
    '4) bullets should prefer verb-leading and parallel structure.',
    '5) choose better layout hint when overloaded (cards/two-column/image-top etc.).',
    '6) keep all facts and numbers source-backed; no hallucination.',
    '',
    'Style preference:',
    styleHint || 'consulting minimal',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Issues JSON:',
    asJson(issues),
    '',
    'Current slides JSON:',
    asJson(currentSlides),
    '',
    'Return schema:',
    '{"patches":[{"index":0,"slide":{"type":"...","title":"...","keyMessage":"...","bullets":["..."],"left":["..."],"right":["..."],"number":"...","caption":"...","images":["https://..."],"density":"low|medium|high","emphasis":{"phrases":["..."],"numbers":["..."]},"visual":{"layoutHint":"text|image-left|image-right|image-top|full-bleed-image|cards|timeline|quote","imageQuery":"...","imageUrl":"https://..."},"tone":"consulting|product|report|education","constraints":{"maxBulletsPerSlide":6,"maxCharsPerBullet":120}}}]}'
  ].join('\n');

  return { system, user };
}
