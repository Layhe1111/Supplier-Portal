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

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;

    const payload = await request.json().catch(() => ({}));
    const subject = toText(payload.subject);
    const category = toText(payload.category) || 'other';
    const description = toText(payload.description);

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Missing subject or description' },
        { status: 400 }
      );
    }

    const ticketInsert = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        category,
        status: 'open',
        requester_email: user.email ?? null,
      })
      .select('id, subject, category, status, created_at')
      .single();

    if (ticketInsert.error || !ticketInsert.data) {
      return NextResponse.json(
        { error: ticketInsert.error?.message || 'Failed to create ticket' },
        { status: 500 }
      );
    }

    const messageInsert = await supabaseAdmin
      .from('support_messages')
      .insert({
        ticket_id: ticketInsert.data.id,
        sender_role: 'user',
        sender_id: user.id,
        message: description,
      })
      .select('id, sender_role, message, created_at')
      .single();

    if (messageInsert.error || !messageInsert.data) {
      return NextResponse.json(
        { error: messageInsert.error?.message || 'Failed to create message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ticket: {
        id: ticketInsert.data.id,
        subject: ticketInsert.data.subject,
        category: ticketInsert.data.category,
        status: ticketInsert.data.status,
        createdAt: ticketInsert.data.created_at,
      },
      messages: [
        {
          id: messageInsert.data.id,
          role: messageInsert.data.sender_role === 'support' ? 'support' : 'user',
          text: messageInsert.data.message,
          time: messageInsert.data.created_at,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;
    const url = new URL(request.url);
    const adminRequested = url.searchParams.get('admin') === '1';
    const role = await getUserRole(user.id);
    const isAdmin = role === 'admin';

    if (adminRequested && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const query = supabaseAdmin
      .from('support_tickets')
      .select('id, subject, category, status, requester_email, created_at, updated_at, user_id')
      .order('updated_at', { ascending: false });

    if (!adminRequested) {
      query.eq('user_id', user.id);
    }

    const result = await query;
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load tickets' },
        { status: 500 }
      );
    }

    const tickets = (result.data || []).map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      requesterEmail: ticket.requester_email,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      userId: ticket.user_id,
    }));

    return NextResponse.json({ tickets, isAdmin });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
