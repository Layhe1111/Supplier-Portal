// lib/ppt/gammaClient.js
// -----------------------------------------------------------------------------
// Gamma Generate API client wrapper.
// -----------------------------------------------------------------------------

import { maskApiKey, shallowGammaResponseSnapshot } from './gammaDebug';
import dns from 'node:dns';
import { Agent, EnvHttpProxyAgent, ProxyAgent } from 'undici';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(obj, path) {
  const keys = String(path || '').split('.');
  let cursor = obj;
  for (const key of keys) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const text = safeString(value);
    if (text) return text;
  }
  return '';
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAbortController(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timer),
  };
}

let dnsConfigured = false;
let dispatcherCache = null;

function ensureDnsPreference() {
  if (dnsConfigured) return;
  dnsConfigured = true;
  const preferIpv4 = String(process.env.GAMMA_FORCE_IPV4 || 'true').toLowerCase() !== 'false';
  if (!preferIpv4) return;
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // ignore platform/runtime mismatch
  }
}

function getGammaProxyUrl() {
  return safeString(
    process.env.GAMMA_PROXY_URL ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.ALL_PROXY ||
      ''
  );
}

function getRequestDispatcher() {
  if (dispatcherCache) return dispatcherCache;

  const proxyUrl = getGammaProxyUrl();
  const connectTimeout = Math.max(3_000, Number(process.env.GAMMA_CONNECT_TIMEOUT_MS) || 10_000);
  const preferEnvProxy = String(process.env.GAMMA_USE_ENV_PROXY || 'false').toLowerCase() === 'true';

  if (proxyUrl) {
    dispatcherCache = new ProxyAgent({
      uri: proxyUrl,
      connect: {
        timeout: connectTimeout,
      },
    });
    return dispatcherCache;
  }

  if (preferEnvProxy) {
    dispatcherCache = new EnvHttpProxyAgent();
    return dispatcherCache;
  }

  dispatcherCache = new Agent({
    connect: {
      timeout: connectTimeout,
    },
  });
  return dispatcherCache;
}

function normalizeGammaBaseUrl(baseUrl) {
  const raw = safeString(baseUrl);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    let path = u.pathname || '';
    if (path === '/') path = '';
    if (!path) {
      u.pathname = '/v1.0';
    }
    return String(u).replace(/\/$/, '');
  } catch {
    return raw.replace(/\/$/, '');
  }
}

function parseBaseUrls(rawPrimary, rawList) {
  const candidates = [rawPrimary];
  const extra = safeString(rawList)
    .split(',')
    .map((x) => safeString(x))
    .filter(Boolean);
  candidates.push(...extra);

  const normalized = candidates
    .map((x) => normalizeGammaBaseUrl(x))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function describeNetworkError(error) {
  if (!error) return 'Unknown network error';
  const baseMessage = error instanceof Error ? safeString(error.message) : safeString(String(error));
  const cause = error && typeof error === 'object' ? error.cause : null;
  const parts = [];
  if (cause && typeof cause === 'object') {
    if (cause.code) parts.push(`code=${cause.code}`);
    if (cause.errno) parts.push(`errno=${cause.errno}`);
    if (cause.hostname) parts.push(`host=${cause.hostname}`);
    if (cause.address) parts.push(`addr=${cause.address}`);
    if (cause.port) parts.push(`port=${cause.port}`);
    if (cause.message && safeString(cause.message) && safeString(cause.message) !== baseMessage) {
      parts.push(`cause=${safeString(cause.message)}`);
    }
  }
  if (parts.length === 0) return baseMessage || 'Unknown network error';
  return `${baseMessage} (${parts.join(', ')})`;
}

function shouldUseCurlForStatus() {
  const explicit = safeString(process.env.GAMMA_STATUS_USE_CURL || '');
  if (explicit) return explicit.toLowerCase() === 'true';
  // Default heuristic:
  // if local proxy is configured, prefer curl polling because it is often
  // more stable in desktop proxy environments.
  return Boolean(getGammaProxyUrl());
}

export function getGammaConfig() {
  const baseUrl = safeString(process.env.GAMMA_BASE_URL || 'https://public-api.gamma.app/v1.0');
  const baseUrls = parseBaseUrls(baseUrl, process.env.GAMMA_BASE_URLS || '');
  const apiKey = safeString(process.env.GAMMA_API_KEY);
  const textMode = safeString(process.env.GAMMA_TEXT_MODE || 'preserve');
  const exportAs = safeString(process.env.GAMMA_EXPORT_AS || 'pptx');
  const themeId = safeString(process.env.GAMMA_THEME_ID || '');
  const folderIds = safeString(process.env.GAMMA_FOLDER_IDS || '')
    .split(',')
    .map((item) => safeString(item))
    .filter(Boolean);

  if (!apiKey) {
    throw new Error('Missing GAMMA_API_KEY');
  }

  return {
    baseUrl: baseUrls[0] || normalizeGammaBaseUrl(baseUrl),
    baseUrls: baseUrls.length > 0 ? baseUrls : ['https://public-api.gamma.app/v1.0'],
    apiKey,
    textMode: textMode || 'preserve',
    exportAs: exportAs || 'pptx',
    themeId,
    folderIds,
  };
}

async function requestGamma({
  method,
  path,
  body,
  timeoutMs = 25_000,
  retries = 1,
  retryDelayMs = 450,
}) {
  ensureDnsPreference();
  const { baseUrls, apiKey } = getGammaConfig();
  const payload = body ? JSON.stringify(body) : undefined;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    for (const baseUrl of baseUrls) {
      const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
      const { controller, clear } = createAbortController(timeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            'X-API-KEY': apiKey,
          },
          body: payload,
          signal: controller.signal,
          cache: 'no-store',
          dispatcher: getRequestDispatcher(),
        });

        const text = await response.text();
        const json = parseJsonSafe(text);

        if (!response.ok) {
          const detail = firstNonEmptyString(
            json?.error?.message,
            json?.error,
            json?.message,
            json?.msg,
            text
          );
          throw new Error(`Gamma API ${method} ${path} failed (${response.status}): ${detail}`);
        }

        return json ?? {};
      } catch (error) {
        if (error && typeof error === 'object' && error.name === 'AbortError') {
          lastError = new Error(`Gamma API ${method} ${path} timed out after ${timeoutMs}ms (base=${baseUrl})`);
        } else {
          const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown Gamma error');
          if (/fetch failed/i.test(rawMessage)) {
            lastError = new Error(
              `Gamma API ${method} ${path} network error: ${describeNetworkError(error)} (base=${baseUrl})`
            );
          } else {
            lastError = error instanceof Error ? error : new Error(rawMessage);
          }
        }
      } finally {
        clear();
      }
    }
    if (attempt >= retries) break;
    await wait(retryDelayMs * (attempt + 1));
  }

  throw lastError || new Error('Gamma request failed');
}

