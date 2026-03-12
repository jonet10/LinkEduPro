"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { RESOURCE_CATEGORIES, RESOURCE_FILE_TYPES } from './library-constants';

function normalize(value) {
  return String(value || '').trim();
}

function fileTypeLabel(value) {
  const found = RESOURCE_FILE_TYPES.find((row) => row.value === String(value || '').toLowerCase());
  return found ? found.label : String(value || '').toUpperCase();
}

export default function ResourcesSection({ token, canManage, defaultCategory = '', focusResourceId = 0 }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [active, setActive] = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);

  const [category, setCategory] = useState(defaultCategory);
  const [fileType, setFileType] = useState('');
  const [q, setQ] = useState('');

  const [favorites, setFavorites] = useState(() => new Set());

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: defaultCategory || RESOURCE_CATEGORIES[0],
    fileType: 'pdf',
    author: '',
    datePublication: '',
    fileUrl: '',
    file: null
  });

  useEffect(() => {
    setCategory(defaultCategory);
    setForm((prev) => ({
      ...prev,
      category: defaultCategory || prev.category || RESOURCE_CATEGORIES[0]
    }));
    setPage(1);
  }, [defaultCategory]);

  async function loadFavorites() {
    try {
      const favData = await apiClient('/library/v2/favorites?type=RESOURCE&pageSize=200', { token });
      const set = new Set((favData.items || []).map((row) => Number(row.referenceId)));
      setFavorites(set);
    } catch (_) {
      setFavorites(new Set());
    }
  }

  async function loadResources() {
    if (!token) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (normalize(category)) params.set('category', normalize(category));
      if (normalize(fileType)) params.set('fileType', normalize(fileType));
      if (normalize(q)) params.set('q', normalize(q));

      const data = await apiClient(`/library/v2/resources?${params.toString()}`, { token });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
      await loadFavorites();
    } catch (e) {
      setError(e.message || 'Impossible de charger les ressources.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, pageSize, category, fileType]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      loadResources();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function resetForm(nextCategory) {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      category: nextCategory || defaultCategory || RESOURCE_CATEGORIES[0],
      fileType: 'pdf',
      author: '',
      datePublication: '',
      fileUrl: '',
      file: null
    });
  }

  async function toggleFavorite(resourceId) {
    const id = Number(resourceId);
    if (!id || !token) return;
    try {
      if (favorites.has(id)) {
        const favData = await apiClient('/library/v2/favorites?type=RESOURCE&pageSize=200', { token });
        const found = (favData.items || []).find((row) => Number(row.referenceId) === id);
        if (found?.id) {
          await apiClient(`/library/v2/favorites/${found.id}`, { method: 'DELETE', token });
        }
        await loadFavorites();
        return;
      }
      await apiClient('/library/v2/favorites', {
        method: 'POST',
        token,
        body: JSON.stringify({ type: 'RESOURCE', resourceId: id })
      });
      await loadFavorites();
    } catch (e) {
      setError(e.message || 'Action impossible.');
    }
  }

  async function openResource(item) {
    const url = normalize(item?.fileUrl);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function openDetails(resourceId) {
    const id = Number(resourceId);
    if (!id || !token) return;
    setActiveLoading(true);
    setError('');
    try {
      const data = await apiClient(`/library/v2/resources/${id}`, { token });
      setActive(data || null);
    } catch (e) {
      setError(e.message || 'Impossible de charger cette ressource.');
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  }

  function startEdit(item) {
    setEditing(item);
    setShowForm(true);
    setSuccess('');
    setError('');
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || defaultCategory || RESOURCE_CATEGORIES[0],
      fileType: String(item.fileType || 'pdf').toLowerCase(),
      author: item.author || '',
      datePublication: item.publicationDate ? String(item.publicationDate).slice(0, 10) : '',
      fileUrl: item.fileUrl || '',
      file: null
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', normalize(form.title));
      fd.append('description', normalize(form.description));
      fd.append('category', normalize(form.category));
      fd.append('fileType', normalize(form.fileType));
      fd.append('author', normalize(form.author));
      fd.append('datePublication', normalize(form.datePublication));
      fd.append('fileUrl', normalize(form.fileUrl));
      if (form.file) fd.append('file', form.file, form.file.name);

      if (editing?.id) {
        await apiClient(`/library/v2/resources/${editing.id}`, { method: 'PATCH', token, body: fd });
        setSuccess('Ressource mise à jour.');
      } else {
        await apiClient('/library/v2/resources', { method: 'POST', token, body: fd });
        setSuccess('Ressource ajoutée.');
      }
      resetForm(form.category);
      setShowForm(false);
      await loadResources();
    } catch (e2) {
      setError(e2.message || 'Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(item) {
    if (!token || !item?.id) return;
    const ok = window.confirm('Supprimer cette ressource ?');
    if (!ok) return;
    try {
      await apiClient(`/library/v2/resources/${item.id}`, { method: 'DELETE', token });
      setSuccess('Ressource supprimée.');
      await loadResources();
    } catch (e) {
      setError(e.message || 'Suppression impossible.');
    }
  }

  useEffect(() => {
    if (!focusResourceId || !items.length) return;
    const found = items.find((row) => Number(row.id) === Number(focusResourceId));
    if (!found) return;
    startEdit(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusResourceId, items]);

  return (
    <section className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ressources</p>
            <h2 className="mt-2 text-2xl font-black text-brand-900">{defaultCategory || 'Centre de ressources'}</h2>
            <p className="mt-1 text-sm text-brand-700">
              Filtrer par catégorie ou type de fichier, puis ouvrir/télécharger le document.
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowForm((v) => !v);
                if (!showForm) resetForm(defaultCategory || category);
              }}
            >
              {showForm ? 'Masquer le formulaire' : (editing ? 'Modifier' : 'Ajouter une ressource')}
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
      </div>

      {showForm && canManage ? (
        <section className="card">
          <h3 className="text-xl font-bold text-brand-900">{editing ? 'Modifier une ressource' : 'Ajouter une ressource'}</h3>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <input className="input md:col-span-2" placeholder="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <input className="input" placeholder="Auteur (optionnel)" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
            <input className="input" type="date" value={form.datePublication} onChange={(e) => setForm((p) => ({ ...p, datePublication: e.target.value }))} />

            <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="input" value={form.fileType} onChange={(e) => setForm((p) => ({ ...p, fileType: e.target.value }))}>
              {RESOURCE_FILE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <textarea className="input md:col-span-2" placeholder="Description (optionnel)" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />

            <input className="input md:col-span-2" placeholder="Lien du fichier (optionnel si upload)" value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} />

            <input
              className="input md:col-span-2"
              type="file"
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            />

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : (editing ? 'Enregistrer' : 'Ajouter')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm(defaultCategory || category);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input md:col-span-2" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Toutes catégories</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="input" value={fileType} onChange={(e) => { setFileType(e.target.value); setPage(1); }}>
            <option value="">Tous types</option>
            {RESOURCE_FILE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-brand-700">Aucune ressource.</p> : null}
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border border-brand-100 bg-white/70 p-4 ${Number(item.id) === Number(focusResourceId) ? 'ring-2 ring-brand-300' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-900">{item.title}</p>
                  <p className="mt-1 text-xs text-brand-700">
                    {item.category} • {fileTypeLabel(item.fileType)}
                  </p>
                </div>
                <button
                  type="button"
                  className={favorites.has(Number(item.id)) ? 'btn-primary !px-2 !py-1 text-xs' : 'btn-secondary !px-2 !py-1 text-xs'}
                  onClick={() => toggleFavorite(item.id)}
                  aria-label="Favori"
                  title="Favori"
                >
                  {favorites.has(Number(item.id)) ? '★' : '☆'}
                </button>
              </div>
              {item.author ? <p className="mt-2 text-xs text-brand-700">Auteur: {item.author}</p> : null}
              {item.description ? <p className="mt-2 line-clamp-3 text-sm text-brand-700">{item.description}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => openResource(item)}>
                  Ouvrir / Télécharger
                </button>
                <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openDetails(item.id)}>
                  Détails
                </button>
                {canManage ? (
                  <>
                    <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => startEdit(item)}>
                      Modifier
                    </button>
                    <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => onDelete(item)}>
                      Supprimer
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {pages > 1 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-brand-700">Page {page} / {pages}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Suivant</button>
            </div>
          </div>
        ) : null}
      </section>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-brand-100 p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-700">{active.item?.category} • {fileTypeLabel(active.item?.fileType)}</p>
                <h3 className="mt-1 truncate text-xl font-black text-brand-900">{active.item?.title}</h3>
                {active.item?.author ? <p className="mt-1 text-sm text-brand-700">Auteur: {active.item.author}</p> : null}
              </div>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setActive(null)}>
                Fermer
              </button>
            </div>
            <div className="p-5">
              {activeLoading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
              {active.item?.description ? (
                <p className="whitespace-pre-wrap text-sm text-brand-700">{active.item.description}</p>
              ) : (
                <p className="text-sm text-brand-700">Aucune description.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => openResource(active.item)}>
                  Ouvrir / Télécharger
                </button>
                <button type="button" className={favorites.has(Number(active.item?.id)) ? 'btn-primary' : 'btn-secondary'} onClick={() => toggleFavorite(active.item?.id)}>
                  {favorites.has(Number(active.item?.id)) ? '★ Favori' : '☆ Ajouter aux favoris'}
                </button>
              </div>

              {(active.seeAlso?.resources?.length || active.seeAlso?.terms?.length || active.seeAlso?.videos?.length) ? (
                <div className="mt-6">
                  <p className="text-sm font-bold text-brand-900">Voir aussi</p>

                  {active.seeAlso?.resources?.length ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Ressources</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {active.seeAlso.resources.slice(0, 6).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="rounded-xl border border-brand-100 p-3 text-left hover:bg-brand-50"
                            onClick={() => openDetails(r.id)}
                          >
                            <p className="text-sm font-semibold text-brand-900">{r.title}</p>
                            <p className="mt-1 text-xs text-brand-700">{r.category} • {fileTypeLabel(r.fileType)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {active.seeAlso?.terms?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Dictionnaire</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {active.seeAlso.terms.slice(0, 10).map((t) => (
                          <span key={t.id} className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
                            {t.term}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {active.seeAlso?.videos?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Classe numérique</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {active.seeAlso.videos.slice(0, 6).map((v) => (
                          <div key={v.id} className="rounded-xl border border-brand-100 p-3">
                            <p className="text-sm font-semibold text-brand-900">{v.title}</p>
                            <p className="mt-1 text-xs text-brand-700">Vidéo</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
