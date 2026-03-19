'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const NAV_ITEMS = [
  { href: '/school-management/dashboard', label: 'Dashboard', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_PAYMENTS_MANAGER', 'SCHOOL_REPORTS_MANAGER'] },
  { href: '/school-management/payments', label: 'Paiements', roles: ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_PAYMENTS_MANAGER'] },
  { href: '/school-management/settings', label: 'Paramètres', roles: ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_PAYMENTS_MANAGER'] },
  { href: '/school-management/users', label: 'Comptes & rôles', roles: ['SCHOOL_ADMIN'] },
  { href: '/school-management/students', label: 'Élèves', roles: ['SCHOOL_ADMIN', 'SCHOOL_REPORTS_MANAGER'] },
  { href: '/school-management/classes', label: 'Classes', roles: ['SCHOOL_ADMIN', 'SCHOOL_REPORTS_MANAGER'] },
  { href: '/school-management/schools', label: 'Écoles', roles: ['SUPER_ADMIN'] },
  { href: '/school-management/students-global', label: 'Élèves globaux', roles: ['SUPER_ADMIN'] }
];

export default function SchoolManagementNav() {
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getSchoolToken();
    const admin = getSchoolAdmin();
    setHasToken(Boolean(token));
    setRole(admin?.role || null);
  }, []);

  if (!hasToken || !role) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 overflow-x-auto px-4 py-3">
        <span className="text-sm font-semibold text-brand-800 whitespace-nowrap">School Manager</span>
        <div className="flex items-center gap-2">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-900 text-white'
                    : 'bg-brand-100 text-brand-800 hover:bg-brand-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
