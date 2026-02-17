"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth, getStudent, getToken } from '@/lib/auth';

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      setIsAuthed(Boolean(getToken()));
      setStudent(getStudent());
    };
    refresh();

    window.addEventListener('storage', refresh);
    window.addEventListener('auth-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-changed', refresh);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [isAuthed]);

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    setStudent(null);
    router.push('/login');
  };

  const canSeeGlobalAdminDashboard = isAuthed && student?.role === 'ADMIN';

  const mobileLinks = isAuthed
    ? [
        { href: '/subjects', label: 'Matieres' },
        { href: '/progress', label: 'Progres' },
        { href: '/library', label: 'Bibliotheque' },
        { href: '/blog', label: 'Blog' },
        ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard' }] : [])
      ]
    : [];

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        {isAuthed ? (
          <button className="hover:text-brand-700" onClick={onLogout}>Deconnexion</button>
        ) : (
          <Link href="/login" className="hover:text-brand-700">Connexion</Link>
        )}

        <div className="hidden md:flex md:items-center md:gap-3">
          {isAuthed ? (
            <>
              <Link href="/subjects" className="hover:text-brand-700">Matieres</Link>
              <Link href="/progress" className="hover:text-brand-700">Progres</Link>
              <Link href="/library" className="hover:text-brand-700">Bibliotheque</Link>
              <Link href="/blog" className="hover:text-brand-700">Blog</Link>
              {canSeeGlobalAdminDashboard ? (
                <Link href="/admin/super-dashboard" className="hover:text-brand-700">Dashboard</Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {mobileLinks.length > 0 ? (
        <>
          <button
            type="button"
            className="fixed bottom-5 right-5 z-50 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-lg md:hidden"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            Menu
          </button>

          {isMobileMenuOpen ? (
            <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 h-1.5 w-12 rounded-full bg-brand-100" />
                <nav className="flex flex-col gap-3 text-sm">
                  {mobileLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
