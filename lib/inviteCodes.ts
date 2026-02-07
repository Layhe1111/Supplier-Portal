import { supabaseAdmin } from '@/lib/supabaseAdmin';

const EXPIRED_MESSAGE = '邀请码已失效';

type InviteCodeRow = {
  id: number;
  status: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number | null;
};

export const consumeInviteCode = async (code: string) => {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .select('id, status, expires_at, max_uses, used_count')
    .eq('code', trimmed)
    .maybeSingle<InviteCodeRow>();

  if (error || !data) {
    throw new Error(EXPIRED_MESSAGE);
  }
  if (data.status !== 'active') {
    throw new Error(EXPIRED_MESSAGE);
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error(EXPIRED_MESSAGE);
  }

  const usedCount = typeof data.used_count === 'number' ? data.used_count : 0;
  const maxUses = typeof data.max_uses === 'number' ? data.max_uses : 1;
  if (usedCount >= maxUses) {
    throw new Error(EXPIRED_MESSAGE);
  }

  const nextUsedCount = usedCount + 1;
  const nextStatus = nextUsedCount >= maxUses ? 'used' : 'active';

  const redeem = await supabaseAdmin
    .from('invite_codes')
    .update({
      used_count: nextUsedCount,
      status: nextStatus,
    })
    .eq('id', data.id)
    .eq('status', 'active')
    .eq('used_count', usedCount)
    .select('id')
    .maybeSingle<{ id: number }>();

  if (redeem.error) {
    throw new Error(EXPIRED_MESSAGE);
  }
  if (!redeem.data) {
    throw new Error(EXPIRED_MESSAGE);
  }

  return data.id;
};
