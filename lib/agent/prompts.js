// lib/agent/prompts.js
// -----------------------------------------------------------------------------
// Prompt templates for high-quality PPT agent.
// All templates enforce strict JSON output and source-traceability rules.
// -----------------------------------------------------------------------------

function asJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || '');
  }
}

function commonRules() {
  return [
    'Hard rules:',
    '1) Output must be valid JSON object only. No markdown.',
    '2) Never invent facts, numbers, institutions, awards, dates, or clients.',
    '3) If data is missing, write "Not provided" or omit safely.',
    '4) Every conclusion, bullet, and numeric emphasis must include sourceKeys.',
    '5) insight bullets must be prefixed with "Suggestion:" or "Potential implication:".',
  ].join('\n');
}

const SLIDE_SCHEMA = '{"type":"title|section|summary|agenda|cards|profile|split-image|bigNumber|timeline|quote|text","title":"string","keyMessage":"string","keyMessageSourceKeys":["string"],"density":"low|medium|high","tone":"clinical|business|pitch|report","layoutHint":"agenda|hero-cover|split-image|cards|profile|big-number|timeline|text|summary|quote|image-left|image-right|image-top|full-bleed-image","bullets":[{"text":"string","sourceKeys":["string"],"kind":"fact|insight"}],"emphasis":{"numbers":[{"value":"string","label":"string","sourceKeys":["string"]}],"phrases":[{"text":"string","sourceKeys":["string"]}]},"imagePlan":{"mode":"none|bg|inline|both","query":"string","style":"clean|modern|medical|corporate","placement":"full-bleed|left|right|top","overlay":"dark-40|dark-55|light-20|null","focalPoint":"center|top|left|right"},"icons":[{"name":"string","placement":"card|title|bullet"}],"constraints":{"maxBulletsPerSlide":6,"maxCharsPerBullet":40}}';

export function buildPlannerPrompt({ userPrompt, styleHint, factIndex, fixedOutline }) {
  const system = [
    'You are Planner for a high-accuracy PPT agent.',
    'You build section goals from source data only.',
    commonRules(),
  ].join('\n');

  const user = [
    'Task: generate section plan by fixed outline.',
    'Output schema:',
    '{"sections":[{"title":"string","goal":"string","keyMessage":"string","requiredFields":["string"],"missingFields":["string"]}],"globalMissingFields":["string"]}',
    '',
    'Style hint:',
    styleHint || 'corporate',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Fixed outline:',
    asJson(fixedOutline || []),
    '',
    'Fact index (path->value):',
    asJson(factIndex || {}),
  ].join('\n');

  return { system, user };
}

export function buildStoryboardPrompt({ userPrompt, styleHint, plannerOutput, sections }) {
  const system = [
    'You are Storyboard planner for PPT pages.',
    'You decide page sequence and initial content objects.',
    commonRules(),
  ].join('\n');

  const user = [
    'Task: generate initial slideSpec slides in section order.',
    'Each slide must follow schema:',
    SLIDE_SCHEMA,
    'Output schema: {"slides":[slide]}',
    '',
    'Write concise presentation language, not report language.',
    '',
    'Style hint:',
    styleHint || 'corporate',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Planner output:',
    asJson(plannerOutput || {}),
    '',
    'Section draft:',
    asJson(sections || []),
  ].join('\n');

  return { system, user };
}

export function buildCopyPolishPrompt({ slideSpec, inputJson, userPrompt, style }) {
  const system = [
    'You are CopyPolish engine for enterprise PPT.',
    'Rewrite wording to be presentation-ready, short, and parallel.',
    commonRules(),
  ].join('\n');

  const user = [
    'Task: polish slide copy while keeping structure and sourceKeys.',
    'Do not change slide count.',
    'Do not introduce unsupported facts.',
    'Ban phrases: "According to", "Based on data", "Highlight".',
    'Constraints:',
    '- title <= 14 English words (or <=18 Chinese chars)',
    '- keyMessage <= 18 English words (or <=24 Chinese chars)',
    '- bullets 3-5 ideal, <=6 max',
    '- each bullet <=16 English words (or <=24 Chinese chars)',
    '- insight bullets must start with Suggestion: or Potential implication:',
    '',
    'Style:',
    style || 'clinical-professional',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Input JSON:',
    asJson(inputJson || {}),
    '',
    'Current slideSpec:',
    asJson(slideSpec || {}),
    '',
    'Output schema: {"slides":[slide]} where slide follows:',
    SLIDE_SCHEMA,
  ].join('\n');

  return { system, user };
}

export function buildCriticRevisePatchPrompt({ userPrompt, styleHint, slides, issues, factIndex }) {
  const system = [
    'You are Critic revise engine.',
    'Patch only invalid slides and keep valid slides unchanged.',
    commonRules(),
  ].join('\n');

  const user = [
    'Task: return minimal JSON patch set for failed slides only.',
    'Output schema: {"patches":[{"index":0,"slide":slide}]}',
    'slide schema:',
    SLIDE_SCHEMA,
    '',
    'Style hint:',
    styleHint || 'corporate',
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Current slides:',
    asJson(slides || []),
    '',
    'Validation issues:',
    asJson(issues || []),
    '',
    'Fact index:',
    asJson(factIndex || {}),
  ].join('\n');

  return { system, user };
}

export function buildFactRepairPrompt({ userPrompt, slides, issues, factIndex }) {
  const system = [
    'You are Fact repair engine for strict mode.',
    'Fix only source-traceability and factual issues.',
    commonRules(),
  ].join('\n');

  const user = [
    'Task: repair only factual/source issues.',
    'When unsupported content appears, delete it instead of inventing support.',
    'Keep slide count unchanged.',
    'Output schema: {"patches":[{"index":0,"slide":slide}]}',
    'slide schema:',
    SLIDE_SCHEMA,
    '',
    'User prompt:',
    userPrompt || '',
    '',
    'Slides:',
    asJson(slides || []),
    '',
    'Fact-related issues:',
    asJson(issues || []),
    '',
    'Fact index:',
    asJson(factIndex || {}),
  ].join('\n');

  return { system, user };
}

// Backward-compatible aliases (existing imports in some branches)
export const buildDesignerPrompt = buildCopyPolishPrompt;
export const buildCriticPrompt = buildCriticRevisePatchPrompt;
