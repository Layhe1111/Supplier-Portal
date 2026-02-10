import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
const PUBLIC_PORTAL_SIGNUP_URL = 'https://www.supplierportal.net/signup';
const PORTAL_URL = process.env.PUBLIC_PORTAL_URL || new URL(PUBLIC_PORTAL_SIGNUP_URL).origin;
const SUPPORT_EMAIL_ADDRESS =
  process.env.SUPPORT_EMAIL_ADDRESS || process.env.SUPPORT_EMAIL || FROM_EMAIL || 'info@engineeringstewards.com';
const PROCUREMENT_CONTACT_EMAIL =
  process.env.PROCUREMENT_CONTACT_EMAIL || process.env.BUSINESS_CONTACT_EMAIL || SUPPORT_EMAIL_ADDRESS;
const COMPANY_NAME = process.env.COMPANY_NAME || 'Engineering Stewards Limited';

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
    ? `\nInvitation code expiry: ${new Date(params.expiresAt).toLocaleString()}.\n邀請碼失效時間：${new Date(params.expiresAt).toLocaleString()}。`
    : '';
  const expiresHtml = params.expiresAt
    ? `<br/>Invitation code expiry: ${new Date(params.expiresAt).toLocaleString()}.<br/>邀請碼失效時間：${new Date(params.expiresAt).toLocaleString()}。`
    : '';

  const subject = 'Invitation to Join Supplier Portal / 供應商平台邀請函';
  const text = `Subject: ${subject}

Dear Valued Supplier,

You are receiving this invitation to join our new Supplier Portal, developed by Engineering Stewards Limited, a partner of the Hong Kong Science and Technology Parks (HKSTP).

This portal is designed to optimize our partnership and provide you with additional benefits:
- Streamlined Interface: Manage your interactions, documents, and communications with our organization efficiently.
- Profile Enhancement: We can assist in converting your provided information into a professional digital company brochure hosted on your portal profile.
- Promotional Support: Approved supplier profiles may be featured and recommended to our platform's active user base to increase your business opportunities.

Action Required:
To activate your account and access these features, please complete your registration via the link below.

Invitation code: ${params.code}${expiresText}
Supplier Portal Registration Link: ${params.signupUrl}
Portal URL: ${PORTAL_URL}

For technical support: ${SUPPORT_EMAIL_ADDRESS}

This is an automated message. Please do not reply directly to this email. For any non-technical inquiries regarding this invitation, please contact ${PROCUREMENT_CONTACT_EMAIL}.

We look forward to your registration.

Sincerely,
The Supplier Portal System
${COMPANY_NAME}

尊敬的供應商夥伴，您好：

您收到此郵件，是因為我們誠邀您加入全新 Supplier Portal（供應商平台）。此平台由 Engineering Stewards Limited 開發，並與香港科技園公司（HKSTP）生態合作。

此平台旨在優化我們的合作流程，並為您提供更多商機與價值：
- 流程更高效：可集中管理與我們的互動、文件與溝通記錄。
- 企業形象升級：我們可協助將您提供的資料轉換為專業數碼公司手冊，展示於您的平台檔案頁面。
- 推廣支持：通過審核的供應商檔案，將有機會被推薦給平台活躍用戶，提升曝光與業務機會。

請您完成以下操作：
為啟用帳戶並使用上述功能，請透過以下連結完成註冊。

邀請碼：${params.code}${expiresText}
供應商平台註冊連結：${params.signupUrl}
平台網址：${PORTAL_URL}

技術支援：${SUPPORT_EMAIL_ADDRESS}

此郵件為系統自動發送，請勿直接回覆。如有非技術相關問題，請聯絡：${PROCUREMENT_CONTACT_EMAIL}。

期待您的註冊。

此致
供應商平台系統
${COMPANY_NAME}`;

  const html = `Subject: ${subject}<br/><br/>
Dear Valued Supplier,<br/><br/>
You are receiving this invitation to join our new Supplier Portal, developed by Engineering Stewards Limited, a partner of the Hong Kong Science and Technology Parks (HKSTP).<br/><br/>
This portal is designed to optimize our partnership and provide you with additional benefits:<br/>
Streamlined Interface: Manage your interactions, documents, and communications with our organization efficiently.<br/>
Profile Enhancement: We can assist in converting your provided information into a professional digital company brochure hosted on your portal profile.<br/>
Promotional Support: Approved supplier profiles may be featured and recommended to our platform's active user base to increase your business opportunities.<br/><br/>
Action Required:<br/>
To activate your account and access these features, please complete your registration via the link below.<br/><br/>
Invitation code: ${params.code}${expiresHtml}<br/>
Supplier Portal Registration Link: <a href="${params.signupUrl}">${params.signupUrl}</a><br/>
Portal URL: <a href="${PORTAL_URL}">${PORTAL_URL}</a><br/><br/>
For technical support: <a href="mailto:${SUPPORT_EMAIL_ADDRESS}">${SUPPORT_EMAIL_ADDRESS}</a><br/><br/>
This is an automated message. Please do not reply directly to this email. For any non-technical inquiries regarding this invitation, please contact <a href="mailto:${PROCUREMENT_CONTACT_EMAIL}">${PROCUREMENT_CONTACT_EMAIL}</a>.<br/><br/>
We look forward to your registration.<br/><br/>
Sincerely,<br/>
The Supplier Portal System<br/>
${COMPANY_NAME}<br/><br/>
尊敬的供應商夥伴，您好：<br/><br/>
您收到此郵件，是因為我們誠邀您加入全新 Supplier Portal（供應商平台）。此平台由 Engineering Stewards Limited 開發，並與香港科技園公司（HKSTP）生態合作。<br/><br/>
此平台旨在優化我們的合作流程，並為您提供更多商機與價值：<br/>
流程更高效：可集中管理與我們的互動、文件與溝通記錄。<br/>
企業形象升級：我們可協助將您提供的資料轉換為專業數碼公司手冊，展示於您的平台檔案頁面。<br/>
推廣支持：通過審核的供應商檔案，將有機會被推薦給平台活躍用戶，提升曝光與業務機會。<br/><br/>
請您完成以下操作：<br/>
為啟用帳戶並使用上述功能，請透過以下連結完成註冊。<br/><br/>
邀請碼：${params.code}${expiresHtml}<br/>
供應商平台註冊連結：<a href="${params.signupUrl}">${params.signupUrl}</a><br/>
平台網址：<a href="${PORTAL_URL}">${PORTAL_URL}</a><br/><br/>
技術支援：<a href="mailto:${SUPPORT_EMAIL_ADDRESS}">${SUPPORT_EMAIL_ADDRESS}</a><br/><br/>
此郵件為系統自動發送，請勿直接回覆。如有非技術相關問題，請聯絡 <a href="mailto:${PROCUREMENT_CONTACT_EMAIL}">${PROCUREMENT_CONTACT_EMAIL}</a>。<br/><br/>
期待您的註冊。<br/><br/>
此致<br/>
供應商平台系統<br/>
${COMPANY_NAME}`;

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
      html,
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
