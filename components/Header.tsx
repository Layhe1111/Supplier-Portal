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
  const [receiveSmsNotifications, setReceiveSmsNotifications] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string; createdAt: string; read: boolean }[]
  >([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAccountEmail, setHasAccountEmail] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [hasAccountPhone, setHasAccountPhone] = useState(false);
  const [accountPhone, setAccountPhone] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'verify'>('input');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [phoneCode, setPhoneCode] = useState('+852');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
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
      setAccountEmail(data.session?.user?.email || '');
      setHasAccountPhone(Boolean(data.session?.user?.phone));
      setAccountPhone(data.session?.user?.phone || '');
      const token = data.session?.access_token;
      if (token) {
        const prefRes = await fetch('/api/notifications/preferences', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const prefBody = await prefRes.json().catch(() => ({}));
        if (prefRes.ok) {
          setReceiveNotifications(Boolean(prefBody.notifyEmail));
          setReceiveSmsNotifications(Boolean(prefBody.notifySms));
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

  const updateNotificationPrefs = async (nextValue: boolean, nextSmsValue: boolean) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        notifyEmail: nextValue,
        notifySms: nextSmsValue,
      }),
    });
    setReceiveNotifications(nextValue);
    setReceiveSmsNotifications(nextSmsValue);
  };

  const openEmailModal = () => {
    setEmailError('');
    setEmailInput('');
    setEmailOtp('');
    setEmailStep('input');
    setShowEmailModal(true);
  };

  const openPhoneModal = () => {
    setPhoneError('');
    setPhoneOtp('');
    setPhoneInput('');
    setPhoneCode('+852');
    setPhoneStep('input');
    setShowPhoneModal(true);
  };

  const sendEmailOtp = async () => {
    setEmailError('');
    const email = emailInput.trim();
    if (!email) {
      setEmailError('Please enter an email / 請輸入電郵');
      return;
    }
    try {
      setIsEmailSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in first');
      }
      const res = await fetch('/api/auth/send-email-bind-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to send code');
      }
      setEmailStep('verify');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const verifyEmailOtp = async () => {
    setEmailError('');
    const email = emailInput.trim();
    if (!email) {
      setEmailError('Please enter an email / 請輸入電郵');
      return;
    }
    if (!emailOtp.trim()) {
      setEmailError('Please enter verification code / 請輸入驗證碼');
      return;
    }
    try {
      setIsEmailSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in first');
      }
      const res = await fetch('/api/auth/verify-email-bind-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, code: emailOtp.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to verify code');
      }
      setHasAccountEmail(true);
      setAccountEmail(email);
      setShowEmailModal(false);
      setEmailInput('');
      setEmailOtp('');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const sendPhoneOtp = async () => {
    setPhoneError('');
    if (!phoneInput.trim()) {
      setPhoneError('Please enter phone number / 請輸入電話號碼');
      return;
    }
    try {
      setIsPhoneSubmitting(true);
      const { validateLocalPhone } = await import('@/lib/phoneValidation');
      const validation = validateLocalPhone(phoneCode, phoneInput);
      if (!validation.ok) {
        throw new Error(validation.error || 'Invalid phone number');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in first');
      }
      const res = await fetch('/api/auth/send-phone-bind-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: validation.normalized }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to send code');
      }
      setPhoneStep('verify');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const verifyPhoneOtp = async () => {
    setPhoneError('');
    if (!phoneOtp.trim()) {
      setPhoneError('Please enter verification code / 請輸入驗證碼');
      return;
    }
    try {
      setIsPhoneSubmitting(true);
      const { validateLocalPhone } = await import('@/lib/phoneValidation');
      const validation = validateLocalPhone(phoneCode, phoneInput);
      if (!validation.ok) {
        throw new Error(validation.error || 'Invalid phone number');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in first');
      }
      const res = await fetch('/api/auth/verify-phone-bind-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: validation.normalized, code: phoneOtp.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to verify code');
      }
      setHasAccountPhone(true);
      setAccountPhone(validation.normalized);
      setShowPhoneModal(false);
      setPhoneInput('');
      setPhoneOtp('');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
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
                        {!hasAccountEmail && (
                          <div className="p-4 border-b border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start justify-between gap-3">
                            <span>建議綁定電郵以接收推送通知。</span>
                            <button
                              type="button"
                              onClick={openEmailModal}
                              className="ml-2 underline"
                            >
                              Bind Email / 綁定電郵
                            </button>
                          </div>
                        )}
                        {hasAccountEmail && accountEmail && (
                          <div className="p-4 border-b border-gray-200 text-xs text-gray-700">
                            Account email: {accountEmail}
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
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={receiveNotifications}
                              onChange={(e) =>
                                updateNotificationPrefs(e.target.checked, receiveSmsNotifications)
                              }
                              className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                            />
                            <span className="text-sm text-gray-700">
                              Receive email notifications / 接收電郵通知
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={receiveSmsNotifications}
                              onChange={(e) =>
                                updateNotificationPrefs(receiveNotifications, e.target.checked)
                              }
                              className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                              disabled={!hasAccountPhone}
                            />
                            <span className="text-sm text-gray-700">
                              Receive SMS notifications / 接收短信通知
                              {hasAccountPhone && accountPhone ? ` (${accountPhone})` : ''}
                            </span>
                          </label>
                          {!hasAccountPhone && (
                            <p className="text-xs text-gray-500">
                              Add a phone number to your account to receive SMS notifications.
                            </p>
                          )}
                          {!hasAccountPhone && (
                            <button
                              type="button"
                              onClick={openPhoneModal}
                              className="text-xs underline text-gray-600"
                            >
                              Add phone number / 綁定手機
                            </button>
                          )}
                          {!hasAccountEmail && (
                            <p className="text-xs text-gray-500">
                              Bind an email to receive email notifications.
                            </p>
                          )}
                          {!hasAccountEmail && (
                            <button
                              type="button"
                              onClick={openEmailModal}
                              className="text-xs underline text-gray-600"
                            >
                              Bind email / 綁定電郵
                            </button>
                          )}
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
              Bind Email / 綁定電郵
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This email will be linked to your account for notifications.
              <br />
              此電郵會綁定到帳號，用於接收通知。
            </p>
            <div className="mt-4">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm"
                placeholder="email@example.com"
              />
              {emailStep === 'verify' && (
                <input
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-3 w-full border border-gray-300 px-3 py-2 text-sm"
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
              )}
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
              {emailStep === 'input' ? (
                <button
                  type="button"
                  onClick={sendEmailOtp}
                  className="px-3 py-2 text-sm bg-gray-900 text-white"
                  disabled={isEmailSubmitting}
                >
                  {isEmailSubmitting ? 'Sending...' : 'Send Code / 發送驗證碼'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verifyEmailOtp}
                  className="px-3 py-2 text-sm bg-gray-900 text-white"
                  disabled={isEmailSubmitting}
                >
                  {isEmailSubmitting ? 'Verifying...' : 'Verify / 驗證'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-200 w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900">
              Add Phone Number / 綁定手機
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This phone is used for SMS notifications.
              <br />
              手機號碼僅用於短信通知。
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="w-28 border border-gray-300 px-3 py-2 text-sm"
                  disabled={phoneStep === 'verify'}
                >
                  {['+852', '+86', '+853', '+886', '+65', '+60', '+81', '+82', '+44', '+1', '+61', '+971'].map(
                    (code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    )
                  )}
                </select>
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="flex-1 border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Phone number"
                  disabled={phoneStep === 'verify'}
                />
              </div>
              {phoneStep === 'verify' && (
                <input
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border border-gray-300 px-3 py-2 text-sm"
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
              )}
              {phoneError && (
                <p className="text-xs text-red-600">{phoneError}</p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700"
              >
                Cancel / 取消
              </button>
              {phoneStep === 'input' ? (
                <button
                  type="button"
                  onClick={sendPhoneOtp}
                  className="px-3 py-2 text-sm bg-gray-900 text-white"
                  disabled={isPhoneSubmitting}
                >
                  {isPhoneSubmitting ? 'Sending...' : 'Send Code / 發送驗證碼'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verifyPhoneOtp}
                  className="px-3 py-2 text-sm bg-gray-900 text-white"
                  disabled={isPhoneSubmitting}
                >
                  {isPhoneSubmitting ? 'Verifying...' : 'Verify / 驗證'}
                </button>
              )}
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
