import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { basename, join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';

const TOKEN_URL = 'https://auth.powerpointgeneratorapi.com/v1.0/token/create';
const GENERATE_URL = 'https://gen.powerpointgeneratorapi.com/v1.0/generator/create';
const TOKEN_TIMEOUT_MS = 20_000;
const GENERATE_TIMEOUT_MS = 600_000;

type ShapeText = { name: string; text: string };

const requireUser = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Invalid auth token' }, { status: 401 }) };
  }

  return { user: data.user };
};

const resolveTokenFromResponse = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidate =
      (typeof parsed.token === 'string' && parsed.token) ||
      (typeof parsed.access_token === 'string' && parsed.access_token) ||
      (typeof parsed.access_Token === 'string' && parsed.access_Token) ||
      (typeof parsed.jwt === 'string' && parsed.jwt) ||
      (parsed.result &&
      typeof parsed.result === 'object' &&
      typeof (parsed.result as Record<string, unknown>).access_Token === 'string'
        ? ((parsed.result as Record<string, unknown>).access_Token as string)
        : '') ||
      '';
    return candidate.trim();
  } catch {
    return trimmed;
  }
};

const resolveTemplateFilePath = () => {
  const configured = (process.env.PPTGEN_TEMPLATE_FILE || '').trim();
  if (configured && existsSync(configured)) return configured;

  const publicDir = join(process.cwd(), 'public');
  const fixed = join(publicDir, 'ppt-template.pptx');
  if (existsSync(fixed)) return fixed;

  try {
    const pptxFiles = readdirSync(publicDir)
      .filter((name) => /\.pptx$/i.test(name))
      .sort((a, b) => a.localeCompare(b));
    if (pptxFiles.length === 1) return join(publicDir, pptxFiles[0]);
  } catch {
    return '';
  }

  return '';
};

const getConfig = () => {
  const username = (
    process.env.PPTGEN_USERNAME ||
    process.env.POWERPOINTGEN_USERNAME ||
    ''
  ).trim();

  const password = (process.env.PPTGEN_PASSWORD || '').trim();

  const key = (
    process.env.PPTGEN_KEY ||
    process.env.PPTGEN_SECURITY_KEY ||
    process.env.PPTGEN_API_KEY ||
    process.env.POWERPOINTGEN_KEY ||
    ''
  ).trim();

  const templateFilePath = resolveTemplateFilePath();

  return { username, password, key, templateFilePath };
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const findFirstByKeyPattern = (value: unknown, patterns: RegExp[]): string => {
  if (!value || typeof value !== 'object') return '';
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (Array.isArray(node)) {
      node.forEach((item) => stack.push(item));
      continue;
    }

    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim() && patterns.some((p) => p.test(k))) {
        return v.trim();
      }
      if (v && typeof v === 'object') stack.push(v);
    }
  }

  return '';
};

const toSafeText = (value: string, fallback: string, max = 500) => {
  const base = (value || '').replace(/\s+/g, ' ').trim() || fallback;
  return base.length > max ? `${base.slice(0, max - 1)}…` : base;
};

const buildSlide = (slideIndex: number, shapes: ShapeText[]) => ({
  slide_index: slideIndex,
  shapes: shapes.filter((shape) => shape.text.trim().length > 0),
});

