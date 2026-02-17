'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

function emptyForm() {
  return {
    title: '',
    excerpt: '',
    imageUrl: '',
    content: '',
    isGlobal: true,
    schoolId: '',
    categoryIds: [],
    tagIds: []
  };
}

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
  const [updateError, setUpdateError] = useState('');
  const [updateInfo, setUpdateInfo] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionInfo, setActionInfo] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingCreateImage, setUploadingCreateImage] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canCreatePost = Boolean(token);
  const selectedPost = useMemo(
    () => items.find((post) => post.id === expandedPostId) || null,
    [items, expandedPostId]
  );

  function scrollToPostTop(postId, smooth = true) {
    if (!postId || typeof document === 'undefined') return;
    const node = document.getElementById(`blog-post-${postId}`);
    if (!node) return;
    node.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }

  function togglePost(postId) {
    setExpandedPostId((prev) => {
      const next = prev === postId ? null : postId;
      if (next) {
        setTimeout(() => scrollToPostTop(postId, true), 0);
      }
      return next;
    });
  }

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

  function toggleArraySelection(target, key, value) {
    const setter = target === 'create' ? setForm : setEditForm;
    setter((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((id) => id !== value) : [...prev[key], value]
      };
    });
  }

  function moderationMessage(status) {
    return status === 'APPROVED'
      ? 'Article publié avec succès.'
      : 'Article soumis. Il sera visible après validation par un admin ou un professeur.';
  }

  async function uploadImage(file, target) {
    if (!token || !file) return;

    if (target === 'create') setUploadingCreateImage(true);
    if (target === 'edit') setUploadingEditImage(true);

    try {
      const body = new FormData();
      body.append('image', file);
      const data = await apiClient('/community/blog/posts/upload-image', {
        method: 'POST',
        token,
        body
      });

      if (target === 'create') {
        setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        setEditForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      }
    } catch (e) {
      setActionError(e.message || 'Erreur upload image.');
    } finally {
      if (target === 'create') setUploadingCreateImage(false);
      if (target === 'edit') setUploadingEditImage(false);
    }
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
        imageUrl: form.imageUrl.trim() || null,
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
      setCreateInfo(moderationMessage(status));
      setForm(emptyForm());
      setPage(1);
      await load();
    } catch (e) {
      setCreateError(e.message || 'Erreur lors de la création de l’article.');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(post) {
    setUpdateError('');
    setUpdateInfo('');
    setEditingPostId(post.id);
    setEditForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      imageUrl: post.imageUrl || '',
      content: post.content || '',
      isGlobal: post.isGlobal !== false,
      schoolId: post.schoolId ? String(post.schoolId) : '',
      categoryIds: (post.categories || []).map((c) => c.categoryId),
      tagIds: (post.tags || []).map((t) => t.tagId)
    });
  }

  async function updatePost(postId) {
    if (!token) return;
    setUpdating(true);
    setUpdateError('');
    setUpdateInfo('');
    try {
      const payload = {
        title: editForm.title.trim(),
        excerpt: editForm.excerpt.trim(),
        imageUrl: editForm.imageUrl.trim() || null,
        content: editForm.content.trim(),
        isGlobal: Boolean(editForm.isGlobal),
        schoolId: editForm.isGlobal ? null : Number(editForm.schoolId || 0),
        categoryIds: editForm.categoryIds,
        tagIds: editForm.tagIds
      };

      const data = await apiClient(`/community/blog/posts/${postId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload)
      });

      const status = data?.moderation?.status || (data?.post?.isApproved ? 'APPROVED' : 'PENDING');
      setUpdateInfo(status === 'APPROVED' ? 'Publication modifiée et validée.' : 'Publication modifiée. Elle repasse en attente de validation.');
      setEditingPostId(null);
      await load();
    } catch (e) {
      setUpdateError(e.message || 'Erreur de modification.');
    } finally {
      setUpdating(false);
    }
  }

  async function likePost(postId) {
    if (!token) return;
    setActionError('');
    setActionInfo('');
    try {
      await apiClient(`/community/blog/posts/${postId}/like`, { method: 'POST', token });
      setActionInfo('Like ajouté.');
      await load();
    } catch (e) {
      setActionError(e.message || 'Erreur lors du like.');
    }
  }

  async function loadComments(postId) {
    if (!token) return;
    try {
      const data = await apiClient(`/community/blog/posts/${postId}/comments`, { token });
      setCommentsByPost((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch (e) {
      setActionError(e.message || 'Erreur chargement commentaires.');
    }
  }

  async function toggleCommentsPanel(postId) {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
    if (!commentsByPost[postId]) {
      await loadComments(postId);
    }
  }

  async function addComment(postId) {
    if (!token) return;
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;

    try {
      await apiClient(`/community/blog/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content })
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      await Promise.all([loadComments(postId), load()]);
    } catch (e) {
      setActionError(e.message || 'Erreur ajout commentaire.');
    }
  }

  async function sharePost(post) {
    const link = `${window.location.origin}/blog/post/${post.id}`;
    const payload = {
      title: post.title,
      text: post.excerpt || 'Publication LinkEduPro',
      url: link
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(link);
      }
      setActionInfo('Lien de partage prêt.');
      setActionError('');
    } catch (_) {
      setActionError('Impossible de partager ce post pour le moment.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = Number(params.get('post') || 0);
    if (postId > 0) {
      setExpandedPostId(postId);
    }
  }, []);

  useEffect(() => {
    if (!expandedPostId) return;
    scrollToPostTop(expandedPostId, false);
  }, [expandedPostId, items.length]);

  function renderPostCard(post, options = {}) {
    const canEdit = student && (student.role === 'ADMIN' || student.id === post.authorId);
    const isExpanded = expandedPostId === post.id;
    const isPriority = Boolean(options.isPriority);

    return (
      <article id={`blog-post-${post.id}`} key={post.id} className={`card space-y-3 ${isPriority ? 'ring-2 ring-brand-200' : ''}`}>
        <button
          type="button"
          className="w-full text-left text-xl font-semibold text-brand-900 hover:text-brand-700"
          onClick={() => togglePost(post.id)}
        >
          {post.title}
        </button>
        <p className="text-sm text-slate-600">
          {post.author?.firstName} {post.author?.lastName} · {post.author?.role}
          {post.author?.role === 'TEACHER' ? ` (${post.author?.teacherLevel})` : ''}
        </p>

        {post.imageUrl ? (
          <img
            src={resolveMediaUrl(post.imageUrl)}
            alt={post.title}
            className="max-h-72 w-full rounded-lg border border-brand-100 object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/article-placeholder.svg';
            }}
          />
        ) : null}

        {!isExpanded && post.excerpt ? <p className="text-sm text-brand-700">{post.excerpt}</p> : null}

        {isExpanded ? (
          <>
            <p className="text-justify">{post.content}</p>
            <p className="text-sm text-slate-500">Likes: {post._count?.likes || 0} · Commentaires: {post._count?.comments || 0}</p>

            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => likePost(post.id)}>Like</button>
              <button className="btn-secondary" onClick={() => toggleCommentsPanel(post.id)}>
                {openComments[post.id] ? 'Masquer commentaires' : 'Voir commentaires'}
              </button>
              <button className="btn-secondary" onClick={() => sharePost(post)}>Partager</button>
            </div>

            {openComments[post.id] ? (
              <div className="space-y-2 rounded-lg border border-brand-100 p-3">
                {(commentsByPost[post.id] || []).map((comment) => (
                  <div key={comment.id} className="rounded border border-brand-100 p-2 text-sm">
                    <p className="font-semibold">{comment.author?.firstName} {comment.author?.lastName}</p>
                    <p className="mt-1 text-justify">{comment.content}</p>
                  </div>
                ))}
                {(commentsByPost[post.id] || []).length === 0 ? <p className="text-sm text-brand-700">Aucun commentaire.</p> : null}

                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Ajouter un commentaire"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  />
                  <button className="btn-primary" onClick={() => addComment(post.id)}>Commenter</button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {canEdit ? (
          <div>
            {editingPostId !== post.id ? (
              <button className="btn-secondary" onClick={() => openEdit(post)}>Modifier</button>
            ) : (
              <div className="mt-3 space-y-3 rounded-lg border border-brand-100 p-3">
                <p className="text-sm font-semibold">Modifier la publication</p>
                <input className="input" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Titre" />
                <input className="input" value={editForm.excerpt} onChange={(e) => setEditForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Extrait" />
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="input" value={editForm.imageUrl} onChange={(e) => setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL" />
                  <label className="rounded-lg border border-brand-100 px-3 py-2 text-sm text-brand-700">
                    Importer image
                    <input type="file" accept="image/*" className="mt-1 block w-full" onChange={(e) => uploadImage(e.target.files?.[0], 'edit')} />
                  </label>
                </div>
                {uploadingEditImage ? <p className="text-xs text-brand-700">Upload image...</p> : null}
                <textarea className="input min-h-[120px]" value={editForm.content} onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Contenu" />

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Portée
                    <select className="input mt-1" value={editForm.isGlobal ? 'global' : 'school'} onChange={(e) => setEditForm((prev) => ({ ...prev, isGlobal: e.target.value === 'global' }))}>
                      <option value="global">Blog global</option>
                      <option value="school">Blog interne</option>
                    </select>
                  </label>

                  {!editForm.isGlobal ? (
                    <label className="text-sm text-slate-700">
                      School ID
                      <input className="input mt-1" type="number" value={editForm.schoolId} onChange={(e) => setEditForm((prev) => ({ ...prev, schoolId: e.target.value }))} />
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Catégories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <label key={`edit_cat_${cat.id}`} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                          <input type="checkbox" checked={editForm.categoryIds.includes(cat.id)} onChange={() => toggleArraySelection('edit', 'categoryIds', cat.id)} />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label key={`edit_tag_${tag.id}`} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                          <input type="checkbox" checked={editForm.tagIds.includes(tag.id)} onChange={() => toggleArraySelection('edit', 'tagIds', tag.id)} />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {updateError ? <p className="text-sm text-red-600">{updateError}</p> : null}
                {updateInfo ? <p className="text-sm text-green-600">{updateInfo}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary" disabled={updating} onClick={() => updatePost(post.id)}>{updating ? 'Mise à jour...' : 'Enregistrer'}</button>
                  <button className="btn-secondary" onClick={() => setEditingPostId(null)}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {expandedPostId ? (
        selectedPost ? (
          renderPostCard(selectedPost, { isPriority: true })
        ) : (
          <section className="card">
            <p className="text-sm text-brand-700">Chargement de l’article sélectionné...</p>
          </section>
        )
      ) : null}

      <section className="card space-y-4">
        <h1 className="text-2xl font-semibold">Blog Global LinkEduPro</h1>
        <div className="flex gap-2">
          <input className="input" placeholder="Recherche posts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => { setPage(1); load(); }}>Rechercher</button>
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
        {actionError ? <p className="text-red-600">{actionError}</p> : null}
        {actionInfo ? <p className="text-green-600">{actionInfo}</p> : null}
      </section>

      {canCreatePost ? (
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Créer un article</h2>
          <p className="text-sm text-slate-600">
            Connecté en tant que: <span className="font-semibold">{student?.role || 'USER'}</span>
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Titre" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <input className="input" placeholder="Extrait (optionnel)" value={form.excerpt} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))} />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <input className="input" placeholder="Image URL (optionnel)" value={form.imageUrl} onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))} />
            <label className="rounded-lg border border-brand-100 px-3 py-2 text-sm text-brand-700">
              Importer image
              <input type="file" accept="image/*" className="mt-1 block w-full" onChange={(e) => uploadImage(e.target.files?.[0], 'create')} />
            </label>
          </div>
          {uploadingCreateImage ? <p className="text-xs text-brand-700">Upload image...</p> : null}

          <textarea className="input min-h-[140px]" placeholder="Contenu de l’article" value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Portée
              <select className="input mt-1" value={form.isGlobal ? 'global' : 'school'} onChange={(e) => setForm((prev) => ({ ...prev, isGlobal: e.target.value === 'global' }))}>
                <option value="global">Blog global</option>
                <option value="school">Blog interne (école)</option>
              </select>
            </label>

            {!form.isGlobal ? (
              <label className="text-sm text-slate-700">
                School ID
                <input className="input mt-1" type="number" value={form.schoolId} onChange={(e) => setForm((prev) => ({ ...prev, schoolId: e.target.value }))} placeholder="Ex: 1" />
              </label>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Catégories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                    <input type="checkbox" checked={form.categoryIds.includes(cat.id)} onChange={() => toggleArraySelection('create', 'categoryIds', cat.id)} />
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
                    <input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={() => toggleArraySelection('create', 'tagIds', tag.id)} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          {createInfo ? <p className="text-sm text-green-600">{createInfo}</p> : null}

          <div>
            <button className="btn-primary" disabled={creating} onClick={createPost}>{creating ? 'Publication...' : 'Publier'}</button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <p className="text-sm text-slate-600">Categories: {categories.map((c) => c.name).join(', ') || 'Aucune'}</p>
        <p className="text-sm text-slate-600">Tags: {tags.map((t) => t.name).join(', ') || 'Aucun'}</p>
      </section>

      {items
        .filter((post) => !expandedPostId || post.id !== expandedPostId)
        .map((post) => renderPostCard(post))}

      <section className="flex items-center justify-between">
        <button className="btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Precedent</button>
        <p className="text-sm">Page {pagination.page} / {pagination.totalPages}</p>
        <button className="btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
      </section>
    </main>
  );
}
