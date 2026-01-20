import { NextResponse } from 'next/server';
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

const getUserRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'user';
  return data?.role || 'user';
};

const requireAdmin = async (request: Request) => {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  const role = await getUserRole(auth.user.id);
  if (role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to load users' },
        { status: 500 }
      );
    }

    const users = data?.users || [];
    const ids = users.map((user) => user.id);
    const rolesResult = ids.length
      ? await supabaseAdmin
          .from('profiles')
          .select('user_id, role, invite_code_id, invite_codes(code)')
          .in('user_id', ids)
      : {
          data: [] as {
            user_id: string;
            role: string;
            invite_code_id: number | null;
            invite_codes?: { code: string } | { code: string }[] | null;
          }[],
        };
    const rolesMap = new Map(
      (rolesResult.data || []).map((row) => [
        row.user_id,
        {
          role: row.role,
          inviteCode: Array.isArray(row.invite_codes)
            ? row.invite_codes[0]?.code || null
            : row.invite_codes?.code || null,
        },
      ])
    );

    const filtered = users.filter((user) => {
      if (!q) return true;
      return (user.email || '').toLowerCase().includes(q);
    });

    return NextResponse.json({
      users: filtered.map((user) => ({
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        role: rolesMap.get(user.id)?.role || 'user',
        inviteCode: rolesMap.get(user.id)?.inviteCode || null,
      })),
      page,
      pageSize: perPage,
      total: data?.total || filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
    const role = typeof payload.role === 'string' ? payload.role.trim() : '';

    if (!userId || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const result = await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: userId, role })
      .select('user_id, role')
      .single();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ userId: result.data.user_id, role: result.data.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
