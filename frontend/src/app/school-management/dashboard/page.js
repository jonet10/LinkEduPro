'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolManagementDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();

      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);

      try {
        setError('');
        const path = currentAdmin.role === 'SUPER_ADMIN'
          ? '/school-management/dashboard/super-admin'
          : `/school-management/dashboard/schools/${currentAdmin.schoolId}`;

        const data = await apiClient(path, { token });
        setStats(data);
      } catch (e) {
        setError(e.message || 'Impossible de charger le dashboard.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  function logout() {
    clearSchoolAuth();
    router.push('/school-management/login');
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-10">Chargement du dashboard...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Espace School Management</p>
          <h1 className="text-2xl font-bold text-brand-900">
            {admin?.role === 'SUPER_ADMIN' ? 'Dashboard Super Admin School' : 'Dashboard Admin Ecole'}
          </h1>
          <p className="text-sm text-brand-700">Connecte: {admin?.email}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>Se deconnecter</button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}

      {admin?.role === 'SUPER_ADMIN' ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card"><p className="text-sm">Total ecoles</p><p className="text-3xl font-black">{stats?.totalSchools ?? 0}</p></article>
          <article className="card"><p className="text-sm">Eleves ecoles</p><p className="text-3xl font-black">{stats?.totalSchoolStudents ?? 0}</p></article>
          <article className="card"><p className="text-sm">Volume paiements</p><p className="text-3xl font-black">{String(stats?.globalPaymentVolume ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Activite ecoles</p><p className="text-3xl font-black">{stats?.schoolActivity?.length ?? 0}</p></article>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="card"><p className="text-sm">Total eleves</p><p className="text-3xl font-black">{stats?.totalStudents ?? 0}</p></article>
          <article className="card"><p className="text-sm">Total classes</p><p className="text-3xl font-black">{stats?.totalClasses ?? 0}</p></article>
          <article className="card"><p className="text-sm">Paiements du jour</p><p className="text-3xl font-black">{String(stats?.paymentsToday ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Revenus mensuels</p><p className="text-3xl font-black">{String(stats?.monthlyRevenue ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Eleves en retard</p><p className="text-3xl font-black">{stats?.lateStudents ?? 0}</p></article>
        </section>
      )}
    </main>
  );
}
