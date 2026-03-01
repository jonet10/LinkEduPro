'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

function emptyForm() {
  return {
    title: '',
    excerpt: '',
    imageUrl: '',
    content: '',
    postType: 'ARTICLE',
    audienceScope: 'GLOBAL',
    isGlobal: true,
    schoolId: '',
    categoryIds: [],
    tagIds: []
  };
}

function getInitials(firstName, lastName) {
  const first = String(firstName || '').trim().charAt(0).toUpperCase();
  const last = String(lastName || '').trim().charAt(0).toUpperCase();
  return `${first}${last}`.trim() || 'U';
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'à l’instant';
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)} j`;
  return date.toLocaleDateString();
}

export default function BlogPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [uploadingCreateImage, setUploadingCreateImage] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());
  const [publicItems, setPublicItems] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentImageUrls, setCommentImageUrls] = useState({});
  const [uploadingCommentImage, setUploadingCommentImage] = useState({});
  const createGalleryInputRef = useRef(null);
  const createCameraInputRef = useRef(null);
  const editGalleryInputRef = useRef(null);
  const editCameraInputRef = useRef(null);

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canCreatePost = Boolean(token);
  const canModeratePosts = Boolean(student && ['TEACHER', 'ADMIN'].includes(student.role));
  const composerPrompt = useMemo(() => {
    const firstName = student?.firstName || 'utilisateur';
    if (student?.role === 'ADMIN') return `Annonce ou mise à jour à partager aujourd'hui, ${firstName} ?`;
    if (student?.role === 'TEACHER') return `Quel conseil, exercice ou correction veux-tu publier, ${firstName} ?`;
    return `Besoin d'aide sur un exercice, ${firstName} ?`;
  }, [student?.firstName, student?.role]);
  const contentPlaceholder = useMemo(() => {
    if (student?.role === 'ADMIN') {
      return 'Rédige ton annonce: objectif, public cible, consignes et prochaines étapes.';
    }
    if (student?.role === 'TEACHER') {
      return "Partage un exercice, une explication ou une correction guidée (objectif, méthode, solution).";
    }
    return "Explique ton exercice ou ta question en détail (énoncé, ce que tu as essayé, où tu bloques).";
  }, [student?.role]);
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
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        search
      });
      if (postTypeFilter) params.set('postType', postTypeFilter);
      if (canModeratePosts && statusFilter) params.set('status', statusFilter);
      const requests = [
        apiClient(`/community/blog/posts?${params.toString()}`, { token }),
        apiClient('/community/blog/categories', { token }),
        apiClient('/community/blog/tags', { token })
      ];
      const [postRes, catRes, tagRes] = await Promise.all(requests);
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

  function onPickImage(target, source) {
    if (target === 'create' && source === 'gallery') createGalleryInputRef.current?.click();
    if (target === 'create' && source === 'camera') createCameraInputRef.current?.click();
    if (target === 'edit' && source === 'gallery') editGalleryInputRef.current?.click();
    if (target === 'edit' && source === 'camera') editCameraInputRef.current?.click();
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
        postType: 'ARTICLE',
        audienceScope: 'GLOBAL',
        isGlobal: true,
        schoolId: null,
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
      const details = Array.isArray(e?.data?.details) ? e.data.details.join(' | ') : '';
      setCreateError(details || e.message || 'Erreur lors de la création de l’article.');
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
      postType: post.postType || 'ARTICLE',
      audienceScope: post.audienceScope || (post.isGlobal ? 'GLOBAL' : 'SCHOOL'),
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
      const isStudentRole = student?.role === 'STUDENT';
      const payload = {
        title: editForm.title.trim(),
        excerpt: editForm.excerpt.trim(),
        imageUrl: editForm.imageUrl.trim() || null,
        content: editForm.content.trim(),
        postType: isStudentRole ? 'ARTICLE' : editForm.postType,
        audienceScope: isStudentRole ? 'GLOBAL' : editForm.audienceScope,
        isGlobal: isStudentRole ? true : editForm.audienceScope === 'GLOBAL',
        schoolId: isStudentRole ? null : (editForm.audienceScope === 'SCHOOL' ? Number(editForm.schoolId || 0) : null),
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

  async function approvePostByModerator(postId) {
    if (!token) return;
    setActionError('');
    setActionInfo('');
    try {
      await apiClient(`/community/blog/posts/${postId}/approve`, {
        method: 'PATCH',
        token
      });
      setActionInfo('Post validé avec succès.');
      await load();
    } catch (e) {
      setActionError(e.message || 'Erreur pendant la validation du post.');
    }
  }

  async function deletePost(postId) {
    if (!token || !postId) return;
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Supprimer cette publication ?');
    if (!confirmed) return;

    setDeletingPostId(postId);
    setActionError('');
    setActionInfo('');
    try {
      await apiClient(`/community/blog/posts/${postId}`, {
        method: 'DELETE',
        token
      });
      setActionInfo('Publication supprimée.');
      if (expandedPostId === postId) {
        setExpandedPostId(null);
      }
      if (editingPostId === postId) {
        setEditingPostId(null);
      }
      await load();
    } catch (e) {
      setActionError(e.message || 'Erreur lors de la suppression.');
    } finally {
      setDeletingPostId(null);
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
    const imageUrl = commentImageUrls[postId] || null;
    if (!content && !imageUrl) return;

    try {
      await apiClient(`/community/blog/posts/${postId}/comments`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content: content || 'Réponse en image', imageUrl })
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setCommentImageUrls((prev) => ({ ...prev, [postId]: '' }));
      await Promise.all([loadComments(postId), load()]);
    } catch (e) {
      setActionError(e.message || 'Erreur ajout commentaire.');
    }
  }

  async function uploadCommentImage(postId, file) {
    if (!token || !file) return;
    setUploadingCommentImage((prev) => ({ ...prev, [postId]: true }));
    try {
      const body = new FormData();
      body.append('image', file);
      const data = await apiClient('/community/blog/posts/upload-image', {
        method: 'POST',
        token,
        body
      });
      setCommentImageUrls((prev) => ({ ...prev, [postId]: data.imageUrl || '' }));
    } catch (e) {
      setActionError(e.message || 'Erreur upload image commentaire.');
    } finally {
      setUploadingCommentImage((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function reactComment(postId, commentId, emoji) {
    if (!token) return;
    try {
      const data = await apiClient(`/community/blog/comments/${commentId}/reaction`, {
        method: 'POST',
        token,
        body: JSON.stringify({ emoji })
      });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (
          c.id === commentId
            ? { ...c, reactions: data.reactions || {}, myReaction: data.myReaction || null }
            : c
        ))
      }));
    } catch (e) {
      setActionError(e.message || 'Erreur reaction emoji.');
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
    if (token) return;
    setPublicLoading(true);
    setPublicError('');
    apiClient('/public/blog/recent?limit=6')
      .then((data) => {
        setPublicItems(data.items || []);
      })
      .catch((e) => {
        setPublicError(e.message || 'Impossible de charger les publications publiques.');
      })
      .finally(() => setPublicLoading(false));
  }, [token]);

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
    const canDelete = Boolean(student && (
      student.role === 'ADMIN'
      || student.id === post.authorId
      || (student.role === 'TEACHER' && post.author?.role === 'STUDENT')
    ));
    const canApprovePending = canModeratePosts && !post.isApproved;
    const isExpanded = expandedPostId === post.id;
    const isPriority = Boolean(options.isPriority);

    return (
      <article
        id={`blog-post-${post.id}`}
        key={post.id}
        className={`overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm ${isPriority ? 'ring-2 ring-brand-300' : ''}`}
      >
        <div className="space-y-3 p-4">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => togglePost(post.id)}
            aria-label="Ouvrir publication"
          >
            <div className="flex items-start gap-3">
              {post.imageUrl ? (
                <img
                  src={resolveMediaUrl(post.imageUrl)}
                  alt={post.title}
                  className="h-24 w-24 flex-shrink-0 rounded-lg border border-brand-100 object-cover sm:h-28 sm:w-36"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/article-placeholder.svg';
                  }}
                />
              ) : (
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-xs font-semibold text-brand-700 sm:h-28 sm:w-36">
                  LinkEduPro
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-brand-700">
                  {post.author?.firstName} {post.author?.lastName}
                  {` · ${post.author?.role || ''}`}
                  {post.author?.role === 'TEACHER' ? ` · ${post.author?.teacherLevel || ''}` : ''}
                  {post.createdAt ? ` · ${formatRelativeTime(post.createdAt)}` : ''}
                </p>
                <p className="mt-1 text-xl font-semibold leading-snug text-brand-900">{post.title}</p>
                <p
                  className="mt-1 text-sm text-brand-700"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.excerpt || post.content}
                </p>
              </div>
            </div>
          </button>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-brand-100 px-2 py-1">{post.postType === 'EXERCISE' ? 'Exercice' : 'Article'}</span>
            <span className="rounded border border-brand-100 px-2 py-1">
              {post.audienceScope === 'GLOBAL' ? 'Global' : post.audienceScope === 'INTER_SCHOOL' ? 'Inter-école' : 'École'}
            </span>
            {post.isApproved ? (
              <span className="rounded border border-green-300 bg-green-50 px-2 py-1 text-green-700">Validé</span>
            ) : (
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700">En attente</span>
            )}
          </div>
          {canApprovePending ? (
            <div>
              <button className="btn-primary !py-1.5 !text-xs" onClick={() => approvePostByModerator(post.id)}>
                Valider ce post
              </button>
            </div>
          ) : null}
        </div>

        {isExpanded ? (
          <>
            <p className="px-4 py-3 text-justify text-brand-900">{post.content}</p>
            <p className="px-4 text-sm text-brand-700">👍 {post._count?.likes || 0} · 💬 {post._count?.comments || 0}</p>

            <div className="mt-3 grid grid-cols-3 border-y border-brand-100 px-3 py-1">
              <button className="rounded-lg px-2 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => likePost(post.id)}>👍 J’aime</button>
              <button className="rounded-lg px-2 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => toggleCommentsPanel(post.id)}>
                💬 {openComments[post.id] ? 'Masquer' : 'Commenter'}
              </button>
              <button className="rounded-lg px-2 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => sharePost(post)}>↗ Partager</button>
            </div>

            {openComments[post.id] ? (
              <div className="space-y-2 bg-brand-50 p-3">
                {(commentsByPost[post.id] || []).map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-brand-100 bg-white p-3 text-sm">
                    <p className="font-semibold text-brand-900">{comment.author?.firstName} {comment.author?.lastName}</p>
                    <p className="mt-1 text-justify">{comment.content}</p>
                    {comment.imageUrl ? (
                      <img
                        src={resolveMediaUrl(comment.imageUrl)}
                        alt="Réponse"
                        className="mt-2 max-h-40 w-full rounded border border-brand-100 object-cover"
                      />
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['👍', '❤️', '🔥', '👏', '💡'].map((emoji) => (
                        <button
                          key={`${comment.id}-${emoji}`}
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${comment.myReaction === emoji ? 'border-brand-500 bg-brand-50' : 'border-brand-100'}`}
                          onClick={() => reactComment(post.id, comment.id, emoji)}
                        >
                          {emoji} {comment.reactions?.[emoji] || 0}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {(commentsByPost[post.id] || []).length === 0 ? <p className="text-sm text-brand-700">Aucun commentaire.</p> : null}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="input"
                      placeholder="Ajouter un commentaire"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    />
                    <button className="btn-primary" onClick={() => addComment(post.id)}>Commenter</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input type="file" accept="image/*" onChange={(e) => uploadCommentImage(post.id, e.target.files?.[0])} />
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => uploadCommentImage(post.id, e.target.files?.[0])} />
                  </div>
                  {uploadingCommentImage[post.id] ? <p className="text-xs text-brand-700">Upload image réponse...</p> : null}
                  {commentImageUrls[post.id] ? (
                    <img src={resolveMediaUrl(commentImageUrls[post.id])} alt="Aperçu réponse" className="max-h-40 rounded border border-brand-100" />
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {canEdit || canDelete ? (
          <div>
            {editingPostId !== post.id ? (
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {canEdit ? <button className="btn-secondary" onClick={() => openEdit(post)}>modifier</button> : null}
                {canDelete ? (
                  <button
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => deletePost(post.id)}
                    disabled={deletingPostId === post.id}
                  >
                    {deletingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-3 rounded-lg border border-brand-100 p-3">
                <p className="text-sm font-semibold">modifier la publication</p>
                <input className="input" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Titre" />
                <input className="input" value={editForm.excerpt} onChange={(e) => setEditForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Extrait" />
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="input" value={editForm.imageUrl} onChange={(e) => setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL" />
                  <div className="space-y-2 rounded-lg border border-brand-100 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Photo</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => onPickImage('edit', 'camera')}>
                        Prendre une photo
                      </button>
                      <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => onPickImage('edit', 'gallery')}>
                        Importer depuis l'appareil
                      </button>
                    </div>
                    <input ref={editGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'edit')} />
                    <input ref={editCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'edit')} />
                  </div>
                </div>
                {uploadingEditImage ? <p className="text-xs text-brand-700">Upload image...</p> : null}
                {editForm.imageUrl ? (
                  <img
                    src={resolveMediaUrl(editForm.imageUrl)}
                    alt="Aperçu image publication"
                    className="max-h-56 w-full rounded-lg border border-brand-100 object-cover"
                  />
                ) : null}
                <textarea className="input min-h-[120px]" value={editForm.content} onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Contenu" />

                {canModeratePosts ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-brand-700">
                      Type
                      <select className="input mt-1" value={editForm.postType} onChange={(e) => setEditForm((prev) => ({ ...prev, postType: e.target.value }))}>
                        <option value="ARTICLE">Article</option>
                        <option value="EXERCISE">Exercice</option>
                      </select>
                    </label>
                    <label className="text-sm text-brand-700">
                      Portée
                      <select className="input mt-1" value={editForm.audienceScope || 'GLOBAL'} onChange={(e) => setEditForm((prev) => ({ ...prev, audienceScope: e.target.value }))}>
                        <option value="GLOBAL">Global</option>
                        <option value="INTER_SCHOOL">Inter-école</option>
                        <option value="SCHOOL">École spécifique</option>
                      </select>
                    </label>

                    {editForm.audienceScope === 'SCHOOL' ? (
                      <label className="text-sm text-brand-700">
                        School ID
                        <input className="input mt-1" type="number" value={editForm.schoolId} onChange={(e) => setEditForm((prev) => ({ ...prev, schoolId: e.target.value }))} />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-brand-700">Catégories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <label key={`edit_cat_${cat.id}`} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                          <input type="checkbox" checked={editForm.categoryIds.includes(cat.id)} onChange={() => toggleArraySelection('edit', 'categoryIds', cat.id)} />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                    {categories.length === 0 ? <p className="text-xs text-brand-700">Aucune catégorie disponible.</p> : null}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-brand-700">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label key={`edit_tag_${tag.id}`} className="inline-flex items-center gap-1 rounded border border-brand-100 px-2 py-1 text-sm">
                          <input type="checkbox" checked={editForm.tagIds.includes(tag.id)} onChange={() => toggleArraySelection('edit', 'tagIds', tag.id)} />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                    {tags.length === 0 ? <p className="text-xs text-brand-700">Aucun tag disponible.</p> : null}
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

  if (!token) {
    return (
      <main className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-4">
        <section className="card public-card grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Solutions expertes</h1>
            <p className="mt-1 text-sm text-brand-700">
              Consulte des publications validées et connecte-toi pour poser des questions ou publier tes ressources.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="/register" className="btn-primary">Créer un compte</a>
              <a href="/login" className="btn-secondary">Se connecter</a>
            </div>
          </div>
          <div className="public-hero-media">
            <img src="/images/tool-communaute-scolaire.png" alt="Communauté et solutions expertes" />
          </div>
        </section>

        <section className="card public-card public-card-delay-1">
          <h2 className="text-xl font-semibold text-brand-900">Publications récentes</h2>
          {publicLoading ? <p className="mt-2 text-sm text-brand-700">Chargement...</p> : null}
          {publicError ? <p className="mt-2 text-sm text-red-600">{publicError}</p> : null}
          <div className="mt-4 grid gap-4">
            {publicItems.map((post) => (
              <article key={post.id} className="rounded-xl border border-brand-100 bg-white p-4 public-card public-card-delay-2">
                <div className="flex items-start gap-3">
                  {post.imageUrl ? (
                    <img
                      src={resolveMediaUrl(post.imageUrl)}
                      alt={post.title}
                      className="h-20 w-20 rounded-lg border border-brand-100 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/article-placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-xs font-semibold text-brand-700">
                      LinkEduPro
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-brand-700">
                      {post.author?.firstName} {post.author?.lastName} · {post.author?.role || 'Membre'}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-brand-900">{post.title}</p>
                    <p className="mt-1 text-sm text-brand-700">
                      {post.excerpt || 'Publication communautaire LinkEduPro.'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            {!publicLoading && publicItems.length === 0 ? (
              <p className="text-sm text-brand-700">Aucune publication publique pour le moment.</p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-4">
      {expandedPostId ? (
        selectedPost ? (
          renderPostCard(selectedPost, { isPriority: true })
        ) : (
          <section className="card">
            <p className="text-sm text-brand-700">Chargement de l’article sélectionné...</p>
          </section>
        )
      ) : null}

      <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-900">Forum LinkEduPro</h1>
        <p className="mt-1 text-sm text-brand-700">Pose une question, partage une solution et échange avec la communauté.</p>
        <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          <p className="text-sm font-semibold text-brand-900">Comment ça marche ?</p>
          <div className="mt-2 grid gap-2 text-sm text-brand-700 md:grid-cols-3">
            <p><strong>1.</strong> Décris ton besoin clairement (contexte + objectif).</p>
            <p><strong>2.</strong> Explique ce que tu as déjà essayé et où ça bloque.</p>
            <p><strong>3.</strong> Consulte les réponses, applique, puis remercie la communauté.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <input className="input" placeholder="Recherche forum" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={postTypeFilter} onChange={(e) => setPostTypeFilter(e.target.value)}>
            <option value="">Tous contenus</option>
            <option value="EXERCISE">Exercices</option>
            <option value="ARTICLE">Articles</option>
          </select>
          {canModeratePosts ? (
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="PENDING">En attente de validation</option>
              <option value="APPROVED">Validés</option>
            </select>
          ) : null}
          <button className="btn-primary" onClick={() => { setPage(1); load(); }}>Rechercher</button>
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
        {actionError ? <p className="text-red-600">{actionError}</p> : null}
        {actionInfo ? <p className="text-green-600">{actionInfo}</p> : null}
      </section>

      {canCreatePost ? (
        <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
              {getInitials(student?.firstName, student?.lastName)}
            </div>
            <input
              className="input flex-1 rounded-full"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder={composerPrompt}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 border-y border-brand-100 py-2">
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => onPickImage('create', 'camera')}>📷 Photo</button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={() => onPickImage('create', 'gallery')}>🖼️ Galerie</button>
          </div>
          <input ref={createGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'create')} />
          <input ref={createCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'create')} />
          {uploadingCreateImage ? <p className="text-xs text-brand-700">Upload image...</p> : null}
          {form.imageUrl ? (
            <img
              src={resolveMediaUrl(form.imageUrl)}
              alt="Aperçu image publication"
              className="max-h-56 w-full rounded-lg border border-brand-100 object-cover"
            />
          ) : null}

          <textarea className="input min-h-[140px]" placeholder={contentPlaceholder} value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} />

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
              {categories.length === 0 ? <p className="text-xs text-brand-700">Aucune catégorie disponible.</p> : null}
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
              {tags.length === 0 ? <p className="text-xs text-brand-700">Aucun tag disponible.</p> : null}
            </div>
          </div>

          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          {createInfo ? <p className="text-sm text-green-600">{createInfo}</p> : null}

          <div className="flex items-center justify-between">
            <p className="text-xs text-brand-700">Connecté en tant que {student?.role || 'USER'}</p>
            <button className="btn-primary" disabled={creating} onClick={createPost}>{creating ? 'Publication...' : 'Publier'}</button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-brand-700">Categories: {categories.map((c) => c.name).join(', ') || 'Aucune'}</p>
        <p className="text-sm text-brand-700">Tags: {tags.map((t) => t.name).join(', ') || 'Aucun'}</p>
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
