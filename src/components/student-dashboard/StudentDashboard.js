"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { estimateSuccessProbability, toPercent } from './utils';

export default function StudentDashboard({
  student,
  progress,
  dailyObjective,
  trackLabel,
  overallPercent,
  community
}) {
  const router = useRouter();
  const successProbability = useMemo(
    () => estimateSuccessProbability(progress?.overview?.averageScore || overallPercent),
    [progress?.overview?.averageScore, overallPercent]
  );

  const communityCount = Array.isArray(community?.recent) ? community.recent.length : 0;
  const overallPct = toPercent(overallPercent, 0);

  const objective = dailyObjective || {
    title: 'Objectif du jour',
    description: 'Fais 1 série de quiz puis révise 20 minutes.',
    ctaLabel: 'Commencer',
    ctaHref: '/subjects'
  };

  const subjectRows = useMemo(() => {
    const rows = Array.isArray(progress?.subjectStats) ? progress.subjectStats : [];
    return [...rows]
      .map((row) => ({
        subject: String(row?.subject || 'Rubrique').trim(),
        score: toPercent(row?.average, 0),
        attempts: Number(row?.attempts || 0)
      }))
      .filter((row) => row.subject)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [progress?.subjectStats]);

  return (
    <section className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Dashboard élève</p>
            <h1 className="mt-2 text-3xl font-black text-brand-900">Bienvenue, {student?.firstName || 'Élève'}.</h1>
            <p className="mt-2 text-sm text-brand-700">
              Filière: {trackLabel || 'Général'} · Préparation estimée: <span className="font-bold">{successProbability}%</span>
            </p>
          </div>
          <div className="min-w-[240px] rounded-2xl border border-brand-100 bg-white/60 p-4">
            <p className="text-xs font-semibold text-brand-700">Progression globale</p>
            <p className="mt-2 text-3xl font-black text-brand-900">{overallPct}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-600"
                style={{ width: `${overallPct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-brand-900">Raccourcis</h2>
            {communityCount ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                {Math.min(99, communityCount)} nouveau(x) post(s)
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/subjects" className="rounded-2xl border border-brand-100 bg-white/70 p-4 hover:bg-brand-50">
              <p className="text-sm font-bold text-brand-900">Quiz & rubriques</p>
              <p className="mt-1 text-xs text-brand-700">Choisir une matière et s'entraîner.</p>
            </Link>
            <Link href="/video-lessons" className="rounded-2xl border border-brand-100 bg-white/70 p-4 hover:bg-brand-50">
              <p className="text-sm font-bold text-brand-900">Classe numérique</p>
              <p className="mt-1 text-xs text-brand-700">Vidéos pédagogiques par classe.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-2xl border border-brand-100 bg-white/70 p-4 hover:bg-brand-50">
              <p className="text-sm font-bold text-brand-900">Examens passés</p>
              <p className="mt-1 text-xs text-brand-700">Annales organisées par année.</p>
            </Link>
            <Link href="/library" className="rounded-2xl border border-brand-100 bg-white/70 p-4 hover:bg-brand-50">
              <p className="text-sm font-bold text-brand-900">Bibliothèque</p>
              <p className="mt-1 text-xs text-brand-700">PDF, fiches, supports.</p>
            </Link>
          </div>
        </section>

        <section className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Objectif</p>
          <h2 className="mt-2 text-xl font-semibold text-brand-900">{objective.title}</h2>
          <p className="mt-2 text-sm text-brand-700">{objective.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => router.push('/messages')}>
              Messages
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push(objective.ctaHref || '/subjects')}>
              {objective.ctaLabel || 'Commencer'}
            </button>
          </div>
        </section>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">Meilleures matières</h2>
        <p className="mt-1 text-sm text-brand-700">Basé sur tes résultats récents.</p>
        {subjectRows.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {subjectRows.map((row) => (
              <div key={row.subject} className="rounded-2xl border border-brand-100 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-brand-900">{row.subject}</p>
                  <p className="text-sm font-black text-brand-900">{row.score}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.score}%` }} aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs text-brand-700">{row.attempts} tentative(s)</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-brand-700">Pas assez de données. Lance quelques quiz pour voir tes stats.</p>
        )}
      </section>
    </section>
  );
}
