'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudent, getToken, normalizeAcademicLevel } from '@/lib/auth';
import { apiClient } from '@/lib/api';

const CLASS_OPTIONS = [
  { value: '9e', label: '9e AF' },
  { value: 'NS1', label: 'NSI' },
  { value: 'NS2', label: 'NSII' },
  { value: 'NS3', label: 'NSIII' },
  { value: 'Terminale', label: 'NSIV' },
  { value: 'Universite', label: 'Universitaire' }
];

const CONTENT_KIND_OPTIONS = [
  { value: 'LESSON', label: 'Leçon' },
  { value: 'EXERCISE', label: 'Exercice' },
  { value: 'COURSE', label: 'Cours complet' },
  { value: 'TUTORIAL', label: 'Tutoriel pratique' },
  { value: 'MASTERCLASS', label: 'Masterclass' },
  { value: 'REVISION', label: 'Révision guidée' },
  { value: 'WEBINAR', label: 'Webinaire' },
  { value: 'INTERVIEW', label: 'Interview pédagogique' },
  { value: 'OTHER', label: 'Autre' }
];

const PUBLICATION_TYPE_OPTIONS = [
  { value: 'SINGLE', label: 'Vidéo unique' },
  { value: 'SERIES', label: 'Série / Cours complet' }
];

const MAX_SERIES_LESSONS = 10;

function createEmptyLesson(index) {
  return {
    title: `Leçon ${index + 1}`,
    videoUrl: ''
  };
}

function normalizeVideoKind(value) {
  const upper = String(value || '').trim().toUpperCase();
  return CONTENT_KIND_OPTIONS.some((item) => item.value === upper) ? upper : 'LESSON';
}

function getVideoKindLabel(kind) {
  return CONTENT_KIND_OPTIONS.find((item) => item.value === kind)?.label || 'Leçon';
}

function toApiLevel(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Terminale';
  const upper = raw.toUpperCase();

  if (raw === '9e' || upper === 'LEVEL_9E') return '9e';
  if (upper === 'NS1' || upper === 'NSI') return 'NS1';
  if (upper === 'NS2' || upper === 'NSII') return 'NS2';
  if (upper === 'NS3' || upper === 'NSIII') return 'NS3';
  if (upper === 'TERMINALE' || upper === 'NSIV') return 'Terminale';
  if (upper === 'UNIVERSITE' || upper === 'UNIVERSITAIRE') return 'Universite';

  return CLASS_OPTIONS.some((item) => item.value === raw) ? raw : 'Terminale';
}

function parseVideoBody(rawBody) {
  if (typeof rawBody !== 'string') {
    return {
      description: '',
      videoUrl: '',
      kind: 'LESSON',
      isPaid: false,
      price: 0
    };
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object') {
      return {
        description: String(parsed.description || ''),
        videoUrl: String(parsed.videoUrl || ''),
        kind: normalizeVideoKind(parsed.kind),
        isPaid: Boolean(parsed.isPaid),
        price: Number(parsed.price || 0)
      };
    }
  } catch (_) {
    // Legacy plain text body fallback.
  }

  return {
    description: rawBody,
    videoUrl: '',
    kind: 'LESSON',
    isPaid: false,
    price: 0
  };
}

function mapContentToVideo(item) {
  const body = parseVideoBody(item?.body);
  const rawLevels = Array.isArray(item?.levels) ? item.levels : [];
  const levels = rawLevels.length
    ? rawLevels.map((lv) => toApiLevel(lv)).filter(Boolean)
    : [toApiLevel(item?.level)].filter(Boolean);
  const classLabel = levels.length
    ? levels
      .map((lv) => CLASS_OPTIONS.find((entry) => entry.value === lv)?.label || lv)
      .join(' + ')
    : (CLASS_OPTIONS.find((entry) => entry.value === toApiLevel(item?.level))?.label || toApiLevel(item?.level));
  return {
    id: item?.id,
    title: item?.title || 'Sans titre',
    description: body.description || 'Aucune description.',
    videoUrl: body.videoUrl || '',
    kind: normalizeVideoKind(body.kind),
    isPaid: body.isPaid,
    price: Math.max(0, Number(body.price || 0)),
    level: toApiLevel(item?.level),
    levels,
    classLabel,
    status: String(item?.status || 'pending').toUpperCase(),
    createdAt: item?.createdAt || null
  };
}

