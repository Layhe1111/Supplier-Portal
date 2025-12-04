'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginMethod = 'email' | 'phone';

const COUNTRY_CODES = [
  { code: '+86', name: '中国 China', flag: '🇨🇳' },
  { code: '+852', name: '香港 Hong Kong', flag: '🇭🇰' },
];

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [formData, setFormData] = useState({
    email: '',
    countryCode: '+86',
    phone: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store login state
    localStorage.setItem('isLoggedIn', 'true');
    const identifier = loginMethod === 'email' ? formData.email : `${formData.countryCode}${formData.phone}`;
    localStorage.setItem('userIdentifier', identifier);

    // Check if user has completed supplier registration
    const supplierData = localStorage.getItem('supplierData');
    if (supplierData) {
      // User has completed registration, go to dashboard
      router.push('/dashboard');
    } else {
      // User hasn't completed registration, redirect to registration page
      router.push('/register/supplier');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-light text-center text-gray-900">
            ProjectPilot
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Supplier Portal 供應商門戶
          </p>
        </div>

        <div className="mt-8">
          {/* Login Method Selection Cards */}
          <div className="flex justify-center gap-4 mb-8">
            {/* Email Login Card */}
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`w-52 p-5 border-2 rounded-lg transition-all text-center ${
                loginMethod === 'email'
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center mb-2">
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">
                  Email Login
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                邮箱登录
              </p>
            </button>

            {/* Phone Login Card */}
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`w-52 p-5 border-2 rounded-lg transition-all text-center ${
                loginMethod === 'phone'
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center mb-2">
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">
                  Phone Login
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                电话登录
              </p>
            </button>
          </div>

          {/* Login Form */}
          <div className="flex justify-center">
            <form className="w-[432px] space-y-6 bg-white p-6 rounded-lg border border-gray-200" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {loginMethod === 'email' ? (
                // Email Input
                <div>
                  <label htmlFor="email" className="block text-sm font-light text-gray-700 mb-1">
                    Email / 電郵
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              ) : (
                // Phone Input with Country Code
                <div>
                  <label htmlFor="phone" className="block text-sm font-light text-gray-700 mb-1">
                    Phone Number / 電話號碼
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="appearance-none px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    >
                      {COUNTRY_CODES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="appearance-none relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                      placeholder="1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-light text-gray-700 mb-1">
                  Password / 密碼
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
              >
                Sign In / 登入
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
