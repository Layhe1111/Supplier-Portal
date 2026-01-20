import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateEmail } from '@/lib/emailValidation';

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

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;

    const result = await supabaseAdmin
      .from('profiles')
      .select('notify_email, notify_sms')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifyEmail: result.data?.notify_email ?? true,
      notifySms: result.data?.notify_sms ?? false,
      notifyEmailAddress: result.data?.notify_email_address ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const payload = await request.json().catch(() => ({}));
    const notifyEmail = Boolean(payload.notifyEmail);
    const notifySms = Boolean(payload.notifySms);
    const notifyEmailAddress =
      typeof payload.notifyEmailAddress === 'string' ? payload.notifyEmailAddress.trim() : '';

    if (notifyEmailAddress) {
      const check = validateEmail(notifyEmailAddress, 'Email');
      if (!check.ok) {
        return NextResponse.json({ error: check.error || 'Invalid email' }, { status: 400 });
      }
    }

    const result = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: auth.user.id,
        notify_email: notifyEmail,
        notify_sms: notifySms,
        notify_email_address: notifyEmailAddress || null,
      })
      .select('notify_email, notify_sms, notify_email_address')
      .single();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifyEmail: result.data.notify_email,
      notifySms: result.data.notify_sms,
      notifyEmailAddress: result.data.notify_email_address ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
