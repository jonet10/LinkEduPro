'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

export default function BlogPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createInfo, setCreateInfo] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    isGlobal: true,
    schoolId: '',
    categoryIds: [],
    tagIds: []
  });

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canCreatePost = Boolean(token);

  async function load() {
    if (!token) return;
    try {
      setError('');
      const [postRes, catRes, tagRes] = await Promise.all([
        apiClient(`/community/blog/posts?page=${page}&limit=10&search=${encodeURIComponent(search)}`, { token }),
        apiClient('/community/blog/categories', { token }),
        apiClient('/community/blog/tags', { token })
      ]);
      setItems(postRes.items || []);
      setPagination(postRes.pagination || { page: 1, totalPages: 1, total: 0 });
      setCategories(catRes.categories || []);
      setTags(tagRes.tags || []);
    } catch (e) {
      setError(e.message);
    }
  }

  function toggleArraySelection(key, value) {
    setForm((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((id) => id !== value) : [...prev[key], value]
      };
    });
  }

  async function createPost() {
    if (!token) return;
    setCreateError('');
    setCreateInfo('');
    setCreating(true);
    try {
      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        isGlobal: Boolean(form.isGlobal),
        schoolId: form.isGlobal ? null : Number(form.schoolId || 0),
        categoryIds: form.categoryIds,
        tagIds: form.tagIds
      };

      const data = await apiClient('/community/blog/posts', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      const status = data?.moderation?.status || (data?.post?.isApproved ? 'APPROVED' : 'PENDING');
      setCreateInfo(
        status === 'APPROVED'
          ? 'Article publié avec succès.'
          : 'Article soumis. Il sera visible après validation par un admin ou un professeur.'
      );

      setForm({
        title: '',
        excerpt: '',
        content: '',
        isGlobal: true,
        schoolId: '',
        categoryIds: [],
        tagIds: []
      });

      setPage(1);
      await load();
    } catch (e) {
      setCreateError(e.message || 'Erreur lors de la création de l’article.');
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, [page]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="card space-y-4">
        <h1 className="text-2xl font-semibold">Blog Global LinkEduPro</h1>
        <div className="flex gap-2">
          <input className="input" placeholder="Recherche posts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => { setPage(1); load(); }}>Rechercher</button>
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
      </section>

      {canCreatePost ? (
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Créer un article</h2>
          <p className="text-sm text-slate-600">
            Connecté en tant que: <span className="font-semibold">{student?.role || 'USER'}</span>
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="input"
              placeholder="Titre"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Extrait (optionnel)"
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            />
          </div>

          <textarea
            className="input min-h-[140px]"
            placeholder="Contenu de l’article"
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Portée
              <select
                className="input mt-1"
                value={form.isGlobal ? 'global' : 'school'}
                onChange={(e) => setForm((prev) => ({ ...prev, isGlobal: e.target.value === 'global' }))}
              >
                <option value="global">Blog global</option>
                <option value="school">Blog interne (école)</option>
              </select>
            </label>

            {!form.isGlobal ? (
              <label className="text-sm text-slate-700">
                School ID
                <input
                  className="input mt-1"
                  type="number"
                  value={form.schoolId}
                  onChange={(e) => setForm((prev) => ({ ...prev, schoolId: e.target.value }))}
                  placeholder="Ex: 1"
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Catégories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(cat.id)}
                      onChange={() => toggleArraySelection('categoryIds', cat.id)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.tagIds.includes(tag.id)}
                      onChange={() => toggleArraySelection('tagIds', tag.id)}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          {createInfo ? <p className="text-sm text-green-600">{createInfo}</p> : null}

          <div>
            <button className="btn-primary" disabled={creating} onClick={createPost}>
              {creating ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <p className="text-sm text-slate-600">Categories: {categories.map((c) => c.name).join(', ') || 'Aucune'}</p>
        <p className="text-sm text-slate-600">Tags: {tags.map((t) => t.name).join(', ') || 'Aucun'}</p>
      </section>

      {items.map((post) => (
        <article key={post.id} className="card space-y-2">
          <h2 className="text-xl font-semibold">{post.title}</h2>
          <p className="text-sm text-slate-600">
            {post.author?.firstName} {post.author?.lastName} · {post.author?.role}
            {post.author?.role === 'TEACHER' ? ` (${post.author?.teacherLevel})` : ''}
          </p>
          <p>{post.excerpt || post.content}</p>
          <p className="text-sm text-slate-500">Likes: {post._count?.likes || 0} · Commentaires: {post._count?.comments || 0}</p>
        </article>
      ))}

      <section className="flex items-center justify-between">
        <button className="btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Precedent</button>
        <p className="text-sm">Page {pagination.page} / {pagination.totalPages}</p>
        <button className="btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
      </section>
    </main>
  );
}