const buildPresentationPayload = (payload: unknown, templateFileName: string) => {
  const companyName = toSafeText(
    findFirstByKeyPattern(payload, [/company.*name/i, /公司/i]),
    'Supplier Profile',
    120
  );
  const supplierType = toSafeText(
    findFirstByKeyPattern(payload, [/supplier.*type/i, /供應商類型/i]),
    'Supplier',
    120
  );
  const contactName = toSafeText(
    findFirstByKeyPattern(payload, [/contact.*person/i, /contact.*name/i, /聯絡人/i, /联系人/i]),
    'N/A',
    120
  );
  const contactEmail = toSafeText(
    findFirstByKeyPattern(payload, [/email/i, /電郵/i]),
    'N/A',
    160
  );
  const contactPhone = toSafeText(
    findFirstByKeyPattern(payload, [/contact.*number/i, /phone/i, /電話/i]),
    'N/A',
    120
  );
  const country = toSafeText(
    findFirstByKeyPattern(payload, [/country/i, /國家/i]),
    'N/A',
    120
  );
  const businessDescription = toSafeText(
    findFirstByKeyPattern(payload, [/business.*description/i, /description/i, /業務描述/i]),
    `${companyName} provides professional supplier services.`,
    700
  );

  const mission = toSafeText(
    `Deliver high quality ${supplierType.toLowerCase()} services for clients in ${country}.`,
    'Deliver reliable services with consistent quality.',
    400
  );
  const vision = toSafeText(
    `Become a trusted long-term partner through execution, transparency and innovation.`,
    'Become a trusted long-term partner.',
    400
  );
  const coreValues = toSafeText(
    'Integrity, Quality, Collaboration, Continuous Improvement.',
    'Integrity, Quality, Collaboration, Continuous Improvement.',
    300
  );

  const marketPosition = toSafeText(
    `${companyName} serves clients in ${country} with proven delivery capability and responsive support.`,
    `${companyName} serves clients with proven delivery capability.`,
    500
  );
  const recentAchievements = toSafeText(
    `Primary contact: ${contactName}. Email: ${contactEmail}. Phone: ${contactPhone}.`,
    `Primary contact: ${contactName}.`,
    500
  );

  const slides = [
    buildSlide(0, [
      { name: 'TextBox 4', text: `${companyName}\n${supplierType}` },
      { name: 'TextBox 14', text: companyName },
      { name: 'TextBox 15', text: `Contact: ${contactName}\n${contactPhone}` },
    ]),
    buildSlide(1, [
      { name: 'TextBox 4', text: 'Introduction' },
      { name: 'TextBox 9', text: `${companyName} Overview` },
      { name: 'TextBox 10', text: businessDescription },
    ]),
    buildSlide(2, [
      { name: 'TextBox 34', text: 'Company Overview' },
      { name: 'TextBox 35', text: 'Organization' },
      { name: 'TextBox 36', text: `${companyName} is a ${supplierType} team focused on quality delivery.` },
      { name: 'TextBox 37', text: 'Mission' },
      { name: 'TextBox 38', text: mission },
      { name: 'TextBox 39', text: 'Vision' },
      { name: 'TextBox 40', text: vision },
      { name: 'TextBox 41', text: 'Core values' },
      { name: 'TextBox 42', text: coreValues },
    ]),
    buildSlide(3, [
      { name: 'TextBox 18', text: 'Company Overview' },
      { name: 'TextBox 19', text: 'Market position' },
      { name: 'TextBox 20', text: marketPosition },
      { name: 'TextBox 21', text: 'Recent achievements' },
      { name: 'TextBox 22', text: recentAchievements },
    ]),
  ];

  return {
    presentation: {
      template: templateFileName,
      slides,
    },
  };
};

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if ('error' in auth) return auth.error;

    const config = getConfig();
    if (!config.username || !config.password || !config.key) {
      return NextResponse.json(
        {
          error:
            'PPT service is not configured. Missing PPTGEN_USERNAME / PPTGEN_PASSWORD / PPTGEN_KEY.',
        },
        { status: 500 }
      );
    }

    if (!config.templateFilePath) {
      return NextResponse.json(
        {
          error:
            'No local PPT template found. Put a .pptx file in public/ and set PPTGEN_TEMPLATE_FILE if needed.',
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const payload = body && typeof body === 'object' ? (body as any).data : null;
    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const tokenRes = await fetchWithTimeout(
      TOKEN_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: config.username,
          password: config.password,
          key: config.key,
        }),
        cache: 'no-store',
      },
      TOKEN_TIMEOUT_MS
    );

    const tokenRaw = await tokenRes.text();
    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: `PPT token request failed (${tokenRes.status}): ${tokenRaw || 'Unknown error'}` },
        { status: 502 }
      );
    }

    const bearerToken = resolveTokenFromResponse(tokenRaw);
    if (!bearerToken) {
      return NextResponse.json(
        { error: 'PPT token response is empty or invalid.' },
        { status: 502 }
      );
    }

    const templateBuffer = await readFile(config.templateFilePath);
    const templateFileName = basename(config.templateFilePath);
    const jsonData = buildPresentationPayload(payload, templateFileName);

    const formData = new FormData();
    formData.append(
      'files',
      new Blob([templateBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
      templateFileName
    );
    formData.append('jsonData', JSON.stringify(jsonData));

    const pptRes = await fetchWithTimeout(
      GENERATE_URL,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearerToken}` },
        body: formData,
        cache: 'no-store',
      },
      GENERATE_TIMEOUT_MS
    );

    if (!pptRes.ok) {
      const errText = await pptRes.text().catch(() => '');
      return NextResponse.json(
        { error: `PPT generate request failed (${pptRes.status}): ${errText || 'Unknown error'}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await pptRes.arrayBuffer();
    const contentType = pptRes.headers.get('content-type') || '';
    const disposition =
      pptRes.headers.get('content-disposition') ||
      'attachment; filename="supplier-report.pptx"';

    return new Response(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          contentType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'PPT generation timed out. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
