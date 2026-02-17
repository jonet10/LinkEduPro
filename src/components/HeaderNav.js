"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth, getToken } from '@/lib/auth';

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => setIsAuthed(Boolean(getToken()));
    refresh();

    window.addEventListener('storage', refresh);
    window.addEventListener('auth-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-changed', refresh);
    };
  }, []);

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/school-management/login" className="rounded-md border border-brand-500 px-2 py-1 text-brand-700 hover:bg-brand-50">
        Connexion School
      </Link>
      {isAuthed ? (
        <>
          <Link href="/subjects" className="hover:text-brand-700">Matieres</Link>
          <Link href="/progress" className="hover:text-brand-700">Progres</Link>
          <Link href="/library" className="hover:text-brand-700">Bibliotheque</Link>
          <Link href="/blog" className="hover:text-brand-700">Blog</Link>
          <Link href="/admin/super-dashboard" className="hover:text-brand-700">Dashboard</Link>
          <button className="hover:text-brand-700" onClick={onLogout}>Deconnexion</button>
        </>
      ) : (
        <Link href="/login" className="hover:text-brand-700">Connexion</Link>
      )}
    </div>
  );
}
