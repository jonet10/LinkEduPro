"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';
import HomeCarousel from '@/components/HomeCarousel';
import VerifiedTestimonials from '@/components/VerifiedTestimonials';

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
      <section className="space-y-8">
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">🎉 Rejoins LinkEduPro — Inscris-toi et démarre les quiz !</p>
            <Link href="/register" className="btn-primary">S'inscrire</Link>
          </div>
        </div>

        <HomeCarousel />

        <section className="card" aria-labelledby="cta-title">
          <h2 id="cta-title" className="text-2xl font-bold text-brand-900">Prêt à progresser dès aujourd'hui ?</h2>
          <p className="mt-2 text-sm text-brand-700">
            Lance un quiz, découvre les séries disponibles et commence ton entraînement.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">Commencer un Quiz</Link>
            <Link href="/subjects" className="btn-secondary">Explorer les Quiz</Link>
            <Link href="/register" className="btn-secondary">Créer un compte</Link>
          </div>
        </section>

        <section className="card" aria-labelledby="features-title">
          <h2 id="features-title" className="mb-4 text-2xl font-bold text-brand-900">Fonctionnalités principales</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Quiz interactifs</h3>
              <p className="mt-2 text-sm text-brand-700">Questions dynamiques, chronomètre et correction immédiate.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Statistiques</h3>
              <p className="mt-2 text-sm text-brand-700">Suivi des scores, moyenne par matière et progression.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Profils</h3>
              <p className="mt-2 text-sm text-brand-700">Profil élève avec niveau, école et historique des tentatives.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Opportunités</h3>
              <p className="mt-2 text-sm text-brand-700">Concours actifs, annonces académiques et recommandations ciblées.</p>
            </article>
          </div>
        </section>

        <VerifiedTestimonials />
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
            {community.leaderboard.length === 0 ? <p>Aucune donnée pour le moment.</p> : null}
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
            {community.schools.length === 0 ? <p>Aucune donnée pour le moment.</p> : null}
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