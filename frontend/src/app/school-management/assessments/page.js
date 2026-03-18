'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const PERIOD_OPTIONS = [
  { value: 'T1', label: 'Trimestre 1' },
  { value: 'T2', label: 'Trimestre 2' },
  { value: 'T3', label: 'Trimestre 3' }
];

const TYPE_OPTIONS = [
  { value: 'DEVOIR', label: 'Devoir' },
  { value: 'INTERRO', label: 'Interro' },
  { value: 'EXAMEN', label: 'Examen' }
];

export default function SchoolAssessmentsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [gradingScale, setGradingScale] = useState(20);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('T1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    academicYearId: '',
    subjectId: '',
    title: '',
    type: 'DEVOIR',
    period: 'T1',
    coefficient: '1',
    maxScore: '20',
    date: ''
  });

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
        const [classesRes, yearsRes, configRes] = await Promise.all([
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token }),
          apiClient(`/school-management/config/schools/${schoolId}`, { token })
        ]);
        const classesList = classesRes.classes || [];
        const yearsList = yearsRes.academicYears || [];
        const scale = Number(configRes?.config?.gradingScale || 20);
        setGradingScale(scale);
        setClasses(classesList);
        setAcademicYears(yearsList);
        if (classesList.length) {
          setSelectedClassId(String(classesList[0].id));
        }
        if (yearsList.length) {
          setForm((prev) => ({ ...prev, academicYearId: String(yearsList[0].id) }));
        }
        setForm((prev) => ({ ...prev, maxScore: String(scale || 20) }));
      } catch (e) {
        setError(e.message || 'Impossible de charger les évaluations.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  useEffect(() => {
    async function loadClassData() {
      if (!selectedClassId) return;
      const token = getSchoolToken();
      const [classSubjectsRes, assessmentsRes] = await Promise.all([
        apiClient(`/school-management/class-subjects/classes/${selectedClassId}`, { token }),
        apiClient(`/school-management/assessments/classes/${selectedClassId}?period=${selectedPeriod}`, { token })
      ]);
      setClassSubjects(classSubjectsRes.subjects || []);
      setAssessments(assessmentsRes.assessments || []);
    }
    loadClassData().catch((e) => setError(e.message || 'Erreur de chargement.'));
  }, [selectedClassId, selectedPeriod]);

  const subjectOptions = useMemo(() => classSubjects.map((row) => row.subject).filter(Boolean), [classSubjects]);

  async function createAssessment(e) {
    e.preventDefault();
    if (!admin) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient('/school-management/assessments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          academicYearId: Number(form.academicYearId),
          classId: Number(selectedClassId),
          subjectId: Number(form.subjectId),
          title: form.title,
          type: form.type,
          period: form.period,
          coefficient: Number(form.coefficient || 1),
          maxScore: Number(form.maxScore || 20),
          date: form.date || null
        })
      });
      const refresh = await apiClient(`/school-management/assessments/classes/${selectedClassId}?period=${selectedPeriod}`, { token });
      setAssessments(refresh.assessments || []);
      setForm((prev) => ({
        ...prev,
        title: '',
        subjectId: '',
        coefficient: '1',
        maxScore: '20',
        date: ''
      }));
      setSuccess('Évaluation créée.');
    } catch (e) {
      setError(e.message || 'Impossible de créer l’évaluation.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteAssessment(item) {
    if (!item?.id) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette évaluation ?')) return;
    setError('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/assessments/${item.id}`, { method: 'DELETE', token });
      setAssessments((prev) => prev.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e.message || 'Impossible de supprimer l’évaluation.');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-700">Gestion des évaluations</p>
          <h1 className="text-2xl font-bold text-brand-900">Évaluations</h1>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select className="input" value={selectedPeriod} onChange={(e) => {
            setSelectedPeriod(e.target.value);
            setForm((prev) => ({ ...prev, period: e.target.value }));
          }}>
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <form onSubmit={createAssessment} className="grid gap-3 sm:grid-cols-3">
          <select
            className="input"
            value={form.subjectId}
            onChange={(e) => setForm((prev) => ({ ...prev, subjectId: e.target.value }))}
            required
          >
            <option value="">Matière</option>
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Titre"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="input"
            value={form.academicYearId}
            onChange={(e) => setForm((prev) => ({ ...prev, academicYearId: e.target.value }))}
            required
          >
            <option value="">Année</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            min="0.25"
            step="0.25"
            value={form.coefficient}
            onChange={(e) => setForm((prev) => ({ ...prev, coefficient: e.target.value }))}
            placeholder="Coefficient"
          />
          <input
            className="input"
            type="number"
            min="1"
            max="100"
            value={form.maxScore}
            onChange={(e) => setForm((prev) => ({ ...prev, maxScore: e.target.value }))}
            placeholder="Note maximale"
          />
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          />
          <button className="btn-primary sm:col-span-2" disabled={creating}>
            {creating ? 'Création...' : 'Ajouter l’évaluation'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Évaluations ({assessments.length})</h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune évaluation pour cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Matière</th>
                  <th className="text-left py-2">Titre</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Coef</th>
                  <th className="text-left py-2">/</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id} className="border-b border-brand-100">
                    <td className="py-2">{item.subject?.name || '-'}</td>
                    <td className="py-2">{item.title}</td>
                    <td className="py-2">{item.type}</td>
                    <td className="py-2">{item.coefficient}</td>
                    <td className="py-2">{item.maxScore}</td>
                    <td className="py-2">
                      <button className="text-red-600 hover:text-red-800" onClick={() => deleteAssessment(item)}>
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
