'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        audience: notificationAudience,
        targetEmail: notificationAudience === 'user' ? notificationTargetEmail.trim() : null,
        targetPhone: notificationAudience === 'user' ? notificationTargetPhone.trim() : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Failed to create notification');
      return;
    }
    await loadNotifications();
    setNotificationTitle('');
    setNotificationBody('');
    setNotificationTargetEmail('');
    setNotificationTargetPhone('');
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
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              />
              <textarea
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Notification message"
              />
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <select
                  value={notificationAudience}
                  onChange={(e) => setNotificationAudience(e.target.value as 'all' | 'user')}
                  className="border border-gray-300 px-3 py-2 text-sm"
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
                    />
                    <input
                      value={notificationTargetPhone}
                      onChange={(e) => setNotificationTargetPhone(e.target.value)}
                      className="border border-gray-300 px-3 py-2 text-sm flex-1"
                      placeholder="Target user phone"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={createNotification}
                  className="px-4 py-2 text-sm bg-gray-900 text-white"
                >
                  Send Notification
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
                          {item.audience === 'all' ? 'All' : 'User'}
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
