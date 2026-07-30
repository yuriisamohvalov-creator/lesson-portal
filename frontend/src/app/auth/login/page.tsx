'use client';

import { useState } from 'react';
import { login } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(email, password);
      setUser(user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Вход</h1>
      <form onSubmit={handleSubmit} className="card space-y-1">
        {error && <div className="mb-3 text-sm text-rose-400">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-indigo-400 no-underline hover:text-indigo-300">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}
