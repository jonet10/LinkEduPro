"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken, isNsivStudent } from '@/lib/auth';

function normalizeSubjectName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function scoreSubjectForTrack(subjectName, track) {
  const normalized = normalizeSubjectName(subjectName);
  const nsivTrack = String(track || 'ORDINAIRE').toUpperCase();

  let score = 0;
  if (normalized.includes('annales')) score += 3;
  if (normalized.includes('connaissance generale')) score += 2;

  if (nsivTrack === 'SVT') {
    if (normalized.includes('svt')) score += 8;
    if (normalized.includes('chimie')) score += 3;
    if (normalized.includes('histoire')) score += 3;
    if (normalized.includes('physique')) score += 2;
  } else if (nsivTrack === 'SMP') {
    if (normalized.includes('physique')) score += 8;
    if (normalized.includes('chimie')) score += 5;
    if (normalized.includes('svt')) score += 2;
    if (normalized.includes('histoire')) score += 2;
  } else if (nsivTrack === 'SES' || nsivTrack === 'LLA') {
    if (normalized.includes('histoire')) score += 8;
    if (normalized.includes('connaissance generale')) score += 5;
    if (normalized.includes('svt')) score += 2;
    if (normalized.includes('chimie')) score += 1;
  } else {
    if (normalized.includes('connaissance generale')) score += 7;
    if (normalized.includes('histoire')) score += 5;
    if (normalized.includes('physique')) score += 3;
    if (normalized.includes('chimie')) score += 3;
    if (normalized.includes('svt')) score += 3;
  }

  return score;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [canSeeProbableExercises, setCanSeeProbableExercises] = useState(false);
  const [isNsivSectionVisible, setIsNsivSectionVisible] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const currentStudent = useMemo(() => getStudent(), []);
  const nsivTrack = String(currentStudent?.nsivTrack || 'ORDINAIRE').toUpperCase();
  const visibleSubjects = useMemo(() => {
    const filtered = !isNsivSectionVisible ? subjects : subjects.filter((subject) => {
      const normalized = normalizeSubjectName(subject.name);
      return normalized !== 'sciences' && normalized !== 'francais';
    });

    if (!isNsivSectionVisible) return filtered;

    const scored = filtered.map((subject) => ({
      ...subject,
      _trackScore: scoreSubjectForTrack(subject.name, nsivTrack)
    }));

    scored.sort((a, b) => b._trackScore - a._trackScore || a.name.localeCompare(b.name));
    return scored;
  }, [subjects, isNsivSectionVisible, nsivTrack]);

  useEffect(() => {
    const token = getToken();
    const student = getStudent();
    if (!token) {
      router.push('/login');
      return;
    }
    const isNsiv = isNsivStudent(student);
    setIsNsivSectionVisible(Boolean(isNsiv));
    setCanSeeProbableExercises(student?.role !== 'STUDENT' || isNsiv);

    apiClient('/subjects', { token })
      .then(setSubjects)
      .catch((e) => setError(e.message || 'Impossible de charger les matières'));
  }, [router]);

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold text-brand-900">Catalogue des rubriques</h1>
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {canSeeProbableExercises && !isNsivSectionVisible ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Exercices les plus probables</h2>
          <p className="mt-2 text-sm text-brand-700">Analyse NSIV des sujets les plus fréquents par matière.</p>
          <Link href="/probable-exercises" className="btn-primary mt-4 inline-block">Voir la rubrique</Link>
        </article>
      ) : null}
      {isNsivSectionVisible ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques NSIV</h2>
          <p className="mt-2 text-sm text-brand-700">
            Accès rapide aux contenus structurés pour la classe NSIV.
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-800">Filiere active: {nsivTrack}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link href="/nsiv" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Espace NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Vue complète des rubriques NSIV.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Exercices les plus probables</p>
              <p className="mt-1 text-sm text-brand-700">Analyse des sujets récurrents du Bac NSIV.</p>
            </Link>
            <Link href="/focus" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Focus & entraînement</p>
              <p className="mt-1 text-sm text-brand-700">Sessions de concentration et suivi quotidien.</p>
            </Link>
            <Link href="/rattrapage" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Rattrapage Google Meet</p>
              <p className="mt-1 text-sm text-brand-700">Cours de rattrapage planifiés pour NSIV.</p>
            </Link>
            <Link href="/subjects" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Histoire-Géographie NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Nouveaux quiz basés sur vos documents Hist-Géo.</p>
            </Link>
            <Link href="/subjects" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Connaissance générale NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Rubrique culture générale pour toutes les filières.</p>
            </Link>
          </div>
        </article>
      ) : null}
      <section className="card">
        <h2 className="text-xl font-semibold text-brand-900">Rubriques disponibles</h2>
        <p className="mt-2 text-sm text-brand-700">
          {isNsivSectionVisible
            ? 'Sélection adaptée au niveau NSIV. Chaque rubrique contient des contenus et des quiz.'
            : 'Sélection générale des rubriques disponibles. Chaque rubrique contient des contenus et des quiz.'}
        </p>
        {isNsivSectionVisible ? (
          <p className="mt-1 text-xs font-semibold text-brand-700">
            Affichage priorise pour ta filiere ({nsivTrack}).
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <article key={subject.id} className="card">
              <h2 className="text-xl font-semibold text-brand-900">{subject.name}</h2>
              <p className="mt-2 text-sm text-brand-700">{subject.description}</p>
              <p className="mt-3 text-xs font-semibold text-brand-500">{subject.questionCount} questions disponibles</p>
              <Link href={`/quiz/${subject.id}`} className="btn-primary mt-4 inline-block">Ouvrir la rubrique</Link>
            </article>
          ))}
          {visibleSubjects.length === 0 ? (
            <p className="text-sm text-brand-700">Aucune matière disponible pour le moment.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
