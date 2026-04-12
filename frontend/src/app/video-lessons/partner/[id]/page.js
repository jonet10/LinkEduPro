'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function PartnerFormationDetailPage() {
  const params = useParams();
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
        const data = await apiClient('/partner-formations/public', { token });
        if (!mounted) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        const found = list.find((item) => String(item.id) === String(params.id));
        setFormation(found || null);
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
      setError('');
      setMessage('');
      const res = await apiClient(`/partner-formations/${formation.id}/enroll`, { method: 'POST', token });
      if (res?.message) {
        setError(res.message);
      } else {
        setMessage('Vous êtes inscrit à cette formation.');
      }
      const refreshed = await apiClient('/partner-formations/public', { token });
      const list = Array.isArray(refreshed?.items) ? refreshed.items : [];
      setFormation(list.find((item) => String(item.id) === String(formation.id)) || formation);
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
        <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Formation certifiante</span>
          <h1 className="mt-3 text-2xl font-bold">{formation.title}</h1>
        </div>
        <p className="mt-4 text-sm text-slate-600">{formation.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          {formation.durationWeeks ? <span>Durée : {formation.durationWeeks}</span> : null}
          {formation.modulesCount ? <span>Modules : {formation.modulesCount}</span> : null}
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
            disabled={formation.enrolled || actionLoading || formation.status !== 'PUBLISHED'}
            onClick={enroll}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {formation.enrolled ? 'Déjà inscrit' : 'Je participe'}
          </button>
        </div>
      </div>
    </main>
  );
}
