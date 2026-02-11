// lib/ppt/llmClient.js
// -----------------------------------------------------------------------------
// OpenAI-compatible client wrapper.
// This supports any provider exposing /chat/completions with OpenAI schema
// (OpenAI, Kimi-compatible gateway, MiniMax-compatible gateway, etc.).
// -----------------------------------------------------------------------------

function stripCodeFence(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export function getLlmConfig() {
  const baseURL = (
    process.env.LLM_BASE_URL ||
    process.env.DEEPSEEK_BASE_URL ||
    'https://api.deepseek.com/v1'
  ).trim();
  const apiKey = (process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
  const model = (
    process.env.LLM_MODEL ||
    process.env.DEEPSEEK_TRANSLATION_MODEL ||
    process.env.DEEPSEEK_MODEL ||
    'deepseek-chat'
  ).trim();

  if (!baseURL) throw new Error('Missing LLM_BASE_URL');
  if (!apiKey) throw new Error('Missing LLM_API_KEY (or DEEPSEEK_API_KEY)');
  if (!model) throw new Error('Missing LLM_MODEL');

  return { baseURL, apiKey, model };
}

export async function chatJson({ messages, temperature = 0.2, timeoutMs = 30_000 }) {
  const { baseURL, apiKey, model } = getLlmConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = payload?.error?.message || payload?.msg || `HTTP ${res.status}`;
      throw new Error(`LLM request failed: ${errorMsg}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('LLM response missing message content');
    }

    const parsed = JSON.parse(stripCodeFence(content));
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
