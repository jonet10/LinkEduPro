'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolGlobalStudentsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [filters, setFilters] = useState({
    schoolId: '',
    department: '',
    commune: '',
    q: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGlobalStudents(nextFilters = filters) {
    const token = getSchoolToken();
    const params = new URLSearchParams();
    if (nextFilters.schoolId) params.set('schoolId', nextFilters.schoolId);
    if (nextFilters.department) params.set('department', nextFilters.department);
    if (nextFilters.commune) params.set('commune', nextFilters.commune);
    if (nextFilters.q) params.set('q', nextFilters.q);
    const query = params.toString();

    const data = await apiClient(`/school-management/students/global${query ? `?${query}` : ''}`, { token });
    setStudents(data.students || []);
    setSchools(data.filters?.schools || []);
    setDepartments(data.filters?.departments || []);
    setCommunes(data.filters?.communes || []);
  }

  useEffect(() => {
    async function init() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (currentAdmin.role !== 'SUPER_ADMIN') {
        clearSchoolAuth();
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);
      try {
        await loadGlobalStudents();
      } catch (e) {
        setError(e.message || 'Impossible de charger les eleves globaux.');
      } finally {
        setLoading(false);
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading) {
    return <main className="mx-auto max-w-7xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Super Admin</p>
          <h1 className="text-2xl font-bold text-brand-900">Tous les eleves de la plateforme</h1>
          <p className="text-sm text-brand-700">Connecte: {admin?.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold text-brand-900">Filtres</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            className="input"
            value={filters.schoolId}
            onChange={(e) => setFilters((p) => ({ ...p, schoolId: e.target.value }))}
          >
            <option value="">Global (toutes ecoles)</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.department}
            onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
          >
            <option value="">Tous departements</option>
            {departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.commune}
            onChange={(e) => setFilters((p) => ({ ...p, commune: e.target.value }))}
          >
            <option value="">Toutes communes</option>
            {communes.map((commune) => (
              <option key={commune} value={commune}>{commune}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Recherche nom / matricule"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              try {
                setError('');
                await loadGlobalStudents(filters);
              } catch (e) {
                setError(e.message || 'Erreur de filtrage.');
              }
            }}
          >
            Appliquer
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              const reset = { schoolId: '', department: '', commune: '', q: '' };
              setFilters(reset);
              try {
                setError('');
                await loadGlobalStudents(reset);
              } catch (e) {
                setError(e.message || 'Erreur de reinitialisation.');
              }
            }}
          >
            Reinitialiser
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Eleves ({students.length})</h2>
        {students.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun eleve trouve avec ces filtres.</p>
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
                  <th className="py-2 text-left">Ecole</th>
                  <th className="py-2 text-left">Departement</th>
                  <th className="py-2 text-left">Commune</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-brand-100">
                    <td className="py-2">{student.studentId}</td>
                    <td className="py-2">{student.lastName} {student.firstName}</td>
                    <td className="py-2">{student.sex}</td>
                    <td className="py-2">{student.schoolClass?.name || '-'}</td>
                    <td className="py-2">{student.academicYear?.label || '-'}</td>
                    <td className="py-2">{student.school?.name || '-'}</td>
                    <td className="py-2">{student.school?.department || '-'}</td>
                    <td className="py-2">{student.school?.commune || student.school?.city || '-'}</td>
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
