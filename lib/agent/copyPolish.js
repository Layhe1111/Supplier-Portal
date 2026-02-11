// lib/agent/copyPolish.js
// -----------------------------------------------------------------------------
// Copy polish step.
// Improves slide wording while preserving structure and source traceability.
// -----------------------------------------------------------------------------

import { chatJson } from '../ppt/llmClient';
import { buildCopyPolishPrompt } from './prompts';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

async function callCopyPolishOnce({ slideSpec, inputJson, userPrompt, style, temperature, timeoutMs }) {
  const { system, user } = buildCopyPolishPrompt({
    slideSpec,
    inputJson,
    userPrompt,
    style,
  });

  const result = await chatJson({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    timeoutMs,
  });

  return result;
}

export async function copyPolish({
  slideSpec,
  inputJson,
  userPrompt,
  style = 'clinical-professional',
  timeoutMs = 12_000,
}) {
  const fallbackSlides = toArray(slideSpec?.slides);

  try {
    const first = await callCopyPolishOnce({
      slideSpec,
      inputJson,
      userPrompt,
      style,
      temperature: 0.28,
      timeoutMs,
    });

    const slides = toArray(first?.slides);
    if (slides.length > 0) {
      return {
        ok: true,
        retried: false,
        slides,
      };
    }
  } catch {
    // Retry once with lower temperature and stricter instruction shape.
  }

  try {
    const second = await callCopyPolishOnce({
      slideSpec,
      inputJson,
      userPrompt,
      style: `${style} strict-json-retry`,
      temperature: 0.2,
      timeoutMs,
    });

    const slides = toArray(second?.slides);
    if (slides.length > 0) {
      return {
        ok: true,
        retried: true,
        slides,
      };
    }
  } catch (error) {
    return {
      ok: false,
      retried: true,
      slides: fallbackSlides,
      error: error instanceof Error ? error.message : String(error || 'copy polish failed'),
    };
  }

  return {
    ok: false,
    retried: true,
    slides: fallbackSlides,
    error: 'copy polish returned empty JSON slides',
  };
}
