'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${Math.max(0, Math.min(100, amount))}%`;
}

export default function FormationsProgressPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await apiClient('/formations', { token });
        if (!mounted) return;
        const list = Array.isArray(data.formations) ? data.formations : [];
        setFormations(list.filter((f) => f.enrolled));
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Impossible de charger la progression.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ma progression</h1>
          <p className="text-sm text-slate-600">Suivi de vos formations certifiantes.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          onClick={() => router.back()}
        >
          Retour
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Chargement...</p> : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 space-y-4">
        {formations.map((formation) => (
          <div key={formation.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{formation.title}</h2>
                <p className="text-sm text-slate-600">{formation.shortDescription}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {formation.enrollmentStatus || 'ENROLLED'}
              </span>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: formatPercent(formation.progressPercent) }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Progression</span>
                <span>{formatPercent(formation.progressPercent)}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && !formations.length ? (
          <p className="text-sm text-slate-500">Aucune formation suivie pour le moment.</p>
        ) : null}
      </div>
    </main>
  );
}
