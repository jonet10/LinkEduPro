"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken, isNsivStudent } from '@/lib/auth';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [canSeeProbableExercises, setCanSeeProbableExercises] = useState(false);
  const [isNsivStudent, setIsNsivStudent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const student = getStudent();
    if (!token) {
      router.push('/login');
      return;
    }
    const isNsiv = isNsivStudent(student);
    setIsNsivStudent(Boolean(isNsiv));
    setCanSeeProbableExercises(student?.role !== 'STUDENT' || isNsiv);

    apiClient('/subjects', { token })
      .then(setSubjects)
      .catch((e) => setError(e.message || 'Impossible de charger les matières'));
  }, [router]);

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold text-brand-900">Catalogue des matières</h1>
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {canSeeProbableExercises ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Exercices les plus probables</h2>
          <p className="mt-2 text-sm text-brand-700">Analyse NSIV des sujets les plus frequents par matiere.</p>
          <Link href="/probable-exercises" className="btn-primary mt-4 inline-block">Voir la rubrique</Link>
        </article>
      ) : null}
      {isNsivStudent ? (
        <article className="card mb-4">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques NSIV</h2>
          <p className="mt-2 text-sm text-brand-700">
            Acces rapide aux contenus structures pour la classe NSIV.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link href="/nsiv" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Espace NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Vue complete des rubriques NSIV.</p>
            </Link>
            <Link href="/study-plans?subject=Chimie" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Plan de cours Chimie NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Chapitres ordonnes + notes + exercices.</p>
            </Link>
            <Link href="/study-plans?subject=Physique" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Plan de cours Physique NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Chapitres ordonnes + notes + exercices.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Exercices les plus probables</p>
              <p className="mt-1 text-sm text-brand-700">Analyse des sujets recurrents du Bac NSIV.</p>
            </Link>
            <Link href="/focus" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50">
              <p className="font-semibold text-brand-900">Focus & entrainement</p>
              <p className="mt-1 text-sm text-brand-700">Sessions de concentration et suivi quotidien.</p>
            </Link>
          </div>
        </article>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <article key={subject.id} className="card">
            <h2 className="text-xl font-semibold text-brand-900">{subject.name}</h2>
            <p className="mt-2 text-sm text-brand-700">{subject.description}</p>
            <p className="mt-3 text-xs font-semibold text-brand-500">{subject.questionCount} questions disponibles</p>
            <Link href={`/quiz/${subject.id}`} className="btn-primary mt-4 inline-block">Lancer le quiz</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
