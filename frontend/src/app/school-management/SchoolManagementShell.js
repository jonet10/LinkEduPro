"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSchoolAdmin } from '@/lib/schoolAuth';

const BASE_ITEMS = [
  { href: '/school-management/dashboard', label: 'Tableau de bord' },
  { href: '/school-management/students', label: 'Élèves' },
  { href: '/school-management/grades', label: 'Notes' },
  { href: '/school-management/report-cards', label: 'Bulletins' },
  { href: '/school-management/payments', label: 'Paiements' },
  { href: '/school-management/classes', label: 'Classes' },
  { href: '/school-management/subjects', label: 'Matières' },
  { href: '/school-management/assessments', label: 'Évaluations' },
  { href: '/school-management/config', label: 'Paramètres' }
];

const SUPER_ADMIN_ITEMS = [
  { href: '/school-management/schools', label: 'Écoles' },
  { href: '/school-management/students-global', label: 'Élèves globaux' }
];

export default function SchoolManagementShell({ children }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith('/school-management/login');

  const admin = useMemo(() => {
    try {
      return getSchoolAdmin();
    } catch (_) {
      return null;
    }
  }, []);

  if (isLogin) {
    return <>{children}</>;
  }

  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const navItems = isSuperAdmin
    ? [...SUPER_ADMIN_ITEMS, ...BASE_ITEMS.filter((item) => item.href !== '/school-management/students')]
    : BASE_ITEMS;

  return (
    <div className="min-h-[70vh]">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-3xl border border-brand-100 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">School Manager</p>
            <h2 className="text-lg font-extrabold text-brand-900">Gestion scolaire</h2>
            <p className="text-xs text-brand-600">Organisation, notes et finances.</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand-900 text-white shadow'
                      : 'text-brand-800 hover:bg-brand-50'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[11px] ${active ? 'text-white/80' : 'text-brand-500'}`}>→</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">
          <div className="rounded-3xl border border-brand-100 bg-white/70 p-4 shadow-sm">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
