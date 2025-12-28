import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;

export async function POST(request: Request) {
  try {
    if (!RESEND_API_KEY || !FROM_EMAIL) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

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
