"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [community, setCommunity] = useState({ leaderboard: [], recent: [], schools: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    const me = getStudent();
    setStudent(me);
    setIsAuthed(Boolean(token));

    if (!token) {
      setReady(true);
      return;
    }

    apiClient('/results/community', { token })
      .then((data) => {
        setCommunity(data);
        setReady(true);
      })
      .catch((e) => {
        setError(e.message || 'Erreur de chargement des données communautaires');
        setReady(true);
      });
  }, []);

  if (!ready) return <p>Chargement...</p>;

  if (!isAuthed) {
    return (
      <section className="grid gap-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-brand-900">L'éducation connectée</p>
          <h1 className="mb-4 text-4xl font-black leading-tight text-brand-900">Réviser, simuler, progresser avec LinkEduPro</h1>
          <p className="mb-6 text-brand-700">Module élève: quiz par matière, examens chronométrés, score automatique et suivi précis des progrès.</p>
          <div className="flex gap-3">
            <Link href="/register" className="btn-primary">Commencer</Link>
            <Link href="/login" className="btn-secondary">Se connecter</Link>
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 text-lg font-bold">Ce que vous obtenez</h2>
          <ul className="space-y-2 text-sm text-brand-900">
            <li>- Catalogue de matières</li>
            <li>- Quiz interactifs et notation immédiate</li>
            <li>- Simulation d'examen chronométrée</li>
            <li>- Tableau de bord de progression</li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <p className="text-sm text-brand-700">Bienvenue</p>
        <h1 className="text-3xl font-black text-brand-900">
          {student ? `${student.firstName} ${student.lastName}` : 'Espace élève'}
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          Compare tes performances avec d'autres élèves et découvre les écoles les plus actives.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/subjects" className="btn-primary">Commencer un quiz</Link>
          <Link href="/progress" className="btn-secondary">Voir mes progrès</Link>
        </div>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">Classement élèves</h2>
          <div className="space-y-2 text-sm">
            {community.leaderboard.map((row, idx) => (
              <div key={`${row.studentId}_${idx}`} className="flex flex-wrap items-center justify-between rounded border border-brand-100 px-3 py-2">
                <span className="font-semibold">#{idx + 1} {row.displayName}</span>
                <span>{row.school}</span>
                <span>Moyenne: {row.average}%</span>
                <span>Meilleur: {row.best}%</span>
              </div>
            ))}
            {community.leaderboard.length === 0 ? <p>Aucune donnee pour le moment.</p> : null}
          </div>
        </article>

        <article className="card">
          <h2 className="mb-3 text-xl font-semibold">Écoles en tête</h2>
          <div className="space-y-2 text-sm">
            {community.schools.map((s, idx) => (
              <div key={`${s.school}_${idx}`} className="rounded border border-brand-100 px-3 py-2">
                <p className="font-semibold">#{idx + 1} {s.school}</p>
                <p>{s.students} élève(s) | moyenne {s.average}%</p>
              </div>
            ))}
            {community.schools.length === 0 ? <p>Aucune donnee pour le moment.</p> : null}
          </div>
        </article>
      </div>

      <article className="card">
        <h2 className="mb-3 text-xl font-semibold">Activité récente</h2>
        <div className="space-y-2 text-sm">
          {community.recent.map((a) => (
            <div key={a.attemptId} className={`flex flex-wrap items-center justify-between rounded border px-3 py-2 ${a.mine ? 'border-brand-500 bg-brand-50' : 'border-brand-100'}`}>
              <span className="font-semibold">{a.displayName} - {a.school}</span>
              <span>{a.subject}</span>
              <span>{a.percentage}%</span>
              <span>{new Date(a.finishedAt).toLocaleString()}</span>
            </div>
          ))}
          {community.recent.length === 0 ? <p>Aucune tentative récente.</p> : null}
        </div>
      </article>
    </section>
  );
}
