'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { logout } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { BookOpen, LogOut, Palette } from 'lucide-react';

export function Navbar() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 text-slate-100 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-slate-100 shadow-lg shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-200 via-slate-200 to-indigo-300 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                Lessons Portal
              </span>
              <span className="hidden items-center gap-1 rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300 sm:inline-flex">
                <Palette className="h-2.5 w-2.5 text-amber-400" /> Kanagawa
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">Портал обучающих материалов</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Основная">
          <Link
            href="/articles"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 no-underline transition-colors hover:bg-slate-800 hover:text-slate-100 sm:inline"
          >
            Статьи
          </Link>
          <Link
            href="/courses"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 no-underline transition-colors hover:bg-slate-800 hover:text-slate-100 sm:inline"
          >
            Курсы
          </Link>

          {user ? (
            <>
              <Link
                href="/profile"
                className="max-w-[140px] truncate rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 no-underline transition-colors hover:bg-slate-800"
              >
                {user.displayName}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 no-underline transition-colors hover:bg-slate-700"
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-semibold text-slate-100 no-underline transition-colors hover:bg-indigo-500"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
