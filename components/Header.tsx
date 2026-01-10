'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [receiveNotifications, setReceiveNotifications] = useState(true);

  // Sample notifications data
  const notifications = [
    {
      id: 1,
      title: 'Product Update / 產品更新',
      message: 'Your product catalog has been reviewed / 您的產品目錄已被審核',
      time: '2 hours ago / 2小時前',
      unread: true,
    },
    {
      id: 2,
      title: 'System Notice / 系統通知',
      message: 'New features available in the portal / 門戶網站提供新功能',
      time: '1 day ago / 1天前',
      unread: true,
    },
    {
      id: 3,
      title: 'Profile Update / 檔案更新',
      message: 'Please update your contact information / 請更新您的聯繫方式',
      time: '3 days ago / 3天前',
      unread: false,
    },
  ];

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session?.user);
    };
    checkSession();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push('/');
  };

  const handleViewSuppliers = () => {
    router.push('/suppliers');
  };

  const showViewSuppliers = pathname !== '/suppliers';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
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
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {showViewSuppliers && (
              <button
                onClick={handleViewSuppliers}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                View Suppliers / 查看供應商
              </button>
            )}

            {isLoggedIn && (
              <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
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
                  {notifications.filter(n => n.unread).length > 0 && (
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
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                              notification.unread ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {notification.time}
                                </p>
                              </div>
                              {notification.unread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notification Settings Footer */}
                      <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={receiveNotifications}
                            onChange={(e) => setReceiveNotifications(e.target.checked)}
                            className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                          />
                          <span className="text-sm text-gray-700">
                            Receive notifications / 接收通知
                          </span>
                        </label>
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
    </header>
  );
}
