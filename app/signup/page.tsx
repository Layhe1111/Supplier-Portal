'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SignupMethod = 'email' | 'phone';

const COUNTRY_CODES = [
  { code: '+86', name: '中國 China', flag: '🇨🇳' },
  { code: '+852', name: '香港 Hong Kong', flag: '🇭🇰' },
];

export default function SignupPage() {
  const router = useRouter();
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [formData, setFormData] = useState({
    email: '',
    countryCode: '+86',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    invitationCode: '',
  });
  const [sentCode, setSentCode] = useState('');

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match / 密碼不一致');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters / 密碼至少需要6個字符');
      return;
    }

    // Generate a random 6-digit code (in real app, this would be sent via email/SMS)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);

    // For demo purposes, show the code in console
    console.log('Verification Code:', code);
    alert(`Verification code sent! (Demo code: ${code})\n驗證碼已發送！（演示代碼：${code}）`);

    setStep('verify');
  };

  const handleVerifyAndSignup = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify the code
    if (formData.verificationCode !== sentCode) {
      alert('Invalid verification code / 驗證碼錯誤');
      return;
    }

    // Create account
    const identifier = signupMethod === 'email' ? formData.email : `${formData.countryCode}${formData.phone}`;

    // Determine account type based on invitation code
    const hasInvitationCode = formData.invitationCode.trim() !== '';
    const accountType = hasInvitationCode ? 'full' : 'basic'; // full = 完整供应商, basic = 基础供应商

    // Store user account
    const userAccount = {
      identifier,
      password: formData.password,
      accountType,
      invitationCode: hasInvitationCode ? formData.invitationCode.trim() : null,
      createdAt: new Date().toISOString(),
    };

    // In a real app, this would be stored in a database
    // For demo, we'll store in localStorage
    localStorage.setItem(`account_${identifier}`, JSON.stringify(userAccount));

    alert('Account created successfully! Please login. / 帳戶創建成功！請登入。');
    router.push('/');
  };

  const handleResendCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    console.log('New Verification Code:', code);
    alert(`New verification code sent! (Demo code: ${code})\n新驗證碼已發送！（演示代碼：${code}）`);
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
                setSignupMethod('email');
                setStep('input');
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
                setSignupMethod('phone');
                setStep('input');
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
            {step === 'input' ? (
              <form className="w-[432px] space-y-6 bg-white p-6 rounded-lg border border-gray-200" onSubmit={handleSendCode}>
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
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  {/* Confirm Password Input */}
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

                  {/* Invitation Code Input (Optional) */}
                  <div>
                    <label htmlFor="invitationCode" className="block text-sm font-light text-gray-700 mb-1">
                      Invitation Code / 邀請碼 <span className="text-gray-400">(Optional / 選填)</span>
                    </label>
                    <input
                      id="invitationCode"
                      name="invitationCode"
                      type="text"
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                      placeholder="Enter invitation code if you have one"
                      value={formData.invitationCode}
                      onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      With invitation code: Full supplier features / 有邀請碼：完整供應商功能<br />
                      Without invitation code: Basic supplier features / 無邀請碼：基礎供應商功能
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                  >
                    Send Verification Code / 發送驗證碼
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Already have an account? Sign in / 已有帳戶？登入
                  </button>
                </div>
              </form>
            ) : (
              <form className="w-[432px] space-y-6 bg-white p-6 rounded-lg border border-gray-200" onSubmit={handleVerifyAndSignup}>
                <div className="space-y-4">
                  <div className="text-center text-sm text-gray-600">
                    Verification code sent to:<br />
                    <span className="font-medium text-gray-900">
                      {signupMethod === 'email' ? formData.email : `${formData.countryCode} ${formData.phone}`}
                    </span>
                  </div>

                  {/* Verification Code Input */}
                  <div>
                    <label htmlFor="verificationCode" className="block text-sm font-light text-gray-700 mb-1">
                      Verification Code / 驗證碼
                    </label>
                    <input
                      id="verificationCode"
                      name="verificationCode"
                      type="text"
                      required
                      maxLength={6}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm text-center text-2xl tracking-widest"
                      placeholder="000000"
                      value={formData.verificationCode}
                      onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Resend Code / 重新發送驗證碼
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                  >
                    Verify and Create Account / 驗證並創建帳戶
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="w-full flex justify-center py-2.5 px-4 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                  >
                    Back / 返回
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
