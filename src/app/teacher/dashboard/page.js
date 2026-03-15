"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function formatHTG(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 2
  }).format(amount);
}

function compactNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const isTeacher = student?.role === 'TEACHER';
  const isAdmin = student?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (isAdmin) {
      router.push('/admin/super-dashboard');
      return;
    }
    if (!isTeacher) {
      router.push('/rattrapage');
      return;
    }
    let mounted = true;
    apiClient('/catchup/dashboard/teacher', { token })
      .then((data) => {
        if (!mounted) return;
        setDashboard(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError('');
        setDashboard({
          summary: {},
          revenuesBySession: [],
          statsByLevel: [],
          library: { revenuesByBook: [] }
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, isTeacher, isAdmin, router]);

  const summary = dashboard?.summary || {};
  const sessionRevenues = dashboard?.revenuesBySession || [];
  const levelStats = dashboard?.statsByLevel || [];
  const topBooks = dashboard?.library?.revenuesByBook || [];

  return (
    <section className="space-y-5 rattrapage-shell">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Revenus professeur</h1>
        <p className="mt-2 text-sm text-brand-700">
          Suivi des revenus (livres + rattrapages), ventes et activité de tes sessions.
        </p>
        <div className="mt-4">
          <Link href="/rattrapage" className="btn-secondary">Retour aux rattrapages</Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenu total</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">Livres + rattrapages</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenus livres</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalLibraryRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalLibrarySales)} vente(s)</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenus rattrapages</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalRemedialRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalSessions)} session(s)</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Commission plateforme</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalCommission)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalStudents)} inscription(s) élève</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-brand-900">Top revenus rattrapages</h2>
              <div className="mt-3 space-y-2">
                {sessionRevenues.slice(0, 8).map((session) => (
                  <div key={session.sessionId} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                    <p className="font-semibold text-brand-900">{session.title}</p>
                    <p className="text-xs text-brand-700">{session.subject} • {session.level} • {session.enrollments} inscrit(s)</p>
                    <p className="mt-1 text-sm text-brand-900">Revenu: {formatHTG(session.revenue)}</p>
                  </div>
                ))}
                {sessionRevenues.length === 0 ? <p className="text-sm text-brand-700">Aucun revenu session pour le moment.</p> : null}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-brand-900">Livres vendus</h2>
              <div className="mt-3 space-y-2">
                {topBooks.slice(0, 8).map((book) => (
                  <div key={book.bookId} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                    <p className="font-semibold text-brand-900">{book.title}</p>
                    <p className="text-xs text-brand-700">{book.salesCount} vente(s)</p>
                    <p className="mt-1 text-sm text-brand-900">Revenu: {formatHTG(book.revenue)}</p>
                  </div>
                ))}
                {topBooks.length === 0 ? <p className="text-sm text-brand-700">Aucune vente de livre pour le moment.</p> : null}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-brand-900">Activité par niveau</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {levelStats.map((row) => (
                <article key={row.level} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{row.level}</p>
                  <p className="mt-1 text-sm text-brand-900">{row.sessions} session(s)</p>
                  <p className="text-sm text-brand-700">{row.enrollments} inscription(s)</p>
                </article>
              ))}
              {levelStats.length === 0 ? <p className="text-sm text-brand-700">Aucune donnée de niveau disponible.</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
