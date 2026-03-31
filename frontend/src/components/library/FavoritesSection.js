"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';

function normalize(value) {
  return String(value || '').trim();
}

function typeLabel(type) {
  const raw = String(type || '').toUpperCase();
  if (raw === 'RESOURCE') return 'Ressource';
  if (raw === 'DICTIONARY') return 'Dictionnaire';
  if (raw === 'BOOK') return 'Livre';
  if (raw === 'EXAM') return 'Examen';
  if (raw === 'DOCUMENT') return 'Document';
  return raw || 'Favori';
}

export default function FavoritesSection({ token, onOpenBook, onOpenDictionaryTerm, onOpenResource }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient('/library/v2/favorites?pageSize=50', { token });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || 'Impossible de charger les favoris.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = String(item.type || 'UNKNOWN');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  async function removeFavorite(id) {
    const favId = Number(id);
    if (!favId || !token) return;
    try {
      await apiClient(`/library/v2/favorites/${favId}`, { method: 'DELETE', token });
      await load();
    } catch (e) {
      setError(e.message || 'Suppression impossible.');
    }
  }

  function openItem(item) {
    const type = String(item?.type || '').toUpperCase();
    if (type === 'RESOURCE' && item.referenceId) {
      onOpenResource?.(item.referenceId);
      return;
    }
    if (type === 'DICTIONARY' && item.referenceId) {
      onOpenDictionaryTerm?.(item.referenceId);
      return;
    }
    if (type === 'BOOK' && item.referenceId) {
      onOpenBook?.(item.referenceId);
    }
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Compte</p>
        <h2 className="mt-2 text-2xl font-black text-brand-900">Mes favoris</h2>
        <p className="mt-1 text-sm text-brand-700">Ressources sauvegardées pour réviser plus vite.</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <section className="card">
        {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        {!loading && !items.length ? <p className="text-sm text-brand-700">Aucun favori.</p> : null}

        <div className="space-y-5">
          {grouped.map(([type, rows]) => (
            <div key={type}>
              <h3 className="text-lg font-bold text-brand-900">{typeLabel(type)}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {rows.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-brand-100 bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-brand-900">
                          {item.resource?.title || `${typeLabel(item.type)} #${item.referenceId}`}
                        </p>
                        {item.resource?.category ? (
                          <p className="mt-1 text-xs text-brand-700">{item.resource.category}</p>
                        ) : null}
                        {item.resource?.fileType ? (
                          <p className="mt-1 text-xs text-brand-700">Type: {String(item.resource.fileType || '').toUpperCase()}</p>
                        ) : null}
                      </div>
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => removeFavorite(item.id)}>
                        Retirer
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        onClick={() => openItem(item)}
                        disabled={!normalize(item.referenceId)}
                      >
                        Ouvrir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

