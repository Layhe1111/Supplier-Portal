// lib/ppt/fixedPrompt.js
// -----------------------------------------------------------------------------
// Fixed prompt used by the Gamma pipeline.
// This keeps behavior stable and removes UI-time prompt input.
// -----------------------------------------------------------------------------

export const FIXED_GAMMA_PROMPT = [
  'Generate an English business presentation using only facts from the provided JSON.',
  'Mandatory structure: include exactly one Cover slide and one Agenda slide at the beginning.',
  'For content sections, you may add extra continuation slides when a section has dense source data.',
  'Image rules:',
  '1) Only cover page can use one AI-generated white abstract background.',
  '2) All non-cover images must come only from image URLs in the source JSON.',
  '3) Prefer using images in project-related slides or where they clearly support the message.',
  '4) If a company logo is provided, place it at the top-right of the cover.',
  '5) Team/personnel images are optional and should be used only when layout fit is good.',
  'Writing style rules:',
  '1) Keep content data-backed and non-fabricated.',
  '2) Rewrite into presentation-ready narrative, not raw JSON key-value listing.',
  '3) Connect data points into coherent business statements with concise, professional tone.',
  '4) If a fact is missing or negative/unfavorable, skip that point instead of guessing.',
  '5) Cover must use the exact field "Company English Name / 公司英文名" as company name.',
  '6) Keep each content page concise to avoid overlapping text.',
].join(' ');
