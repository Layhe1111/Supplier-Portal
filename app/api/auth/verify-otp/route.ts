import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    const { email, code, password, accountType, invitationCode } = await request.json();
    if (!email || !code || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
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

    const inviteCodeId =
      typeof invitationCode === 'string' && invitationCode.trim()
        ? await validateInviteCode(invitationCode)
        : null;

    // Create user as confirmed
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { accountType: accountType ?? 'full' },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (created.user?.id) {
      await supabaseAdmin.from('profiles').upsert({
        user_id: created.user.id,
        role: 'user',
        invite_code_id: inviteCodeId,
        notify_email: true,
        notify_sms: false,
      });
    }

    // Clean up OTP
    await supabaseAdmin.from('email_otps').delete().eq('email', email);

    return NextResponse.json({ user: created.user });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
