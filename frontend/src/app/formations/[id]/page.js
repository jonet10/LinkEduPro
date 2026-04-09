'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function FormationDetailPage({ params }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
  }, [router]);

  useEffect(() => {
    if (!token || !params?.id) return;
    let mounted = true;
    async function loadFormation() {
      try {
        setLoading(true);
        setError('');
        const data = await apiClient(`/formations/${params.id}`, { token });
        if (!mounted) return;
        setFormation(data.formation || null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Impossible de charger la formation.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFormation();
    return () => {
      mounted = false;
    };
  }, [token, params?.id]);

  async function enroll() {
    if (!token || !formation) return;
    try {
      setActionLoading(true);
      setMessage('');
      setError('');
      await apiClient(`/formations/${formation.id}/enroll`, { method: 'POST', token });
      const data = await apiClient(`/formations/${formation.id}`, { token });
      setFormation(data.formation || null);
      setMessage('Vous êtes inscrit à cette formation.');
    } catch (err) {
      setError(err?.message || "Impossible de s'inscrire.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-8 text-sm text-slate-500">Chargement...</div>;
  }

  if (!formation) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-8 text-sm text-slate-500">Formation introuvable.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <button
        type="button"
        className="mb-6 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
        onClick={() => router.back()}
      >
        Retour
      </button>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Certifiante</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Bientôt disponible
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{formation.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{formation.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          <span>Durée : {formation.durationWeeks}</span>
          <span>Modules : {formation.modulesCount}</span>
          <span>{formation.participantsCount || 0} participants</span>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            disabled={formation.enrolled || actionLoading}
            onClick={enroll}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              formation.enrolled ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-700 text-white'
            }`}
          >
            {formation.enrolled ? 'Déjà inscrit' : 'Participer à la formation'}
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Objectifs</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {formation.objectives?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Modules</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              {formation.modules?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Certification incluse : un certificat sera délivré dès l’ouverture et la complétion de la formation.
        </div>
      </div>
    </main>
  );
}
