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
      {isAuthed ? (
        <>
          <Link href="/subjects" className="hover:text-brand-700">Matières</Link>
          <Link href="/progress" className="hover:text-brand-700">Progrès</Link>
          <button className="hover:text-brand-700" onClick={onLogout}>Déconnexion</button>
        </>
      ) : (
        <Link href="/login" className="hover:text-brand-700">Connexion</Link>
      )}
    </div>
  );
}
