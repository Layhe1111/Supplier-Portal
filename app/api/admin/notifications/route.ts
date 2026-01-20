import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

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

const sendEmail = async (email: string, title: string, body: string) => {
  if (!RESEND_API_KEY || !FROM_EMAIL) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: title,
      text: body,
    }),
  });
};

const sendSms = async (phone: string, body: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  if (!TWILIO_FROM_NUMBER && !TWILIO_MESSAGING_SERVICE_SID) return;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams();
  params.set('To', phone);
  params.set('Body', body);
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
  } else if (TWILIO_FROM_NUMBER) {
    params.set('From', TWILIO_FROM_NUMBER);
  }
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );
};

const resolveUsersByAudience = async (
  audience: string,
  targetUserId: string | null,
  targetEmail: string | null,
  targetPhone: string | null
) => {
  const users = (await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })).data?.users || [];
  if (audience === 'user') {
    const matched = users.find(
      (user) =>
        (targetUserId && user.id === targetUserId) ||
        (targetEmail && user.email?.toLowerCase() === targetEmail.toLowerCase()) ||
        (targetPhone && user.phone === targetPhone)
    );
    return matched ? [matched] : [];
  }
  return users;
};

const loadPreferences = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, { notify_email: boolean; notify_sms: boolean }>();
  const result = await supabaseAdmin
    .from('profiles')
    .select('user_id, notify_email, notify_sms, notify_email_address')
    .in('user_id', userIds);
  const map = new Map<
    string,
    { notify_email: boolean; notify_sms: boolean; notify_email_address: string | null }
  >();
  (result.data || []).forEach((row) => {
    map.set(row.user_id, {
      notify_email: row.notify_email ?? true,
      notify_sms: row.notify_sms ?? false,
      notify_email_address: row.notify_email_address ?? null,
    });
  });
  return map;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const result = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to load notifications' },
        { status: 500 }
      );
    }

    const reads = await supabaseAdmin
      .from('notification_reads')
      .select('notification_id');

    const readCount = new Map<string, number>();
    (reads.data || []).forEach((row) => {
      const current = readCount.get(row.notification_id) || 0;
      readCount.set(row.notification_id, current + 1);
    });

    const notifications = (result.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      targetUserId: row.target_user_id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      readCount: readCount.get(row.id) || 0,
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
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const payload = await request.json().catch(() => ({}));
    const title = toText(payload.title);
    const body = toText(payload.body);
    const audience = toText(payload.audience) || 'all';
    const targetUserId = toText(payload.targetUserId);
    const targetEmail = toText(payload.targetEmail);
    const targetPhone = toText(payload.targetPhone);

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    let resolvedTargetUserId = targetUserId;
    if (audience === 'user' && !resolvedTargetUserId && (targetEmail || targetPhone)) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const matched = (data?.users || []).find(
        (user) =>
          (targetEmail && user.email?.toLowerCase() === targetEmail.toLowerCase()) ||
          (targetPhone && user.phone === targetPhone)
      );
      resolvedTargetUserId = matched?.id || null;
    }

    if (audience === 'user' && !resolvedTargetUserId) {
      return NextResponse.json(
        { error: 'Missing target user' },
        { status: 400 }
      );
    }

    const insert = await supabaseAdmin
      .from('notifications')
      .insert({
        title,
        body,
        audience,
        target_user_id: audience === 'user' ? resolvedTargetUserId : null,
        created_by: auth.user.id,
      })
      .select('*')
      .single();

    if (insert.error) {
      return NextResponse.json(
        { error: insert.error.message || 'Failed to create notification' },
        { status: 500 }
      );
    }

    const targetUsers = await resolveUsersByAudience(
      audience,
      resolvedTargetUserId,
      targetEmail,
      targetPhone
    );
    const prefs = await loadPreferences(targetUsers.map((user) => user.id));
    for (const user of targetUsers) {
      const pref = prefs.get(user.id) || {
        notify_email: true,
        notify_sms: false,
        notify_email_address: null,
      };
      const emailTarget = user.email || pref.notify_email_address;
      if (pref.notify_email && emailTarget) {
        await sendEmail(emailTarget, title, body);
      }
      // SMS sending is disabled for now; prompt users to add email instead.
    }

    return NextResponse.json({
      notification: {
        id: insert.data.id,
        title: insert.data.title,
        body: insert.data.body,
        audience: insert.data.audience,
        targetUserId: insert.data.target_user_id,
        createdAt: insert.data.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
