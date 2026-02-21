'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolStudentsPage() {
  const pageSize = 10;
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [importClassId, setImportClassId] = useState('');
  const [importYearId, setImportYearId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT'];

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
        const [studentsRes, classesRes, yearsRes, historyRes] = await Promise.all([
          apiClient(`/school-management/students/schools/${schoolId}`, { token }),
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token }),
          apiClient(`/school-management/students/schools/${schoolId}/import-history`, { token })
        ]);

        const classesData = classesRes.classes || [];
        const yearsData = yearsRes.academicYears || [];
        setStudents(studentsRes.students || []);
        setClasses(classesData);
        setAcademicYears(yearsData);
        setImportHistory(historyRes.imports || []);

        if (classesData.length > 0) setImportClassId(String(classesData[0].id));
        if (yearsData.length > 0) setImportYearId(String(yearsData[0].id));
      } catch (e) {
        setError(e.message || 'Impossible de charger les eleves.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function reloadStudents(classId, yearId) {
    if (!admin) return;
    const token = getSchoolToken();
    const params = new URLSearchParams();
    if (classId) params.set('classId', classId);
    if (yearId) params.set('academicYearId', yearId);
    const query = params.toString();
    const path = `/school-management/students/schools/${admin.schoolId}${query ? `?${query}` : ''}`;
    const studentsRes = await apiClient(path, { token });
    setStudents(studentsRes.students || []);
    setCurrentPage(1);
  }

  async function onFiltersChange(nextClassId, nextYearId) {
    setCurrentPage(1);
    setError('');
    setSuccess('');
    try {
      await reloadStudents(nextClassId, nextYearId);
    } catch (e) {
      setError(e.message || 'Erreur lors du filtrage.');
    }
  }

  const filteredStudents = useMemo(() => {
    const keyword = String(searchTerm || '').trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((student) => {
      const studentId = String(student.studentId || '').toLowerCase();
      const first = String(student.firstName || '').toLowerCase();
      const last = String(student.lastName || '').toLowerCase();
      const full = `${last} ${first}`.trim();
      const schoolClass = String(student.schoolClass?.name || '').toLowerCase();
      return studentId.includes(keyword) || full.includes(keyword) || schoolClass.includes(keyword);
    });
  }, [students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function handleImport(e) {
    e.preventDefault();
    if (!admin) return;
    if (!importFile) {
      setError('Selectionne un fichier .xlsx ou .csv.');
      return;
    }
    if (!importClassId || !importYearId) {
      setError('Selectionne la classe et l annee academique.');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const body = new FormData();
      body.append('file', importFile);
      body.append('classId', importClassId);
      body.append('academicYearId', importYearId);

      const res = await apiClient(`/school-management/students/schools/${admin.schoolId}/import`, {
        method: 'POST',
        token,
        body
      });

      setSuccess(`Import termine. ${res.createdCount || 0} eleve(s) ajoute(s).`);
      setImportFile(null);
      await onFiltersChange(selectedClassId, selectedYearId);
      const historyRes = await apiClient(`/school-management/students/schools/${admin.schoolId}/import-history`, { token });
      setImportHistory(historyRes.imports || []);
    } catch (e) {
      setError(e.message || 'Erreur pendant l import.');
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Gestion scolaire</p>
          <h1 className="text-2xl font-bold text-brand-900">Gerer les eleves</h1>
        </div>
        <button className="btn-secondary" type="button" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {success ? <p className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</p> : null}

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Filtres</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="input"
            placeholder="Rechercher nom ou matricule..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="input"
            value={selectedClassId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedClassId(value);
              onFiltersChange(value, selectedYearId);
            }}
          >
            <option value="">Toutes les classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select
            className="input"
            value={selectedYearId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedYearId(value);
              onFiltersChange(selectedClassId, value);
            }}
          >
            <option value="">Toutes les annees</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>{year.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              setSelectedClassId('');
              setSelectedYearId('');
              setSearchTerm('');
              setError('');
              setSuccess('');
              await reloadStudents('', '');
            }}
          >
            Reinitialiser filtres
          </button>
        </div>
      </section>

      {admin?.role === 'SCHOOL_ADMIN' ? (
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Importer des eleves (.xlsx / .csv)</h2>
          <form onSubmit={handleImport} className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={importClassId} onChange={(e) => setImportClassId(e.target.value)} required>
              <option value="">Classe cible</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <select className="input" value={importYearId} onChange={(e) => setImportYearId(e.target.value)} required>
              <option value="">Annee academique</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.label}</option>
              ))}
            </select>
            <input
              className="input sm:col-span-2"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              required
            />
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={importing}>
                {importing ? 'Import en cours...' : 'Importer les eleves'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-900">Liste des eleves ({filteredStudents.length})</h2>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1"
            onClick={() => onFiltersChange(selectedClassId, selectedYearId)}
          >
            Recharger
          </button>
        </div>
        {filteredStudents.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun eleve trouve.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="py-2 text-left">Matricule</th>
                  <th className="py-2 text-left">Nom complet</th>
                  <th className="py-2 text-left">Sexe</th>
                  <th className="py-2 text-left">Classe</th>
                  <th className="py-2 text-left">Annee</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="border-b border-brand-100">
                    <td className="py-2">{student.studentId}</td>
                    <td className="py-2">{student.lastName} {student.firstName}</td>
                    <td className="py-2">{student.gender || '-'}</td>
                    <td className="py-2">{student.schoolClass?.name || '-'}</td>
                    <td className="py-2">{student.academicYear?.label || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredStudents.length > pageSize ? (
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-brand-700">Page {safePage} / {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary !px-3 !py-1"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Precedent
              </button>
              <button
                type="button"
                className="btn-secondary !px-3 !py-1"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Historique des imports</h2>
        {importHistory.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun import enregistre.</p>
        ) : (
          <div className="space-y-2">
            {importHistory.map((item) => {
              const createdCount = item?.metadata?.createdCount ?? 0;
              return (
                <div key={item.id} className="rounded border border-brand-100 px-3 py-2">
                  <p className="text-sm text-brand-900">
                    {new Date(item.createdAt).toLocaleString('fr-FR')} - {createdCount} eleve(s) ajoute(s)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
