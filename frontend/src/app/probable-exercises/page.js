"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function ProbableExercisesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient('/public/probable-exercises')
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e.message || 'Impossible de charger les exercices probables.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Exercices les plus probables</h1>
        <p className="mt-2 text-sm text-brand-700">
          Analyse globale des examens passes pour le niveau NSIV (toutes ecoles confondues).
        </p>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((subjectItem) => (
            <article key={subjectItem.subject} className="card space-y-3">
              <h2 className="text-xl font-semibold text-brand-900">{subjectItem.subject}</h2>
              <div className="space-y-2">
                {(subjectItem.topics || []).map((topicItem) => (
                  <div key={`${subjectItem.subject}_${topicItem.topic}`} className="rounded-lg border border-brand-100 px-3 py-2">
                    <p className="font-semibold text-brand-900">{topicItem.topic}</p>
                    <p className="text-xs text-brand-700">Apparitions: {topicItem.frequency}</p>
                    <p className="text-xs text-brand-700">Classification: {topicItem.classification}</p>
                  </div>
                ))}
                {(subjectItem.topics || []).length === 0 ? (
                  <p className="text-sm text-brand-700">Aucune donnee disponible.</p>
                ) : null}
              </div>
            </article>
          ))}
          {items.length === 0 ? <p className="text-sm text-brand-700">Aucune donnee NSIV disponible pour le moment.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
