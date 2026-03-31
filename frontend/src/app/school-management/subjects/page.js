'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolSubjectsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [assignForm, setAssignForm] = useState({ subjectId: '', coefficient: '1' });

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN'];

      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (!allowedRoles.includes(currentAdmin.role)) {
        clearSchoolAuth();
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);
      try {
        setError('');
        const schoolId = currentAdmin.schoolId;
        const [subjectsRes, classesRes] = await Promise.all([
          apiClient(`/school-management/subjects/schools/${schoolId}`, { token }),
          apiClient(`/school-management/classes/schools/${schoolId}`, { token })
        ]);
        setSubjects(subjectsRes.subjects || []);
        setClasses(classesRes.classes || []);
        if (classesRes.classes?.length) {
          setSelectedClassId(String(classesRes.classes[0].id));
        }
      } catch (e) {
        setError(e.message || 'Impossible de charger les matières.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  useEffect(() => {
    async function loadClassSubjects() {
      if (!selectedClassId) return;
      const token = getSchoolToken();
      try {
        const data = await apiClient(`/school-management/class-subjects/classes/${selectedClassId}`, { token });
        setClassSubjects(data.subjects || []);
      } catch (e) {
        setError(e.message || 'Impossible de charger les matières de la classe.');
      }
    }
    loadClassSubjects();
  }, [selectedClassId]);

  const activeSubjects = useMemo(() => subjects.filter((s) => s.isActive !== false), [subjects]);

  async function createSubject(e) {
    e.preventDefault();
    if (!admin) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const res = await apiClient('/school-management/subjects', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          name: form.name,
          code: form.code || null
        })
      });
      setSubjects((prev) => [...prev, res.subject].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', code: '' });
      setSuccess('Matière ajoutée.');
    } catch (e) {
      setError(e.message || 'Impossible de créer la matière.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleSubject(subject) {
    if (!subject) return;
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const res = await apiClient(`/school-management/subjects/${subject.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: !subject.isActive })
      });
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? res.subject : s)));
      setSuccess('Statut mis à jour.');
    } catch (e) {
      setError(e.message || 'Impossible de modifier la matière.');
    }
  }

  async function assignSubject(e) {
    e.preventDefault();
    if (!admin || !selectedClassId) return;
    setAssigning(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const res = await apiClient('/school-management/class-subjects', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          classId: Number(selectedClassId),
          subjectId: Number(assignForm.subjectId),
          coefficient: Number(assignForm.coefficient || 1)
        })
      });
      const updated = res.classSubject;
      setClassSubjects((prev) => {
        const existing = prev.find((row) => row.id === updated.id);
        if (existing) {
          return prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row));
        }
        return [...prev, updated];
      });
      setAssignForm({ subjectId: '', coefficient: '1' });
      setSuccess('Matière associée à la classe.');
    } catch (e) {
      setError(e.message || 'Impossible d’associer la matière.');
    } finally {
      setAssigning(false);
    }
  }

  async function updateCoefficient(item, coefficient) {
    setError('');
    try {
      const token = getSchoolToken();
      const res = await apiClient(`/school-management/class-subjects/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ coefficient: Number(coefficient) })
      });
      setClassSubjects((prev) => prev.map((row) => (row.id === item.id ? res.classSubject : row)));
    } catch (e) {
      setError(e.message || 'Impossible de modifier le coefficient.');
    }
  }

  async function removeClassSubject(item) {
    if (!item?.id) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette matière de la classe ?')) return;
    setError('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/class-subjects/${item.id}`, { method: 'DELETE', token });
      setClassSubjects((prev) => prev.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e.message || 'Impossible de supprimer la matière.');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-700">Gestion des matières</p>
          <h1 className="text-2xl font-bold text-brand-900">Matières & coefficients</h1>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Ajouter une matière</h2>
        <form onSubmit={createSubject} className="grid gap-3 sm:grid-cols-3">
          <input
            className="input"
            placeholder="Nom (ex: Mathématiques)"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Code (optionnel)"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          />
          <button className="btn-primary" disabled={creating}>
            {creating ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Matières existantes</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune matière pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Code</th>
                  <th className="text-left py-2">Statut</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-brand-100">
                    <td className="py-2">{subject.name}</td>
                    <td className="py-2">{subject.code || '-'}</td>
                    <td className="py-2">{subject.isActive ? 'Actif' : 'Inactif'}</td>
                    <td className="py-2">
                      <button
                        className="text-brand-600 hover:text-brand-800"
                        onClick={() => toggleSubject(subject)}
                      >
                        {subject.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Associer matières à une classe</h2>
            <p className="text-sm text-brand-700">Définis le coefficient par matière.</p>
          </div>
          <select
            className="input"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={assignSubject} className="grid gap-3 sm:grid-cols-3">
          <select
            className="input"
            value={assignForm.subjectId}
            onChange={(e) => setAssignForm((prev) => ({ ...prev, subjectId: e.target.value }))}
            required
          >
            <option value="">Choisir une matière</option>
            {activeSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            min="0.25"
            step="0.25"
            value={assignForm.coefficient}
            onChange={(e) => setAssignForm((prev) => ({ ...prev, coefficient: e.target.value }))}
          />
          <button className="btn-primary" disabled={assigning}>
            {assigning ? 'Ajout...' : 'Associer'}
          </button>
        </form>

        {classSubjects.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune matière associée pour cette classe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Matière</th>
                  <th className="text-left py-2">Coefficient</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {classSubjects.map((item) => (
                  <tr key={item.id} className="border-b border-brand-100">
                    <td className="py-2">{item.subject?.name || '-'}</td>
                    <td className="py-2">
                      <input
                        className="input w-24"
                        type="number"
                        min="0.25"
                        step="0.25"
                        defaultValue={item.coefficient}
                        onBlur={(e) => updateCoefficient(item, e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <button className="text-red-600 hover:text-red-800" onClick={() => removeClassSubject(item)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
