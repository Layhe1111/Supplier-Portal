import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendTwilioVerification } from '@/lib/twilioVerify';

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
    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }

    const result = await sendTwilioVerification(phone);
    if (!result?.sid) {
      return NextResponse.json({ error: 'Failed to send verification' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
