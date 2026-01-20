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
    const { email, password, accountType, invitationCode } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), { status: 400 });
    }

    const inviteCodeId =
      typeof invitationCode === 'string' && invitationCode.trim()
        ? await validateInviteCode(invitationCode)
        : null;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        accountType: accountType ?? 'full',
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
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

    return new Response(JSON.stringify({ user: data.user }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      { status: 500 }
    );
  }
}
