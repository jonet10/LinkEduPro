"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { DICTIONARY_LETTERS } from './library-constants';

function normalize(value) {
  return String(value || '').trim();
}

function kindLabel(kind) {
  const raw = String(kind || '').toUpperCase();
  if (raw === 'SIGLE') return 'Sigle';
  if (raw === 'ABREVIATION') return 'Abréviation';
  if (raw === 'CONCEPT') return 'Concept';
  return 'Terme';
}

export default function DictionarySection({ token, focusTermId = 0 }) {
  const [q, setQ] = useState('');
  const [letter, setLetter] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());

  const suggestTimer = useRef(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function loadFavorites() {
    try {
      const favData = await apiClient('/library/v2/favorites?type=DICTIONARY&pageSize=300', { token });
      const set = new Set((favData.items || []).map((row) => Number(row.referenceId)));
      setFavorites(set);
    } catch (_) {
      setFavorites(new Set());
    }
  }

  async function loadTerms() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (normalize(q)) params.set('q', normalize(q));
      if (normalize(letter)) params.set('letter', normalize(letter));
      const data = await apiClient(`/library/v2/dictionary?${params.toString()}`, { token });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      await loadFavorites();
    } catch (e) {
      setError(e.message || 'Impossible de charger le dictionnaire.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, pageSize, letter]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      loadTerms();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!token) return;
    const query = normalize(q);
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = window.setTimeout(async () => {
      try {
        const data = await apiClient(`/library/v2/dictionary/suggest?q=${encodeURIComponent(query)}`, { token });
        setSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch (_) {
        setSuggestions([]);
      }
    }, 180);
    return () => {
      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    };
  }, [q, token]);

  async function openTerm(id) {
    const termId = Number(id);
    if (!termId || !token) return;
    setActiveLoading(true);
    setError('');
    try {
      const data = await apiClient(`/library/v2/dictionary/${termId}`, { token });
      setActive(data || null);
    } catch (e) {
      setError(e.message || 'Impossible de charger le terme.');
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  }

  async function toggleFavorite(termId) {
    const id = Number(termId);
    if (!id || !token) return;
    try {
      if (favorites.has(id)) {
        const favData = await apiClient('/library/v2/favorites?type=DICTIONARY&pageSize=400', { token });
        const found = (favData.items || []).find((row) => Number(row.referenceId) === id);
        if (found?.id) await apiClient(`/library/v2/favorites/${found.id}`, { method: 'DELETE', token });
        await loadFavorites();
        return;
      }
      await apiClient('/library/v2/favorites', {
        method: 'POST',
        token,
        body: JSON.stringify({ type: 'DICTIONARY', referenceId: id })
      });
      await loadFavorites();
    } catch (e) {
      setError(e.message || 'Action impossible.');
    }
  }

  useEffect(() => {
    if (!focusTermId) return;
    openTerm(focusTermId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTermId]);

  return (
    <section className="space-y-6">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Dictionnaires spécialisés</p>
        <h2 className="mt-2 text-2xl font-black text-brand-900">Dictionnaire Informatique</h2>
        <p className="mt-1 text-sm text-brand-700">
          Recherche de termes, navigation A–Z et suggestions intelligentes.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <section className="card">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <input
              className="input w-full"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tape un terme (ex: programmation, CPU, réseau...)"
            />
            {suggestions.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.slice(0, 8).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                    onClick={() => openTerm(s.id)}
                  >
                    {s.term}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <select className="input" value={letter} onChange={(e) => { setLetter(e.target.value); setPage(1); }}>
            <option value="">Toutes lettres</option>
            {DICTIONARY_LETTERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl border border-brand-100 bg-white/60 p-3">
          <div className="flex flex-wrap gap-2">
            {DICTIONARY_LETTERS.map((l) => (
              <button
                key={l}
                type="button"
                className={letter === l ? 'btn-primary !px-3 !py-1 text-xs' : 'btn-secondary !px-3 !py-1 text-xs'}
                onClick={() => { setLetter(l); setPage(1); }}
              >
                {l}
              </button>
            ))}
            <button type="button" className={!letter ? 'btn-primary !px-3 !py-1 text-xs' : 'btn-secondary !px-3 !py-1 text-xs'} onClick={() => { setLetter(''); setPage(1); }}>
              Tous
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-brand-900">Termes</h3>
            <p className="mt-1 text-sm text-brand-700">{total} résultat(s)</p>
          </div>
          {pages > 1 ? <p className="text-xs font-semibold text-brand-700">Page {page}/{pages}</p> : null}
        </div>

        {loading ? <p className="mt-4 text-sm text-brand-700">Chargement...</p> : null}
        {!loading && !items.length ? <p className="mt-4 text-sm text-brand-700">Aucun terme.</p> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((row) => (
            <article key={row.id} className="rounded-2xl border border-brand-100 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-brand-900">{row.term}</p>
                  <p className="mt-1 text-xs text-brand-700">{kindLabel(row.kind)} • {row.letterIndex}</p>
                </div>
                <button
                  type="button"
                  className={favorites.has(Number(row.id)) ? 'btn-primary !px-2 !py-1 text-xs' : 'btn-secondary !px-2 !py-1 text-xs'}
                  onClick={() => toggleFavorite(row.id)}
                  aria-label="Favori"
                  title="Favori"
                >
                  {favorites.has(Number(row.id)) ? '★' : '☆'}
                </button>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-brand-700">{row.definition}</p>
              <button type="button" className="btn-primary mt-4 !px-3 !py-1.5 text-xs" onClick={() => openTerm(row.id)}>
                Voir détails
              </button>
            </article>
          ))}
        </div>

        {pages > 1 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Suivant</button>
            </div>
          </div>
        ) : null}
      </section>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-brand-100 p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-700">Dictionnaire Informatique • {kindLabel(active.item?.kind)}</p>
                <h3 className="mt-1 truncate text-xl font-black text-brand-900">{active.item?.term}</h3>
              </div>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setActive(null)}>
                Fermer
              </button>
            </div>
            <div className="p-5">
              {activeLoading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
              {active.item ? (
                <>
                  <p className="text-sm font-bold text-brand-900">Définition</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-brand-700">{active.item.definition}</p>
                  {active.item.example ? (
                    <>
                      <p className="mt-5 text-sm font-bold text-brand-900">Exemple</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-brand-700">{active.item.example}</p>
                    </>
                  ) : null}

                  {active.seeAlso?.terms?.length ? (
                    <div className="mt-6">
                      <p className="text-sm font-bold text-brand-900">Voir aussi (termes)</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {active.seeAlso.terms.slice(0, 10).map((t) => (
                          <button key={t.id} type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => openTerm(t.id)}>
                            {t.term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {active.seeAlso?.resources?.length ? (
                    <div className="mt-6">
                      <p className="text-sm font-bold text-brand-900">Voir aussi (ressources)</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {active.seeAlso.resources.slice(0, 6).map((r) => (
                          <div key={r.id} className="rounded-xl border border-brand-100 p-3">
                            <p className="text-sm font-semibold text-brand-900">{r.title}</p>
                            <p className="mt-1 text-xs text-brand-700">{r.category} • {String(r.fileType || '').toUpperCase()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

