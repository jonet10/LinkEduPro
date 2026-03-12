"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/runtime-config';

function normalize(value) {
  return String(value || '').trim();
}

export default function LibrarySearchPanel({ token }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const timerRef = useRef(null);

  const hasQuery = useMemo(() => normalize(q).length >= 2, [q]);

  useEffect(() => {
    if (!token) return;
    if (!hasQuery) {
      setResults(null);
      setError('');
      setLoading(false);
      return;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient(`/library/v2/search?q=${encodeURIComponent(normalize(q))}`, { token });
        setResults(data || null);
        setOpen(true);
      } catch (e) {
        setError(e.message || 'Recherche impossible.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [q, token, hasQuery]);

  function openBook(bookId) {
    router.push(`/library?section=livres&bookId=${encodeURIComponent(bookId)}`);
    setOpen(false);
  }

  function openTerm(termId) {
    router.push(`/library?section=dictionnaires&termId=${encodeURIComponent(termId)}`);
    setOpen(false);
  }

  function openResource(resourceId) {
    router.push(`/library?section=supports&resourceId=${encodeURIComponent(resourceId)}`);
    setOpen(false);
  }

  function openExamPdf(fileName) {
    const pdfUrl = `${getApiBaseUrl()}/public/exam-pdfs/${encodeURIComponent(fileName)}`;
    window.location.assign(pdfUrl);
    setOpen(false);
  }

  const groups = results?.groups || {};
  const hasResults = Boolean(
    (groups?.dictionnaire?.length || 0) +
    (groups?.livres?.length || 0) +
    (groups?.ressources?.length || 0) +
    (groups?.examens?.length || 0)
  );

  return (
    <section className="card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Recherche</p>
          <h2 className="mt-2 text-2xl font-black text-brand-900">Trouver une ressource</h2>
          <p className="mt-1 text-sm text-brand-700">
            Recherche dans: livres, supports, dictionnaire informatique et examens passés.
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <input
          className="input w-full"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex: programmation, algorithme, bac 2025..."
          onFocus={() => setOpen(true)}
        />

        {(open && (loading || error || hasResults)) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-brand-100 bg-white p-4 shadow-lg">
            {loading ? <p className="text-sm text-brand-700">Recherche...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {!loading && !error && !hasResults ? (
              <p className="text-sm text-brand-700">Aucun résultat.</p>
            ) : null}

            {!loading && !error && groups?.dictionnaire?.length ? (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Dictionnaire</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {groups.dictionnaire.slice(0, 6).map((row) => (
                    <button key={row.id} type="button" className="rounded-xl border border-brand-100 p-3 text-left hover:bg-brand-50" onClick={() => openTerm(row.id)}>
                      <p className="text-sm font-bold text-brand-900">{row.term}</p>
                      <p className="text-xs text-brand-700">{String(row.kind || '').replace('_', ' ')}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && !error && groups?.livres?.length ? (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Livres</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {groups.livres.slice(0, 6).map((row) => (
                    <button key={row.id} type="button" className="rounded-xl border border-brand-100 p-3 text-left hover:bg-brand-50" onClick={() => openBook(row.id)}>
                      <p className="text-sm font-bold text-brand-900">{row.title}</p>
                      <p className="text-xs text-brand-700">{row.author || 'Auteur non précisé'}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && !error && groups?.ressources?.length ? (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Supports pédagogiques</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {groups.ressources.slice(0, 6).map((row) => (
                    <button key={row.id} type="button" className="rounded-xl border border-brand-100 p-3 text-left hover:bg-brand-50" onClick={() => openResource(row.id)}>
                      <p className="text-sm font-bold text-brand-900">{row.title}</p>
                      <p className="text-xs text-brand-700">{row.category} • {String(row.fileType || '').toUpperCase()}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && !error && groups?.examens?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Examens passés</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {groups.examens.slice(0, 6).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="rounded-xl border border-brand-100 p-3 text-left hover:bg-brand-50"
                      onClick={() => openExamPdf(row.fileName)}
                    >
                      <p className="text-sm font-bold text-brand-900">{row.subject}</p>
                      <p className="text-xs text-brand-700">{row.topic} {row.year ? `• ${row.year}` : ''}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

