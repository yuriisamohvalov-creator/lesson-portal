'use client';

import { useState } from 'react';
import { register } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, displayName);
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Регистрация</h1>
      <form onSubmit={handleSubmit} className="card space-y-1">
        {error && <div className="mb-3 text-sm text-rose-400">{error}</div>}
        <div className="form-group">
          <label>Имя</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-indigo-400 no-underline hover:text-indigo-300">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
