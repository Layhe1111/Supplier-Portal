'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { extractOriginalFilename } from '@/lib/sanitizeFilename';

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  requesterEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

type Message = {
  id: string;
  role: 'user' | 'support';
  text: string;
  time: string;
};

type AdminUser = {
  id: string;
  email?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  role: 'user' | 'admin';
  inviteCode?: string | null;
};

type InviteCode = {
  id: number;
  code: string;
  max_uses: number | null;
  used_count: number;
  status: string;
  expires_at: string | null;
  created_at: string;
};

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  audience: string;
  targetUserId?: string | null;
  targetLabel?: string | null;
  createdAt: string;
  createdBy?: string | null;
  readCount?: number;
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'open':
      return 'Open / 開啟';
    case 'pending':
      return 'Pending / 待處理';
    case 'closed':
      return 'Closed / 已結案';
    default:
      return status;
  }
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'invites' | 'notifications'>(
    'tickets'
  );

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('open');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoLoadingUserId, setInfoLoadingUserId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoPayload, setInfoPayload] = useState<any | null>(null);
  const [infoEmail, setInfoEmail] = useState<string>('');
  const [fileLoadingPath, setFileLoadingPath] = useState<string | null>(null);

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationAudience, setNotificationAudience] = useState<'all' | 'user'>('all');
  const [notificationTargetEmail, setNotificationTargetEmail] = useState('');
  const [notificationTargetPhone, setNotificationTargetPhone] = useState('');
  const [notificationChannel, setNotificationChannel] = useState<'both' | 'email' | 'sms'>('both');
  const [notificationSubmitting, setNotificationSubmitting] = useState(false);

  const infoSupplier = infoPayload?.supplier || null;
  const infoStatus = infoPayload?.status || '';
  const infoSupplierId = infoPayload?.supplierId || '';

  const isProbablyUrl = (value: string) => /^https?:\/\//i.test(value);
  const isProbablyStoragePath = (value: string) =>
    !isProbablyUrl(value) && value.includes('/') && /\.[a-z0-9]{2,6}$/i.test(value);

  const openFilePreview = async (path: string) => {
    if (!path) return;
    if (isProbablyUrl(path)) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    setFileLoadingPath(path);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/storage/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load file');
      }
      if (body.signedUrl) {
        window.open(body.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setFileLoadingPath(null);
    }
  };

  const renderFileItem = (path: string, index?: number) => {
    const displayName = extractOriginalFilename(path);
    const isLoading = fileLoadingPath === path;
    return (
      <div key={`${path}-${index ?? 0}`} className="flex items-center gap-2">
        <span className="text-sm text-gray-700 break-all">{displayName || path}</span>
        <button
          type="button"
          onClick={() => openFilePreview(path)}
          className="text-xs underline text-gray-600"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Preview'}
        </button>
      </div>
    );
  };

  const renderValue = (value: unknown) => {
    if (value == null) return <span className="text-gray-400">-</span>;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return <span className="text-gray-400">-</span>;
      if (isProbablyStoragePath(trimmed)) {
        return renderFileItem(trimmed);
      }
      if (isProbablyUrl(trimmed)) {
        return (
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline break-all"
          >
            {trimmed}
          </a>
        );
      }
      return trimmed;
    }
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      const items = value.filter((item) => item != null && String(item).trim().length > 0);
      if (items.length === 0) return <span className="text-gray-400">-</span>;
      const allStrings = items.every((item) => typeof item === 'string');
      if (allStrings) {
        const stringItems = items as string[];
        const allFiles = stringItems.every((item) => isProbablyStoragePath(item));
        if (allFiles) {
          return <div className="space-y-1">{stringItems.map(renderFileItem)}</div>;
        }
        const allUrls = stringItems.every((item) => isProbablyUrl(item));
        if (allUrls) {
          return (
            <ul className="list-disc pl-4 space-y-1">
              {stringItems.map((item, idx) => (
                <li key={`${item}-${idx}`}>
                  <a
                    href={item}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline break-all"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          );
        }
      }
      return (
        <ul className="list-disc pl-4 space-y-1">
          {items.map((item, idx) => (
            <li key={`${String(item)}-${idx}`} className="text-sm text-gray-700 break-words">
              {String(item)}
            </li>
          ))}
        </ul>
      );
    }
    return String(value);
  };

  const renderField = (label: string, value: unknown) => {
    return (
      <div key={label} className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 py-2 border-b border-gray-100">
        <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
        <div className="text-sm text-gray-700 break-words">{renderValue(value)}</div>
      </div>
    );
  };

  const renderSection = (title: string, fields: Array<[string, unknown]>) => {
    const rows = fields.map(([label, value]) => renderField(label, value));
    return (
      <section className="space-y-1">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="border border-gray-100">{rows}</div>
      </section>
    );
  };

  const formatFax = (code?: string, number?: string) => {
    const trimmedNumber = typeof number === 'string' ? number.trim() : '';
    if (!trimmedNumber) return '';
    const trimmedCode = typeof code === 'string' ? code.trim() : '';
    return trimmedCode ? `${trimmedCode} ${trimmedNumber}` : trimmedNumber;
  };

  const renderItemFields = (fields: Array<[string, unknown]>) => (
    <div className="space-y-1">
      {fields.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-1">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
          <div className="text-sm text-gray-700 break-words">{renderValue(value)}</div>
        </div>
      ))}
    </div>
  );

  const renderListSection = (
    title: string,
    items: any[] | undefined,
    renderItem: (item: any, index: number) => ReactNode
  ) => {
    const safeItems = Array.isArray(items) ? items : [];
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {safeItems.length > 0 ? (
          <div className="space-y-3">
            {safeItems.map((item, index) => (
              <div key={item.id || index} className="border border-gray-100 p-3">
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-100 p-3 text-sm text-gray-400">-</div>
        )}
      </section>
    );
  };

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [tickets, selectedId]
  );

  const getToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token || null;
  };

  const loadTickets = async () => {
    setIsLoading(true);
    setError('');
    const token = await getToken();
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const res = await fetch('/api/support/tickets?admin=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load tickets');
      }
      setTickets(body.tickets || []);
      setIsAdmin(Boolean(body.isAdmin));
      if (!selectedId && body.tickets?.length) {
        setSelectedId(body.tickets[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages?admin=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load messages');
      }
      setMessages(body.messages || []);
      setStatus(body.status || 'open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setIsSending(true);
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply.trim(), status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to send message');
      }
      setMessages((prev) => [...prev, body.message]);
      setReply('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);
    setError('');
    const token = await getToken();
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (userQuery.trim()) params.set('q', userQuery.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load users');
      }
      setUsers(body.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUserLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, role }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to update role');
      return;
    }
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
  };

  const openUserInfo = async (userId: string, email?: string | null) => {
    setInfoLoading(true);
    setInfoLoadingUserId(userId);
    setInfoPayload(null);
    setInfoEmail(email || '');
    const token = await getToken();
    if (!token) {
      setInfoLoading(false);
      setInfoLoadingUserId(null);
      return;
    }
    try {
      const params = new URLSearchParams({ userId });
      const res = await fetch(`/api/suppliers/me?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load user information');
      }
      setInfoPayload(body);
      setInfoOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user information');
    } finally {
      setInfoLoading(false);
      setInfoLoadingUserId(null);
    }
  };

  const loadInviteCodes = async () => {
    setInviteLoading(true);
    setError('');
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/admin/invite-codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load invite codes');
      }
      setInviteCodes(body.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite codes');
    } finally {
      setInviteLoading(false);
    }
  };

  const createInviteCode = async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxUses: inviteMaxUses ? Number(inviteMaxUses) : null,
        expiresAt: inviteExpiresAt || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to create invite code');
      return;
    }
    setInviteCodes((prev) => [body.code, ...prev]);
    setInviteMaxUses('');
    setInviteExpiresAt('');
  };

  const updateInviteCode = async (id: number, status: string) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/invite-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to update invite code');
      return;
    }
    setInviteCodes((prev) => prev.map((code) => (code.id === id ? body.code : code)));
  };

  const deleteInviteCode = async (id: number) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/invite-codes?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to delete invite code');
      return;
    }
    setInviteCodes((prev) => prev.filter((code) => code.id !== id));
  };

  const loadNotifications = async () => {
    setNotificationLoading(true);
    setError('');
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load notifications');
      }
      setNotifications(body.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setNotificationLoading(false);
    }
  };

  const createNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setError('Please enter title and message');
      return;
    }
    const token = await getToken();
    if (!token) return;
    setNotificationSubmitting(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: notificationTitle.trim(),
          body: notificationBody.trim(),
          audience: notificationAudience,
          targetEmail: notificationAudience === 'user' ? notificationTargetEmail.trim() : null,
          targetPhone: notificationAudience === 'user' ? notificationTargetPhone.trim() : null,
          channel: notificationChannel,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to create notification');
      setNotificationSubmitting(false);
      return;
    }
    if (
      notificationChannel !== 'email' &&
      body?.delivery &&
      typeof body.delivery.smsSent === 'number' &&
      body.delivery.smsSent === 0
    ) {
      const skipped = typeof body.delivery.smsSkippedNoPhone === 'number'
        ? body.delivery.smsSkippedNoPhone
        : 0;
      setError(
        skipped > 0
          ? 'SMS not sent: target user has no phone bound.'
          : 'SMS not sent: no eligible recipients.'
      );
    }
    await loadNotifications();
    setNotificationTitle('');
    setNotificationBody('');
    setNotificationTargetEmail('');
    setNotificationTargetPhone('');
    setNotificationChannel('both');
    setNotificationSubmitting(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'invites') {
      loadInviteCodes();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading... / 加載中...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-700">
            Admin access is not enabled for this account.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Assign role = admin in profiles to enable access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-light text-gray-900">
            Admin Console / 後台管理
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage tickets, users, invitation codes, and notifications.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          {([
            ['tickets', 'Tickets / 工單'],
            ['users', 'Users / 用戶'],
            ['invites', 'Invite Codes / 邀請碼'],
            ['notifications', 'Notifications / 推送訊息'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm border transition-colors ${
                activeTab === key
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <div className="bg-white border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
                Tickets ({tickets.length})
              </div>
              <div className="max-h-[640px] overflow-y-auto">
                {tickets.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No tickets yet.</p>
                )}
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-50 ${
                      ticket.id === selectedId ? 'bg-gray-50' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.requesterEmail || 'Unknown'} · {statusLabel(ticket.status)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200">
              {selectedTicket ? (
                <div className="flex flex-col h-full">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedTicket.requesterEmail || 'Unknown'} ·{' '}
                      {statusLabel(selectedTicket.status)}
                    </p>
                  </div>

                  <div className="flex-1 px-6 py-4 space-y-3 max-h-[420px] overflow-y-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'support' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                            message.role === 'support'
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p>{message.text}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {new Date(message.time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 px-6 py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-500">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="border border-gray-300 px-2 py-1 text-xs"
                      >
                        <option value="open">Open / 開啟</option>
                        <option value="pending">Pending / 待處理</option>
                        <option value="closed">Closed / 已結案</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Reply to user..."
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!reply.trim() || isSending}
                        className="px-4 py-2 text-sm bg-gray-900 text-white disabled:bg-gray-300"
                      >
                        {isSending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-500">
                  Select a ticket to view the conversation.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium text-gray-900">Users / 用戶</h2>
              <div className="flex gap-2">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Search by email"
                />
                <button
                  type="button"
                  onClick={loadUsers}
                  className="px-3 py-2 text-sm border border-gray-300"
                >
                  Search
                </button>
              </div>
            </div>
            {userLoading ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Email</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Invite</th>
                      <th className="py-2">Last Sign-in</th>
                      <th className="py-2">Created</th>
                      <th className="py-2">Information</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-2 pr-4">{user.email || '-'}</td>
                        <td className="py-2 pr-4">
                          <select
                            value={user.role}
                            onChange={(e) =>
                              updateUserRole(user.id, e.target.value as 'user' | 'admin')
                            }
                            className="border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">
                          {user.inviteCode || '-'}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">
                          {user.lastSignInAt
                            ? new Date(user.lastSignInAt).toLocaleString()
                            : '-'}
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => openUserInfo(user.id, user.email)}
                            className="text-xs underline"
                            disabled={infoLoadingUserId === user.id}
                          >
                            {infoLoadingUserId === user.id ? 'Loading...' : 'Open'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {infoOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-3xl bg-white border border-gray-200 shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">User Information</p>
                      <p className="text-xs text-gray-500">{infoEmail || 'Unknown user'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfoOpen(false)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
                    {infoSupplier ? (
                      <div className="space-y-6">
                        {renderSection('Overview', [
                          ['Supplier Type', infoSupplier.supplierType],
                          ['Status', infoStatus],
                          ['Supplier ID', infoSupplierId],
                        ])}

                        {infoSupplier.supplierType === 'basic' && (
                          <>
                            {renderSection('Basic Supplier Info', [
                              ['Company Name', infoSupplier.companyName],
                              ['Company Name (ZH)', infoSupplier.companyNameChinese],
                              ['Country', infoSupplier.country],
                              ['Office Address', infoSupplier.officeAddress],
                              ['Business Type', infoSupplier.businessType],
                              ['Submitter Name', infoSupplier.submitterName],
                              ['Submitter Position', infoSupplier.submitterPosition],
                              [
                                'Submitter Phone',
                                [infoSupplier.submitterPhoneCode, infoSupplier.submitterPhone]
                                  .filter(Boolean)
                                  .join(' '),
                              ],
                              ['Submitter Email', infoSupplier.submitterEmail],
                          ['Contact Fax', formatFax(infoSupplier.contactFaxCode, infoSupplier.contactFax)],
                              ['Business Description', infoSupplier.businessDescription],
                              ['Company Supplement Link', infoSupplier.companySupplementLink],
                              ['Company Logo', infoSupplier.companyLogo],
                              ['Submission Date', infoSupplier.submissionDate],
                            ])}
                          </>
                        )}

                        {infoSupplier.supplierType !== 'basic' && (
                          <>
                            {renderSection('Company Profile', [
                              ['Company Name', infoSupplier.companyName],
                              ['Company Name (ZH)', infoSupplier.companyNameChinese],
                              ['Year Established', infoSupplier.yearEstablished],
                              ['Registered Capital', infoSupplier.registeredCapital],
                              ['Country', infoSupplier.country],
                              ['Office Address', infoSupplier.officeAddress],
                              ['Business Type', infoSupplier.businessType],
                              ['Business Type (ZH)', infoSupplier.businessTypeZh],
                              ['Business Description', infoSupplier.businessDescription],
                              ['HK Work Eligible Employees', infoSupplier.hkWorkEligibleEmployees],
                              ['Company Supplement File', infoSupplier.companySupplementFile],
                              ['Company Supplement Link', infoSupplier.companySupplementLink],
                            ])}

                            {renderSection('Registration & Contact', [
                              ['HK Business Registration No.', infoSupplier.hkBusinessRegistrationNumber],
                              ['CN Business Registration No.', infoSupplier.cnBusinessRegistrationNumber],
                              ['CN Unified Social Credit Code', infoSupplier.cnUnifiedSocialCreditCode],
                              ['Submitter Name', infoSupplier.submitterName],
                              ['Submitter Position', infoSupplier.submitterPosition],
                              [
                                'Submitter Phone',
                                [infoSupplier.submitterPhoneCode, infoSupplier.submitterPhone]
                                  .filter(Boolean)
                                  .join(' '),
                              ],
                              ['Submitter Email', infoSupplier.submitterEmail],
                              ['Contact Fax', formatFax(infoSupplier.contactFaxCode, infoSupplier.contactFax)],
                              ['Submission Date', infoSupplier.submissionDate],
                            ])}

                            {renderSection('Documents & Commitments', [
                              ['Business Registration', infoSupplier.businessRegistration],
                              ['Company Photos', infoSupplier.companyPhotos],
                              ['Company Logo', infoSupplier.companyLogo],
                              ['Guarantee Info True', infoSupplier.guaranteeInfoTrue],
                              ['Accept Quality Supervision', infoSupplier.acceptQualitySupervision],
                              ['Agree Info Sharing', infoSupplier.agreeInfoSharing],
                            ])}
                          </>
                        )}

                        {infoSupplier.supplierType === 'contractor' && (
                          <>
                            {renderSection('Certifications', [
                              ['Construction Grade', infoSupplier.constructionGrade],
                              ['License Number', infoSupplier.licenseNumber],
                              ['Certificate Upload', infoSupplier.certificateUpload],
                              ['ISO Certifications', infoSupplier.isocertifications],
                              ['ISO Certificate Uploads', infoSupplier.isoCertificateUploads ? Object.entries(infoSupplier.isoCertificateUploads).map(([iso, file]) => `${iso}: ${file || '-'}`) : []],
                              ['Other Certifications', infoSupplier.otherCertifications?.map((item: any) => item.name)],
                            ])}

                            {renderSection('Construction Capability', [
                              ['Project Types', infoSupplier.projectTypes],
                              ['Annual Construction Capacity', infoSupplier.annualConstructionCapacity],
                              ['Max Concurrent Projects', infoSupplier.maxConcurrentProjects],
                              ['Largest Project Value', infoSupplier.largestProjectValue],
                            ])}

                            {renderListSection('Project Highlights', infoSupplier.projectHighlights, (item) =>
                              renderItemFields([
                                ['Project Name', item.projectName],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['Renovation Type', item.renovationType],
                                ['Project Types', item.projectTypes],
                                ['Highlight', item.projectHighlight],
                                ['Photos', item.photos],
                              ])
                            )}

                            {renderListSection('Project Managers', infoSupplier.projectManagers, (item) =>
                              renderItemFields([
                                ['Name', item.name],
                                ['Years Experience', item.yearsExperience],
                                ['Languages', item.languages],
                                ['Main Project', item.mainProject],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['CV', item.cv],
                                ['Projects', item.projects?.map((p: any) => p.projectName)],
                              ])
                            )}

                            {renderSection('Personnel', [
                              ['Organization Chart', infoSupplier.organizationChart],
                              ['Has Safety Officer', infoSupplier.hasSafetyOfficer],
                              ['Number of Safety Officers', infoSupplier.numberOfSafetyOfficers],
                              ['Has Construction Manager', infoSupplier.hasConstructionManager],
                              ['Number of Construction Managers', infoSupplier.numberOfConstructionManagers],
                              ['Has MEP Lead', infoSupplier.hasMepLead],
                              ['Number of MEP Leads', infoSupplier.numberOfMepLeads],
                              ['CN/HK Project Compliance', infoSupplier.cnHkProjectCompliance],
                            ])}

                            {renderListSection('Insurances', infoSupplier.insurances, (item) =>
                              renderItemFields([
                                ['Type', item.type],
                                ['Provider', item.provider],
                                ['Expiry Date', item.expiryDate],
                                ['File', item.file],
                              ])
                            )}

                            {renderSection('Compliance & Governance', [
                              ['Has Environmental Health & Safety', infoSupplier.hasEnvironmentalHealthSafety],
                              ['Environmental Health & Safety File', infoSupplier.environmentalHealthSafetyFile],
                              ['Has Incidents Past 3 Years', infoSupplier.hasIncidentsPast3Years],
                              ['Incident Report File', infoSupplier.incidentsFile],
                              ['Has Litigation Past 3 Years', infoSupplier.hasLitigationPast3Years],
                              ['Litigation Report File', infoSupplier.litigationFile],
                            ])}
                          </>
                        )}

                        {infoSupplier.supplierType === 'designer' && (
                          <>
                            {renderSection('Design Company Overview', [
                              ['Design Awards', infoSupplier.designAwards],
                              ['Design Team Size', infoSupplier.designTeamSize],
                              ['Fee Structure', infoSupplier.feeStructure],
                              ['Design Highlights', infoSupplier.designHighlights?.map((item: any) => item.projectName)],
                            ])}

                            {renderSection('Design Specialization', [
                              ['Design Styles', infoSupplier.designStyles],
                              ['Project Types', infoSupplier.projectTypes],
                              ['BIM Capability', infoSupplier.bimCapability],
                              ['Main Software', infoSupplier.mainSoftware],
                            ])}

                            {renderListSection('Design Highlights', infoSupplier.designHighlights, (item) =>
                              renderItemFields([
                                ['Project Name', item.projectName],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['Renovation Type', item.renovationType],
                                ['Project Types', item.projectTypes],
                                ['Highlight', item.projectHighlight],
                                ['Photos', item.photos],
                              ])
                            )}

                            {renderListSection('Designers', infoSupplier.designers, (item) =>
                              renderItemFields([
                                ['Name', item.name],
                                ['Experience', item.experience],
                                ['Languages', item.languages],
                                ['CV', item.cv],
                                ['Projects', item.projects?.map((p: any) => p.projectName)],
                              ])
                            )}

                            {renderSection('Design & Build Capability', [
                              ['Can Do Design Build', infoSupplier.canDoDesignBuild],
                              ['Organization Chart', infoSupplier.organizationChart],
                            ])}

                            {renderSection('DB Contractor Info', [
                              ['DB Construction Grade', infoSupplier.dbConstructionGrade],
                              ['DB License Number', infoSupplier.dbLicenseNumber],
                              ['DB Certificate Upload', infoSupplier.dbCertificateUpload],
                              ['DB ISO Certifications', infoSupplier.dbIsocertifications],
                              ['DB ISO Certificate Uploads', infoSupplier.dbIsoCertificateUploads ? Object.entries(infoSupplier.dbIsoCertificateUploads).map(([iso, file]) => `${iso}: ${file || '-'}`) : []],
                              ['DB Other Certifications', infoSupplier.dbOtherCertifications?.map((item: any) => item.name)],
                              ['DB Project Types', infoSupplier.dbProjectTypes],
                              ['DB Annual Construction Capacity', infoSupplier.dbAnnualConstructionCapacity],
                              ['DB Max Concurrent Projects', infoSupplier.dbMaxConcurrentProjects],
                              ['DB Largest Project Value', infoSupplier.dbLargestProjectValue],
                              ['DB Organization Chart', infoSupplier.dbOrganizationChart],
                              ['DB Has Safety Officer', infoSupplier.dbHasSafetyOfficer],
                              ['DB Number of Safety Officers', infoSupplier.dbNumberOfSafetyOfficers],
                              ['DB Has Construction Manager', infoSupplier.dbHasConstructionManager],
                              ['DB Number of Construction Managers', infoSupplier.dbNumberOfConstructionManagers],
                              ['DB Has MEP Lead', infoSupplier.dbHasMepLead],
                              ['DB Number of MEP Leads', infoSupplier.dbNumberOfMepLeads],
                              ['DB CN/HK Project Compliance', infoSupplier.dbCnHkProjectCompliance],
                              ['DB Has Environmental Health & Safety', infoSupplier.dbHasEnvironmentalHealthSafety],
                              ['DB Environmental Health & Safety File', infoSupplier.dbEnvironmentalHealthSafetyFile],
                              ['DB Has Incidents Past 3 Years', infoSupplier.dbHasIncidentsPast3Years],
                              ['DB Incident Report File', infoSupplier.dbIncidentsFile],
                              ['DB Has Litigation Past 3 Years', infoSupplier.dbHasLitigationPast3Years],
                              ['DB Litigation Report File', infoSupplier.dbLitigationFile],
                            ])}

                            {renderListSection('DB Project Highlights', infoSupplier.dbProjectHighlights, (item) =>
                              renderItemFields([
                                ['Project Name', item.projectName],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['Renovation Type', item.renovationType],
                                ['Project Types', item.projectTypes],
                                ['Highlight', item.projectHighlight],
                                ['Photos', item.photos],
                              ])
                            )}

                            {renderListSection('DB Project Managers', infoSupplier.dbProjectManagers, (item) =>
                              renderItemFields([
                                ['Name', item.name],
                                ['Years Experience', item.yearsExperience],
                                ['Languages', item.languages],
                                ['Main Project', item.mainProject],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['CV', item.cv],
                                ['Projects', item.projects?.map((p: any) => p.projectName)],
                              ])
                            )}

                            {renderListSection('DB Insurances', infoSupplier.dbInsurances, (item) =>
                              renderItemFields([
                                ['Type', item.type],
                                ['Provider', item.provider],
                                ['Expiry Date', item.expiryDate],
                                ['File', item.file],
                              ])
                            )}
                          </>
                        )}

                        {infoSupplier.supplierType === 'material' && (
                          <>
                            {renderSection('Material Supplier Details', [
                              ['Company Type', infoSupplier.companyType],
                              ['Represented Brands', infoSupplier.representedBrands],
                              ['Company Supplement File', infoSupplier.companySupplementFile],
                              ['Company Supplement Link', infoSupplier.companySupplementLink],
                              ['Sample Provided', infoSupplier.sampleProvided],
                              ['Sample Cost', infoSupplier.sampleCost],
                              ['Sample Delivery Time', infoSupplier.sampleDeliveryTime],
                              ['Free Shipping To HK', infoSupplier.freeShippingToHK],
                            ])}

                            {renderListSection('Warehouses', infoSupplier.warehouses, (item) =>
                              renderItemFields([
                                ['Address', item.address],
                                ['Capacity', item.capacity],
                              ])
                            )}

                            {renderListSection('Products', infoSupplier.products, (item) =>
                              renderItemFields([
                                ['SKU', item.sku],
                                ['Product Name', item.productName],
                                ['Category', item.category],
                                ['Brand', item.brand],
                                ['Series', item.series],
                                ['Specification', item.spec],
                                ['Material', item.material],
                                ['Unit Price', item.unitPrice],
                                ['MOQ', item.moq],
                                ['Origin', item.origin],
                                ['Lead Time', item.leadTime],
                                ['Current Stock', item.currentStock],
                                ['Photos', item.photos],
                                ['Specification File', item.specificationFile],
                                ['Specification Link', item.specificationLink],
                                ['3D Model', item.model3D],
                              ])
                            )}

                            {renderListSection('Project Highlights', infoSupplier.projectHighlights, (item) =>
                              renderItemFields([
                                ['Project Name', item.projectName],
                                ['Year', item.year],
                                ['Address', item.address],
                                ['Area', item.area],
                                ['Renovation Type', item.renovationType],
                                ['Project Types', item.projectTypes],
                                ['Highlight', item.projectHighlight],
                                ['Photos', item.photos],
                              ])
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No information available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Invite Codes / 邀請碼</h2>
            <div className="grid grid-cols-1 md:grid-cols-[200px_200px_auto] gap-3">
              <input
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm"
                placeholder="Max uses (optional)"
              />
              <input
                value={inviteExpiresAt}
                onChange={(e) => setInviteExpiresAt(e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm"
                placeholder="Expires at (YYYY-MM-DD)"
              />
              <button
                type="button"
                onClick={createInviteCode}
                className="px-4 py-2 text-sm bg-gray-900 text-white"
              >
                Create Code
              </button>
            </div>
            {inviteLoading ? (
              <p className="text-sm text-gray-500">Loading invite codes...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Code</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Uses</th>
                      <th className="py-2">Expires</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteCodes.map((code) => (
                      <tr key={code.id} className="border-b">
                        <td className="py-2 pr-4 font-mono">{code.code}</td>
                        <td className="py-2 pr-4">{code.status}</td>
                        <td className="py-2 pr-4">
                          {code.used_count}/{code.max_uses ?? '∞'}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">
                          {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateInviteCode(
                                  code.id,
                                  code.status === 'active' ? 'inactive' : 'active'
                                )
                              }
                              className="text-xs underline"
                            >
                              {code.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteInviteCode(code.id)}
                              className="text-xs text-red-600 underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              Notifications / 推送訊息
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <input
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm"
                placeholder="Notification title"
                disabled={notificationSubmitting}
              />
              <textarea
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Notification message"
                disabled={notificationSubmitting}
              />
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <select
                  value={notificationAudience}
                  onChange={(e) => setNotificationAudience(e.target.value as 'all' | 'user')}
                  className="border border-gray-300 px-3 py-2 text-sm"
                  disabled={notificationSubmitting}
                >
                  <option value="all">All users / 全部</option>
                  <option value="user">Specific user / 指定用戶</option>
                </select>
                {notificationAudience === 'user' && (
                  <div className="flex flex-col md:flex-row gap-3 flex-1">
                    <input
                      value={notificationTargetEmail}
                      onChange={(e) => setNotificationTargetEmail(e.target.value)}
                      className="border border-gray-300 px-3 py-2 text-sm flex-1"
                      placeholder="Target user email"
                      disabled={notificationSubmitting}
                    />
                    <input
                      value={notificationTargetPhone}
                      onChange={(e) => setNotificationTargetPhone(e.target.value)}
                      className="border border-gray-300 px-3 py-2 text-sm flex-1"
                      placeholder="Target user phone"
                      disabled={notificationSubmitting}
                    />
                  </div>
                )}
                <select
                  value={notificationChannel}
                  onChange={(e) =>
                    setNotificationChannel(e.target.value as 'both' | 'email' | 'sms')
                  }
                  className="border border-gray-300 px-3 py-2 text-sm"
                  disabled={notificationSubmitting}
                >
                  <option value="both">Email + SMS</option>
                  <option value="email">Email only</option>
                  <option value="sms">SMS only</option>
                </select>
                <button
                  type="button"
                  onClick={createNotification}
                  className="px-4 py-2 text-sm bg-gray-900 text-white"
                  disabled={notificationSubmitting}
                >
                  {notificationSubmitting ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </div>

            {notificationLoading ? (
              <p className="text-sm text-gray-500">Loading notifications...</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <div key={item.id} className="border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{item.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {new Date(item.createdAt).toLocaleString()} ·{' '}
                          {item.audience === 'all'
                            ? 'All'
                            : item.targetLabel || 'User'}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        Read: {item.readCount ?? 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
