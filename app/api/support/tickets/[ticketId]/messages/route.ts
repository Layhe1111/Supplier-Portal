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

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const ensureTicketAccess = async (ticketId: string, userId: string, isAdmin: boolean) => {
  const ticketResult = await supabaseAdmin
    .from('support_tickets')
    .select('id, user_id, status')
    .eq('id', ticketId)
    .single();

  if (ticketResult.error || !ticketResult.data) {
    return { error: NextResponse.json({ error: 'Ticket not found' }, { status: 404 }) };
  }

  if (!isAdmin && ticketResult.data.user_id !== userId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ticket: ticketResult.data };
};

export async function GET(
  request: Request,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;
    const role = await getUserRole(user.id);
    const isAdmin = role === 'admin';

    const access = await ensureTicketAccess(params.ticketId, user.id, isAdmin);
    if (access.error) return access.error;

    const result = await supabaseAdmin
      .from('support_messages')
      .select('id, sender_role, message, created_at')
      .eq('ticket_id', params.ticketId)
      .order('created_at', { ascending: true });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load messages' },
        { status: 500 }
      );
    }

    const messages = (result.data || []).map((message) => ({
      id: message.id,
      role: message.sender_role === 'support' ? 'support' : 'user',
      text: message.message,
      time: message.created_at,
    }));

    return NextResponse.json({ messages, status: access.ticket.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { ticketId: string } }
) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;
    const role = await getUserRole(user.id);
    const isAdmin = role === 'admin';

    const access = await ensureTicketAccess(params.ticketId, user.id, isAdmin);
    if (access.error) return access.error;

    const payload = await request.json().catch(() => ({}));
    const message = toText(payload.message);
    const status = toText(payload.status);
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const insert = await supabaseAdmin
      .from('support_messages')
      .insert({
        ticket_id: params.ticketId,
        sender_role: isAdmin ? 'support' : 'user',
        sender_id: user.id,
        message,
      })
      .select('id, sender_role, message, created_at')
      .single();

    if (insert.error || !insert.data) {
      return NextResponse.json(
        { error: insert.error?.message || 'Failed to save message' },
        { status: 500 }
      );
    }

    if (isAdmin && status) {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status })
        .eq('id', params.ticketId);
    }

    await supabaseAdmin
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.ticketId);

    return NextResponse.json({
      message: {
        id: insert.data.id,
        role: insert.data.sender_role === 'support' ? 'support' : 'user',
        text: insert.data.message,
        time: insert.data.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
