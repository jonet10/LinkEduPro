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
  const [passwordsuccess, setPasswordsuccess] = useState('');

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
    router.push('/');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordsuccess('');

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
      setPasswordsuccess('Mot de passe mis à jour. Tu peux maintenant utiliser toutes les fonctions.');
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

  const maxMonthly = Math.max(...(stats?.monthlySeries || []).map((item) => Number(item.amount || 0)), 1);
  const kpiCards = [
    { label: 'Total élèves', value: stats?.totalStudents ?? 0 },
    { label: 'Total classes', value: stats?.totalClasses ?? 0 },
    { label: 'Paiements du jour', value: String(stats?.paymentsToday ?? 0) },
    { label: 'Revenus mensuels', value: String(stats?.monthlyRevenue ?? 0) },
    { label: 'Élèves en retard', value: stats?.lateStudents ?? 0 },
    { label: 'Notes saisies', value: `${stats?.notesCompletion ?? 0}%` },
    { label: 'Bulletins générés', value: stats?.reportCardsCount ?? 0 }
  ];

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
                Tous les Élèves
              </button>
              <button className="btn-primary" onClick={() => router.push('/school-management/schools')}>
                Ajouter une École
              </button>
            </>
          ) : null}
          <button className="btn-secondary" onClick={logout}>Se déconnecter</button>
        </div>
      </section>

      {/* Suspension */}
      {admin?.role !== 'SUPER_ADMIN' && admin?.schoolActive === false ? (
        <section className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-700">Compte école désactivé</h2>
          <p className="mt-2 text-sm text-red-700">
            Ton école est actuellement suspendue. Tu peux te connecter, mais tu ne peux pas gérer les paiements,
            les élèves, les classes ou d'autres opérations.
          </p>
          <p className="mt-2 text-sm text-red-700">
            Contacte le responsable de la plateforme LinkEduPro pour réactiver le compte.
          </p>
        </section>
      ) : null}

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {admin?.mustChangePassword ? (
        <section className="card">
          <h2 className="text-lg font-semibold text-brand-900">Changement de mot de passe obligatoire</h2>
          <p className="mt-1 text-sm text-brand-700">
            Avant toute opération, modifie ton mot de passe temporaire.
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
                {passwordLoading ? 'Mise à jour...' : 'Modifier le mot de passe'}
              </button>
              {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
              {passwordsuccess ? <p className="text-sm text-green-700">{passwordsuccess}</p> : null}
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
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => (
              <article key={card.label} className="rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-brand-900">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-900">Vue d'ensemble des paiements</h3>
                <p className="text-xs text-brand-600">6 derniers mois</p>
              </div>
              <div className="mt-4 flex items-end gap-3">
                {(stats?.monthlySeries || []).map((row) => (
                  <div key={row.month} className="flex flex-1 flex-col items-center">
                    <div
                      className="w-full rounded-lg bg-brand-600"
                      style={{ height: Math.max(8, Math.round((Number(row.amount || 0) / maxMonthly) * 160)) }}
                    />
                    <p className="mt-2 text-[11px] text-brand-600">{String(row.month).slice(5)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-brand-900">Élèves récemment inscrits</h3>
              <div className="mt-3 space-y-2 text-sm text-brand-700">
                {(stats?.recentStudents || []).length === 0 ? (
                  <p>Aucun élève récent.</p>
                ) : (
                  stats.recentStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-xl border border-brand-100 bg-white/60 px-3 py-2">
                      <span>{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-brand-500">{new Date(student.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-semibold text-brand-900">Suivi des notes & bulletins</h3>
              <div className="mt-3 space-y-2 text-sm text-brand-700">
                {(stats?.recentReportCards || []).length === 0 ? (
                  <p>Aucun bulletin généré récemment.</p>
                ) : (
                  stats.recentReportCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between rounded-xl border border-brand-100 bg-white/60 px-3 py-2">
                      <span>Bulletin {card.period} - {card.student?.firstName} {card.student?.lastName}</span>
                      <span className="text-xs text-brand-500">{new Date(card.generatedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
            <article className="rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-brand-900">Absences aujourd'hui</h3>
              <p className="mt-4 text-3xl font-bold text-brand-900">0</p>
              <p className="text-xs text-brand-600">À configurer (module absentéisme).</p>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
