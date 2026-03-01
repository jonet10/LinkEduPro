"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartSearchSection from '@/components/search/SmartSearchSection';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function SearchPage() {
  const token = getToken();
  const router = useRouter();
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState('');
  const [prefill, setPrefill] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setPrefill(String(params.get('prefill') || '').trim());
  }, []);

  function goToLoginWithPrefill(query) {
    const q = String(query || '').trim();
    if (!q) {
      router.push('/login');
      return;
    }
    const target = `/search?prefill=${encodeURIComponent(q)}`;
    router.push(`/login?redirect=${encodeURIComponent(target)}`);
  }

  useEffect(() => {
    if (token) return;
    setTrendingLoading(true);
    setTrendingError('');
    apiClient('/search/trending')
      .then((data) => {
        setTrending(data.trending || []);
      })
      .catch((e) => {
        setTrendingError(e.message || 'Impossible de charger les tendances.');
      })
      .finally(() => setTrendingLoading(false));
  }, [token]);

  if (!token) {
    return (
      <section className="space-y-4">
        <div className="card public-card grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="text-2xl font-black text-brand-900">Recherche d’étude</h1>
            <p className="mt-2 text-sm text-brand-700">
              Accède à la recherche avancée (cours, publications et enseignants) après connexion.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">Créer un compte</Link>
              <Link href="/login" className="btn-secondary">Se connecter</Link>
            </div>
          </div>
          <div className="public-hero-media">
            <img src="/images/tool-quiz-bac.png" alt="Recherche intelligente LinkEduPro" />
          </div>
        </div>

        <div className="card public-card public-card-delay-1">
          <h2 className="text-lg font-semibold text-brand-900">Exemples de requêtes</h2>
          <ul className="mt-2 space-y-2 text-sm text-brand-700">
            <li>“Quiz chimie NSIV réactions”</li>
            <li>“Exercices bac physique électricité”</li>
            <li>“Plan de cours philosophie terminale”</li>
          </ul>
        </div>

        <div className="card public-card public-card-delay-2">
          <h2 className="text-lg font-semibold text-brand-900">Tendances de recherche</h2>
          {trendingLoading ? <p className="mt-2 text-sm text-brand-700">Chargement...</p> : null}
          {trendingError ? <p className="mt-2 text-sm text-red-600">{trendingError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {trending.map((item) => (
              <button
                key={item.query}
                type="button"
                className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:border-brand-300 hover:bg-white"
                onClick={() => goToLoginWithPrefill(item.query)}
              >
                {item.query}
              </button>
            ))}
            {!trendingLoading && trending.length === 0 ? (
              <span className="text-sm text-brand-700">Aucune tendance disponible pour le moment.</span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-black text-brand-900">Recherche</h1>
        <p className="mt-2 text-sm text-brand-700">Trouve rapidement cours, publications et enseignants.</p>
      </div>
      <SmartSearchSection initialQuery={prefill} />
    </section>
  );
}
