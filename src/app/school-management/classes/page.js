'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';
import { API_BASE_URL } from '@/lib/runtime-config';

const initialForm = {
  academicYearId: '',
  name: '',
  level: '',
  track: '',
  section: 'A',
  capacity: ''
};

const HAITI_LEVEL_OPTIONS = [
  '7e AF',
  '8e AF',
  '9e AF',
  'NSI',
  'NSII',
  'NSIII',
  'NSIV'
];

const NSIV_TRACK_OPTIONS = ['SMP', 'SVT', 'SES', 'LLA', 'Ordinaire'];

export default function SchoolClassesPage() {
  const pageSize = 8;
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [schoolConfig, setSchoolConfig] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
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

  function normalizeSection(value) {
    const v = String(value || '').trim().toUpperCase();
    return v || 'A';
  }

  function buildSuggestedClassName(level, track, section) {
    if (!level) return '';
    const cleanSection = normalizeSection(section);
    if (level === 'NSIV' && track) {
      return `${level} ${track} ${cleanSection}`;
    }
    return `${level} ${cleanSection}`;
  }

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
        const [classesRes, yearsRes, configRes] = await Promise.all([
          apiClient(`/school-management/classes/schools/${schoolId}`, { token }),
          apiClient(`/school-management/schools/${schoolId}/academic-years`, { token }),
          apiClient(`/school-management/config/schools/${schoolId}`, { token })
        ]);

        const years = yearsRes.academicYears || [];
        setAcademicYears(years);
        setClasses(classesRes.classes || []);
        setSchoolConfig(configRes?.config || null);
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

  function extractSection(name) {
    const cleaned = String(name || '').trim();
    const match = cleaned.match(/([A-Z])$/);
    return match ? match[1] : '';
  }

  async function downloadClassReport(format) {
    if (!admin) return;
    const token = getSchoolToken();
    const params = new URLSearchParams({ format });
    if (selectedYearId) params.set('academicYearId', selectedYearId);
    const url = `${API_BASE_URL}/school-management/reports/schools/${admin.schoolId}/classes?${params.toString()}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Impossible de télécharger le rapport.');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `liste-classes.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30000);
    } catch (e) {
      setError(e.message || 'Erreur de téléchargement.');
    }
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

  async function loadClassStudents(cls) {
    if (!admin || !cls) return;
    setClassStudentsLoading(true);
    try {
      const token = getSchoolToken();
      const params = new URLSearchParams({ classId: String(cls.id), academicYearId: String(cls.academicYearId) });
      const res = await apiClient(`/school-management/students/schools/${admin.schoolId}?${params.toString()}`, { token });
      const students = res.students || [];
      setActiveClass(cls);
      setClassStudents(students);
    } catch (e) {
      setError(e.message || 'Impossible de charger les élèves de la classe.');
    } finally {
      setClassStudentsLoading(false);
    }
  }

  function openPrintPreview() {
    if (!activeClass) return;
    const total = classStudents.length;
    const girls = classStudents.filter((s) => s.sex === 'FEMALE').length;
    const boys = classStudents.filter((s) => s.sex === 'MALE').length;
    const logo = schoolConfig?.logo ? `<img src="${schoolConfig.logo}" style="height:60px;object-fit:contain" />` : '';
    const header = `
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:16px;">
        ${logo}
        <div>
          <div style="font-size:18px;font-weight:700;">${schoolConfig?.name || 'École'}</div>
          <div style="font-size:12px;">${schoolConfig?.address || ''}</div>
          <div style="font-size:12px;">${schoolConfig?.phone || ''}</div>
        </div>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Classe: ${activeClass.name}</div>
      <div style="font-size:12px;margin-bottom:12px;">Total: ${total} · Filles: ${girls} · Garçons: ${boys}</div>
    `;
    const rows = classStudents.map((s, idx) => (
      `<tr>
        <td style="padding:6px;border:1px solid #ddd;">${idx + 1}</td>
        <td style="padding:6px;border:1px solid #ddd;">${s.lastName} ${s.firstName}</td>
        <td style="padding:6px;border:1px solid #ddd;">${s.sex}</td>
        <td style="padding:6px;border:1px solid #ddd;">${s.studentId || ''}</td>
      </tr>`
    )).join('');
    const html = `
      <html><head><title>Liste classe</title></head>
      <body style="font-family:Arial, sans-serif;padding:24px;">
        ${header}
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="padding:6px;border:1px solid #ddd;">#</th>
              <th style="padding:6px;border:1px solid #ddd;">Élève</th>
              <th style="padding:6px;border:1px solid #ddd;">Sexe</th>
              <th style="padding:6px;border:1px solid #ddd;">Matricule</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const filteredClasses = useMemo(() => {
    const keyword = String(searchTerm || '').trim().toLowerCase();
    return classes
      .filter((item) => {
        if (!keyword) return true;
        const name = String(item.name || '').toLowerCase();
        const level = String(item.level || '').toLowerCase();
        const year = String(item.academicYear?.label || '').toLowerCase();
        return name.includes(keyword) || level.includes(keyword) || year.includes(keyword);
      })
      .filter((item) => {
        if (!levelFilter) return true;
        return String(item.level || '').toLowerCase().includes(String(levelFilter).toLowerCase());
      })
      .filter((item) => {
        if (!sectionFilter) return true;
        return extractSection(item.name) === sectionFilter;
      });
  }, [classes, searchTerm, levelFilter, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClasses = filteredClasses.slice((safePage - 1) * pageSize, safePage * pageSize);
  const levelOptions = useMemo(() => (
    Array.from(new Set(classes.map((c) => c.level).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [classes]);
  const sectionOptions = useMemo(() => (
    Array.from(new Set(classes.map((c) => extractSection(c.name)).filter(Boolean))).sort()
  ), [classes]);

  async function onCreateClass(e) {
    e.preventDefault();
    if (!admin) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const suggestedName = buildSuggestedClassName(form.level, form.track, form.section);
      const className = String(form.name || '').trim() || suggestedName;
      const levelLabel = form.level
        ? (form.level === 'NSIV' && form.track ? `${form.level} - ${form.track}` : form.level)
        : null;

      if (!className) {
        setError('Renseigne le niveau ou le nom de classe.');
        setCreating(false);
        return;
      }

      const payload = {
        schoolId: admin.schoolId,
        academicYearId: Number(form.academicYearId),
        name: className,
        level: levelLabel,
        capacity: form.capacity ? Number(form.capacity) : null
      };

      await apiClient('/school-management/classes', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      setSuccess('Classe créée avec succès.');
      setForm((prev) => ({ ...initialForm, academicYearId: prev.academicYearId || '' }));
      await reloadClasses(selectedYearId);
    } catch (e) {
      setError(e.message || 'Impossible de créer la classe.');
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
      setError(e.message || "Impossible de créer l'année académique.");
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
      setSuccess('Classe modifiée avec succès.');
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
          <h1 className="text-2xl font-bold text-brand-900">Gérer les classes</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" type="button" onClick={() => downloadClassReport('pdf')}>
            Liste PDF
          </button>
          <button className="btn-secondary" type="button" onClick={() => downloadClassReport('xlsx')}>
            Liste Excel
          </button>
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
            placeholder="Rechercher par nom / niveau..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="input"
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tous les niveaux</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <select
            className="input"
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Toutes les sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </section>

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
                Définir comme année active
              </label>
              <button className="btn-primary w-fit" type="submit" disabled={creatingYear}>
                {creatingYear ? 'Création...' : 'Ajouter une année (2025-2026)'}
              </button>
            </form>
          </article>

          <article className="card">
            <h2 className="mb-4 text-lg font-semibold text-brand-900">Nouvelle classe</h2>
            <p className="mb-3 text-sm text-brand-700">Configuration adaptee au systeme scolaire haitien (Fondamental et NSIV).</p>
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
              <select
                className="input"
                value={form.level}
                onChange={(e) => {
                  const levelValue = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    level: levelValue,
                    track: levelValue === 'NSIV' ? prev.track : ''
                  }));
                }}
                required
              >
                <option value="">Niveau (systeme haitien)</option>
                {HAITI_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {form.level === 'NSIV' ? (
                <select
                  className="input"
                  value={form.track}
                  onChange={(e) => setForm((prev) => ({ ...prev, track: e.target.value }))}
                >
                  <option value="">Filière NSIV (optionnel)</option>
                  {NSIV_TRACK_OPTIONS.map((track) => (
                    <option key={track} value={track}>{track}</option>
                  ))}
                </select>
              ) : (
                <div />
              )}
              <input
                className="input"
                placeholder="Section (A, B, C...)"
                value={form.section}
                onChange={(e) => setForm((prev) => ({ ...prev, section: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Nom de classe (optionnel, auto si vide)"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Capacite (optionnel)"
                value={form.capacity}
                onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
              />
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      name: buildSuggestedClassName(prev.level, prev.track, prev.section)
                    }))
                  }
                >
                  Generer nom classe
                </button>
                <button className="btn-primary" type="submit" disabled={creating}>
                  {creating ? 'création...' : 'créer la classe'}
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
                  <th className="py-2 text-left">Élèves</th>
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
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => loadClassStudents(item)}>
                          Voir élèves
                        </button>
                        {admin?.role === 'SCHOOL_ADMIN' ? (
                          <>
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
                                modifier
                              </button>
                              <button type="button" className="btn-secondary !px-3 !py-1" onClick={() => removeClass(item.id)}>
                                Supprimer
                              </button>
                            </>
                          )}
                          </>
                        ) : null}
                      </div>
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

      {activeClass ? (
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-brand-900">Élèves - {activeClass.name}</h2>
              <p className="text-sm text-brand-700">
                Total: {classStudents.length} · Filles: {classStudents.filter((s) => s.sex === 'FEMALE').length} · Garçons: {classStudents.filter((s) => s.sex === 'MALE').length}
              </p>
            </div>
            <button className="btn-secondary" type="button" onClick={openPrintPreview}>
              Imprimer la liste
            </button>
          </div>
          {classStudentsLoading ? (
            <p className="text-sm text-brand-700">Chargement des élèves...</p>
          ) : classStudents.length === 0 ? (
            <p className="text-sm text-brand-700">Aucun élève trouvé pour cette classe.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-200">
                    <th className="py-2 text-left">Matricule</th>
                    <th className="py-2 text-left">Nom</th>
                    <th className="py-2 text-left">Sexe</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => (
                    <tr key={student.id} className="border-b border-brand-100">
                      <td className="py-2">{student.studentId || '-'}</td>
                      <td className="py-2">{student.lastName} {student.firstName}</td>
                      <td className="py-2">{student.sex || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
