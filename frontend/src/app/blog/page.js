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

export default function BlogPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
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
  const [commentImageUrls, setCommentImageUrls] = useState({});
  const [uploadingCommentImage, setUploadingCommentImage] = useState({});
  const [reviewForms, setReviewForms] = useState({});
  const [reviewingComment, setReviewingComment] = useState({});
  const [reviewSummary, setReviewSummary] = useState({
    stats: { pending: 0, corrected: 0, pinnedBest: 0 },
    pendingItems: []
  });
  const createGalleryInputRef = useRef(null);
  const createCameraInputRef = useRef(null);
  const editGalleryInputRef = useRef(null);
  const editCameraInputRef = useRef(null);

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canCreatePost = Boolean(token);
  const canSeeReviewSummary = Boolean(student && ['TEACHER', 'ADMIN'].includes(student.role));
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
      const requests = [
        apiClient(`/community/blog/posts?${params.toString()}`, { token }),
        apiClient('/community/blog/categories', { token }),
        apiClient('/community/blog/tags', { token })
      ];
      if (canSeeReviewSummary) {
        requests.push(apiClient('/community/blog/review-summary', { token }));
      }

      const [postRes, catRes, tagRes, summaryRes] = await Promise.all(requests);
      setItems(postRes.items || []);
      setPagination(postRes.pagination || { page: 1, totalPages: 1, total: 0 });
      setCategories(catRes.categories || []);
      setTags(tagRes.tags || []);
      if (canSeeReviewSummary && summaryRes) {
        setReviewSummary({
          stats: summaryRes.stats || { pending: 0, corrected: 0, pinnedBest: 0 },
          pendingItems: summaryRes.pendingItems || []
        });
      }
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
        postType: form.postType,
        audienceScope: form.audienceScope,
        isGlobal: form.audienceScope === 'GLOBAL',
        schoolId: form.audienceScope === 'SCHOOL' ? Number(form.schoolId || 0) : null,
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
      const payload = {
        title: editForm.title.trim(),
        excerpt: editForm.excerpt.trim(),
        imageUrl: editForm.imageUrl.trim() || null,
        content: editForm.content.trim(),
        postType: editForm.postType,
        audienceScope: editForm.audienceScope,
        isGlobal: editForm.audienceScope === 'GLOBAL',
        schoolId: editForm.audienceScope === 'SCHOOL' ? Number(editForm.schoolId || 0) : null,
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
      setReviewForms((prev) => {
        const next = { ...prev };
        (data.comments || []).forEach((comment) => {
          if (!next[comment.id]) {
            next[comment.id] = {
              correctionStatus: comment.correctionStatus || 'PENDING',
              score: comment.score ?? '',
              maxScore: comment.maxScore ?? '',
              teacherFeedback: comment.teacherFeedback || '',
              pinBest: Boolean(comment.isPinnedBest)
            };
          }
        });
        return next;
      });
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

  function updateReviewForm(commentId, key, value) {
    setReviewForms((prev) => ({
      ...prev,
      [commentId]: {
        correctionStatus: 'PENDING',
        score: '',
        maxScore: '',
        teacherFeedback: '',
        pinBest: false,
        ...(prev[commentId] || {}),
        [key]: value
      }
    }));
  }

  async function reviewCommentByTeacher(postId, commentId) {
    if (!token) return;
    const draft = reviewForms[commentId] || {};
    try {
      setReviewingComment((prev) => ({ ...prev, [commentId]: true }));
      await apiClient(`/community/blog/comments/${commentId}/review`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          correctionStatus: draft.correctionStatus || 'PENDING',
          score: draft.score === '' ? null : Number(draft.score),
          maxScore: draft.maxScore === '' ? null : Number(draft.maxScore),
          teacherFeedback: draft.teacherFeedback || null,
          pinBest: Boolean(draft.pinBest)
        })
      });
      await Promise.all([loadComments(postId), load()]);
      setActionInfo('Correction enregistrée.');
      setActionError('');
    } catch (e) {
      setActionError(e.message || 'Erreur correction commentaire.');
    } finally {
      setReviewingComment((prev) => ({ ...prev, [commentId]: false }));
    }
  }

  async function openPendingForReview(item) {
    if (!item?.postId) return;
    setExpandedPostId(item.postId);
    setOpenComments((prev) => ({ ...prev, [item.postId]: true }));
    await loadComments(item.postId);
    setTimeout(() => scrollToPostTop(item.postId, true), 0);
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
    const canReviewExerciseAnswers = student && ['TEACHER', 'ADMIN'].includes(student.role) && post.postType === 'EXERCISE';
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
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-brand-100 px-2 py-1">{post.postType === 'EXERCISE' ? 'Exercice' : 'Article'}</span>
          <span className="rounded border border-brand-100 px-2 py-1">
            {post.audienceScope === 'GLOBAL' ? 'Global' : post.audienceScope === 'INTER_SCHOOL' ? 'Inter-école' : 'École'}
          </span>
        </div>

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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded border px-2 py-0.5 ${comment.correctionStatus === 'CORRECTED' ? 'border-green-300 bg-green-50 text-green-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                        {comment.correctionStatus === 'CORRECTED' ? 'Corrigé' : 'Non corrigé'}
                      </span>
                      {comment.isPinnedBest ? (
                        <span className="rounded border border-brand-300 bg-brand-50 px-2 py-0.5 text-brand-700">Meilleure réponse</span>
                      ) : null}
                      {(comment.score !== null && comment.score !== undefined && comment.maxScore) ? (
                        <span className="rounded border border-brand-100 px-2 py-0.5 text-brand-700">
                          Barème: {comment.score}/{comment.maxScore}
                        </span>
                      ) : null}
                    </div>
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
                    {comment.teacherFeedback ? (
                      <p className="mt-2 rounded border border-brand-100 bg-brand-50 px-2 py-1 text-xs text-brand-800">
                        Feedback professeur: {comment.teacherFeedback}
                      </p>
                    ) : null}
                    {comment.corrector ? (
                      <p className="mt-1 text-[11px] text-brand-700">
                        Corrigé par {comment.corrector.firstName} {comment.corrector.lastName}
                        {comment.correctedAt ? ` le ${new Date(comment.correctedAt).toLocaleString()}` : ''}
                      </p>
                    ) : null}
                    {canReviewExerciseAnswers ? (
                      <div className="mt-3 rounded border border-brand-100 p-2">
                        <p className="text-xs font-semibold text-brand-900">Correction guidée</p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <select
                            className="input"
                            value={reviewForms[comment.id]?.correctionStatus || 'PENDING'}
                            onChange={(e) => updateReviewForm(comment.id, 'correctionStatus', e.target.value)}
                          >
                            <option value="PENDING">Non corrigé</option>
                            <option value="CORRECTED">Corrigé</option>
                          </select>
                          <label className="inline-flex items-center gap-2 text-xs text-brand-700">
                            <input
                              type="checkbox"
                              checked={Boolean(reviewForms[comment.id]?.pinBest)}
                              onChange={(e) => updateReviewForm(comment.id, 'pinBest', e.target.checked)}
                            />
                            Épingler meilleure réponse
                          </label>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            placeholder="Score"
                            value={reviewForms[comment.id]?.score ?? ''}
                            onChange={(e) => updateReviewForm(comment.id, 'score', e.target.value)}
                          />
                          <input
                            className="input"
                            type="number"
                            min={1}
                            placeholder="Barème max"
                            value={reviewForms[comment.id]?.maxScore ?? ''}
                            onChange={(e) => updateReviewForm(comment.id, 'maxScore', e.target.value)}
                          />
                        </div>
                        <textarea
                          className="input mt-2 min-h-[70px]"
                          placeholder="Feedback professeur"
                          value={reviewForms[comment.id]?.teacherFeedback || ''}
                          onChange={(e) => updateReviewForm(comment.id, 'teacherFeedback', e.target.value)}
                        />
                        <div className="mt-2">
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={Boolean(reviewingComment[comment.id])}
                            onClick={() => reviewCommentByTeacher(post.id, comment.id)}
                          >
                            {reviewingComment[comment.id] ? 'Enregistrement...' : 'Enregistrer correction'}
                          </button>
                        </div>
                      </div>
                    ) : null}
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

        {canEdit ? (
          <div>
            {editingPostId !== post.id ? (
              <button className="btn-secondary" onClick={() => openEdit(post)}>modifier</button>
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

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Type
                    <select className="input mt-1" value={editForm.postType} onChange={(e) => setEditForm((prev) => ({ ...prev, postType: e.target.value }))}>
                      <option value="ARTICLE">Article</option>
                      <option value="EXERCISE">Exercice</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Portée
                    <select className="input mt-1" value={editForm.audienceScope || 'GLOBAL'} onChange={(e) => setEditForm((prev) => ({ ...prev, audienceScope: e.target.value }))}>
                      <option value="GLOBAL">Global</option>
                      <option value="INTER_SCHOOL">Inter-école</option>
                      <option value="SCHOOL">École spécifique</option>
                    </select>
                  </label>

                  {editForm.audienceScope === 'SCHOOL' ? (
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
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <input className="input" placeholder="Recherche posts" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={postTypeFilter} onChange={(e) => setPostTypeFilter(e.target.value)}>
            <option value="">Tous contenus</option>
            <option value="EXERCISE">Exercices</option>
            <option value="ARTICLE">Articles</option>
          </select>
          <button className="btn-primary" onClick={() => { setPage(1); load(); }}>Rechercher</button>
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
        {actionError ? <p className="text-red-600">{actionError}</p> : null}
        {actionInfo ? <p className="text-green-600">{actionInfo}</p> : null}
      </section>

      {canSeeReviewSummary ? (
        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Copies à corriger</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-800">En attente</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{reviewSummary.stats.pending}</p>
            </article>
            <article className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs uppercase tracking-wide text-green-800">Corrigées</p>
              <p className="mt-1 text-2xl font-bold text-green-900">{reviewSummary.stats.corrected}</p>
            </article>
            <article className="rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs uppercase tracking-wide text-brand-800">Meilleures épinglées</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{reviewSummary.stats.pinnedBest}</p>
            </article>
          </div>
          <div className="space-y-2">
            {reviewSummary.pendingItems.length === 0 ? (
              <p className="text-sm text-brand-700">Aucune copie en attente.</p>
            ) : (
              reviewSummary.pendingItems.map((item) => (
                <div key={item.commentId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-100 p-2 text-sm">
                  <div>
                    <p className="font-semibold text-brand-900">{item.studentName}</p>
                    <p className="text-brand-700">{item.postTitle}</p>
                    <p className="text-xs text-brand-700">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <button type="button" className="btn-primary" onClick={() => openPendingForReview(item)}>
                    Corriger
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

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
            <div className="space-y-2 rounded-lg border border-brand-100 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Photo</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => onPickImage('create', 'camera')}>
                  Prendre une photo
                </button>
                <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => onPickImage('create', 'gallery')}>
                  Importer depuis l'appareil
                </button>
              </div>
              <input ref={createGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'create')} />
              <input ref={createCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], 'create')} />
            </div>
          </div>
          {uploadingCreateImage ? <p className="text-xs text-brand-700">Upload image...</p> : null}
          {form.imageUrl ? (
            <img
              src={resolveMediaUrl(form.imageUrl)}
              alt="Aperçu image publication"
              className="max-h-56 w-full rounded-lg border border-brand-100 object-cover"
            />
          ) : null}

          <textarea className="input min-h-[140px]" placeholder="Contenu de l’article" value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Type
              <select className="input mt-1" value={form.postType} onChange={(e) => setForm((prev) => ({ ...prev, postType: e.target.value }))}>
                <option value="ARTICLE">Article</option>
                <option value="EXERCISE">Exercice (prof/admin)</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Portée
              <select className="input mt-1" value={form.audienceScope || 'GLOBAL'} onChange={(e) => setForm((prev) => ({ ...prev, audienceScope: e.target.value }))}>
                <option value="GLOBAL">Global</option>
                <option value="INTER_SCHOOL">Inter-école</option>
                <option value="SCHOOL">École spécifique</option>
              </select>
            </label>

            {form.audienceScope === 'SCHOOL' ? (
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
