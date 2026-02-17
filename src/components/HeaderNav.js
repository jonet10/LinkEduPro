"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth, getStudent, getToken } from '@/lib/auth';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [schoolAdmin, setSchoolAdmin] = useState(null);
  const [isSchoolAuthed, setIsSchoolAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      setIsAuthed(Boolean(getToken()));
      setStudent(getStudent());
      setIsSchoolAuthed(Boolean(getSchoolToken()));
      setSchoolAdmin(getSchoolAdmin());
    };
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
    setStudent(null);
    router.push('/login');
  };

  const onSchoolLogout = () => {
    clearSchoolAuth();
    setIsSchoolAuthed(false);
    setSchoolAdmin(null);
    router.push('/school-management/login');
  };

  const canSeeGlobalAdminDashboard = isAuthed && student?.role === 'ADMIN';
  const canSeeSchoolDashboard =
    isSchoolAuthed &&
    schoolAdmin &&
    ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT'].includes(schoolAdmin.role);

  return (
    <div className="flex items-center gap-3 text-sm">
      {!canSeeSchoolDashboard ? (
        <Link href="/school-management/login" className="rounded-md border border-brand-500 px-2 py-1 text-brand-700 hover:bg-brand-50">
          Connexion School
        </Link>
      ) : null}
      {canSeeSchoolDashboard ? (
        <>
          <Link href="/school-management/dashboard" className="hover:text-brand-700">
            Dashboard School
          </Link>
          <button className="hover:text-brand-700" onClick={onSchoolLogout}>Deconnexion School</button>
        </>
      ) : null}
      {isAuthed ? (
        <>
          <Link href="/subjects" className="hover:text-brand-700">Matieres</Link>
          <Link href="/progress" className="hover:text-brand-700">Progres</Link>
          <Link href="/library" className="hover:text-brand-700">Bibliotheque</Link>
          <Link href="/blog" className="hover:text-brand-700">Blog</Link>
          {canSeeGlobalAdminDashboard ? (
            <Link href="/admin/super-dashboard" className="hover:text-brand-700">Dashboard</Link>
          ) : null}
          <button className="hover:text-brand-700" onClick={onLogout}>Deconnexion</button>
        </>
      ) : (
        <Link href="/login" className="hover:text-brand-700">Connexion</Link>
      )}
    </div>
  );
}
