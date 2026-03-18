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

export default function SchoolGradesPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [gradesMap, setGradesMap] = useState({});
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('T1');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        const [classesRes, yearsRes] = await Promise.all([
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token })
        ]);
        const classesList = classesRes.classes || [];
        const yearsList = yearsRes.academicYears || [];
        setClasses(classesList);
        setAcademicYears(yearsList);
        if (classesList.length) setSelectedClassId(String(classesList[0].id));
        if (yearsList.length) setSelectedYearId(String(yearsList[0].id));
      } catch (e) {
        setError(e.message || 'Impossible de charger les notes.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    async function loadAssessments() {
      if (!selectedClassId) return;
      const token = getSchoolToken();
      const res = await apiClient(
        `/school-management/assessments/classes/${selectedClassId}?period=${selectedPeriod}&academicYearId=${selectedYearId}`,
        { token }
      );
      setAssessments(res.assessments || []);
      if (res.assessments?.length) {
        setSelectedAssessmentId(String(res.assessments[0].id));
      } else {
        setSelectedAssessmentId('');
      }
    }
    loadAssessments().catch((e) => setError(e.message || 'Erreur chargement évaluations.'));
  }, [selectedClassId, selectedPeriod, selectedYearId]);

  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId || !admin) return;
      const token = getSchoolToken();
      const query = `?classId=${selectedClassId}&academicYearId=${selectedYearId}`;
      const res = await apiClient(`/school-management/students/schools/${admin.schoolId}${query}`, { token });
      setStudents(res.students || []);
    }
    loadStudents().catch((e) => setError(e.message || 'Erreur chargement élèves.'));
  }, [selectedClassId, selectedYearId, admin]);

  useEffect(() => {
    async function loadGrades() {
      if (!selectedAssessmentId) {
        setGradesMap({});
        return;
      }
      const token = getSchoolToken();
      const res = await apiClient(`/school-management/grades/assessments/${selectedAssessmentId}`, { token });
      const map = {};
      (res.grades || []).forEach((g) => {
        map[g.studentId] = { score: String(g.score), coefficient: g.coefficient != null ? String(g.coefficient) : '' };
      });
      setGradesMap(map);
    }
    loadGrades().catch((e) => setError(e.message || 'Erreur chargement notes.'));
  }, [selectedAssessmentId]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => String(a.id) === String(selectedAssessmentId)),
    [assessments, selectedAssessmentId]
  );

  function updateGrade(studentId, field, value) {
    setGradesMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  }

  async function saveGrades() {
    if (!admin || !selectedAssessmentId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const grades = students.map((student) => ({
        studentId: student.id,
        score: Number(gradesMap[student.id]?.score || 0),
        coefficient: gradesMap[student.id]?.coefficient
          ? Number(gradesMap[student.id].coefficient)
          : undefined
      }));
      await apiClient('/school-management/grades/bulk', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          assessmentId: Number(selectedAssessmentId),
          grades
        })
      });
      setSuccess('Notes enregistrées.');
    } catch (e) {
      setError(e.message || 'Impossible d’enregistrer les notes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-700">Saisie des notes</p>
          <h1 className="text-2xl font-bold text-brand-900">Notes</h1>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <section className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select className="input" value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
          <select className="input" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className="input" value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)}>
            <option value="">Sélectionner une évaluation</option>
            {assessments.map((ass) => (
              <option key={ass.id} value={ass.id}>
                {ass.subject?.name} - {ass.title}
              </option>
            ))}
          </select>
        </div>

        {selectedAssessment ? (
          <p className="text-sm text-brand-700">
            Note max: {selectedAssessment.maxScore} | Coef: {selectedAssessment.coefficient}
          </p>
        ) : null}
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand-900">Élèves ({students.length})</h2>
          <button className="btn-primary" onClick={saveGrades} disabled={saving || !selectedAssessmentId}>
            {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun élève dans cette classe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Élève</th>
                  <th className="text-left py-2">Note</th>
                  <th className="text-left py-2">Coefficient (optionnel)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-brand-100">
                    <td className="py-2">{student.firstName} {student.lastName}</td>
                    <td className="py-2">
                      <input
                        className="input w-24"
                        type="number"
                        min="0"
                        step="0.25"
                        value={gradesMap[student.id]?.score || ''}
                        onChange={(e) => updateGrade(student.id, 'score', e.target.value)}
                        disabled={!selectedAssessmentId}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        className="input w-24"
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={gradesMap[student.id]?.coefficient || ''}
                        onChange={(e) => updateGrade(student.id, 'coefficient', e.target.value)}
                        disabled={!selectedAssessmentId}
                      />
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
