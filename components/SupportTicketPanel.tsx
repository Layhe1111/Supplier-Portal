'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ToastProvider';

type TicketMessage = {
  id: string;
  role: 'user' | 'support';
  text: string;
  time: string;
};

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'pending' | 'closed';
  createdAt: string;
};

const nowLabel = () =>
  new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

const formatTime = (value: string) => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
};

const formatStatus = (status: Ticket['status']) => {
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

export default function SupportTicketPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('account');
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = subject.trim() && description.trim();
  const canSend = chatInput.trim();

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    void loadTickets();
  }, [isOpen]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const getCategoryLabelFor = (value: string) => {
    switch (value) {
      case 'account':
        return 'Account / 帳號';
      case 'registration':
        return 'Registration / 註冊';
      case 'products':
        return 'Products / 產品';
      case 'directory':
        return 'Directory / 供應商黃頁';
      default:
        return 'Other / 其他';
    }
  };

  const resetForm = () => {
    setSubject('');
    setCategory('account');
    setDescription('');
    setChatInput('');
    setError('');
  };

  const handleCreateTicket = async () => {
    if (!canSubmit) {
      setError('Please fill in subject and description / 請填寫標題與問題描述');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in to submit a ticket / 請先登入');
      }
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to create ticket');
      }
      setTicket(body.ticket as Ticket);
      setTickets((prev) => [body.ticket as Ticket, ...prev]);
      setMessages(
        (body.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          text: msg.text,
          time: msg.time,
        }))
      );
      setChatInput('');
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTickets = async () => {
    setIsLoadingTicket(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load ticket');
      }
      const list: Ticket[] = (body.tickets || []).map((item: any) => ({
        id: item.id,
        subject: item.subject,
        category: item.category,
        status: item.status,
        createdAt: item.createdAt,
      }));
      setTickets(list);
      if (list.length === 0) return;
      if (isCreating) return;
      const active = ticket?.id
        ? list.find((item) => item.id === ticket.id) || list[0]
        : list[0];
      setTicket(active);
      await loadMessages(active.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || 'Failed to load messages');
    }
    setMessages(body.messages || []);
  };

  const handleSendMessage = async () => {
    if (!canSend) return;
    if (!ticket) return;
    setIsSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in to reply / 請先登入');
      }
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to send message');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: body.message.id,
          role: body.message.role,
          text: body.message.text,
          time: body.message.time,
        },
      ]);
      setChatInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleNewTicket = () => {
    setTicket(null);
    setMessages([]);
    resetForm();
    setIsCreating(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-5xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Support Ticket / 工單
            </h2>
            <p className="text-xs text-gray-500">
              Tickets are saved for admin review. / 工單會保存供後台查看。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close / 關閉
          </button>
        </div>

        <div className="flex h-[calc(100%-72px)]">
          <aside className="w-64 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 space-y-2">
              <button
                type="button"
                onClick={handleNewTicket}
                className="w-full px-3 py-2 text-sm bg-gray-900 text-white"
              >
                New Ticket / 新建工單
              </button>
              <button
                type="button"
                onClick={() => loadTickets()}
                className="w-full px-3 py-2 text-xs border border-gray-300 text-gray-600"
              >
                Refresh / 刷新
              </button>
              {isLoadingTicket && (
                <p className="text-xs text-gray-500">Loading... / 載入中...</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 && (
                <p className="p-4 text-xs text-gray-500">No tickets yet.</p>
              )}
              {tickets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={async () => {
                    setIsCreating(false);
                    setTicket(item);
                    await loadMessages(item.id);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-200 ${
                    item.id === ticket?.id
                      ? 'bg-gray-50 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium truncate">{item.subject}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatStatus(item.status)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex-1 overflow-y-auto px-6 py-4">
            {ticket && !isCreating ? (
              <div className="space-y-4">
                <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getCategoryLabelFor(ticket.category)} · {ticket.createdAt}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                      {formatStatus(ticket.status)}
                    </span>
                  </div>
                </div>

                <div
                  ref={listRef}
                  className="space-y-3 rounded border border-gray-200 bg-white p-4 max-h-[420px] overflow-y-auto"
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {formatTime(message.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Reply here / 在此回覆"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!canSend || isSending}
                    className="px-4 py-2 text-sm bg-gray-900 text-white disabled:bg-gray-300"
                  >
                    {isSending ? 'Sending... / 發送中' : 'Send / 發送'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Category / 類別
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="account">Account / 帳號</option>
                    <option value="registration">Registration / 註冊</option>
                    <option value="products">Products / 產品</option>
                    <option value="directory">Directory / 供應商黃頁</option>
                    <option value="other">Other / 其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Subject / 標題
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g., Cannot submit form"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Issue Description / 問題描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                    rows={6}
                    placeholder="Tell us what happened, steps to reproduce, and screenshots if any."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateTicket}
                  disabled={isSubmitting}
                  className="w-full bg-gray-900 text-white py-2 text-sm hover:bg-gray-800 disabled:bg-gray-300"
                >
                  {isSubmitting ? 'Submitting... / 提交中' : 'Create Ticket / 提交工單'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
