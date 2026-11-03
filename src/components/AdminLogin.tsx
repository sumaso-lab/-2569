
import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (loginError) throw loginError;

      const { data: sessionData } =
        await supabase.auth.getSession();

      const token = sessionData.session?.access_token;

      if (!token) throw new Error('ไม่พบข้อมูลการเข้าสู่ระบบ');

      const { data, error: adminError } =
        await supabase.functions.invoke('admin-api', {
          body: { action: 'verify-admin' },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

      if (adminError || !data?.isAdmin) {
        await supabase.auth.signOut();
        throw new Error('บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่');
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'เข้าสู่ระบบไม่สำเร็จ'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-xl border border-amber-300">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
        เข้าสู่ระบบเจ้าหน้าที่
      </h2>
      <p className="text-center text-slate-500 text-sm mb-6">
        ยินดีบัณฑิตพยาบาล มข. ๒๕๖๙
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="อีเมลเจ้าหน้าที่"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full p-3 border rounded-xl"
        />

        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full p-3 border rounded-xl"
        />

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-amber-200 py-3 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
