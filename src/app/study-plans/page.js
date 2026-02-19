"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const LEVELS = ['9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite'];

function parseChapterOrder(plan) {
  if (Number.isInteger(plan?.chapterOrder)) return plan.chapterOrder;
  const match = String(plan?.title || '').match(/M(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sortPlans(a, b) {
  const orderA = parseChapterOrder(a);
  const orderB = parseChapterOrder(b);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

export default function StudyPlansPage() {
  const [plans, setPlans] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);

  const [filterLevel, setFilterLevel] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const [form, setForm] = useState({
    level: '9e',
    subject: '',
    chapterOrder: '',
    title: '',
    description: '',
    notes: '',
    exercises: ''
  });

  const [editForm, setEditForm] = useState({
    level: '9e',
    subject: '',
    chapterOrder: '',
    title: '',
    description: '',
    notes: '',
    exercises: ''
  });

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const [preferredSubject, setPreferredSubject] = useState('');
  const canCreate = student && ['TEACHER', 'ADMIN'].includes(student.role);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setPreferredSubject((params.get('subject') || '').trim());
  }, []);

  const plansBySubject = useMemo(() => {
    const grouped = new Map();
    plans.forEach((plan) => {
      const subject = (plan.subject || 'General').trim() || 'General';
      if (!grouped.has(subject)) grouped.set(subject, []);
      grouped.get(subject).push(plan);
    });

    const entries = Array.from(grouped.entries())
      .map(([subject, list]) => ({ subject, plans: list.sort(sortPlans) }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    return entries;
  }, [plans]);

  const selectedSubjectPlans = useMemo(() => {
    const found = plansBySubject.find((s) => s.subject === selectedSubject);
    return found ? found.plans : [];
  }, [plansBySubject, selectedSubject]);

  const selectedPlan = useMemo(() => {
    return selectedSubjectPlans.find((p) => p.id === selectedPlanId) || null;
  }, [selectedSubjectPlans, selectedPlanId]);

  useEffect(() => {
    if (!plansBySubject.length) {
      setSelectedSubject('');
      setSelectedPlanId(null);
      return;
    }

    if (preferredSubject) {
      const preferred = plansBySubject.find(
        (item) => item.subject.toLowerCase() === preferredSubject.toLowerCase()
      );
      if (preferred && selectedSubject !== preferred.subject) {
        setSelectedSubject(preferred.subject);
        setSelectedPlanId(preferred.plans[0]?.id || null);
        return;
      }
    }

    if (!selectedSubject || !plansBySubject.some((s) => s.subject === selectedSubject)) {
      setSelectedSubject(plansBySubject[0].subject);
      setSelectedPlanId(plansBySubject[0].plans[0]?.id || null);
      return;
    }

    const currentSubjectPlans = plansBySubject.find((s) => s.subject === selectedSubject)?.plans || [];
    if (!currentSubjectPlans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(currentSubjectPlans[0]?.id || null);
    }
  }, [plansBySubject, selectedSubject, selectedPlanId, preferredSubject]);

  async function loadPlans() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (student?.role === 'STUDENT') {
        const data = await apiClient('/v2/study-plans/my', { token });
        setPlans(data.plans || []);
      } else {
        const query = new URLSearchParams();
        if (filterLevel) query.set('level', filterLevel);
        if (filterSubject.trim()) query.set('subject', filterSubject.trim());
        const data = await apiClient(`/v2/study-plans${query.toString() ? `?${query.toString()}` : ''}`, { token });
        setPlans(data.plans || []);
      }
    } catch (e) {
      setError(e.message || 'Erreur chargement plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.role]);

  function normalizePayload(payload) {
    return {
      level: payload.level,
      subject: payload.subject.trim() || null,
      chapterOrder: payload.chapterOrder ? Number(payload.chapterOrder) : null,
      title: payload.title.trim(),
      description: payload.description.trim(),
      notes: payload.notes.trim() || null,
      exercises: payload.exercises.trim() || null
    };
  }

  async function onCreatePlan(e) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const data = await apiClient('/v2/study-plans', {
        method: 'POST',
        token,
        body: JSON.stringify(normalizePayload(form))
      });
      setInfo('Plan de cours cree.');
      setForm({ level: form.level, subject: '', chapterOrder: '', title: '', description: '', notes: '', exercises: '' });
      setPlans((prev) => [...prev, data.studyPlan]);
    } catch (e2) {
      setError(e2.message || 'Erreur creation plan.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(plan) {
    setEditingPlanId(plan.id);
    setEditForm({
      level: plan.level || '9e',
      subject: plan.subject || '',
      chapterOrder: Number.isInteger(plan.chapterOrder) ? String(plan.chapterOrder) : '',
      title: plan.title || '',
      description: plan.description || '',
      notes: plan.notes || '',
      exercises: plan.exercises || ''
    });
    setError('');
    setInfo('');
  }

  function canManagePlan(plan) {
    if (!student) return false;
    if (student.role === 'ADMIN') return true;
    return student.role === 'TEACHER' && plan.createdBy?.id === student.id;
  }

  async function onUpdatePlan(planId) {
    if (!token) return;
    setUpdating(true);
    setError('');
    setInfo('');
    try {
      const data = await apiClient(`/v2/study-plans/${planId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(normalizePayload(editForm))
      });
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.studyPlan : p)));
      setEditingPlanId(null);
      setInfo('Plan de cours mis a jour.');
    } catch (e) {
      setError(e.message || 'Erreur mise a jour plan.');
    } finally {
      setUpdating(false);
    }
  }

  async function onDeletePlan(planId) {
    if (!token) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce chapitre du plan de cours ?')) return;

    try {
      await apiClient(`/v2/study-plans/${planId}`, {
        method: 'DELETE',
        token
      });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (editingPlanId === planId) setEditingPlanId(null);
      setInfo('Chapitre supprime.');
    } catch (e) {
      setError(e.message || 'Erreur suppression plan.');
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card space-y-2">
        <h1 className="text-2xl font-semibold text-brand-900">Plan de cours structure</h1>
        <p className="text-sm text-brand-700">
          Choisis une matiere, puis un chapitre pour voir les notes de lecon et les exercices associes.
        </p>
      </section>

      {canCreate ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-brand-900">Ajouter un chapitre</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreatePlan}>
            <select className="input" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
            <input className="input" placeholder="Matiere (ex: Chimie)" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
            <input className="input" placeholder="Ordre chapitre (ex: 1)" value={form.chapterOrder} onChange={(e) => setForm((p) => ({ ...p, chapterOrder: e.target.value }))} />
            <input className="input" placeholder="Titre chapitre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <textarea className="input md:col-span-2 min-h-[90px]" placeholder="Description courte" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
            <textarea className="input md:col-span-2 min-h-[140px]" placeholder="Notes / lecons du chapitre" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <textarea className="input md:col-span-2 min-h-[140px]" placeholder="Exercices du chapitre" value={form.exercises} onChange={(e) => setForm((p) => ({ ...p, exercises: e.target.value }))} />
            <button className="btn-primary md:col-span-2" disabled={saving}>{saving ? 'Creation...' : 'Ajouter chapitre'}</button>
          </form>
        </section>
      ) : null}

      {student?.role !== 'STUDENT' ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-brand-900">Filtres</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="input" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">Tous les niveaux</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
            <input className="input" placeholder="Filtrer par matiere" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} />
            <button className="btn-secondary" onClick={loadPlans}>Appliquer</button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold text-brand-900">Matieres</h2>
          {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
          {!loading && plansBySubject.length === 0 ? <p className="text-sm text-brand-700">Aucun plan disponible.</p> : null}
          <div className="space-y-2">
            {plansBySubject.map((item) => (
              <button
                key={item.subject}
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedSubject === item.subject ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:bg-brand-50'}`}
                onClick={() => {
                  setSelectedSubject(item.subject);
                  setSelectedPlanId(item.plans[0]?.id || null);
                }}
              >
                <p className="font-semibold text-brand-900">{item.subject}</p>
                <p className="text-xs text-brand-700">{item.plans.length} chapitre(s)</p>
              </button>
            ))}
          </div>
        </article>

        <article className="card lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold text-brand-900">Chapitres</h2>
          <div className="space-y-2">
            {selectedSubjectPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left ${selectedPlanId === plan.id ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:bg-brand-50'}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{plan.level}</p>
                <p className="font-semibold text-brand-900">{Number.isInteger(plan.chapterOrder) ? `Chapitre ${plan.chapterOrder}: ` : ''}{plan.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-brand-700">{plan.description}</p>
              </button>
            ))}
            {!selectedSubjectPlans.length ? <p className="text-sm text-brand-700">Selectionne une matiere.</p> : null}
          </div>
        </article>

        <article className="card lg:col-span-1">
          <h2 className="mb-3 text-lg font-semibold text-brand-900">Detail chapitre</h2>
          {!selectedPlan ? (
            <p className="text-sm text-brand-700">Choisis un chapitre pour voir le contenu.</p>
          ) : editingPlanId === selectedPlan.id ? (
            <div className="space-y-2">
              <select className="input" value={editForm.level} onChange={(e) => setEditForm((p) => ({ ...p, level: e.target.value }))}>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <input className="input" value={editForm.subject} onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Matiere" />
              <input className="input" value={editForm.chapterOrder} onChange={(e) => setEditForm((p) => ({ ...p, chapterOrder: e.target.value }))} placeholder="Ordre chapitre" />
              <input className="input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Titre" />
              <textarea className="input min-h-[90px]" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
              <textarea className="input min-h-[130px]" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
              <textarea className="input min-h-[130px]" value={editForm.exercises} onChange={(e) => setEditForm((p) => ({ ...p, exercises: e.target.value }))} placeholder="Exercices" />
              <div className="flex gap-2">
                <button className="btn-primary" disabled={updating} onClick={() => onUpdatePlan(selectedPlan.id)}>{updating ? 'Mise a jour...' : 'Enregistrer'}</button>
                <button className="btn-secondary" onClick={() => setEditingPlanId(null)}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{selectedPlan.level} {selectedPlan.subject ? `- ${selectedPlan.subject}` : ''}</p>
              <h3 className="text-lg font-semibold text-brand-900">{Number.isInteger(selectedPlan.chapterOrder) ? `Chapitre ${selectedPlan.chapterOrder}: ` : ''}{selectedPlan.title}</h3>
              <p className="text-sm text-brand-800 whitespace-pre-wrap">{selectedPlan.description}</p>

              <div>
                <h4 className="text-sm font-semibold text-brand-900">Notes / Lecons</h4>
                <p className="mt-1 text-sm text-brand-700 whitespace-pre-wrap">{selectedPlan.notes || 'Notes non renseignees.'}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-brand-900">Exercices</h4>
                <p className="mt-1 text-sm text-brand-700 whitespace-pre-wrap">{selectedPlan.exercises || 'Exercices non renseignes.'}</p>
              </div>

              {selectedPlan.createdBy ? (
                <p className="text-xs text-brand-700">Par {selectedPlan.createdBy.firstName} {selectedPlan.createdBy.lastName} ({selectedPlan.createdBy.role})</p>
              ) : null}

              {canManagePlan(selectedPlan) ? (
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => openEdit(selectedPlan)}>Modifier</button>
                  <button className="btn-secondary" onClick={() => onDeletePlan(selectedPlan.id)}>Supprimer</button>
                </div>
              ) : null}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
