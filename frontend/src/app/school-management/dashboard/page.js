'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken, setSchoolAuth } from '@/lib/schoolAuth';

export default function SchoolManagementDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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

      let syncedAdmin = currentAdmin;
      try {
        const me = await apiClient('/school-management/me', { token });
        if (me?.user) {
          syncedAdmin = {
            ...currentAdmin,
            ...me.user
          };
          setSchoolAuth(token, syncedAdmin);
        }
      } catch (_) {
        // Ignore, fallback to cached admin
      }

      setAdmin(syncedAdmin);

      try {
        setError('');
        const path = syncedAdmin.role === 'SUPER_ADMIN'
          ? '/school-management/dashboard/super-admin'
          : `/school-management/dashboard/schools/${syncedAdmin.schoolId}`;

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

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Tous les champs sont obligatoires.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = getSchoolToken();
      await apiClient('/school-management/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const updatedAdmin = {
        ...(admin || {}),
        mustChangePassword: false
      };
      setAdmin(updatedAdmin);
      setSchoolAuth(token, updatedAdmin);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Mot de passe mis a jour. Tu peux maintenant utiliser toutes les fonctions.');
      setError('');

      if (updatedAdmin.role === 'SUPER_ADMIN') {
        const data = await apiClient('/school-management/dashboard/super-admin', { token });
        setStats(data);
      } else if (updatedAdmin.schoolId) {
        const data = await apiClient(`/school-management/dashboard/schools/${updatedAdmin.schoolId}`, { token });
        setStats(data);
      }
    } catch (e2) {
      setPasswordError(e2.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setPasswordLoading(false);
    }
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
            <>
              <button className="btn-secondary" onClick={() => router.push('/school-management/students-global')}>
                Tous les eleves
              </button>
              <button className="btn-primary" onClick={() => router.push('/school-management/schools')}>
                Ajouter une ecole
              </button>
            </>
          ) : null}
          <button className="btn-secondary" onClick={logout}>Se déconnecter</button>
        </div>
      </section>

      {/* Navigation */}
      {admin?.role !== 'SUPER_ADMIN' && admin?.schoolActive === false ? (
        <section className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-700">Compte école désactivé</h2>
          <p className="mt-2 text-sm text-red-700">
            Ton école est actuellement suspendue. Tu peux te connecter, mais tu ne peux pas gérer les paiements,
            les élèves, les classes ou d autres opérations.
          </p>
          <p className="mt-2 text-sm text-red-700">
            Contacte le responsable de la plateforme LinkEduPro pour réactiver le compte.
          </p>
        </section>
      ) : (
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
              <>
                <button
                  onClick={() => router.push('/school-management/schools')}
                  className="btn-secondary"
                >
                  Gérer les écoles
                </button>
                <button
                  onClick={() => router.push('/school-management/students-global')}
                  className="btn-secondary"
                >
                  Élèves globaux
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {admin?.mustChangePassword ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-brand-900">Changement de mot de passe obligatoire</h2>
          <p className="mt-1 text-sm text-brand-700">
            Avant toute operation, modifie ton mot de passe temporaire.
          </p>
          <form onSubmit={handleChangePassword} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              type="password"
              className="input"
              placeholder="Mot de passe actuel"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              required
            />
            <input
              type="password"
              className="input"
              placeholder="Nouveau mot de passe"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              required
            />
            <input
              type="password"
              className="input"
              placeholder="Confirmer le mot de passe"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary" disabled={passwordLoading}>
                {passwordLoading ? 'Mise a jour...' : 'Modifier le mot de passe'}
              </button>
              {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-green-700">{passwordSuccess}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      {admin?.role !== 'SUPER_ADMIN' && admin?.schoolActive === false ? null : admin?.role === 'SUPER_ADMIN' ? (
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
