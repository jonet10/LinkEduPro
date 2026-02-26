"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

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
  const isStudent = student?.role === 'STUDENT';
  const canView = Boolean(student);

  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherStats, setTeacherStats] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('MONCASH');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    level: 'NSIV',
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
    duration: '60'
  });

  async function refreshSessions() {
    const sessionsData = await apiClient('/catchup?page=1&pageSize=100', { token });
    setSessions(sessionsData.sessions || []);
  }

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!canView) {
      router.push('/subjects');
      return;
    }

    Promise.allSettled([
      apiClient('/catchup?page=1&pageSize=100', { token }),
      canManage ? apiClient('/catchup/teachers', { token }) : Promise.resolve({ teachers: [] }),
      canManage ? apiClient('/catchup/dashboard/teacher', { token }) : Promise.resolve(null),
      isStudent ? apiClient('/catchup/dashboard/student?page=1&pageSize=8', { token }) : Promise.resolve(null)
    ])
      .then(([sessionsRes, teachersRes, teacherDashRes, studentDashRes]) => {
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

        if (teacherDashRes.status === 'fulfilled') {
          setTeacherStats(teacherDashRes.value);
        } else {
          setTeacherStats(null);
        }

        if (studentDashRes.status === 'fulfilled') {
          setStudentStats(studentDashRes.value);
        } else {
          setStudentStats(null);
        }
      })
      .finally(() => setLoading(false));
  }, [token, canView, router, canManage, isStudent]);

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
      await apiClient('/catchup', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...form,
          isFree: Boolean(form.isFree),
          price: form.isFree ? 0 : Number(form.price || 0),
          maxParticipants: Number(form.maxParticipants || 0),
          startTime: new Date(form.startTime).toISOString(),
          duration: Number(form.duration || 0),
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage planifié.');
      setForm({
        title: '',
        level: 'NSIV',
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
      startTime: toDatetimeLocal(session.startTime || session.startsAt),
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
      await apiClient(`/catchup/${editingId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          ...form,
          isFree: Boolean(form.isFree),
          price: form.isFree ? 0 : Number(form.price || 0),
          maxParticipants: Number(form.maxParticipants || 0),
          startTime: new Date(form.startTime).toISOString(),
          duration: Number(form.duration || 0),
          targetTeacherId: form.invitationScope === 'TEACHER' ? Number(form.targetTeacherId || 0) : null
        })
      });
      setInfo('Rattrapage mis à jour.');
      setEditingId(null);
      setForm({
        title: '',
        level: 'NSIV',
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

  async function onPay(sessionId, price) {
    setError('');
    setInfo('');
    try {
      if (paymentMethod === 'NATCASH' && typeof window !== 'undefined') {
        const accepted = window.confirm(
          `Mode simulation ${paymentMethod}: aucun débit réel ne sera fait. Continuer ?`
        );
        if (!accepted) return;
      }

      const data = await apiClient(`/catchup/${sessionId}/pay`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          paymentMethod,
          amount: Number(price || 0)
        })
      });

      if (paymentMethod === 'MONCASH' && data.redirectUrl && typeof window !== 'undefined') {
        window.location.assign(data.redirectUrl);
        return;
      }

      setInfo(data.message || 'Paiement validé.');
      await refreshSessions();
    } catch (e) {
      setError(e.message || 'Impossible de valider le paiement.');
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

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Sessions de rattrapage</h1>
        <p className="mt-2 text-sm text-brand-700">
          Sessions gratuites ou payantes. Les élèves réservent leur place et accèdent au lien après validation.
        </p>
      </div>

      {canManage ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <article className="card">
            <p className="text-xs text-brand-700">Revenus total (livres + rattrapage)</p>
            <p className="text-2xl font-bold text-brand-900">{formatHTG(teacherStats?.summary?.totalRevenue ?? 0)}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Commission plateforme totale</p>
            <p className="text-2xl font-bold text-brand-900">{formatHTG(teacherStats?.summary?.totalCommission ?? 0)}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Revenus rattrapage (85%)</p>
            <p className="text-2xl font-bold text-brand-900">{formatHTG(teacherStats?.summary?.totalRemedialRevenue ?? 0)}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Revenus livres (90%)</p>
            <p className="text-2xl font-bold text-brand-900">{formatHTG(teacherStats?.summary?.totalLibraryRevenue ?? 0)}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Ventes de livres</p>
            <p className="text-2xl font-bold text-brand-900">{teacherStats?.summary?.totalLibrarySales ?? 0}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Élèves inscrits rattrapage</p>
            <p className="text-2xl font-bold text-brand-900">{teacherStats?.summary?.totalStudents ?? 0}</p>
          </article>
          <article className="card">
            <p className="text-xs text-brand-700">Sessions</p>
            <p className="text-2xl font-bold text-brand-900">{teacherStats?.summary?.totalSessions ?? 0}</p>
          </article>
        </div>
      ) : null}

      {canManage ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-brand-900">
            {editingId ? 'Modifier une session' : 'Planifier une session'}
          </h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmitForm}>
            <input className="input" placeholder="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <select className="input" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} required>
              <option value="LEVEL_9E">9e</option>
              <option value="NSI">NSI</option>
              <option value="NSII">NSII</option>
              <option value="NSIII">NSIII</option>
              <option value="NSIV">NSIV</option>
              <option value="UNIVERSITAIRE">Universitaire</option>
            </select>
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
            <input className="input" type="datetime-local" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} required />
            <input className="input" type="number" min={15} max={600} step={5} value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} required />
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
      {isStudent ? (
        <div className="card flex flex-wrap items-center gap-2">
          <p className="text-sm text-brand-700">Méthode de paiement :</p>
          <select className="input w-full max-w-xs" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="MONCASH">MonCash</option>
            <option value="NATCASH">NatCash (simulation)</option>
          </select>
          {paymentMethod === 'MONCASH' ? (
            <p className="w-full rounded border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
              En cliquant sur payer, tu seras redirigé vers MonCash pour finaliser la transaction.
            </p>
          ) : null}
          {paymentMethod === 'NATCASH' ? (
            <p className="w-full rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Mode test actif: {paymentMethod} est simulé pour le moment (pas d’API externe, pas de débit réel).
            </p>
          ) : null}
        </div>
      ) : null}
      {isStudent ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Historique des sessions suivies</h2>
          <div className="mt-2 space-y-2">
            {(studentStats?.history || []).slice(0, 5).map((item) => (
              <div key={item.enrollmentId} className="rounded border border-brand-200 px-3 py-2 text-sm text-brand-800">
                {item.session?.title} | {item.session?.subject} | Paiement: {item.paymentStatus}
              </div>
            ))}
            {(!studentStats?.history || studentStats.history.length === 0) ? (
              <p className="text-sm text-brand-700">Aucune session suivie pour le moment.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((session) => (
          <article key={session.id} className={`card ${highlightedSessionId === session.id ? 'ring-2 ring-brand-400' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{session.subject}</p>
            <h3 className="text-lg font-semibold text-brand-900">{session.title}</h3>
            {session.description ? <p className="mt-1 text-sm text-brand-700">{session.description}</p> : null}
            <p className="mt-1 text-xs text-brand-700">
              Niveau: {session.level} | {session.isFree ? 'Gratuite' : `Prix: ${formatHTG(session.price)}`} | Places: {session.enrolledCount}/{session.maxParticipants}
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
                  <button className="btn-primary" onClick={() => onPay(session.id, session.price)}>Payer ({formatHTG(session.price)})</button>
                ) : null}
                {session.enrollment && session.isFree && !session.enrollment.accessGranted ? (
                  <button className="btn-primary" onClick={() => onConfirmPresence(session.id)}>Confirmer ma présence</button>
                ) : null}
              </div>
            ) : null}
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
