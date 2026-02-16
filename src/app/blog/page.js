'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function BlogPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');

  const token = useMemo(() => getToken(), []);

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
