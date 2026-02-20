"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudent, getToken, isNsivStudent } from '@/lib/auth';

const WEEKLY_PLAN = [
  { week: 'Semaine 1', chimie: 'M1', physique: 'M1', focus: 'Bases + révision active' },
  { week: 'Semaine 2', chimie: 'M2', physique: 'M2', focus: 'Exercices de calcul' },
  { week: 'Semaine 3', chimie: 'M3', physique: 'M3', focus: 'Méthodologie + récap' },
  { week: 'Semaine 4', chimie: 'M4', physique: 'M4', focus: 'Serie d\'applications' },
  { week: 'Semaine 5', chimie: 'M5', physique: 'M5', focus: 'Problèmes types bac' },
  { week: 'Semaine 6', chimie: 'M6', physique: 'M6', focus: 'Consolidation des notions' },
  { week: 'Semaine 7', chimie: 'M7', physique: 'M7', focus: 'Révision ciblée' },
  { week: 'Semaine 8', chimie: 'M8', physique: 'M8', focus: 'Simulation bac + correction' }
];

export default function NsivPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const student = useMemo(() => getStudent(), []);
  const token = useMemo(() => getToken(), []);
  const nsivAccess = isNsivStudent(student);
  const nsivTrack = String(student?.nsivTrack || 'ORDINAIRE').toUpperCase();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!nsivAccess) {
      router.push('/subjects');
      return;
    }
    setReady(true);
  }, [token, nsivAccess, router]);

  if (!ready) {
    return <p>Chargement de l’espace NSIV...</p>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Terminale</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">Espace NSIV</h1>
        <p className="mt-2 text-sm text-brand-700">
          Rubriques organisées pour préparer le bac: cours structurés, exercices probables et progression hebdomadaire.
        </p>
        <p className="mt-2 text-sm font-semibold text-brand-800">Filiere selectionnee: {nsivTrack}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/probable-exercises" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Exercices probables</h2>
          <p className="mt-2 text-sm text-brand-700">Sujets les plus fréquents analysés à partir des épreuves.</p>
        </Link>
        <Link href="/focus" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Focus</h2>
          <p className="mt-2 text-sm text-brand-700">Sessions Pomodoro et musique de concentration.</p>
        </Link>
        <Link href="/rattrapage" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Rattrapage Google Meet</h2>
          <p className="mt-2 text-sm text-brand-700">Sessions planifiées par professeur ou admin.</p>
        </Link>
        <Link href="/library" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Bibliothèque</h2>
          <p className="mt-2 text-sm text-brand-700">Supports PDF et ressources de révision.</p>
        </Link>
        <Link href="/subjects" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Histoire-Géographie</h2>
          <p className="mt-2 text-sm text-brand-700">Quiz alignés sur les thèmes des documents Hist-Géo.</p>
        </Link>
        <Link href="/subjects" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Connaissance générale</h2>
          <p className="mt-2 text-sm text-brand-700">Culture générale utile pour la filière ordinaire et toutes les séries.</p>
        </Link>
        <Link href="/progress" className="card hover:bg-brand-50">
          <h2 className="text-xl font-semibold text-brand-900">Mon progrès</h2>
          <p className="mt-2 text-sm text-brand-700">Suivi des performances et points à renforcer.</p>
        </Link>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">Recommandations selon ta filiere</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brand-700">
          {nsivTrack === 'SVT' ? (
            <>
              <li>Priorise Histoire-Géographie et Connaissance générale en complément des sciences.</li>
              <li>Fais 1 quiz Hist-Géo puis 1 quiz scientifique par session de révision.</li>
            </>
          ) : null}
          {nsivTrack === 'SMP' ? (
            <>
              <li>Combine Physique/Mathématiques avec une session régulière de culture générale.</li>
              <li>Utilise les rubriques Hist-Géo pour renforcer les compétences transversales.</li>
            </>
          ) : null}
          {nsivTrack !== 'SVT' && nsivTrack !== 'SMP' ? (
            <>
              <li>Commence par les rubriques Connaissance générale et Histoire-Géographie.</li>
              <li>Ajoute progressivement les autres matières selon ton plan hebdomadaire.</li>
            </>
          ) : null}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">Plan de progression recommandé (8 semaines)</h2>
        <p className="mt-2 text-sm text-brand-700">Ordre recommandé pour avancer en Chimie et Physique sans sauter les bases.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="px-2 py-2 font-semibold text-brand-900">Période</th>
                <th className="px-2 py-2 font-semibold text-brand-900">Chimie</th>
                <th className="px-2 py-2 font-semibold text-brand-900">Physique</th>
                <th className="px-2 py-2 font-semibold text-brand-900">Objectif</th>
              </tr>
            </thead>
            <tbody>
              {WEEKLY_PLAN.map((row) => (
                <tr key={row.week} className="border-b border-brand-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{row.week}</td>
                  <td className="px-2 py-2 text-brand-700">{row.chimie}</td>
                  <td className="px-2 py-2 text-brand-700">{row.physique}</td>
                  <td className="px-2 py-2 text-brand-700">{row.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
