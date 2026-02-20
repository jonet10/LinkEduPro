"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken, isNsivStudent } from '@/lib/auth';

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RattrapagePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canManage = student?.role === 'ADMIN' || student?.role === 'TEACHER';
  const canView = canManage || isNsivStudent(student);

  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subject: 'Physique',
    description: '',
    meetUrl: '',
    invitationScope: 'GLOBAL',
    targetSchool: '',
    targetTeacherId: '',
    invitationMessage: '',
    startsAt: '',
    endsAt: ''
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!canView) {
      router.push('/subjects');
      return;
    }

    Promise.all([
      apiClient('/catchup', { token }),
      canManage ? apiClient('/catchup/teachers', { token }) : Promise.resolve({ teachers: [] })
    ])
      .then(([sessionsData, teachersData]) => {
        setSessions(sessionsData.sessions || []);
        setTeachers(teachersData.teachers || []);
      })
      .catch((e) => setError(e.message || 'Impossible de charger les rattrapages.'))
      .finally(() => setLoading(false));
  }, [token, canView, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const sessionParam = Number(query.get('session') || 0);
    if (sessionParam > 0) {
      setHighlightedSessionId(sessionParam);
    }
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await apiClient('/catchup', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage planifié.');
      setForm({
        title: '',
        subject: 'Physique',
        description: '',
        meetUrl: '',
        invitationScope: 'GLOBAL',
        targetSchool: '',
        targetTeacherId: '',
        invitationMessage: '',
        startsAt: '',
        endsAt: ''
      });
      const data = await apiClient('/catchup', { token });
      setSessions(data.sessions || []);
    } catch (e2) {
      setError(e2.message || 'Erreur création rattrapage.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(session) {
    setEditingId(session.id);
    setForm({
      title: session.title || '',
      subject: session.subject || 'Physique',
      description: session.description || '',
      meetUrl: session.meetUrl || '',
      invitationScope: session.invitationScope || 'GLOBAL',
      targetSchool: session.targetSchool || '',
      targetTeacherId: session.targetTeacherId ? String(session.targetTeacherId) : '',
      invitationMessage: session.invitationMessage || '',
      startsAt: toDatetimeLocal(session.startsAt),
      endsAt: toDatetimeLocal(session.endsAt)
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
      await apiClient(`/catchup/${editingId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage mis à jour.');
      setEditingId(null);
      setForm({
        title: '',
        subject: 'Physique',
        description: '',
        meetUrl: '',
        invitationScope: 'GLOBAL',
        targetSchool: '',
        targetTeacherId: '',
        invitationMessage: '',
        startsAt: '',
        endsAt: ''
      });
      const data = await apiClient('/catchup', { token });
      setSessions(data.sessions || []);
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

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Rattrapage NSIV</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sessions de rattrapage planifiées via Google Meet pour les élèves NSIV.
        </p>
      </div>

      {canManage ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-brand-900">
            {editingId ? 'Modifier une session' : 'Planifier une session'}
          </h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmitForm}>
            <input className="input" placeholder="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <input className="input" placeholder="Matière (ex: Physique)" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input className="input md:col-span-2" placeholder="Lien Google Meet" value={form.meetUrl} onChange={(e) => setForm((p) => ({ ...p, meetUrl: e.target.value }))} required />
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
            <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} required />
            <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} required />
            <textarea className="input md:col-span-2" placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <textarea className="input md:col-span-2" placeholder="Message d'annonce personnalisé (optionnel)" value={form.invitationMessage} onChange={(e) => setForm((p) => ({ ...p, invitationMessage: e.target.value }))} />
            {!editingId ? (
              <button className="btn-primary md:col-span-2" disabled={saving}>{saving ? 'Enregistrement...' : 'Planifier'}</button>
            ) : (
              <div className="md:col-span-2 flex gap-2">
                <button type="button" className="btn-primary" disabled={saving} onClick={onSaveEdit}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>Annuler</button>
              </div>
            )}
          </form>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => (
          <article key={session.id} className={`card ${highlightedSessionId === session.id ? 'ring-2 ring-brand-400' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{session.subject}</p>
            <h3 className="text-lg font-semibold text-brand-900">{session.title}</h3>
            {session.description ? <p className="mt-1 text-sm text-brand-700">{session.description}</p> : null}
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
            <p className="mt-2 text-sm text-brand-700">Début: {new Date(session.startsAt).toLocaleString()}</p>
            <p className="text-sm text-brand-700">Fin: {new Date(session.endsAt).toLocaleString()}</p>
            <a href={session.meetUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 inline-block">
              Rejoindre Google Meet
            </a>
            {canManage ? (
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => startEdit(session)}>Modifier</button>
                <button className="btn-secondary" onClick={() => onDelete(session.id)}>Supprimer</button>
              </div>
            ) : null}
          </article>
        ))}
        {!loading && sessions.length === 0 ? <p className="text-sm text-brand-700">Aucune session planifiée pour le moment.</p> : null}
      </div>
    </section>
  );
}