function formatHtg(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0
  }).format(amount);
}

function getVideoPlayerConfig(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return { type: 'none', src: '' };
  const directVideoPattern = /\.(mp4|webm|ogg)(\?.*)?$/i;
  if (directVideoPattern.test(url)) return { type: 'file', src: url };

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
      const shortPath = parsed.pathname.split('/').filter(Boolean);
      if (shortPath[0] === 'shorts' && shortPath[1]) {
        return { type: 'iframe', src: `https://www.youtube.com/embed/${shortPath[1]}` };
      }
    }

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }

    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) {
        return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
      }
    }
  } catch (_) {
    return { type: 'link', src: url };
  }

  return { type: 'link', src: url };
}

function normalizeErrorText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function safeText(value) {
  return String(value || '').trim();
}

function getYoutubeId(rawUrl) {
  const url = safeText(rawUrl);
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return id;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' && parts[1]) return parts[1];
      if (parts[0] === 'embed' && parts[1]) return parts[1];
    }

    if (host.includes('youtu.be')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return parts[0];
    }
  } catch (_) {
  }

  return '';
}

function getVideoThumbnail(rawUrl) {
  const youtubeId = getYoutubeId(rawUrl);
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  return '';
}

export default function VideoLessonsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [publicationType, setPublicationType] = useState('SINGLE');
  const [seriesLessons, setSeriesLessons] = useState([createEmptyLesson(0)]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'LESSON',
    isPaid: false,
    price: '',
    videoUrl: '',
    level: 'Terminale',
    levels: ['Terminale'],
    publishNow: false
  });

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push('/login');
      return;
    }
    const currentStudent = getStudent();
    const fallbackLevel = toApiLevel(normalizeAcademicLevel(currentStudent) || currentStudent?.level);
    setToken(currentToken);
    setStudent(currentStudent);
    setForm((prev) => ({ ...prev, level: fallbackLevel, levels: [fallbackLevel] }));
    setReady(true);
  }, [router]);

  const canManage = Boolean(student && ['ADMIN', 'TEACHER', 'SUPER_ADMIN'].includes(student.role));

  async function loadVideos(currentToken, currentStudent) {
    try {
      setLoading(true);
      setError('');
      if (!currentToken) return;

      if (currentStudent && ['ADMIN', 'TEACHER', 'SUPER_ADMIN'].includes(currentStudent.role)) {
        let items = [];
        if (['ADMIN', 'SUPER_ADMIN'].includes(currentStudent.role)) {
          const [mineData, pendingData] = await Promise.all([
            apiClient('/v2/contents/mine', { token: currentToken }),
            apiClient('/v2/contents/pending', { token: currentToken })
          ]);
          const merged = [...(pendingData.pending || []), ...(mineData.contents || [])];
          const byId = new Map(merged.map((item) => [item.id, item]));
          items = Array.from(byId.values());
        } else {
          const data = await apiClient('/v2/contents/mine', { token: currentToken });
          items = data.contents || [];
        }

        const mapped = items
          .filter((item) => String(item.type || '').toLowerCase() === 'video')
          .map(mapContentToVideo);
        setVideos(mapped);
      } else {
        const data = await apiClient('/v2/contents/my-level', { token: currentToken });
        const mapped = (data.contents || [])
          .filter((item) => String(item.type || '').toLowerCase() === 'video')
          .map(mapContentToVideo)
          .filter((item) => item.status === 'APPROVED');
        setVideos(mapped);
      }
    } catch (e) {
      const message = String(e?.message || '');
      const normalizedMessage = normalizeErrorText(message);
      if (normalizedMessage.includes('niveau utilisateur non defini')) {
        // For users without an academic level yet, keep the catalog empty without surfacing a blocking red error.
        setError('');
      } else {
        setError(message || 'Impossible de charger les contenus vidéo.');
      }
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    loadVideos(token, student);
  }, [ready, token, student]);

  const filteredVideos = useMemo(() => {
    let next = videos;
    if (filter !== 'ALL') {
      next = next.filter((item) => item.kind === filter);
    }
    if (statusFilter !== 'ALL') {
      next = next.filter((item) => item.status === statusFilter);
    }
    if (classFilter !== 'ALL') {
      next = next.filter((item) => (
        Array.isArray(item.levels) ? item.levels.includes(classFilter) : item.level === classFilter
      ));
    }
    return next;
  }, [filter, statusFilter, classFilter, videos]);

  function onChangeField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addSeriesLesson() {
    setSeriesLessons((prev) => {
      if (prev.length >= MAX_SERIES_LESSONS) return prev;
      return [...prev, createEmptyLesson(prev.length)];
    });
  }

  function removeSeriesLesson(index) {
    setSeriesLessons((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((_, currentIndex) => currentIndex !== index)
        .map((lesson, lessonIndex) => ({
          ...lesson,
          title: lesson.title || `Leçon ${lessonIndex + 1}`
        }));
    });
  }

  function updateSeriesLesson(index, patch) {
    setSeriesLessons((prev) => prev.map((lesson, currentIndex) => (
      currentIndex === index ? { ...lesson, ...patch } : lesson
    )));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canManage || !token) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    const title = form.title.trim();
    const description = form.description.trim();
    const videoUrl = form.videoUrl.trim();
    const price = Number(form.price || 0);

    if (!title || !description) {
      setSubmitting(false);
      setError('Merci de remplir le titre et la description.');
      return;
    }

    if (publicationType === 'SINGLE' && !videoUrl) {
      setSubmitting(false);
      setError('Merci de renseigner le lien vidéo.');
      return;
    }

    try {
      const selectedLevelsRaw = Array.isArray(form.levels) && form.levels.length ? form.levels : [form.level];
      const selectedLevels = Array.from(new Set(selectedLevelsRaw.map((lv) => toApiLevel(lv)).filter(Boolean)));
      if (!selectedLevels.length) {
        setSubmitting(false);
        setError('Choisis au moins une classe.');
        return;
      }

      const basePayload = {
        level: selectedLevels[0],
        levels: selectedLevels
      };
      const shouldPublishNow = student?.role === 'ADMIN' && form.publishNow;

      const buildPayload = (contentTitle, contentDescription, contentVideoUrl) => {
        const payload = {
          ...basePayload,
          ...(editingId ? null : { type: 'video' }),
          title: contentTitle,
          body: JSON.stringify({
            description: contentDescription,
            videoUrl: contentVideoUrl,
            kind: form.kind,
            isPaid: Boolean(form.isPaid),
            price: form.isPaid ? Math.max(0, price) : 0
          })
        };
        if (shouldPublishNow) {
          payload.status = 'approved';
        }
        return payload;
      };

      if (editingId) {
        const payload = buildPayload(title, description, videoUrl);
        const data = await apiClient(`/v2/contents/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload)
        });
        const updatedVideo = mapContentToVideo(data.content);
        setVideos((prev) => prev.map((item) => (item.id === updatedVideo.id ? updatedVideo : item)));
        setEditingId(null);
        setForm((prev) => ({
          ...prev,
          title: '',
          description: '',
          kind: 'LESSON',
          isPaid: false,
          price: '',
          videoUrl: '',
          publishNow: false
        }));
        setPublicationType('SINGLE');
        setSeriesLessons([createEmptyLesson(0)]);
        setShowComposer(false);
        setSuccess('Vidéo modifiée avec succès.');
        setSubmitting(false);
        return;
      }

      const payloads = publicationType === 'SERIES'
        ? seriesLessons
          .map((lesson, index) => ({
            title: String(lesson.title || `Leçon ${index + 1}`).trim(),
            videoUrl: String(lesson.videoUrl || '').trim(),
            index
          }))
          .filter((lesson) => lesson.videoUrl)
          .map((lesson) => (
            buildPayload(
              `${title} - ${lesson.title || `Leçon ${lesson.index + 1}`}`,
              `${description}\n\nParcours: ${title} | ${lesson.title || `Leçon ${lesson.index + 1}`}`,
              lesson.videoUrl
            )
          ))
        : [buildPayload(title, description, videoUrl)];

      if (!payloads.length) {
        setSubmitting(false);
        setError('Ajoute au moins une leçon avec un lien vidéo valide.');
        return;
      }

      const createdResponses = [];
      for (const payload of payloads) {
        const data = await apiClient('/v2/contents', {
          method: 'POST',
          token,
          body: JSON.stringify(payload)
        });
        createdResponses.push(data);
      }

      const createdVideos = createdResponses
        .map((response) => mapContentToVideo(response.content))
        .filter((item) => item?.id);
      setVideos((prev) => [...createdVideos, ...prev]);
      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        kind: 'LESSON',
        isPaid: false,
        price: '',
        videoUrl: '',
        publishNow: false
      }));
      setPublicationType('SINGLE');
      setSeriesLessons([createEmptyLesson(0)]);
      setShowComposer(false);
      if (publicationType === 'SERIES') {
        setSuccess(
          shouldPublishNow
            ? `Série publiée avec succès (${createdVideos.length} leçon(s)).`
            : `Série enregistrée avec succès (${createdVideos.length} leçon(s), en attente de validation admin).`
        );
      } else {
        setSuccess(shouldPublishNow
          ? 'Vidéo publiée avec succès.'
          : 'Vidéo enregistrée avec succès (en attente de validation admin).');
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la création du contenu vidéo.');
  } finally {
      setSubmitting(false);
    }
  }

  function startEditVideo(item) {
    if (!item?.id) return;
    setEditingId(item.id);
    setPublicationType('SINGLE');
    setSeriesLessons([createEmptyLesson(0)]);
    setForm((prev) => ({
      ...prev,
      title: item.title || '',
      description: item.description || '',
      kind: item.kind || 'LESSON',
      isPaid: Boolean(item.isPaid),
      price: item.isPaid ? String(item.price || 0) : '',
      videoUrl: item.videoUrl || '',
      level: Array.isArray(item.levels) && item.levels.length ? item.levels[0] : (item.level || 'Terminale'),
      levels: Array.isArray(item.levels) && item.levels.length ? item.levels : [item.level || 'Terminale'],
      publishNow: false
    }));
    setShowComposer(true);
    setSuccess('');
    setError('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function deleteVideo(item) {
    if (!item?.id || !token) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Supprimer cette vidéo ? Cette action est irréversible.')
      : false;
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await apiClient(`/v2/contents/${item.id}`, { method: 'DELETE', token });
      setVideos((prev) => prev.filter((row) => row.id !== item.id));
      if (activeVideo?.id === item.id) setActiveVideo(null);
      if (editingId === item.id) setEditingId(null);
      setSuccess('Vidéo supprimée.');
    } catch (e) {
      setError(e.message || 'Impossible de supprimer cette vidéo.');
    }
  }

  if (!ready) {
    return <p>Chargement de Classe Numerique...</p>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Nouveau module</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">Classe Numerique</h1>
        <p className="mt-2 text-sm text-brand-700">
          Espace de vidéos pédagogiques: leçons, exercices, cours complets, tutoriels et plus.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
      </section>

      {canManage ? (
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-brand-900">Publier un contenu vidéo</h2>
              <p className="mt-1 text-sm text-brand-700">
                Visible pour: ADMIN et TEACHER. Les enseignants créent des contenus en attente de validation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editingId ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setShowComposer(false);
                    setForm((prev) => ({
                      ...prev,
                      title: '',
                      description: '',
                      kind: 'LESSON',
                      isPaid: false,
                      price: '',
                      videoUrl: '',
                      publishNow: false
                    }));
                    setPublicationType('SINGLE');
                    setSeriesLessons([createEmptyLesson(0)]);
                  }}
                >
                  Annuler la modification
                </button>
              ) : null}
              <button type="button" className="btn-primary" onClick={() => setShowComposer((prev) => !prev)}>
                {showComposer ? 'Masquer le formulaire' : 'Ajouter une vidéo'}
              </button>
            </div>
          </div>

          {showComposer ? (
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-brand-900">Type de publication</span>
              <select
                className="input w-full"
                value={publicationType}
                onChange={(e) => setPublicationType(e.target.value)}
              >
                {PUBLICATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-brand-900">Titre</span>
              <input
                className="input w-full"
                value={form.title}
                onChange={(e) => onChangeField('title', e.target.value)}
                placeholder={publicationType === 'SERIES' ? 'Ex: Chimie organique - Cours complet' : 'Ex: Leçon de chimie organique'}
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-brand-900">Type</span>
              <select className="input w-full" value={form.kind} onChange={(e) => onChangeField('kind', e.target.value)}>
                {CONTENT_KIND_OPTIONS.map((kindOption) => (
                  <option key={kindOption.value} value={kindOption.value}>{kindOption.label}</option>
                ))}
              </select>
            </label>

            <div className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-brand-900">Classes concernées</span>
              <div className="flex flex-wrap gap-2">
                {CLASS_OPTIONS.map((entry) => (
                  <label
                    key={entry.value}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      Array.isArray(form.levels) && form.levels.includes(entry.value)
                        ? 'border-brand-200 bg-brand-50 text-brand-800'
                        : 'border-brand-100 bg-white text-brand-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Array.isArray(form.levels) ? form.levels.includes(entry.value) : form.level === entry.value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev) => {
                          const prevLevels = Array.isArray(prev.levels) && prev.levels.length ? prev.levels : [prev.level || 'Terminale'];
                          const next = new Set(prevLevels);
                          if (checked) next.add(entry.value);
                          else next.delete(entry.value);
                          if (next.size === 0) next.add('Terminale');
                          const nextLevels = Array.from(next.values());
                          return { ...prev, levels: nextLevels, level: nextLevels[0] || 'Terminale' };
                        });
                      }}
                    />
                    {entry.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-brand-600">Sélection multiple possible (ex: NSI + NSII).</p>
            </div>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-brand-900">Description</span>
              <textarea
                className="input min-h-[90px] w-full"
                value={form.description}
                onChange={(e) => onChangeField('description', e.target.value)}
                placeholder="Résumé court de la vidéo"
              />
            </label>

            {publicationType === 'SINGLE' ? (
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-brand-900">Lien vidéo (YouTube, Vimeo, etc.)</span>
                <input
                  className="input w-full"
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => onChangeField('videoUrl', e.target.value)}
                  placeholder="https://..."
                  required
                />
              </label>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-900">Leçons du parcours ({seriesLessons.length}/{MAX_SERIES_LESSONS})</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addSeriesLesson}
                    disabled={seriesLessons.length >= MAX_SERIES_LESSONS}
                  >
                    + Ajouter une leçon
                  </button>
                </div>
                <div className="space-y-2">
                  {seriesLessons.map((lesson, index) => (
                    <div key={`lesson-${index}`} className="grid gap-2 rounded-lg border border-brand-100 p-3 md:grid-cols-[1fr_2fr_auto]">
                      <input
                        className="input w-full"
                        value={lesson.title}
                        onChange={(e) => updateSeriesLesson(index, { title: e.target.value })}
                        placeholder={`Leçon ${index + 1}`}
                      />
                      <input
                        className="input w-full"
                        type="url"
                        value={lesson.videoUrl}
                        onChange={(e) => updateSeriesLesson(index, { videoUrl: e.target.value })}
                        placeholder="https://..."
                        required={index === 0}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => removeSeriesLesson(index)}
                        disabled={seriesLessons.length <= 1}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="inline-flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => onChangeField('isPaid', e.target.checked)}
              />
              <span className="text-sm text-brand-900">Contenu payant</span>
            </label>

            {student?.role === 'ADMIN' ? (
              <label className="inline-flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={form.publishNow}
                  onChange={(e) => onChangeField('publishNow', e.target.checked)}
                />
                <span className="text-sm text-brand-900">Publier immédiatement</span>
              </label>
            ) : <div />}

            {form.isPaid ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-brand-900">Prix (HTG)</span>
                <input
                  className="input w-full"
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => onChangeField('price', e.target.value)}
                  required
                />
              </label>
            ) : <div />}

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting
                  ? (editingId ? 'Modification...' : 'Publication...')
                  : (editingId ? 'Enregistrer les modifications' : (publicationType === 'SERIES' ? 'Publier la série' : 'Publier la vidéo'))}
              </button>
            </div>
          </form>
          ) : (
            <p className="mt-4 text-sm text-brand-700">Clique sur « Ajouter une vidéo » pour afficher le formulaire.</p>
          )}
        </section>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-brand-900">{canManage ? 'Mes contenus vidéo' : 'Catalogue vidéo'}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select className="input h-9 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par catégorie vidéo">
              <option value="ALL">Toutes catégories</option>
              {CONTENT_KIND_OPTIONS.map((kindOption) => (
                <option key={kindOption.value} value={kindOption.value}>{kindOption.label}</option>
              ))}
            </select>
            <select className="input h-9 text-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filtrer par classe">
              <option value="ALL">Toutes les classes</option>
              {CLASS_OPTIONS.map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label}</option>
              ))}
            </select>
            {canManage ? (
              <>
                <button type="button" className={statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatusFilter('ALL')}>Tous statuts</button>
                <button type="button" className={statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatusFilter('PENDING')}>En attente</button>
                <button type="button" className={statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatusFilter('APPROVED')}>Approuvés</button>
                <button type="button" className={statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatusFilter('REJECTED')}>Rejetés</button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {loading ? <p className="text-sm text-brand-700">Chargement du catalogue...</p> : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {filteredVideos.map((item) => {
              const thumbnail = getVideoThumbnail(item.videoUrl);
              const statusLabel = item.status === 'APPROVED' ? 'Approuvé' : item.status === 'REJECTED' ? 'Rejeté' : 'En attente';
              const statusTone = item.status === 'APPROVED'
                ? 'bg-emerald-50 text-emerald-800'
                : item.status === 'REJECTED'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-amber-50 text-amber-800';

              return (
                <article key={item.id} className="group">
                  <button
                    type="button"
                    className="relative w-full overflow-hidden rounded-2xl border border-brand-100 bg-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => setActiveVideo(item)}
                    aria-label={`Ouvrir la vidéo ${item.title}`}
                  >
                    <div className="relative aspect-[2/3] w-full">
                      {thumbnail ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-90"
                          style={{ backgroundImage: `url(${thumbnail})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

                      <div className="absolute left-2 top-2 flex flex-col gap-1 text-left">
                        <span className="inline-flex w-fit rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-black text-white shadow">
                          {item.classLabel}
                        </span>
                        <span className="inline-flex w-fit rounded-lg bg-white/90 px-2 py-1 text-[11px] font-bold text-slate-900 shadow">
                          {getVideoKindLabel(item.kind)}
                        </span>
                      </div>

                      {canManage ? (
                        <div className="absolute right-2 top-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-white/90 px-2 py-1 text-[11px] font-bold text-slate-900 shadow hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditVideo(item);
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-bold text-white shadow hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVideo(item);
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : null}

                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-left">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{item.title}</p>
                          {canManage ? (
                            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone}`}>
                              {statusLabel}
                            </p>
                          ) : null}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${
                          item.isPaid ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
                        }`}>
                          {item.isPaid ? formatHtg(item.price) : 'Gratuit'}
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>

          {!loading && filteredVideos.length === 0 ? (
            <p className="mt-3 text-sm text-brand-700">Aucune vidéo pour ce filtre.</p>
          ) : null}
        </div>
      </section>

      {activeVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-brand-100 p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-700">{activeVideo.classLabel} • {getVideoKindLabel(activeVideo.kind)}</p>
                <h3 className="mt-1 truncate text-lg font-bold text-brand-900">{activeVideo.title}</h3>
                <p className="mt-1 text-sm text-brand-700">{activeVideo.description}</p>
              </div>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setActiveVideo(null)}>
                Fermer
              </button>
            </div>
            <div className="p-4">
              {activeVideo.videoUrl ? (() => {
                const player = getVideoPlayerConfig(activeVideo.videoUrl);
                if (player.type === 'file') {
                  return (
                    <div className="overflow-hidden rounded-xl border border-brand-100 bg-black">
                      <video className="aspect-video w-full" controls preload="metadata" src={player.src} />
                    </div>
                  );
                }
                if (player.type === 'iframe') {
                  return (
                    <div className="overflow-hidden rounded-xl border border-brand-100 bg-black">
                      <iframe
                        src={player.src}
                        title={activeVideo.title}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                return (
                  <a className="btn-primary inline-block" href={activeVideo.videoUrl} target="_blank" rel="noreferrer">
                    Ouvrir la vidéo
                  </a>
                );
              })() : (
                <p className="text-sm text-brand-700">Aucun lien vidéo fourni.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
