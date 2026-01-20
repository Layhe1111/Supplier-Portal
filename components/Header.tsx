'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUnsavedChanges } from '@/components/UnsavedChangesProvider';
import SupportTicketPanel from '@/components/SupportTicketPanel';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string; createdAt: string; read: boolean }[]
  >([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifyEmailAddress, setNotifyEmailAddress] = useState('');
  const [hasAccountEmail, setHasAccountEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dismissedEmailHint, setDismissedEmailHint] = useState(false);
  const { isDirty, saveChanges } = useUnsavedChanges();

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const hasUser = !!data.session?.user;
      setIsLoggedIn(hasUser);
      if (!hasUser) {
        setIsAdmin(false);
        return;
      }
      setHasAccountEmail(Boolean(data.session?.user?.email));
      const token = data.session?.access_token;
      if (token) {
        const prefRes = await fetch('/api/notifications/preferences', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const prefBody = await prefRes.json().catch(() => ({}));
        if (prefRes.ok) {
          setReceiveNotifications(Boolean(prefBody.notifyEmail));
          setNotifyEmailAddress(prefBody.notifyEmailAddress || '');
        }
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.session?.user?.id)
        .maybeSingle();
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(profile?.role === 'admin');
    };
    checkSession();
  }, [pathname]);

  const loadNotifications = async () => {
    if (!isLoggedIn) return;
    setIsLoadingNotifications(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(body.error || 'Failed to load notifications');
        return;
      }
      setNotifications(body.notifications || []);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const markAllRead = async () => {
    if (!isLoggedIn) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markRead = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const updateNotificationPrefs = async (nextValue: boolean) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        notifyEmail: nextValue,
        notifySms: false,
        notifyEmailAddress: notifyEmailAddress || null,
      }),
    });
    setReceiveNotifications(nextValue);
  };

  const openEmailModal = () => {
    setEmailError('');
    setEmailInput(notifyEmailAddress || '');
    setShowEmailModal(true);
  };

  const submitNotificationEmail = async () => {
    setEmailError('');
    const email = emailInput.trim();
    if (!email) {
      setEmailError('Please enter an email / 請輸入電郵');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        notifyEmail: true,
        notifySms: false,
        notifyEmailAddress: email,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEmailError(body.error || 'Failed to save email');
      return;
    }
    setNotifyEmailAddress(email);
    setReceiveNotifications(true);
    setShowEmailModal(false);
    setEmailInput('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push('/');
  };

  const handleViewSuppliers = () => {
    router.push('/suppliers');
  };

  const handleLogoClick = async () => {
    if (isDirty) {
      const confirmed = window.confirm(
        '內容尚未保存，是否保存後離開？\nYou have unsaved changes. Save before leaving?'
      );
      if (!confirmed) return;
      const saved = await saveChanges();
      if (!saved) return;
    }

    router.push(isLoggedIn ? '/dashboard' : '/');
  };

  const handleBack = () => {
    router.back();
  };

  const showViewSuppliers = pathname !== '/suppliers';
  const showBack = pathname === '/suppliers';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
            aria-label="ProjectPilot Home"
          >
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Project Pilot Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a2332] tracking-tight">
                ProjectPilot
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Supplier Portal 供應商門戶
              </p>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {showBack && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Back / 返回
              </button>
            )}
            {showViewSuppliers && (
              <button
                onClick={handleViewSuppliers}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Find Suppliers / 查找供应商
              </button>
            )}

            {isLoggedIn && (
              <>
              <button
                onClick={() => setIsTicketOpen(true)}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Support / 工單
              </button>
              {isAdmin && (
                <button
                  onClick={() => router.push(pathname === '/admin' ? '/dashboard' : '/admin')}
                  className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {pathname === '/admin' ? 'Return to Portal / 返回前台' : 'Admin / 後台管理'}
                </button>
              )}
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    const nextOpen = !isNotificationOpen;
                    setIsNotificationOpen(nextOpen);
                    if (nextOpen) {
                      loadNotifications();
                    }
                  }}
                  className="relative p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 transition-colors"
                  aria-label="Notifications"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {/* Notification badge */}
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {/* Notification Popover */}
                {isNotificationOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsNotificationOpen(false)}
                    />
                    {/* Popover */}
                    <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-300 shadow-lg z-20">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-base font-light text-gray-900">
                          Notifications / 通知
                        </h3>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-96 overflow-y-auto">
                        {!dismissedEmailHint && !notifyEmailAddress && (
                          <div className="p-4 border-b border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start justify-between gap-3">
                            <span>
                              {hasAccountEmail
                                ? '是否想用其他電郵接收推送通知？'
                                : '建議補充電郵以接收推送通知。'}
                            </span>
                            <button
                              type="button"
                              onClick={openEmailModal}
                              className="ml-2 underline"
                            >
                              {hasAccountEmail ? 'Change / 更換' : 'Add Email / 補充電郵'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDismissedEmailHint(true)}
                              className="text-gray-500 hover:text-gray-700"
                              aria-label="Dismiss"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {notifyEmailAddress && (
                          <div className="p-4 border-b border-gray-200 text-xs text-gray-700">
                            Notification email: {notifyEmailAddress}
                            <button
                              type="button"
                              onClick={openEmailModal}
                              className="ml-2 underline"
                            >
                              Edit / 修改
                            </button>
                          </div>
                        )}
                        {isLoadingNotifications && (
                          <div className="p-4 text-sm text-gray-500">
                            Loading... / 載入中...
                          </div>
                        )}
                        {!isLoadingNotifications && notifications.length === 0 && (
                          <div className="p-4 text-sm text-gray-500">
                            No notifications yet. / 暫無通知
                          </div>
                        )}
                        {notifications.map((notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => markRead(notification.id)}
                            className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 ${
                              notification.read ? '' : 'bg-blue-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  {notification.body}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Notification Settings Footer */}
                      <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={receiveNotifications}
                              onChange={(e) => updateNotificationPrefs(e.target.checked)}
                              className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                            />
                            <span className="text-sm text-gray-700">
                              Receive email notifications / 接收電郵通知
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Logout / 登出
              </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-200 w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900">
              Add Notification Email / 補充通知電郵
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This email is only used for receiving notifications.
              <br />
              此電郵僅用於接收推送通知，不作為帳號識別。
            </p>
            <div className="mt-4">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm"
                placeholder="email@example.com"
              />
              {emailError && (
                <p className="mt-2 text-xs text-red-600">{emailError}</p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700"
              >
                Cancel / 取消
              </button>
              <button
                type="button"
                onClick={submitNotificationEmail}
                className="px-3 py-2 text-sm bg-gray-900 text-white"
              >
                Save / 保存
              </button>
            </div>
          </div>
        </div>
      )}
      <SupportTicketPanel
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
      />
    </header>
  );
}
