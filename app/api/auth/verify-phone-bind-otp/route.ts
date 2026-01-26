import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkTwilioVerification } from '@/lib/twilioVerify';

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
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
    const code = typeof payload.code === 'string' ? payload.code.trim() : '';

    if (!phone || !code) {
      return NextResponse.json({ error: 'Missing phone or code' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const verification = await checkTwilioVerification(phone, code);
    if (verification?.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const update = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      phone,
      phone_confirm: true,
    });

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
