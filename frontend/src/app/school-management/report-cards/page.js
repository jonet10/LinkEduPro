'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';
import { API_BASE_URL } from '@/lib/runtime-config';

const PERIOD_OPTIONS = [
  { value: 'T1', label: 'Trimestre 1' },
  { value: 'T2', label: 'Trimestre 2' },
  { value: 'T3', label: 'Trimestre 3' }
];

export default function SchoolReportCardsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('T1');
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blockedStudents, setBlockedStudents] = useState([]);

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
        setError(e.message || 'Impossible de charger les bulletins.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    async function loadReportCards() {
      if (!selectedClassId || !selectedYearId) return;
      const token = getSchoolToken();
      const res = await apiClient(
        `/school-management/report-cards/classes/${selectedClassId}?period=${selectedPeriod}&academicYearId=${selectedYearId}`,
        { token }
      );
      setReportCards(res.reportCards || []);
    }
    loadReportCards().catch((e) => setError(e.message || 'Erreur chargement bulletins.'));
  }, [selectedClassId, selectedPeriod, selectedYearId]);

  async function generateReportCards() {
    if (!admin || !selectedClassId || !selectedYearId) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    setBlockedStudents([]);
    try {
      const token = getSchoolToken();
      await apiClient('/school-management/report-cards/generate', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          classId: Number(selectedClassId),
          academicYearId: Number(selectedYearId),
          period: selectedPeriod
        })
      });
      const res = await apiClient(
        `/school-management/report-cards/classes/${selectedClassId}?period=${selectedPeriod}&academicYearId=${selectedYearId}`,
        { token }
      );
      setReportCards(res.reportCards || []);
      setSuccess('Bulletins générés.');
    } catch (e) {
      if (e?.data?.blockedStudents) {
        setBlockedStudents(e.data.blockedStudents);
      }
      setError(e.message || 'Impossible de générer les bulletins.');
    } finally {
      setGenerating(false);
    }
  }

  async function openReport(reportCardId) {
    const token = getSchoolToken();
    const url = `${API_BASE_URL}/school-management/report-cards/${reportCardId}/pdf`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Téléchargement impossible.');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30_000);
    } catch (e) {
      setError(e.message || 'Erreur téléchargement bulletin.');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-700">Bulletins scolaires</p>
          <h1 className="text-2xl font-bold text-brand-900">Bulletins</h1>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      {blockedStudents.length > 0 ? (
        <section className="card border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900 font-semibold">Bulletins bloqués (écolage non soldé) :</p>
          <ul className="text-sm text-amber-900 mt-2">
            {blockedStudents.map((st) => (
              <li key={st.id}>{st.firstName} {st.lastName}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
          <button className="btn-primary" onClick={generateReportCards} disabled={generating}>
            {generating ? 'Génération...' : 'Générer les bulletins'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900 mb-3">Bulletins générés</h2>
        {reportCards.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun bulletin pour cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="text-left py-2">Élève</th>
                  <th className="text-left py-2">Moyenne</th>
                  <th className="text-left py-2">Rang</th>
                  <th className="text-left py-2">Mention</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {reportCards.map((card) => (
                  <tr key={card.id} className="border-b border-brand-100">
                    <td className="py-2">{card.student?.firstName} {card.student?.lastName}</td>
                    <td className="py-2">{card.average}</td>
                    <td className="py-2">{card.rank || '-'}</td>
                    <td className="py-2">{card.mention || '-'}</td>
                    <td className="py-2">
                      <button className="text-brand-600 hover:text-brand-800" onClick={() => openReport(card.id)}>
                        PDF
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
