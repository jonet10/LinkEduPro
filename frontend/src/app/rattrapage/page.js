"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const LEVEL_CHOICES = [
  { value: 'LEVEL_9E', label: '9e' },
  { value: 'NSI', label: 'NSI' },
  { value: 'NSII', label: 'NSII' },
  { value: 'NSIII', label: 'NSIII' },
  { value: 'NSIV', label: 'NSIV' },
  { value: 'UNIVERSITAIRE', label: 'Universitaire' }
];

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minutesBetween(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

function addMinutesLocal(startValue, durationValue) {
  const start = new Date(startValue);
  const duration = Number(durationValue || 0);
  if (Number.isNaN(start.getTime()) || !Number.isFinite(duration) || duration <= 0) return '';
  return toDatetimeLocal(new Date(start.getTime() + duration * 60000));
}

export default function RattrapagePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canManage = student?.role === 'ADMIN' || student?.role === 'TEACHER';
  const isStudent = student?.role === 'STUDENT';
  const canView = Boolean(student);
  const [isPublicView, setIsPublicView] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState(null);
  const [paymentChoice, setPaymentChoice] = useState(null);
  const [form, setForm] = useState({
    title: '',
    level: 'NSIV',
    levels: ['NSIV'],
    subject: 'Physique',
    isFree: false,
    price: '0',
    maxParticipants: '60',
    description: '',
    meetingLink: '',
    invitationScope: 'GLOBAL',
    targetSchool: '',
    targetTeacherId: '',
    invitationMessage: '',
    startTime: '',
    endTime: '',
    duration: '60'
  });

  async function refreshSessions() {
    const sessionsData = await apiClient('/catchup?page=1&pageSize=100', { token });
    setSessions(sessionsData.sessions || []);
  }

  useEffect(() => {
    if (!token) {
      setIsPublicView(true);
      setLoading(false);
      return;
    }
    if (!canView) {
      router.push('/subjects');
      return;
    }

    Promise.allSettled([
      apiClient('/catchup?page=1&pageSize=100', { token }),
      canManage ? apiClient('/catchup/teachers', { token }) : Promise.resolve({ teachers: [] })
    ])
      .then(([sessionsRes, teachersRes]) => {
        if (sessionsRes.status === 'fulfilled') {
          setSessions(sessionsRes.value.sessions || []);
        } else {
          setError(sessionsRes.reason?.message || 'Impossible de charger les rattrapages.');
        }

        if (teachersRes.status === 'fulfilled') {
          setTeachers(teachersRes.value.teachers || []);
        } else {
          setTeachers([]);
        }

      })
      .finally(() => setLoading(false));
  }, [token, canView, router, canManage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const sessionParam = Number(query.get('session') || 0);
    const payment = String(query.get('payment') || '').trim().toLowerCase();
    const provider = String(query.get('provider') || '').trim().toLowerCase();
    if (sessionParam > 0) {
      setHighlightedSessionId(sessionParam);
    }
    if (provider === 'moncash') {
      if (payment === 'success') {
        setInfo('Paiement MonCash validé. Accès accordé.');
      } else if (payment === 'failed') {
        setError('Paiement MonCash non validé.');
      }
    }
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const startDate = new Date(form.startTime);
      const endDate = form.endTime ? new Date(form.endTime) : null;
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Date de début invalide.');
      }
      if (endDate && Number.isNaN(endDate.getTime())) {
        throw new Error('Heure de fin invalide.');
      }
      const computedDuration = minutesBetween(form.startTime, form.endTime) || Number(form.duration || 0);
      await apiClient('/catchup', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...form,
          levels: Array.isArray(form.levels) && form.levels.length ? form.levels : [form.level || 'NSIV'],
          level: (Array.isArray(form.levels) && form.levels.length ? form.levels[0] : form.level) || 'NSIV',
          isFree: Boolean(form.isFree),
          price: form.isFree ? 0 : Number(form.price || 0),
          maxParticipants: Number(form.maxParticipants || 0),
          startTime: startDate.toISOString(),
          endsAt: endDate ? endDate.toISOString() : null,
          duration: computedDuration,
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage planifié.');
      setForm({
        title: '',
        level: 'NSIV',
        levels: ['NSIV'],
        subject: 'Physique',
        isFree: false,
        price: '0',
        maxParticipants: '60',
        description: '',
        meetingLink: '',
        invitationScope: 'GLOBAL',
        targetSchool: '',
        targetTeacherId: '',
        invitationMessage: '',
        startTime: '',
        endTime: '',
        duration: '60'
      });
      await refreshSessions();
    } catch (e2) {
      const details = Array.isArray(e2?.data?.details) ? e2.data.details.join(' | ') : '';
      setError(details || e2.message || 'Erreur création rattrapage.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(session) {
    setEditingId(session.id);
    setShowPlanner(true);
    setOpenActionsId(null);
    const nextLevels = Array.isArray(session.targetLevels) && session.targetLevels.length
      ? session.targetLevels
      : [session.level || 'NSIV'];
    setForm({
      title: session.title || '',
      level: nextLevels[0] || session.level || 'NSIV',
      levels: nextLevels,
      subject: session.subject || 'Physique',
      isFree: Boolean(session.isFree),
      price: session.price != null ? String(session.price) : '0',
      maxParticipants: session.maxParticipants ? String(session.maxParticipants) : '60',
      description: session.description || '',
      meetingLink: session.meetingLink || session.meetUrl || '',
      invitationScope: session.invitationScope || 'GLOBAL',
      targetSchool: session.targetSchool || '',
      targetTeacherId: session.targetTeacherId ? String(session.targetTeacherId) : '',
      invitationMessage: session.invitationMessage || '',
      startTime: toDatetimeLocal(session.startTime || session.startsAt),
      endTime: toDatetimeLocal(session.endsAt || (session.startTime ? new Date(new Date(session.startTime).getTime() + Number(session.duration || 0) * 60000) : null)),
      duration: session.duration ? String(session.duration) : '60'
    });
    setError('');
    setInfo('');
  }

  async function onSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const startDate = new Date(form.startTime);
      const endDate = form.endTime ? new Date(form.endTime) : null;
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Date de début invalide.');
      }
      if (endDate && Number.isNaN(endDate.getTime())) {
        throw new Error('Heure de fin invalide.');
      }
      const computedDuration = minutesBetween(form.startTime, form.endTime) || Number(form.duration || 0);
      await apiClient(`/catchup/${editingId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          ...form,
          levels: Array.isArray(form.levels) && form.levels.length ? form.levels : [form.level || 'NSIV'],
          level: (Array.isArray(form.levels) && form.levels.length ? form.levels[0] : form.level) || 'NSIV',
          isFree: Boolean(form.isFree),
          price: form.isFree ? 0 : Number(form.price || 0),
          maxParticipants: Number(form.maxParticipants || 0),
          startTime: startDate.toISOString(),
          endsAt: endDate ? endDate.toISOString() : null,
          duration: computedDuration,
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage mis à jour.');
      setEditingId(null);
      setForm({
        title: '',
        level: 'NSIV',
        levels: ['NSIV'],
        subject: 'Physique',
        isFree: false,
        price: '0',
        maxParticipants: '60',
        description: '',
        meetingLink: '',
        invitationScope: 'GLOBAL',
        targetSchool: '',
        targetTeacherId: '',
        invitationMessage: '',
        startTime: '',
        endTime: '',
        duration: '60'
      });
      await refreshSessions();
    } catch (e2) {
      setError(e2.message || 'Erreur mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(sessionId) {
    if (!canManage) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce rattrapage ?')) return;
    try {
      await apiClient(`/catchup/${sessionId}`, { method: 'DELETE', token });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e) {
      setError(e.message || 'Erreur suppression.');
    }
  }

  async function onSubmitForm(e) {
    if (editingId) {
      e.preventDefault();
      await onSaveEdit();
      return;
    }
    await onCreate(e);
  }

  function onStartTimeChange(value) {
    setForm((prev) => {
      const next = { ...prev, startTime: value };
      if (next.duration) {
        next.endTime = addMinutesLocal(value, next.duration);
      }
      return next;
    });
  }

  function onDurationChange(value) {
    setForm((prev) => ({
      ...prev,
      duration: value,
      endTime: prev.startTime ? addMinutesLocal(prev.startTime, value) : prev.endTime
    }));
  }

  function onEndTimeChange(value) {
    setForm((prev) => {
      const computed = minutesBetween(prev.startTime, value);
      return {
        ...prev,
        endTime: value,
        duration: computed ? String(computed) : prev.duration
      };
    });
  }

  function onRepublish(session) {
    setEditingId(null);
    setShowPlanner(true);
    setOpenActionsId(null);
    const sourceStart = session.startTime || session.startsAt;
    const sourceEnd = session.endsAt || (sourceStart ? new Date(new Date(sourceStart).getTime() + Number(session.duration || 0) * 60000) : null);
    setForm({
      title: session.title || '',
      level: session.level || 'NSIV',
      subject: session.subject || 'Physique',
      isFree: Boolean(session.isFree),
      price: session.price != null ? String(session.price) : '0',
      maxParticipants: session.maxParticipants ? String(session.maxParticipants) : '60',
      description: session.description || '',
      meetingLink: session.meetingLink || session.meetUrl || '',
      invitationScope: session.invitationScope || 'GLOBAL',
      targetSchool: session.targetSchool || '',
      targetTeacherId: session.targetTeacherId ? String(session.targetTeacherId) : '',
      invitationMessage: session.invitationMessage || '',
      startTime: '',
      endTime: '',
      duration: session.duration ? String(session.duration) : '60'
    });
    setInfo(`Session chargée pour republication. Choisis une nouvelle date/heure de début et de fin.`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (sourceStart || sourceEnd) {
      // Keep previous values available as a hint in the form placeholders via info message only.
    }
  }

  async function onEnroll(sessionId) {
    setError('');
    setInfo('');
    try {
      const data = await apiClient(`/catchup/${sessionId}/enroll`, {
        method: 'POST',
        token
      });
      setInfo(data.message || 'Inscription enregistrée.');
      await refreshSessions();
    } catch (e) {
      setError(e.message || 'Impossible de réserver la place.');
    }
  }

  function openPaymentChoice(sessionId, price) {
    setPaymentChoice({ sessionId, price: Number(price || 0) });
  }

  async function onPayWithMethod(method, sessionId, price) {
    setError('');
    setInfo('');
    try {
      if (method === 'NATCASH') {
        setInfo('NatCash sera disponible prochainement. Utilise MonCash pour le moment.');
        setPaymentChoice(null);
        return;
      }

      const data = await apiClient(`/catchup/${sessionId}/pay`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          paymentMethod: method,
          amount: Number(price || 0)
        })
      });

      if (method === 'MONCASH' && data.redirectUrl && typeof window !== 'undefined') {
        window.location.assign(data.redirectUrl);
        return;
      }

      setInfo(data.message || 'Paiement validé.');
      await refreshSessions();
    } catch (e) {
      setError(e.message || 'Impossible de valider le paiement.');
    } finally {
      setPaymentChoice(null);
    }
  }

  async function onConfirmPresence(sessionId) {
    setError('');
    setInfo('');
    try {
      const data = await apiClient(`/catchup/${sessionId}/confirm-presence`, {
        method: 'POST',
        token
      });
      setInfo(data.message || 'Présence confirmée.');
      await refreshSessions();
    } catch (e) {
      setError(e.message || 'Impossible de confirmer la présence.');
    }
  }

  function formatHTG(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'HTG',
      maximumFractionDigits: 2
    }).format(amount);
  }

  function getSessionEndDate(session) {
    const start = new Date(session.startTime || session.startsAt);
    if (Number.isNaN(start.getTime())) return null;
    if (session.endsAt) {
      const end = new Date(session.endsAt);
      if (!Number.isNaN(end.getTime())) return end;
    }
    return new Date(start.getTime() + Number(session.duration || 0) * 60000);
  }

  function isArchivedSession(session) {
    if (session.status && session.status !== 'SCHEDULED') return true;
    const end = getSessionEndDate(session);
    if (!end) return false;
    return end.getTime() <= Date.now();
  }

  const activeSessions = canManage
    ? sessions.filter((session) => !isArchivedSession(session))
    : sessions;
  const archivedSessions = canManage
    ? sessions.filter((session) => isArchivedSession(session))
    : [];

  function renderSessionCard(session) {
    const endDate = getSessionEndDate(session);
    return (
      <article key={session.id} className={`card rattrapage-session-card ${highlightedSessionId === session.id ? 'ring-2 ring-brand-400' : ''} ${openActionsId === session.id ? 'z-30' : ''}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{session.subject}</p>
        <h3 className="text-lg font-semibold text-brand-900">{session.title}</h3>
        {session.description ? <p className="mt-1 text-sm text-brand-700">{session.description}</p> : null}
        <p className="mt-1 text-xs text-brand-700">
          Niveau: {(Array.isArray(session.targetLevels) && session.targetLevels.length ? session.targetLevels.join(', ') : session.level)} |{' '}
          {session.isFree ? 'Gratuite' : `Prix: ${formatHTG(session.price)}`} | Places: {session.enrolledCount}/{session.maxParticipants}
        </p>
        {canManage ? (
          <p className="mt-1 text-xs text-brand-700">
            Présences confirmées: {session.confirmedCount || 0}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-brand-700">
          Audience: {session.invitationScope}
          {session.targetSchool ? ` | École: ${session.targetSchool}` : ''}
          {session.targetTeacherName ? ` | Prof: ${session.targetTeacherName}` : ''}
        </p>
        {session.invitationMessage ? (
          <p className="mt-2 rounded border border-brand-100 bg-brand-50 px-2 py-1 text-sm text-brand-800">
            {session.invitationMessage}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-brand-700">Début: {new Date(session.startTime || session.startsAt).toLocaleString()}</p>
        {endDate ? <p className="text-sm text-brand-700">Fin: {endDate.toLocaleString()}</p> : null}
        <p className="text-sm text-brand-700">Durée: {session.duration} minutes</p>
        {session.canAccessMeeting && session.meetUrl ? (
          <a href={session.meetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 inline-block">
            Rejoindre Google Meet
          </a>
        ) : (
          <p className="mt-2 text-sm text-amber-700">Lien Meet verrouillé jusqu’à validation de l’accès.</p>
        )}
        {isStudent ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {!session.enrollment ? (
              <button className="btn-secondary" onClick={() => onEnroll(session.id)}>Réserver ma place</button>
            ) : null}
            {session.enrollment && session.enrollment.paymentStatus !== 'PAID' && !session.isFree ? (
              <button className="btn-primary" onClick={() => openPaymentChoice(session.id, session.price)}>Payer ({formatHTG(session.price)})</button>
            ) : null}
            {session.enrollment && session.isFree && !session.enrollment.accessGranted ? (
              <button className="btn-primary" onClick={() => onConfirmPresence(session.id)}>Confirmer ma présence</button>
            ) : null}
          </div>
        ) : null}
        {canManage ? (
          <div className="mt-3 flex justify-end">
            <div className="relative">
              <button
                type="button"
                className="btn-secondary px-3"
                aria-label="Actions session"
                onClick={() => setOpenActionsId((prev) => (prev === session.id ? null : session.id))}
              >
                ⋮
              </button>
              {openActionsId === session.id ? (
                <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg border border-brand-100 bg-white p-1 shadow-lg">
                  <button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => { startEdit(session); setOpenActionsId(null); }}>
                    Modifier
                  </button>
                  <button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => { onRepublish(session); setOpenActionsId(null); }}>
                    Reprogrammer
                  </button>
                  <button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { onDelete(session.id); setOpenActionsId(null); }}>
                    Supprimer
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (isPublicView) {
    return (
      <section className="public-transparent-scope space-y-5 rattrapage-shell">
        <div className="card public-card grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Live / rattrapage</h1>
            <p className="mt-2 text-sm text-brand-700">
              Des sessions live animées par des professeurs pour rattraper un chapitre ou se préparer aux examens.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">Créer un compte</Link>
              <Link href="/login" className="btn-secondary">Se connecter</Link>
            </div>
          </div>
          <div className="public-hero-media">
            <img src="/images/tool-rattrapage-live.png" alt="Sessions de rattrapage en direct" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="card public-card public-card-delay-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Exemple de session</p>
            <h2 className="mt-2 text-lg font-semibold text-brand-900">Physique — Électricité</h2>
            <p className="mt-2 text-sm text-brand-700">Session guidée avec exercices + corrections.</p>
            <p className="mt-2 text-xs text-brand-700">Durée: 60 min • Format: Google Meet</p>
          </article>
          <article className="card public-card public-card-delay-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Pour les élèves</p>
            <ul className="mt-2 space-y-2 text-sm text-brand-700">
              <li>Réserve ta place et reçois le lien après validation.</li>
              <li>Choisis des sessions gratuites ou payantes.</li>
              <li>Rejoins les professeurs en direct.</li>
            </ul>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 rattrapage-shell">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Sessions de rattrapage</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sessions gratuites ou payantes. Les élèves réservent leur place et accèdent au lien après validation.
        </p>
        {student?.role === 'TEACHER' ? (
          <div className="mt-4">
            <Link href="/teacher/dashboard" className="btn-secondary">Ouvrir mes revenus</Link>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-brand-900">{editingId ? 'Modifier une session' : 'Planifier une session'}</h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (editingId) {
                  setEditingId(null);
                  setShowPlanner(false);
                  return;
                }
                setShowPlanner((prev) => !prev);
              }}
            >
              {editingId ? 'Fermer' : (showPlanner ? 'Masquer le planificateur' : 'Planifier un rattrapage')}
            </button>
          </div>
          {showPlanner || editingId ? (
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmitForm}>
            <input className="input" placeholder="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <div className="md:col-span-2 space-y-1">
              <span className="text-sm font-medium text-brand-900">Classes concernées</span>
              <div className="flex flex-wrap gap-2">
                {LEVEL_CHOICES.map((entry) => (
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
                        setForm((p) => {
                          const prevLevels = Array.isArray(p.levels) && p.levels.length ? p.levels : [p.level || 'NSIV'];
                          const next = new Set(prevLevels);
                          if (checked) next.add(entry.value);
                          else next.delete(entry.value);
                          if (next.size === 0) next.add('NSIV');
                          const nextLevels = Array.from(next.values());
                          return { ...p, levels: nextLevels, level: nextLevels[0] || 'NSIV' };
                        });
                      }}
                    />
                    {entry.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-brand-600">Tu peux sélectionner plusieurs classes (ex: NSIII + NSIV).</p>
            </div>
            <input className="input" placeholder="Matière (ex: Physique)" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input className="input" type="number" min={1} placeholder="Max participants" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: e.target.value }))} required />
            <label className="inline-flex items-center gap-2 text-sm text-brand-800">
              <input type="checkbox" checked={Boolean(form.isFree)} onChange={(e) => setForm((p) => ({ ...p, isFree: e.target.checked }))} />
              Session gratuite
            </label>
            {!form.isFree ? (
              <input className="input" type="number" min={1} step="0.01" placeholder="Prix (HTG)" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            ) : null}
            <input className="input md:col-span-2" placeholder="Lien Google Meet" value={form.meetingLink} onChange={(e) => setForm((p) => ({ ...p, meetingLink: e.target.value }))} required />
            <select className="input" value={form.invitationScope} onChange={(e) => setForm((p) => ({ ...p, invitationScope: e.target.value }))}>
              <option value="GLOBAL">Global</option>
              <option value="TEACHERS">Entre professeurs</option>
              <option value="TEACHER">Professeur spécifique</option>
              <option value="SCHOOL">École spécifique</option>
            </select>
            {form.invitationScope === 'SCHOOL' ? (
              <input className="input" placeholder="École cible" value={form.targetSchool} onChange={(e) => setForm((p) => ({ ...p, targetSchool: e.target.value }))} required />
            ) : null}
            {form.invitationScope === 'TEACHER' ? (
              <select className="input" value={form.targetTeacherId} onChange={(e) => setForm((p) => ({ ...p, targetTeacherId: e.target.value }))} required>
                <option value="">Choisir un professeur</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName} ({teacher.school || 'Sans école'})
                  </option>
                ))}
              </select>
            ) : null}
            <label className="text-sm text-brand-700">
              Date et heure
              <input
                className="input mt-1"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-brand-700">
              Durée (minutes)
              <input
                className="input mt-1"
                type="number"
                min={15}
                max={600}
                step={5}
                placeholder="Ex: 60"
                value={form.duration}
                onChange={(e) => onDurationChange(e.target.value)}
                required
              />
              <span className="mt-1 block text-xs text-brand-700">Entre 15 et 600 minutes.</span>
            </label>
            <label className="text-sm text-brand-700 md:col-span-2">
              Heure de fin
              <input
                className="input mt-1"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                required
              />
            </label>
            <textarea className="input md:col-span-2" placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <textarea className="input md:col-span-2" placeholder="Message d'annonce personnalisé (optionnel)" value={form.invitationMessage} onChange={(e) => setForm((p) => ({ ...p, invitationMessage: e.target.value }))} />
            {!editingId ? (
              <button className="btn-primary md:col-span-2" disabled={saving}>{saving ? 'Enregistrement...' : 'Planifier'}</button>
            ) : (
              <div className="md:col-span-2 flex gap-2">
                <button type="button" className="btn-primary" disabled={saving} onClick={onSaveEdit}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setShowPlanner(false); }}>Annuler</button>
              </div>
            )}
            </form>
          ) : (
            <p className="mt-3 text-sm text-brand-700">Clique sur « Planifier un rattrapage » pour afficher le formulaire.</p>
          )}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-900">Sessions actives</h2>
        <div className="rattrapage-active-sessions mt-3 grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
          {activeSessions.map((session) => renderSessionCard(session))}
          {!loading && activeSessions.length === 0 ? <p className="text-sm text-brand-700">Aucune session active pour le moment.</p> : null}
        </div>
      </div>

      {canManage ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Archives</h2>
          <p className="mt-1 text-sm text-brand-700">Anciennes sessions terminées. Tu peux les reprogrammer rapidement.</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {archivedSessions.map((session) => renderSessionCard(session))}
            {!loading && archivedSessions.length === 0 ? <p className="text-sm text-brand-700">Aucune session archivée.</p> : null}
          </div>
        </div>
      ) : null}

      {paymentChoice ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-brand-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Paiement rattrapage</p>
                <h3 className="mt-1 text-xl font-black text-brand-900">Choisis ta méthode de paiement</h3>
                <p className="mt-1 text-sm text-brand-700">Montant: {formatHTG(paymentChoice.price)}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-brand-100 px-2 py-1 text-sm"
                onClick={() => setPaymentChoice(null)}
              >
                Fermer
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-brand-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50"
                onClick={() => onPayWithMethod('MONCASH', paymentChoice.sessionId, paymentChoice.price)}
              >
                <img src="/images/moncash.jpg" alt="MonCash" className="h-16 w-full rounded-md object-contain bg-white" />
                <p className="mt-2 text-sm font-semibold text-brand-900">Payer avec MonCash</p>
                <p className="text-xs text-brand-700">Actif maintenant</p>
              </button>

              <button
                type="button"
                className="rounded-xl border border-brand-200 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50"
                onClick={() => onPayWithMethod('NATCASH', paymentChoice.sessionId, paymentChoice.price)}
              >
                <img src="/images/natcash.png" alt="NatCash" className="h-16 w-full rounded-md object-contain bg-white" />
                <p className="mt-2 text-sm font-semibold text-brand-900">Payer avec NatCash</p>
                <p className="text-xs text-amber-700">Option future (bientôt disponible)</p>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
