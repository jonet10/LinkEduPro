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
      const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT'];

      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (!allowedRoles.includes(currentAdmin.role)) {
        clearSchoolAuth();
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
            {admin?.role === 'SUPER_ADMIN' ? 'Dashboard Super Admin School' : 'Dashboard Admin École'}
          </h1>
          <p className="text-sm text-brand-700">Connecté: {admin?.email}</p>
        </div>
        <div className="flex gap-2">
          {admin?.role === 'SUPER_ADMIN' ? (
            <button className="btn-primary" onClick={() => router.push('/school-management/schools')}>
              Ajouter une ecole
            </button>
          ) : null}
          <button className="btn-secondary" onClick={logout}>Se déconnecter</button>
        </div>
      </section>

      {/* Navigation */}
      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          {admin?.role !== 'SUPER_ADMIN' && (
            <>
              <button
                onClick={() => router.push('/school-management/payments')}
                className="btn-secondary"
              >
                Gérer les paiements
              </button>
              <button
                onClick={() => router.push('/school-management/students')}
                className="btn-secondary"
              >
                Gérer les élèves
              </button>
              <button
                onClick={() => router.push('/school-management/classes')}
                className="btn-secondary"
              >
                Gérer les classes
              </button>
            </>
          )}
          {admin?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => router.push('/school-management/schools')}
              className="btn-secondary"
            >
              Gérer les écoles
            </button>
          )}
        </div>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}

      {admin?.role === 'SUPER_ADMIN' ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card"><p className="text-sm">Total écoles</p><p className="text-3xl font-black">{stats?.totalSchools ?? 0}</p></article>
          <article className="card"><p className="text-sm">Élèves écoles</p><p className="text-3xl font-black">{stats?.totalSchoolStudents ?? 0}</p></article>
          <article className="card"><p className="text-sm">Volume paiements</p><p className="text-3xl font-black">{String(stats?.globalPaymentVolume ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Activité écoles</p><p className="text-3xl font-black">{stats?.schoolActivity?.length ?? 0}</p></article>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="card"><p className="text-sm">Total élèves</p><p className="text-3xl font-black">{stats?.totalStudents ?? 0}</p></article>
          <article className="card"><p className="text-sm">Total classes</p><p className="text-3xl font-black">{stats?.totalClasses ?? 0}</p></article>
          <article className="card"><p className="text-sm">Paiements du jour</p><p className="text-3xl font-black">{String(stats?.paymentsToday ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Revenus mensuels</p><p className="text-3xl font-black">{String(stats?.monthlyRevenue ?? 0)}</p></article>
          <article className="card"><p className="text-sm">Eleves en retard</p><p className="text-3xl font-black">{stats?.lateStudents ?? 0}</p></article>
        </section>
      )}
    </main>
  );
}
