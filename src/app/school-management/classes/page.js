'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const initialForm = {
  academicYearId: '',
  name: '',
  level: '',
  capacity: ''
};

export default function SchoolClassesPage() {
  const pageSize = 8;
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [yearForm, setYearForm] = useState({
    label: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-07-31',
    isActive: true
  });
  const [creatingYear, setCreatingYear] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editForm, setEditForm] = useState({
    academicYearId: '',
    name: '',
    level: '',
    capacity: ''
  });
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
        const [classesRes, yearsRes] = await Promise.all([
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token })
        ]);

        const years = yearsRes.academicYears || [];
        setAcademicYears(years);
        setClasses(classesRes.classes || []);
        if (years.length > 0) {
          setForm((prev) => ({ ...prev, academicYearId: String(years[0].id) }));
        }
      } catch (e) {
        setError(e.message || 'Impossible de charger les classes.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function reloadClasses(yearId) {
    if (!admin) return;
    const token = getSchoolToken();
    const query = yearId ? `?academicYearId=${encodeURIComponent(yearId)}` : '';
    const res = await apiClient(`/school-management/classes/schools/${admin.schoolId}${query}`, { token });
    setClasses(res.classes || []);
    setCurrentPage(1);
  }

  async function onFilterYearChange(value) {
    setSelectedYearId(value);
    setCurrentPage(1);
    setError('');
    try {
      await reloadClasses(value);
    } catch (e) {
      setError(e.message || 'Erreur lors du filtrage.');
    }
  }

  const filteredClasses = useMemo(() => {
    const keyword = String(searchTerm || '').trim().toLowerCase();
    if (!keyword) return classes;
    return classes.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const level = String(item.level || '').toLowerCase();
      const year = String(item.academicYear?.label || '').toLowerCase();
      return name.includes(keyword) || level.includes(keyword) || year.includes(keyword);
    });
  }, [classes, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClasses = filteredClasses.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function onCreateClass(e) {
    e.preventDefault();
    if (!admin) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const payload = {
        schoolId: admin.schoolId,
        academicYearId: Number(form.academicYearId),
        name: form.name,
        level: form.level || null,
        capacity: form.capacity ? Number(form.capacity) : null
      };

      await apiClient('/school-management/classes', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      setSuccess('Classe creee avec succes.');
      setForm((prev) => ({ ...initialForm, academicYearId: prev.academicYearId || '' }));
      await reloadClasses(selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de creer la classe.');
    } finally {
      setCreating(false);
    }
  }

  async function onCreateAcademicYear(e) {
    e.preventDefault();
    if (!admin) return;
    setCreatingYear(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/schools/${admin.schoolId}/academic-years`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          label: yearForm.label,
          startDate: yearForm.startDate,
          endDate: yearForm.endDate,
          isActive: Boolean(yearForm.isActive)
        })
      });

      const yearsRes = await apiClient(`/school-management/schools/${admin.schoolId}/academic-years`, { token });
      const years = yearsRes.academicYears || [];
      setAcademicYears(years);
      setSuccess(`Annee academique ${yearForm.label} ajoutee.`);
      setSelectedYearId('');
      setYearForm({
        label: '2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-07-31',
        isActive: false
      });
      await reloadClasses('');
    } catch (e) {
      setError(e.message || 'Impossible de creer l annee academique.');
    } finally {
      setCreatingYear(false);
    }
  }

  function startEditClass(item) {
    setEditingClassId(item.id);
    setEditForm({
      academicYearId: String(item.academicYearId || ''),
      name: item.name || '',
      level: item.level || '',
      capacity: item.capacity ? String(item.capacity) : ''
    });
  }

  async function saveEditClass(classId) {
    if (!admin) return;
    setError('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/classes/schools/${admin.schoolId}/${classId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          academicYearId: Number(editForm.academicYearId),
          name: editForm.name,
          level: editForm.level || null,
          capacity: editForm.capacity ? Number(editForm.capacity) : null
        })
      });
      setEditingClassId(null);
      setSuccess('Classe modifiee avec succes.');
      await reloadClasses(selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de modifier la classe.');
    }
  }

  async function removeClass(classId) {
    if (!admin) return;
    const ok = window.confirm('Supprimer cette classe ? Cette action est irreversible.');
    if (!ok) return;
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/classes/schools/${admin.schoolId}/${classId}`, {
        method: 'DELETE',
        token
      });
      setSuccess('Classe supprimee.');
      await reloadClasses(selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de supprimer la classe.');
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
          <h1 className="text-2xl font-bold text-brand-900">Gerer les classes</h1>
        </div>
        <button className="btn-secondary" type="button" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {success ? <p className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</p> : null}

      {admin?.role === 'SCHOOL_ADMIN' ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="card">
            <h2 className="mb-4 text-lg font-semibold text-brand-900">Annee academique</h2>
            <form onSubmit={onCreateAcademicYear} className="grid gap-3">
              <input
                className="input"
                value={yearForm.label}
                onChange={(e) => setYearForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Label (ex: 2025-2026)"
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  className="input"
                  value={yearForm.startDate}
                  onChange={(e) => setYearForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
                <input
                  type="date"
                  className="input"
                  value={yearForm.endDate}
                  onChange={(e) => setYearForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-brand-800">
                <input
                  type="checkbox"
                  checked={yearForm.isActive}
                  onChange={(e) => setYearForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Definir comme annee active
              </label>
              <button className="btn-primary w-fit" type="submit" disabled={creatingYear}>
                {creatingYear ? 'Creation...' : 'Ajouter annee (2025-2026)'}
              </button>
            </form>
          </article>

          <article className="card">
            <h2 className="mb-4 text-lg font-semibold text-brand-900">Nouvelle classe</h2>
            <form onSubmit={onCreateClass} className="grid gap-3 sm:grid-cols-2">
              <select
                className="input"
                value={form.academicYearId}
                onChange={(e) => setForm((prev) => ({ ...prev, academicYearId: e.target.value }))}
                required
              >
                <option value="">Annee academique</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.label}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Nom de classe (ex: NSIV A)"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                className="input"
                placeholder="Niveau (optionnel)"
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
              />
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Capacite (optionnel)"
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <button className="btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Creation...' : 'Creer la classe'}
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-900">Liste des classes ({filteredClasses.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input !w-56"
              placeholder="Rechercher une classe..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="input !w-auto"
              value={selectedYearId}
              onChange={(e) => onFilterYearChange(e.target.value)}
            >
              <option value="">Toutes les annees</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary !px-3 !py-2"
              onClick={async () => {
                setSelectedYearId('');
                setSearchTerm('');
                setError('');
                await reloadClasses('');
              }}
            >
              Reinitialiser
            </button>
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune classe disponible.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="py-2 text-left">Classe</th>
                  <th className="py-2 text-left">Niveau</th>
                  <th className="py-2 text-left">Annee</th>
                  <th className="py-2 text-left">Capacite</th>
                  <th className="py-2 text-left">Eleves</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClasses.map((item) => (
                  <tr key={item.id} className="border-b border-brand-100">
                    <td className="py-2">
                      {editingClassId === item.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : item.name}
                    </td>
                    <td className="py-2">
                      {editingClassId === item.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.level}
                          onChange={(e) => setEditForm((p) => ({ ...p, level: e.target.value }))}
                        />
                      ) : (item.level || '-')}
                    </td>
                    <td className="py-2">
                      {editingClassId === item.id ? (
                        <select
                          className="input !py-1"
                          value={editForm.academicYearId}
                          onChange={(e) => setEditForm((p) => ({ ...p, academicYearId: e.target.value }))}
                        >
                          {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>{year.label}</option>
                          ))}
                        </select>
                      ) : (item.academicYear?.label || '-')}
                    </td>
                    <td className="py-2">
                      {editingClassId === item.id ? (
                        <input
                          className="input !py-1"
                          type="number"
                          min="1"
                          value={editForm.capacity}
                          onChange={(e) => setEditForm((p) => ({ ...p, capacity: e.target.value }))}
                        />
                      ) : (item.capacity || '-')}
                    </td>
                    <td className="py-2">{item?._count?.students ?? 0}</td>
                    <td className="py-2">
                      {admin?.role === 'SCHOOL_ADMIN' ? (
                        <div className="flex gap-2">
                          {editingClassId === item.id ? (
                            <>
                              <button type="button" className="btn-primary !px-3 !py-1" onClick={() => saveEditClass(item.id)}>
                                Enregistrer
                              </button>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => setEditingClassId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => startEditClass(item)}>
                                Modifier
                              </button>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => removeClass(item.id)}>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      ) : <span className="text-xs text-brand-700">Lecture seule</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredClasses.length > pageSize ? (
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
    </main>
  );
}
