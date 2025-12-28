'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type SignupMethod = 'email' | 'phone';
type Step = 'input' | 'enter_code';

const COUNTRY_CODES = [
  { code: '+86', name: '中國 China', flag: '🇨🇳' },
  { code: '+852', name: '香港 Hong Kong', flag: '🇭🇰' },
];

export default function SignupPage() {
  const router = useRouter();
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  const [step, setStep] = useState<Step>('input');
  const [formData, setFormData] = useState({
    email: '',
    countryCode: '+86',
    phone: '',
    password: '',
    confirmPassword: '',
    invitationCode: '',
    otp: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (countryCode: string, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const normalized = `${countryCode}${digits}`.replace(/[^+\d]/g, '');
    if (!/^\+\d{6,15}$/.test(normalized)) return null;
    return normalized;
  };

  const handleMethodChange = (method: SignupMethod) => {
    setSignupMethod(method);
    setStep('input');
    setError('');
    setFormData((prev) => ({ ...prev, otp: '' }));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match / 密碼不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters / 密碼至少需要6個字符');
      return;
    }

    setIsSubmitting(true);

    try {
      if (signupMethod === 'phone') {
        const phone = normalizePhone(formData.countryCode, formData.phone);
        if (!phone) {
          setError('Invalid phone number / 請輸入有效電話號碼');
          setIsSubmitting(false);
          return;
        }
        if (phone.startsWith('+86')) {
          setError(
            'Mainland China SMS is under review. We are currently onboarding this service. / 中國大陸短信正在審核中，我們正在開通服務。'
          );
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/send-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Failed to send verification code');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Failed to send verification code');
          setIsSubmitting(false);
          return;
        }
      }

      setStep('enter_code');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      if (signupMethod === 'phone') {
        const phone = normalizePhone(formData.countryCode, formData.phone);
        if (!phone) {
          setError('Invalid phone number / 請輸入有效電話號碼');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/verify-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            password: formData.password,
            code: formData.otp,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Verification failed');
          setIsSubmitting(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone,
          password: formData.password,
        });

        if (signInError) {
          setError(signInError.message);
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            code: formData.otp,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Verification failed');
          setIsSubmitting(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          setError(signInError.message);
          setIsSubmitting(false);
          return;
        }
      }

      router.push('/register/supplier');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-light text-center text-gray-900">
            Create Account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            創建帳戶
          </p>
        </div>

        <div className="mt-8">
          {/* Signup Method Selection Cards */}
          <div className="flex justify-center gap-4 mb-8">
            {/* Email Signup Card */}
            <button
              type="button"
              onClick={() => {
                handleMethodChange('email');
              }}
              className={`w-52 p-5 border-2 rounded-lg transition-all text-center ${
                signupMethod === 'email'
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center mb-2">
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">
                  Email Signup
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                電郵註冊
              </p>
            </button>

            {/* Phone Signup Card */}
            <button
              type="button"
              onClick={() => {
                handleMethodChange('phone');
              }}
              className={`w-52 p-5 border-2 rounded-lg transition-all text-center ${
                signupMethod === 'phone'
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center mb-2">
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">
                  Phone Signup
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                電話註冊
              </p>
            </button>
          </div>

          {/* Signup Form */}
          <div className="flex justify-center">
            <form
              className="w-[432px] space-y-6 bg-white p-6 rounded-lg border border-gray-200"
              onSubmit={step === 'input' ? handleSendOtp : handleVerifyOtp}
            >
              <div className="space-y-4">
                {signupMethod === 'email' ? (
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

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-light text-gray-700 mb-1">
                    Confirm Password / 確認密碼
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>

                {/* Invitation Code */}
                <div>
                  <label htmlFor="invitationCode" className="block text-sm font-light text-gray-700 mb-1">
                    Invitation Code / 邀請碼（可選）
                  </label>
                  <input
                    id="invitationCode"
                    name="invitationCode"
                    type="text"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    placeholder="Optional invitation code"
                    value={formData.invitationCode}
                    onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">如有邀請碼可填寫，沒有也可直接註冊。</p>
                </div>
              </div>

              {step === 'enter_code' && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-light text-gray-700 mb-1">
                    Verification Code / 驗證碼
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    placeholder="6-digit code"
                    value={formData.otp}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\\D/g, '').slice(0, 6);
                      setFormData({ ...formData, otp: digitsOnly });
                    }}
                    title="6位數字"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {signupMethod === 'phone'
                      ? '輸入短信中的6位數驗證碼。'
                      : '輸入郵件中的6位數驗證碼。'}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Please wait...'
                    : step === 'input'
                      ? 'Send Code / 發送驗證碼'
                      : 'Verify & Create / 驗證並創建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
