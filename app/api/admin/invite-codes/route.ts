import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
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

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const generateCode = () => randomBytes(4).toString('hex').toUpperCase();

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const result = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load invite codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ codes: result.data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const code = toText(payload.code) || generateCode();
    const maxUses = typeof payload.maxUses === 'number' ? payload.maxUses : null;
    const expiresAt = toText(payload.expiresAt);

    const insert = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code,
        max_uses: maxUses,
        expires_at: expiresAt,
        status: 'active',
      })
      .select('*')
      .single();

    if (insert.error) {
      return NextResponse.json(
        { error: insert.error.message || 'Failed to create invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: insert.data });
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
    const id = typeof payload.id === 'number' ? payload.id : null;
    const status = toText(payload.status);
    const maxUses = typeof payload.maxUses === 'number' ? payload.maxUses : null;
    const expiresAt = toText(payload.expiresAt);

    if (!id) {
      return NextResponse.json({ error: 'Missing invite code id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (maxUses !== null) updates.max_uses = maxUses;
    if (expiresAt !== null) updates.expires_at = expiresAt;

    const result = await supabaseAdmin
      .from('invite_codes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to update invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const id = idParam ? Number(idParam) : null;
    if (!id) {
      return NextResponse.json({ error: 'Missing invite code id' }, { status: 400 });
    }

    const result = await supabaseAdmin
      .from('invite_codes')
      .delete()
      .eq('id', id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to delete invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
