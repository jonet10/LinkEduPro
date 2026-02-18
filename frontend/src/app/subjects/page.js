"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [canSeeProbableExercises, setCanSeeProbableExercises] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const student = getStudent();
    if (!token) {
      router.push('/login');
      return;
    }
    setCanSeeProbableExercises(student?.role !== 'STUDENT' || student?.academicLevel === 'NSIV');

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