async function requestGammaStatusViaCurl({ generationId, timeoutMs = 18_000 }) {
  const { baseUrl, apiKey } = getGammaConfig();
  const proxyUrl = getGammaProxyUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/generations/${encodeURIComponent(safeString(generationId))}`;

  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    String(Math.max(5, Math.ceil(timeoutMs / 1000))),
    '--connect-timeout',
    String(Math.max(3, Math.ceil(Math.min(timeoutMs, 12_000) / 1000))),
    '--write-out',
    '\n%{http_code}',
    '-H',
    'accept: application/json',
    '-H',
    `X-API-KEY: ${apiKey}`,
    url,
  ];

  if (proxyUrl) {
    args.unshift(proxyUrl);
    args.unshift('--proxy');
  }

  const { stdout, stderr } = await execFileAsync('curl', args, {
    timeout: timeoutMs + 2_000,
    maxBuffer: 4 * 1024 * 1024,
  });

  const marker = '\n';
  const splitIndex = stdout.lastIndexOf(marker);
  const body = splitIndex >= 0 ? stdout.slice(0, splitIndex) : stdout;
  const codeText = splitIndex >= 0 ? stdout.slice(splitIndex + marker.length).trim() : '';
  const statusCode = Number(codeText);

  if (!Number.isFinite(statusCode) || statusCode <= 0) {
    throw new Error(
      `Gamma curl status request returned invalid status code (${codeText || 'empty'}). stderr=${safeString(stderr)}`
    );
  }

  const json = parseJsonSafe(body);
  if (statusCode < 200 || statusCode >= 300) {
    const detail = firstNonEmptyString(
      json?.error?.message,
      json?.error,
      json?.message,
      json?.msg,
      body,
      safeString(stderr)
    );
    throw new Error(`Gamma API GET /generations/${generationId} failed (${statusCode}): ${detail}`);
  }

  return json ?? {};
}

export async function createGeneration(payload, options = {}) {
  const timeoutMs = Math.max(8_000, Number(options.timeoutMs) || 25_000);
  const retries = Math.max(0, Math.min(2, Number(options.retries) || 1));
  return requestGamma({
    method: 'POST',
    path: '/generations',
    body: payload,
    timeoutMs,
    retries,
  });
}

export async function getGeneration(generationId, options = {}) {
  const id = safeString(generationId);
  if (!id) throw new Error('Missing generationId');

  const timeoutMs = Math.max(8_000, Number(options.timeoutMs) || 18_000);
  const retries = Math.max(0, Math.min(2, Number(options.retries) || 1));
  const useCurl = shouldUseCurlForStatus();

  if (useCurl) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await requestGammaStatusViaCurl({ generationId: id, timeoutMs });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'Gamma curl status failed');
        lastError = new Error(`Gamma status polling failed via curl: ${message}`);
      }
      if (attempt >= retries) break;
      await wait(350 * (attempt + 1));
    }
    throw lastError || new Error('Gamma status polling failed via curl');
  }

  return requestGamma({
    method: 'GET',
    path: `/generations/${encodeURIComponent(id)}`,
    timeoutMs,
    retries,
  });
}

export function extractGenerationId(raw) {
  return firstNonEmptyString(
    raw?.id,
    raw?.generationId,
    getPath(raw, 'data.id'),
    getPath(raw, 'data.generationId'),
    getPath(raw, 'result.id'),
    getPath(raw, 'result.generationId')
  );
}

export function normalizeStatus(raw) {
  const source = firstNonEmptyString(
    raw?.status,
    raw?.state,
    getPath(raw, 'data.status'),
    getPath(raw, 'data.state'),
    getPath(raw, 'result.status'),
    getPath(raw, 'result.state')
  ).toLowerCase();

  if (!source) return 'pending';
  if (['completed', 'done', 'success', 'succeeded', 'ready'].includes(source)) return 'completed';
  if (['failed', 'error', 'cancelled', 'canceled', 'timeout'].includes(source)) return 'failed';
  if (['processing', 'running', 'in_progress', 'rendering', 'exporting', 'generating'].includes(source)) {
    return 'running';
  }
  if (['pending', 'queued', 'created', 'waiting'].includes(source)) return 'pending';
  return 'running';
}

export function extractPptxUrl(raw) {
  const candidates = [
    raw?.pptxUrl,
    raw?.downloadUrl,
    raw?.exportedFileUrl,
    raw?.fileUrl,
    raw?.exportUrl,
    getPath(raw, 'data.pptxUrl'),
    getPath(raw, 'data.downloadUrl'),
    getPath(raw, 'data.exportedFileUrl'),
    getPath(raw, 'data.fileUrl'),
    getPath(raw, 'data.exportUrl'),
    getPath(raw, 'exports.pptx'),
    getPath(raw, 'exports.pptx.url'),
    getPath(raw, 'data.exports.pptx'),
    getPath(raw, 'data.exports.pptx.url'),
    getPath(raw, 'result.exports.pptx.url'),
    getPath(raw, 'files.pptx.url'),
    getPath(raw, 'data.files.pptx.url'),
    getPath(raw, 'exportedFiles.pptx'),
    getPath(raw, 'data.exportedFiles.pptx'),
  ];

  return firstNonEmptyString(...candidates);
}

export function extractGammaUrl(raw) {
  return firstNonEmptyString(
    raw?.url,
    raw?.gammaUrl,
    getPath(raw, 'data.url'),
    getPath(raw, 'data.gammaUrl'),
    getPath(raw, 'result.url')
  );
}

export function extractProviderError(raw) {
  return firstNonEmptyString(
    raw?.error?.message,
    raw?.error,
    raw?.message,
    raw?.msg,
    getPath(raw, 'data.error'),
    getPath(raw, 'data.message')
  );
}

export function mapProviderProgress(providerStatus, currentProgress = 0, elapsedSeconds = 0) {
  const now = Math.max(0, Number(currentProgress) || 0);
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);

  if (providerStatus === 'pending') {
    // Queue stage can take time. Increase progress gradually to avoid "stuck at 35%" UX.
    // Starts at 35 and climbs towards 62 over ~2 minutes.
    const queued = 35 + Math.floor(elapsed / 8);
    return Math.max(now, Math.min(62, queued));
  }

  if (providerStatus === 'running') {
    // Rendering/exporting stage climbs from 65 to 92 smoothly.
    const rendering = 65 + Math.floor(elapsed / 6);
    return Math.max(now, Math.min(92, rendering));
  }

  if (providerStatus === 'completed') return Math.max(now, 90);
  if (providerStatus === 'failed') return 100;
  return Math.max(now, Math.min(62, 35 + Math.floor(elapsed / 10)));
}

export function getGammaClientDebug() {
  const { baseUrl, apiKey } = getGammaConfig();
  return {
    baseUrl,
    apiKeyMasked: maskApiKey(apiKey),
  };
}

export function snapshotGammaPayload(payload) {
  if (!isObject(payload)) return payload;
  return shallowGammaResponseSnapshot(payload);
}
