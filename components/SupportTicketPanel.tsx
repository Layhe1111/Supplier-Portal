'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  status: 'Open' | 'Pending' | 'Closed';
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

export default function SupportTicketPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('account');
  const [description, setDescription] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = subject.trim() && description.trim();
  const canSend = chatInput.trim();

  useEffect(() => {
    if (!isOpen) return;
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const categoryLabel = useMemo(() => {
    switch (category) {
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
  }, [category]);

  const resetForm = () => {
    setSubject('');
    setCategory('account');
    setDescription('');
    setChatInput('');
    setError('');
  };

  const handleCreateTicket = () => {
    if (!canSubmit) {
      setError('Please fill in subject and description / 請填寫標題與問題描述');
      return;
    }

    const createdAt = nowLabel();
    const newTicket: Ticket = {
      id: `ticket-${Date.now()}`,
      subject: subject.trim(),
      category,
      status: 'Open',
      createdAt,
    };

    const initialMessages: TicketMessage[] = [
      {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        text: description.trim(),
        time: createdAt,
      },
      {
        id: `msg-${Date.now()}-support`,
        role: 'support',
        text:
          'We received your ticket. Our team will reply here soon. / 已收到您的工單，我們將盡快回覆。',
        time: nowLabel(),
      },
    ];

    setTicket(newTicket);
    setMessages(initialMessages);
    setChatInput('');
    setError('');
  };

  const handleSendMessage = () => {
    if (!canSend) return;
    const newMessage: TicketMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: chatInput.trim(),
      time: nowLabel(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setChatInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-support`,
          role: 'support',
          text: 'Thanks for the details. We are looking into it. / 感謝補充，我們正在處理。',
          time: nowLabel(),
        },
      ]);
    }, 900);
  };

  const handleNewTicket = () => {
    setTicket(null);
    setMessages([]);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Support Ticket / 工單
            </h2>
            <p className="text-xs text-gray-500">
              Frontend demo only. Messages are not persisted. / 目前僅前台展示，訊息不會保存。
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

        <div className="flex h-[calc(100%-72px)] flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!ticket ? (
              <div className="space-y-4">
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
                {error && (
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCreateTicket}
                  className="w-full bg-gray-900 text-white py-2 text-sm hover:bg-gray-800"
                >
                  Create Ticket / 提交工單
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-500">
                        {categoryLabel} · {ticket.createdAt}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <div
                  ref={listRef}
                  className="space-y-3 rounded border border-gray-200 bg-white p-4 max-h-[360px] overflow-y-auto"
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
                          {message.time}
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
                    disabled={!canSend}
                    className="px-4 py-2 text-sm bg-gray-900 text-white disabled:bg-gray-300"
                  >
                    Send / 發送
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleNewTicket}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Create another ticket / 新建工單
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
