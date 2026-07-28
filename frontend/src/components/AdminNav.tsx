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
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ textDecoration: 'none' }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
