'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('正在驗證郵件並登入，請稍候...');

  useEffect(() => {
    const process = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMessage(error.message || '驗證失敗，請重試登入。');
        return;
      }

      const user = data.session?.user;
      if (!user) {
        setMessage('未獲取到用戶信息，請重新登入。');
        return;
      }

      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1);
      const supplier = suppliers?.[0];

      if (supplier) {
        router.replace('/dashboard');
      } else {
        router.replace('/register/supplier');
      }
    };

    process();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 px-6 py-8 max-w-md w-full text-center">
        <p className="text-sm text-gray-700">{message}</p>
      </div>
    </div>
  );
}
