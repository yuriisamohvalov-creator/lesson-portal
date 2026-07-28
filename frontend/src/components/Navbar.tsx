'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/');
  };

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 1rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
          Lessons Portal
        </Link>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/articles" style={{ textDecoration: 'none', color: 'var(--text)' }}>Статьи</Link>
          <Link href="/courses" style={{ textDecoration: 'none', color: 'var(--text)' }}>Курсы</Link>
          {user ? (
            <>
              <Link href="/articles/mine" style={{ textDecoration: 'none', color: 'var(--text)' }}>Мои статьи</Link>
              <Link href="/articles/create" style={{ textDecoration: 'none', color: 'var(--primary)' }}>+ Написать</Link>
              <Link href="/profile" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.displayName}</Link>
              {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
                <Link href="/moderation" style={{ textDecoration: 'none', color: 'var(--warning)' }}>Модерация</Link>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin/stats" style={{ textDecoration: 'none', color: 'var(--danger)' }}>Админ</Link>
              )}
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Войти</Link>
              <Link href="/auth/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
