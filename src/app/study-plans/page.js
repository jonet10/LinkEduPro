"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const LEVELS = ['9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite'];

export default function StudyPlansPage() {
  const [plans, setPlans] = useState([]);
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
    title: '',
    description: ''
  });
  const [editForm, setEditForm] = useState({
    level: '9e',
    subject: '',
    title: '',
    description: ''
  });

  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canCreate = student && ['TEACHER', 'ADMIN'].includes(student.role);

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
        body: JSON.stringify({
          level: form.level,
          subject: form.subject.trim() || null,
          title: form.title.trim(),
          description: form.description.trim()
        })
      });
      setInfo('Plan de revision cree.');
      setForm({ level: form.level, subject: '', title: '', description: '' });
      setPlans((prev) => [data.studyPlan, ...prev]);
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
      title: plan.title || '',
      description: plan.description || ''
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
        body: JSON.stringify({
          level: editForm.level,
          subject: editForm.subject.trim() || null,
          title: editForm.title.trim(),
          description: editForm.description.trim()
        })
      });
      setPlans((prev) => prev.map((p) => (p.id === planId ? data.studyPlan : p)));
      setEditingPlanId(null);
      setInfo('Plan mis a jour.');
    } catch (e) {
      setError(e.message || 'Erreur mise a jour plan.');
    } finally {
      setUpdating(false);
    }
  }

  async function onDeletePlan(planId) {
    if (!token) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce plan de revision ?')) return;

    try {
      await apiClient(`/v2/study-plans/${planId}`, {
        method: 'DELETE',
        token
      });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (editingPlanId === planId) setEditingPlanId(null);
      setInfo('Plan supprime.');
    } catch (e) {
      setError(e.message || 'Erreur suppression plan.');
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold text-brand-900">Plans de revision</h1>
        <p className="text-sm text-brand-700">
          {student?.role === 'STUDENT'
            ? 'Voici les plans recommandes pour ton niveau.'
            : 'Creer et gerer des plans de revision par niveau et matiere.'}
        </p>
      </section>

      {canCreate ? (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-brand-900">Nouveau plan</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreatePlan}>
            <select className="input" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Matiere (ex: Mathematiques)"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            />
            <input
              className="input md:col-span-2"
              placeholder="Titre du plan"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <textarea
              className="input md:col-span-2 min-h-[120px]"
              placeholder="Description et etapes de revision"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              required
            />
            <button className="btn-primary md:col-span-2" disabled={saving}>
              {saving ? 'Creation...' : 'Creer le plan'}
            </button>
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
            <input
              className="input"
              placeholder="Filtrer par matiere"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            />
            <button className="btn-secondary" onClick={loadPlans}>Appliquer</button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}

      <section className="space-y-3">
        {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        {!loading && plans.length === 0 ? <p className="text-sm text-brand-700">Aucun plan disponible.</p> : null}
        {plans.map((plan) => (
          <article key={plan.id} className="card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{plan.level}</p>
            {editingPlanId === plan.id ? (
              <div className="space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <select className="input" value={editForm.level} onChange={(e) => setEditForm((p) => ({ ...p, level: e.target.value }))}>
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  <input className="input" value={editForm.subject} onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Matiere" />
                </div>
                <input className="input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Titre" />
                <textarea className="input min-h-[120px]" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                <div className="flex gap-2">
                  <button className="btn-primary" disabled={updating} onClick={() => onUpdatePlan(plan.id)}>
                    {updating ? 'Mise a jour...' : 'Enregistrer'}
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingPlanId(null)}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-brand-900">{plan.title}</h3>
                {plan.subject ? <p className="text-sm text-brand-700">Matiere: {plan.subject}</p> : null}
                <p className="text-sm text-brand-800 whitespace-pre-wrap">{plan.description}</p>
                {plan.createdBy ? (
                  <p className="text-xs text-brand-700">
                    Par {plan.createdBy.firstName} {plan.createdBy.lastName} ({plan.createdBy.role})
                  </p>
                ) : null}
                {canManagePlan(plan) ? (
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => openEdit(plan)}>Modifier</button>
                    <button className="btn-secondary" onClick={() => onDeletePlan(plan.id)}>Supprimer</button>
                  </div>
                ) : null}
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
