'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen,
  Grid3X3,
  User,
  ShieldCheck,
  UserCheck,
  PenLine,
  Library,
  LayoutDashboard,
} from 'lucide-react';

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  color,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold no-underline transition-all ${
        active
          ? 'border border-indigo-500/30 bg-indigo-600/15 text-indigo-300'
          : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-indigo-400' : color || 'text-slate-400'}`} />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-slate-900/60 p-4 md:flex">
      <div className="space-y-6">
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Навигация
          </p>
          <nav className="space-y-1" aria-label="Боковая">
            <NavLink href="/" label="Главная" icon={LayoutDashboard} active={pathname === '/'} />
            <NavLink href="/articles" label="Все статьи" icon={BookOpen} active={isActive('/articles') && !pathname.startsWith('/articles/mine') && !pathname.startsWith('/articles/create')} />
            <NavLink href="/courses" label="Курсы" icon={Library} active={isActive('/courses')} />
            {user && (
              <>
                <NavLink href="/articles/mine" label="Мои статьи" icon={User} active={isActive('/articles/mine')} />
                <NavLink href="/articles/create" label="Написать статью" icon={PenLine} active={isActive('/articles/create')} />
                <NavLink href="/profile" label="Профиль" icon={User} active={isActive('/profile')} />
              </>
            )}
          </nav>
        </div>

        {user && (user.role === 'MODERATOR' || user.role === 'ADMIN') && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Управление
            </p>
            <nav className="space-y-1">
              <NavLink
                href="/moderation"
                label="Модерация"
                icon={UserCheck}
                active={isActive('/moderation')}
                color="text-amber-400"
              />
              {user.role === 'ADMIN' && (
                <NavLink
                  href="/admin/stats"
                  label="Панель админа"
                  icon={ShieldCheck}
                  active={isActive('/admin')}
                  color="text-purple-400"
                />
              )}
            </nav>
          </div>
        )}

        <div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Каталог
          </p>
          <nav className="space-y-1">
            <NavLink href="/articles" label="Категории в каталоге" icon={Grid3X3} active={isActive('/categories')} />
          </nav>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] text-slate-500">
        Kanagawa UI · version2
      </div>
    </aside>
  );
}
