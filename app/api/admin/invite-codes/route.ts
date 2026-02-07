import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
const PUBLIC_PORTAL_SIGNUP_URL = 'https://www.supplierportal.net/signup';

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

const getUserRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'user';
  return data?.role || 'user';
};

const requireAdmin = async (request: Request) => {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  const role = await getUserRole(auth.user.id);
  if (role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
};

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const generateCode = () => randomBytes(4).toString('hex').toUpperCase();
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const toPositiveInteger = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : null;
};

const listAuthUsersByIds = async (targetIds: Set<string>) => {
  const labels = new Map<string, string>();
  if (!targetIds.size) return labels;

  const perPage = 1000;
  for (let page = 1; labels.size < targetIds.size; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    for (const user of users) {
      if (!targetIds.has(user.id)) continue;
      const label = user.email || user.phone || user.id;
      labels.set(user.id, label);
    }
    if (users.length < perPage) break;
  }

  return labels;
};

const sendInviteCodeEmail = async (params: {
  to: string;
  code: string;
  expiresAt: string | null;
  signupUrl: string;
}) => {
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    throw new Error('Email service not configured');
  }

  const expiresText = params.expiresAt
    ? `\nThis code expires at: ${new Date(params.expiresAt).toLocaleString()}.`
    : '';

  const subject = 'Your invitation code / 邀請碼';
  const text = `You are invited to Supplier Portal.

Invitation code: ${params.code}${expiresText}
Sign up here: ${params.signupUrl}

您已被邀請加入 Supplier Portal。
邀請碼：${params.code}${expiresText ? `\n失效時間：${new Date(params.expiresAt as string).toLocaleString()}` : ''}
註冊入口：${params.signupUrl}`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      text,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text();
    throw new Error(`Failed to send invite email: ${detail}`);
  }
};

const parseTargetEmails = (value: string) => {
  const parts = value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const email of parts) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(email);
  }
  return deduped;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const result = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load invite codes' },
        { status: 500 }
      );
    }

    const codes = result.data || [];
    const codeIds = codes.map((code) => code.id);

    if (!codeIds.length) {
      return NextResponse.json({ codes });
    }

    const profilesResult = await supabaseAdmin
      .from('profiles')
      .select('invite_code_id, user_id')
      .in('invite_code_id', codeIds);

    if (profilesResult.error) {
      return NextResponse.json(
        { error: profilesResult.error.message || 'Failed to load invite code users' },
        { status: 500 }
      );
    }

    const rows = profilesResult.data || [];
    const targetUserIds = new Set<string>();
    for (const row of rows) {
      if (row.user_id) targetUserIds.add(row.user_id);
    }

    const userLabels = await listAuthUsersByIds(targetUserIds);
    const usedByMap = new Map<number, string[]>();
    for (const row of rows) {
      if (typeof row.invite_code_id !== 'number') continue;
      const label = userLabels.get(row.user_id) || row.user_id;
      const current = usedByMap.get(row.invite_code_id) || [];
      if (!current.includes(label)) current.push(label);
      usedByMap.set(row.invite_code_id, current);
    }

    const enrichedCodes = codes.map((code) => ({
      ...code,
      used_by: usedByMap.get(code.id) || [],
    }));

    return NextResponse.json({ codes: enrichedCodes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const targetEmailRaw = toText(payload.targetEmail);
    const targetEmails = targetEmailRaw ? parseTargetEmails(targetEmailRaw) : [];
    const manualCode = toText(payload.code);
    const maxUses = toPositiveInteger(payload.maxUses) ?? 1;
    const expiresAt = toText(payload.expiresAt);

    if (targetEmails.length > 0) {
      const invalidEmails = targetEmails.filter((email) => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { error: `Invalid target email: ${invalidEmails.join(', ')}` },
          { status: 400 }
        );
      }
    } else if (targetEmailRaw && !isValidEmail(targetEmailRaw)) {
      return NextResponse.json({ error: 'Invalid target email' }, { status: 400 });
    }

    if (targetEmails.length === 0) {
      const insert = await supabaseAdmin
        .from('invite_codes')
        .insert({
          code: manualCode || generateCode(),
          max_uses: maxUses,
          expires_at: expiresAt,
          status: 'active',
        })
        .select('*')
        .single();

      if (insert.error) {
        return NextResponse.json(
          { error: insert.error.message || 'Failed to create invite code' },
          { status: 500 }
        );
      }

      return NextResponse.json({ code: insert.data, codes: [insert.data] });
    }

    const createdCodes: any[] = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const email of targetEmails) {
      const insert = await supabaseAdmin
        .from('invite_codes')
        .insert({
          code: generateCode(),
          max_uses: maxUses,
          expires_at: expiresAt,
          status: 'active',
        })
        .select('*')
        .single();

      if (insert.error || !insert.data) {
        failed.push({ email, reason: insert.error?.message || 'Failed to create invite code' });
        continue;
      }

      try {
        await sendInviteCodeEmail({
          to: email,
          code: insert.data.code,
          expiresAt: insert.data.expires_at,
          signupUrl: PUBLIC_PORTAL_SIGNUP_URL,
        });
        createdCodes.push(insert.data);
      } catch (emailError) {
        await supabaseAdmin.from('invite_codes').delete().eq('id', insert.data.id);
        failed.push({
          email,
          reason: emailError instanceof Error ? emailError.message : 'Failed to send invite email',
        });
      }
    }

    if (createdCodes.length === 0) {
      return NextResponse.json(
        { error: failed[0]?.reason || 'Failed to send invite emails', failed },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        code: createdCodes[0],
        codes: createdCodes,
        failed,
      },
      { status: failed.length > 0 ? 207 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const id = typeof payload.id === 'number' ? payload.id : null;
    const status = toText(payload.status);
    const maxUses = typeof payload.maxUses === 'number' ? payload.maxUses : null;
    const expiresAt = toText(payload.expiresAt);

    if (!id) {
      return NextResponse.json({ error: 'Missing invite code id' }, { status: 400 });
    }

    if (status === 'active') {
      const existing = await supabaseAdmin
        .from('invite_codes')
        .select('used_count, max_uses, status')
        .eq('id', id)
        .maybeSingle<{
          used_count: number | null;
          max_uses: number | null;
          status: string;
        }>();

      if (existing.error || !existing.data) {
        return NextResponse.json({ error: 'Invite code not found' }, { status: 404 });
      }

      const usedCount = typeof existing.data.used_count === 'number' ? existing.data.used_count : 0;
      const maxUses = typeof existing.data.max_uses === 'number' ? existing.data.max_uses : 1;
      if (usedCount >= maxUses || existing.data.status === 'used') {
        return NextResponse.json({ error: 'Used invite code cannot be reactivated' }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (maxUses !== null) updates.max_uses = maxUses;
    if (expiresAt !== null) updates.expires_at = expiresAt;

    const result = await supabaseAdmin
      .from('invite_codes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to update invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const id = idParam ? Number(idParam) : null;
    if (!id) {
      return NextResponse.json({ error: 'Missing invite code id' }, { status: 400 });
    }

    const result = await supabaseAdmin
      .from('invite_codes')
      .delete()
      .eq('id', id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to delete invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
