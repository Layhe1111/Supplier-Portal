import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    const payload = await request.json().catch(() => ({}));
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    const code = typeof payload.code === 'string' ? payload.code.trim() : '';

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const codeHash = createHash('sha256').update(code).digest('hex');
    const { data: otpRow, error: otpError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (otpError || !otpRow) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    if (otpRow.code_hash !== codeHash) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    const update = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      email,
      email_confirm: true,
    });

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 400 });
    }

    await supabaseAdmin.from('email_otps').delete().eq('email', email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
