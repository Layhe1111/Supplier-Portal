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

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;

    const result = await supabaseAdmin
      .from('notifications')
      .select('*')
      .or(`audience.eq.all,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load notifications' },
        { status: 500 }
      );
    }

    const readsResult = await supabaseAdmin
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readSet = new Set(
      (readsResult.data || []).map((row) => row.notification_id)
    );

    const notifications = (result.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      read: readSet.has(row.id),
    }));

    return NextResponse.json({ notifications });
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
    const user = auth.user;
    const payload = await request.json().catch(() => ({}));
    const notificationId =
      typeof payload.notificationId === 'string' ? payload.notificationId.trim() : '';
    const markAll = Boolean(payload.markAll);

    if (!notificationId && !markAll) {
      return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });
    }

    if (markAll) {
      const { data } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .or(`audience.eq.all,target_user_id.eq.${user.id}`);
      const rows = (data || []).map((row) => ({
        notification_id: row.id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabaseAdmin.from('notification_reads').upsert(rows, {
          onConflict: 'notification_id,user_id',
        });
      }
      return NextResponse.json({ ok: true });
    }

    const insert = await supabaseAdmin
      .from('notification_reads')
      .upsert(
        {
          notification_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'notification_id,user_id' }
      );

    if (insert.error) {
      return NextResponse.json(
        { error: insert.error.message || 'Failed to mark read' },
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
