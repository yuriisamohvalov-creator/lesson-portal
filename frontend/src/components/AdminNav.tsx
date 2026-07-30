'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin/stats', label: 'Статистика' },
  { href: '/admin/articles', label: 'Статьи' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/courses', label: 'Курсы' },
  { href: '/admin/users', label: 'Пользователи' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-2 text-xs font-semibold no-underline transition-colors ${
              active
                ? 'border border-purple-500/40 bg-purple-500/15 text-purple-300'
                : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
