import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;

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

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    if (!RESEND_API_KEY || !FROM_EMAIL) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const payload = await request.json().catch(() => ({}));
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: upsertError } = await supabaseAdmin
      .from('email_otps')
      .upsert({ email, code_hash: codeHash, expires_at: expiresAt });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const subject = 'Your verification code / 驗證碼';
    const text = `Your verification code is ${code}. It expires in 15 minutes.\n\n你的驗證碼是 ${code}，15 分鐘內有效。`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject,
        text,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      return NextResponse.json(
        { error: 'Failed to send email', detail },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
