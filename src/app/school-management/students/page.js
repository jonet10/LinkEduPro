'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';
import { API_BASE_URL } from '@/lib/runtime-config';

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
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createForm, setCreateForm] = useState({
    classId: '',
    academicYearId: '',
    studentId: '',
    firstName: '',
    lastName: '',
    sex: 'MALE',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });
  const [editForm, setEditForm] = useState({
    classId: '',
    academicYearId: '',
    studentId: '',
    firstName: '',
    lastName: '',
    sex: 'MALE',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });
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
      const allowedRoles = ['SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_REPORTS_MANAGER'];

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
        setError(e.message || 'Impossible de charger les Élèves.');
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
      setError('sélectionné un fichier .xlsx ou .csv.');
      return;
    }
    if (!importClassId || !importYearId) {
      setError("sélectionne la classe et l'année académique.");
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

      setSuccess(`Import terminé. ${res.createdCount || 0} Élève(s) ajouté(s).`);
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

  async function downloadTemplate(format) {
    if (!admin) return;
    try {
      const token = getSchoolToken();
      const url = `${API_BASE_URL}/school-management/students/schools/${admin.schoolId}/import-template?format=${format}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Impossible de télécharger le modèle.');
      }
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `modele-import-eleves.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30000);
    } catch (e) {
      setError(e.message || 'Erreur lors du téléchargement du modèle.');
    }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    if (!admin) return;
    setCreatingStudent(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/students/schools/${admin.schoolId}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          classId: Number(createForm.classId),
          academicYearId: Number(createForm.academicYearId),
          studentId: createForm.studentId || null,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          sex: createForm.sex,
          birthDate: createForm.birthDate || null,
          parentName: createForm.parentName || null,
          parentPhone: createForm.parentPhone || null,
          parentEmail: createForm.parentEmail || null
        })
      });
      setShowCreateModal(false);
      setCreateForm({
        classId: '',
        academicYearId: '',
        studentId: '',
        firstName: '',
        lastName: '',
        sex: 'MALE',
        birthDate: '',
        parentName: '',
        parentPhone: '',
        parentEmail: ''
      });
      setSuccess('Élève ajouté avec succès.');
      await onFiltersChange(selectedClassId, selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de créer cet Élève.');
    } finally {
      setCreatingStudent(false);
    }
  }

  function startEditStudent(student) {
    setEditingStudentId(student.id);
    setEditForm({
      classId: String(student.classId),
      academicYearId: String(student.academicYearId),
      studentId: student.studentId || '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      sex: student.sex || 'MALE',
      birthDate: student.birthDate ? String(student.birthDate).slice(0, 10) : '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || ''
    });
  }

  async function saveStudent(studentIdPk) {
    if (!admin) return;
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/students/schools/${admin.schoolId}/${studentIdPk}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          classId: Number(editForm.classId),
          academicYearId: Number(editForm.academicYearId),
          studentId: editForm.studentId,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          sex: editForm.sex,
          birthDate: editForm.birthDate || null,
          parentName: editForm.parentName || null,
          parentPhone: editForm.parentPhone || null,
          parentEmail: editForm.parentEmail || null
        })
      });
      setEditingStudentId(null);
      setSuccess('Élève modifié avec succès.');
      await onFiltersChange(selectedClassId, selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de modifier cet Élève.');
    }
  }

  async function deleteStudent(studentIdPk) {
    if (!admin) return;
    const ok = window.confirm('désactiver cet Élève ?');
    if (!ok) return;
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/students/schools/${admin.schoolId}/${studentIdPk}`, {
        method: 'DELETE',
        token
      });
      setSuccess('Élève désactivé.');
      await onFiltersChange(selectedClassId, selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de désactiver cet Élève.');
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
          <h1 className="text-2xl font-bold text-brand-900">Gérer les Élèves</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {admin?.role === 'SCHOOL_ADMIN' ? (
            <button className="btn-primary" type="button" onClick={() => setShowCreateModal(true)}>
              Ajouter un Élève
            </button>
          ) : null}
          <button className="btn-secondary" type="button" onClick={() => router.push('/school-management/dashboard')}>
            Retour dashboard
          </button>
        </div>
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
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Importer des Élèves (.xlsx / .csv)</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => downloadTemplate('xlsx')}>
              Télécharger modèle XLSX
            </button>
            <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => downloadTemplate('csv')}>
              Télécharger modèle CSV
            </button>
          </div>
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
                {importing ? 'Import en cours...' : 'Importer les Élèves'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-900">Liste des Élèves ({filteredStudents.length})</h2>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1"
            onClick={() => onFiltersChange(selectedClassId, selectedYearId)}
          >
            Recharger
          </button>
        </div>
        {filteredStudents.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun élève trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="py-2 text-left">Matricule</th>
                  <th className="py-2 text-left">Nom complet</th>
                  <th className="py-2 text-left">Sexe</th>
                  <th className="py-2 text-left">Naissance</th>
                  <th className="py-2 text-left">Parent</th>
                  <th className="py-2 text-left">Téléphone</th>
                  <th className="py-2 text-left">Classe</th>
                  <th className="py-2 text-left">Annee</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="border-b border-brand-100">
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.studentId}
                          onChange={(e) => setEditForm((p) => ({ ...p, studentId: e.target.value }))}
                        />
                      ) : student.studentId}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="input !py-1"
                            value={editForm.lastName}
                            onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                          />
                          <input
                            className="input !py-1"
                            value={editForm.firstName}
                            onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                          />
                        </div>
                      ) : `${student.lastName} ${student.firstName}`}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <select
                          className="input !py-1"
                          value={editForm.sex}
                          onChange={(e) => setEditForm((p) => ({ ...p, sex: e.target.value }))}
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      ) : (student.sex || '-')}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <input
                          type="date"
                          className="input !py-1"
                          value={editForm.birthDate}
                          onChange={(e) => setEditForm((p) => ({ ...p, birthDate: e.target.value }))}
                        />
                      ) : (student.birthDate ? new Date(student.birthDate).toLocaleDateString('fr-FR') : '-')}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.parentName}
                          onChange={(e) => setEditForm((p) => ({ ...p, parentName: e.target.value }))}
                        />
                      ) : (student.parentName || '-')}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.parentPhone}
                          onChange={(e) => setEditForm((p) => ({ ...p, parentPhone: e.target.value }))}
                        />
                      ) : (student.parentPhone || '-')}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <select
                          className="input !py-1"
                          value={editForm.classId}
                          onChange={(e) => setEditForm((p) => ({ ...p, classId: e.target.value }))}
                        >
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      ) : (student.schoolClass?.name || '-')}
                    </td>
                    <td className="py-2">
                      {editingStudentId === student.id ? (
                        <select
                          className="input !py-1"
                          value={editForm.academicYearId}
                          onChange={(e) => setEditForm((p) => ({ ...p, academicYearId: e.target.value }))}
                        >
                          {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>{year.label}</option>
                          ))}
                        </select>
                      ) : (student.academicYear?.label || '-')}
                    </td>
                    <td className="py-2">
                      {admin?.role === 'SCHOOL_ADMIN' ? (
                        <div className="flex gap-2">
                          {editingStudentId === student.id ? (
                            <>
                              <button type="button" className="btn-primary !px-3 !py-1" onClick={() => saveStudent(student.id)}>
                                Enregistrer
                              </button>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => setEditingStudentId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => startEditStudent(student)}>
                                modifier
                              </button>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => deleteStudent(student.id)}>
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
                Précédent
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

      {showCreateModal && admin?.role === 'SCHOOL_ADMIN' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-brand-900 mb-4">Ajouter un Élève</h3>
            <form onSubmit={handleCreateStudent} className="grid gap-3 sm:grid-cols-2">
              <select
                className="input"
                value={createForm.classId}
                onChange={(e) => setCreateForm((p) => ({ ...p, classId: e.target.value }))}
                required
              >
                <option value="">Classe</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <select
                className="input"
                value={createForm.academicYearId}
                onChange={(e) => setCreateForm((p) => ({ ...p, academicYearId: e.target.value }))}
                required
              >
                <option value="">Année académique</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.label}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Matricule (optionnel)"
                value={createForm.studentId}
                onChange={(e) => setCreateForm((p) => ({ ...p, studentId: e.target.value }))}
              />
              <select
                className="input"
                value={createForm.sex}
                onChange={(e) => setCreateForm((p) => ({ ...p, sex: e.target.value }))}
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
              </select>
              <input
                className="input"
                placeholder="Nom"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                required
              />
              <input
                className="input"
                placeholder="Prénom"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                required
              />
              <input
                className="input"
                type="date"
                value={createForm.birthDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, birthDate: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Nom du parent"
                value={createForm.parentName}
                onChange={(e) => setCreateForm((p) => ({ ...p, parentName: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Téléphone parent"
                value={createForm.parentPhone}
                onChange={(e) => setCreateForm((p) => ({ ...p, parentPhone: e.target.value }))}
              />
              <input
                className="input sm:col-span-2"
                placeholder="Email parent"
                value={createForm.parentEmail}
                onChange={(e) => setCreateForm((p) => ({ ...p, parentEmail: e.target.value }))}
              />
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={creatingStudent}>
                  {creatingStudent ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold text-brand-900">Historique des imports</h2>
        {importHistory.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun import Enregistré.</p>
        ) : (
          <div className="space-y-2">
            {importHistory.map((item) => {
              const createdCount = item?.metadata?.createdCount ?? 0;
              return (
                <div key={item.id} className="rounded border border-brand-100 px-3 py-2">
                  <p className="text-sm text-brand-900">
                    {new Date(item.createdAt).toLocaleString('fr-FR')} - {createdCount} Élève(s) ajouté(s)
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
