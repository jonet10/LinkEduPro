'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudent, getToken, normalizeAcademicLevel } from '@/lib/auth';
import { apiClient } from '@/lib/api';

const CLASS_OPTIONS = [
  { value: '9e', label: '9e AF' },
  { value: 'NS1', label: 'NS I' },
  { value: 'NS2', label: 'NS II' },
  { value: 'NS3', label: 'NS III' },
  { value: 'Terminale', label: 'Terminale (NS IV)' },
  { value: 'Universite', label: 'Universite' }
];

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
        kind: String(parsed.kind || 'LESSON').toUpperCase() === 'EXERCISE' ? 'EXERCISE' : 'LESSON',
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
  return {
    id: item?.id,
    title: item?.title || 'Sans titre',
    description: body.description || 'Aucune description.',
    videoUrl: body.videoUrl || '',
    kind: body.kind,
    isPaid: body.isPaid,
    price: Math.max(0, Number(body.price || 0)),
    level: toApiLevel(item?.level),
    classLabel: CLASS_OPTIONS.find((entry) => entry.value === toApiLevel(item?.level))?.label || toApiLevel(item?.level),
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

export default function VideoLessonsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    kind: 'LESSON',
    isPaid: false,
    price: '',
    videoUrl: '',
    level: 'Terminale',
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
    setForm((prev) => ({ ...prev, level: fallbackLevel }));
    setReady(true);
  }, [router]);

  const canManage = Boolean(student && ['ADMIN', 'TEACHER'].includes(student.role));

  async function loadVideos(currentToken, currentStudent) {
    try {
      setLoading(true);
      setError('');
      if (!currentToken) return;

      if (currentStudent && ['ADMIN', 'TEACHER'].includes(currentStudent.role)) {
        const data = await apiClient('/v2/contents/mine', { token: currentToken });
        const mapped = (data.contents || [])
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
      if (message.toLowerCase().includes('niveau utilisateur non défini')) {
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
      next = next.filter((item) => item.level === classFilter);
    }
    return next;
  }, [filter, statusFilter, classFilter, videos]);

  function onChangeField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (!title || !videoUrl || !description) {
      setSubmitting(false);
      setError('Merci de remplir le titre, la description et le lien vidéo.');
      return;
    }

    const payload = {
      title,
      level: toApiLevel(form.level),
      type: 'video',
      body: JSON.stringify({
        description,
        videoUrl,
        kind: form.kind,
        isPaid: Boolean(form.isPaid),
        price: form.isPaid ? Math.max(0, price) : 0
      })
    };

    if (student?.role === 'ADMIN' && form.publishNow) {
      payload.status = 'approved';
    }

    try {
      const data = await apiClient('/v2/contents', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      const created = mapContentToVideo(data.content);
      setVideos((prev) => [created, ...prev]);
      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        kind: 'LESSON',
        isPaid: false,
        price: '',
        videoUrl: ''
      }));
      setSuccess(student?.role === 'ADMIN' && form.publishNow
        ? 'Vidéo publiée avec succès.'
        : 'Vidéo enregistrée avec succès (en attente de validation admin).');
    } catch (e) {
      setError(e.message || 'Erreur lors de la création du contenu vidéo.');
    } finally {
      setSubmitting(false);
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
          Espace de leçons et exercices en vidéo. Les contenus peuvent être gratuits ou payants.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
      </section>

      {canManage ? (
        <section className="card">
          <h2 className="text-xl font-semibold text-brand-900">Publier un contenu vidéo</h2>
          <p className="mt-1 text-sm text-brand-700">
            Visible pour: ADMIN et TEACHER. Les enseignants créent des contenus en attente de validation.
          </p>

          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-brand-900">Titre</span>
              <input
                className="input w-full"
                value={form.title}
                onChange={(e) => onChangeField('title', e.target.value)}
                placeholder="Ex: Leçon de chimie organique"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-brand-900">Type</span>
              <select className="input w-full" value={form.kind} onChange={(e) => onChangeField('kind', e.target.value)}>
                <option value="LESSON">Leçon</option>
                <option value="EXERCISE">Exercice</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-brand-900">Classe concernée</span>
              <select className="input w-full" value={form.level} onChange={(e) => onChangeField('level', e.target.value)}>
                {CLASS_OPTIONS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-brand-900">Description</span>
              <textarea
                className="input min-h-[90px] w-full"
                value={form.description}
                onChange={(e) => onChangeField('description', e.target.value)}
                placeholder="Résumé court de la vidéo"
              />
            </label>

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
                {submitting ? 'Publication...' : 'Ajouter la vidéo'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-brand-900">{canManage ? 'Mes contenus vidéo' : 'Catalogue vidéo'}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button type="button" className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('ALL')}>Tout</button>
            <button type="button" className={filter === 'LESSON' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('LESSON')}>Leçons</button>
            <button type="button" className={filter === 'EXERCISE' ? 'btn-primary' : 'btn-secondary'} onClick={() => setFilter('EXERCISE')}>Exercices</button>
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading ? <p className="text-sm text-brand-700">Chargement du catalogue...</p> : null}
          {filteredVideos.map((item) => (
            <article key={item.id} className="rounded-xl border border-brand-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.kind === 'LESSON' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
                  {item.kind === 'LESSON' ? 'Leçon' : 'Exercice'}
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.isPaid ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {item.isPaid ? `Payant (${formatHtg(item.price)})` : 'Gratuit'}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Classe: {item.classLabel}</span>
                {canManage ? (
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    item.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.status === 'APPROVED' ? 'Approuvé' : item.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-brand-900">{item.title}</h3>
              <p className="mt-1 text-sm text-brand-700">{item.description || 'Aucune description.'}</p>
              {item.videoUrl ? (
                <a className="btn-secondary mt-4 inline-block" href={item.videoUrl} target="_blank" rel="noreferrer">
                  Ouvrir la vidéo
                </a>
              ) : (
                <p className="mt-4 text-xs text-brand-700">Aucun lien vidéo fourni.</p>
              )}
            </article>
          ))}
          {!loading && filteredVideos.length === 0 ? (
            <p className="text-sm text-brand-700">Aucune vidéo pour ce filtre.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
