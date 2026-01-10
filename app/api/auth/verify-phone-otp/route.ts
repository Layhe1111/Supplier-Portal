import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkTwilioVerification } from '@/lib/twilioVerify';
import { validateE164Phone } from '@/lib/phoneValidation';

export async function POST(request: Request) {
  try {
    const { phone, code, password, accountType } = await request.json();
    const validation = validateE164Phone(phone);

    if (!validation.ok || !code || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const verification = await checkTwilioVerification(validation.normalized, code);
    if (verification?.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      phone: validation.normalized,
      password,
      phone_confirm: true,
      user_metadata: {
        accountType: accountType ?? 'full',
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    const status =
      typeof (error as { status?: number })?.status === 'number'
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status }
    );
  }
}
