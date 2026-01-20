import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkTwilioVerification } from '@/lib/twilioVerify';

const validateInviteCode = async (code: string) => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .eq('code', trimmed)
    .maybeSingle();
  if (error || !data) {
    throw new Error('Invalid invitation code');
  }
  if (data.status !== 'active') {
    throw new Error('Invitation code inactive');
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation code expired');
  }
  if (typeof data.max_uses === 'number' && data.used_count >= data.max_uses) {
    throw new Error('Invitation code exhausted');
  }
  const { error: updateError } = await supabaseAdmin
    .from('invite_codes')
    .update({ used_count: (data.used_count || 0) + 1 })
    .eq('id', data.id);
  if (updateError) {
    throw new Error('Failed to redeem invitation code');
  }
  return data.id as number;
};

export async function POST(request: Request) {
  try {
    const { phone, code, password, accountType, invitationCode } = await request.json();
    if (typeof phone !== 'string' || !phone.trim() || !code || !password) {
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

    const normalizedPhone = phone.trim();
    const verification = await checkTwilioVerification(normalizedPhone, code);
    if (verification?.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const inviteCodeId =
      typeof invitationCode === 'string' && invitationCode.trim()
        ? await validateInviteCode(invitationCode)
        : null;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      phone: normalizedPhone,
      password,
      phone_confirm: true,
      user_metadata: {
        accountType: accountType ?? 'full',
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user?.id) {
      await supabaseAdmin.from('profiles').upsert({
        user_id: data.user.id,
        role: 'user',
        invite_code_id: inviteCodeId,
        notify_email: true,
        notify_sms: false,
      });
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
