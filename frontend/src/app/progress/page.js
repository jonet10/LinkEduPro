"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    apiClient('/results/progress', { token })
      .then(setData)
      .catch((e) => setError(e.message || 'Erreur chargement progression'));
  }, [router]);

  if (!data && !error) return <p>Chargement...</p>;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-900">Tableau de bord des progres</h1>
      {error ? <p className="text-red-600">{error}</p> : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <p className="text-sm text-brand-700">Nombre total de tentatives</p>
              <p className="text-3xl font-black text-brand-900">{data.overview.totalAttempts}</p>
            </div>
            <div className="card">
              <p className="text-sm text-brand-700">Score moyen global</p>
              <p className="text-3xl font-black text-brand-900">{data.overview.averageScore}%</p>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-3 text-xl font-semibold">Statistiques par matiere</h2>
            <div className="space-y-2 text-sm">
              {data.subjectStats.map((s) => (
                <div key={s.subject} className="flex flex-wrap items-center justify-between rounded border border-brand-100 px-3 py-2">
                  <span className="font-semibold">{s.subject}</span>
                  <span>Tentatives: {s.attempts}</span>
                  <span>Moyenne: {s.average}%</span>
                  <span>Meilleur: {s.best}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-3 text-xl font-semibold">Dernieres tentatives</h2>
            <div className="space-y-2 text-sm">
              {data.recentAttempts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between rounded border border-brand-100 px-3 py-2">
                  <span className="font-semibold">{a.subject}</span>
                  <span>{a.score}/{a.totalQuestions}</span>
                  <span>{a.percentage}%</span>
                  <span>{new Date(a.finishedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
