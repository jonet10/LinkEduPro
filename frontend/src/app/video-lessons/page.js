  'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Ouvert pour inscription' },
  { value: 'UPCOMING', label: 'Bientôt' },
  { value: 'ARCHIVED', label: 'Archivé' }
];

const FALLBACK_IMAGES = [
  '/images/tool-communaute-scolaire.png',
  '/images/tool-quiz-bac.png',
  '/images/tool-rattrapage-live.png',
  '/images/tool-rubriques-nsiv.png',
  '/images/subject-physique.png',
  '/images/subject-chimie.png'
];

function formatPrice(isFree) {
  return isFree ? 'Gratuit' : 'Payant';
}

function formatStatus(status) {
  const match = STATUS_OPTIONS.find((item) => item.value === status);
  return match ? match.label : 'Ouvert';
}

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${Math.max(0, Math.min(100, amount))}%`;
}

function pickFallbackImage(index) {
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

export default function VideoLessonsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [student, setStudent] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [languageFilter, setLanguageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [formations, setFormations] = useState([]);
  const [formationsLoading, setFormationsLoading] = useState(true);
  const [formationError, setFormationError] = useState('');
  const [formationMessage, setFormationMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
    setStudent(getStudent());
  }, [router]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function fetchFormations() {
      try {
        setFormationsLoading(true);
        setFormationError('');
        const data = await apiClient('/formations', { token });
        if (!mounted) return;
        setFormations(Array.isArray(data?.formations) ? data.formations : []);
      } catch (err) {
        if (!mounted) return;
        setFormationError(err?.message || 'Impossible de charger les formations certifiantes.');
        setFormations([]);
      } finally {
        if (mounted) setFormationsLoading(false);
      }
    }

    async function fetchCourses() {
      try {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (statusFilter) params.set('status', statusFilter);
        if (languageFilter) params.set('language', languageFilter);
        if (typeFilter) params.set('category', typeFilter);

        const [coursesData, dashboardData] = await Promise.all([
          apiClient(`/v2/courses?${params.toString()}`, { token }),
          apiClient('/v2/courses/dashboard', { token }).catch(() => ({ enrolled: [], completed: [] }))
        ]);

        if (!mounted) return;

        const enrolledMap = new Map();
        (dashboardData?.enrolled || []).forEach((course) => {
          enrolledMap.set(course.id, course);
        });

        setCourses(Array.isArray(coursesData?.courses) ? coursesData.courses : []);
        setEnrollments(enrolledMap);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Impossible de charger les cours.');
        setCourses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFormations();
    fetchCourses();
    return () => {
      mounted = false;
    };
  }, [token, query, statusFilter, languageFilter, typeFilter]);

  const filteredCourses = useMemo(() => {
    if (!query) return courses;
    const q = query.trim().toLowerCase();
    return courses.filter((course) => (
      String(course.title || '').toLowerCase().includes(q) ||
      String(course.description || '').toLowerCase().includes(q) ||
      String(course.provider || '').toLowerCase().includes(q)
    ));
  }, [courses, query]);

  async function enroll(courseId) {
    if (!token) return;
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      await apiClient(`/v2/courses/${courseId}/enroll`, { method: 'POST', token });
      const dashboardData = await apiClient('/v2/courses/dashboard', { token });
      const enrolledMap = new Map();
      (dashboardData?.enrolled || []).forEach((course) => {
        enrolledMap.set(course.id, course);
      });
      setEnrollments(enrolledMap);
      setSuccess('Inscription enregistrée. Le certificat sera généré automatiquement à la fin du cours.');
    } catch (err) {
      setError(err?.message || "Impossible d'inscrire ce cours.");
    } finally {
      setActionLoading(false);
    }
  }

  async function enrollFormation(formationId) {
    if (!token) return;
    try {
      setFormationMessage('');
      setFormationError('');
      setActionLoading(true);
      await apiClient(`/formations/${formationId}/enroll`, { method: 'POST', token });
      const data = await apiClient('/formations', { token });
      setFormations(Array.isArray(data?.formations) ? data.formations : []);
      setFormationMessage('Vous êtes inscrit à cette formation.');
    } catch (err) {
      setFormationError(err?.message || "Impossible de s'inscrire à la formation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadCertificate(courseId) {
    if (!token) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v2/courses/${courseId}/certificate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Certificat indisponible pour le moment.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err?.message || 'Impossible de télécharger le certificat.');
    } finally {
      setActionLoading(false);
    }
  }

  const courseCounts = useMemo(() => {
    const totals = {
      status: { OPEN: 0, UPCOMING: 0, ARCHIVED: 0 },
      language: { Français: 0, Anglais: 0, Créole: 0 },
      type: {}
    };
    courses.forEach((course) => {
      const status = String(course.status || '').toUpperCase();
      if (totals.status[status] !== undefined) totals.status[status] += 1;
      const lang = course.language || '';
      if (totals.language[lang] !== undefined) totals.language[lang] += 1;
      const type = course.category || course.type || '';
      if (type) totals.type[type] = (totals.type[type] || 0) + 1;
    });
    return totals;
  }, [courses]);

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-blue-700 px-4 py-8 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">Trouver un cours en ligne</h1>
          </div>
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 text-blue-900 shadow-sm">
              <input
                className="w-full bg-transparent px-3 py-1 text-sm text-blue-900 placeholder:text-blue-500 focus:outline-none"
                placeholder="Recherche des cours, établissements, des catégories"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="rounded-full bg-blue-900 px-4 py-2 text-xs font-semibold text-white">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-100 bg-white p-4">
          <h2 className="text-sm font-bold text-slate-800">Filtrer les cours</h2>
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-700"
            onClick={() => {
              setStatusFilter('OPEN');
              setLanguageFilter('');
              setTypeFilter('');
              setQuery('');
            }}
          >
            Retirer les filtres
          </button>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-semibold text-slate-700">Disponibilité</p>
              <div className="mt-2 space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <label key={status.value} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={statusFilter === status.value}
                        onChange={() => setStatusFilter(status.value)}
                      />
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {(courseCounts.status[status.value] || 0)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-700">Langues</p>
              <div className="mt-2 space-y-2">
                {['Français', 'Anglais', 'Créole'].map((lang) => (
                  <label key={lang} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={languageFilter === lang}
                        onChange={() => setLanguageFilter(lang)}
                      />
                      {lang}
                    </span>
                    <span className="text-xs text-slate-400">{courseCounts.language[lang] || 0}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-700">Types</p>
              <div className="mt-2 space-y-2">
                {['Formation professionnelle', 'Certificat', 'Classe numérique', 'Examens'].map((type) => (
                  <label key={type} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={typeFilter === type}
                        onChange={() => setTypeFilter(type)}
                      />
                      {type}
                    </span>
                    <span className="text-xs text-slate-400">{courseCounts.type[type] || 0}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Résultats 1 à {filteredCourses.length} sur {courses.length} cours correspondant à votre recherche
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {loading ? <p className="text-sm text-slate-500">Chargement des cours...</p> : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course, index) => {
              const enrolled = enrollments.get(course.id);
              const progress = enrolled?.progress?.progressPercentage || course?.progress?.progressPercentage || 0;
              const certificateReady = course.certificate && progress >= 100;
              const banner = course.thumbnail || pickFallbackImage(index);
              return (
                <article key={course.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="relative h-40 bg-slate-100">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${banner})` }}
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900">{course.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{course.provider || 'EduPro'}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">{formatPrice(course.isFree)}</span>
                    {enrolled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        Inscrit
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading}
                        className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                        onClick={() => enroll(course.id)}
                      >
                        S&apos;inscrire
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-[11px] font-semibold text-white">
                    <span>{formatStatus(String(course.status || '').toUpperCase())}</span>
                    {certificateReady ? (
                      <button
                        type="button"
                        className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                        onClick={() => downloadCertificate(course.id)}
                      >
                        Certificat
                      </button>
                    ) : (
                      <span>Ouvert à inscription</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12">
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Formations certifiantes</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Formations Certifiantes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Découvrez nos parcours certifiants et confirmez votre participation.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              Bientôt disponible
            </span>
          </div>

          {formationsLoading ? <p className="mt-4 text-sm text-slate-500">Chargement...</p> : null}
          {formationError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formationError}
            </div>
          ) : null}
          {formationMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {formationMessage}
            </div>
          ) : null}

          {!formationsLoading && formations.length ? (
            formations.map((formation) => (
              <div key={formation.id} className="mt-6 grid gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Certifiante</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        formation.status === 'open'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {formation.status === 'open' ? 'Ouverte' : 'Bientôt disponible'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{formation.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{formation.shortDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                    <span>Durée : {formation.durationWeeks}</span>
                    <span>Modules : {formation.modulesCount}</span>
                    <span>{formation.participantsCount || 0} participants</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3">
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      formation.enrolled ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-700 text-white'
                    }`}
                    disabled={formation.enrolled || actionLoading || formation.status !== 'open'}
                    onClick={() => enrollFormation(formation.id)}
                  >
                    {formation.enrolled ? 'Déjà inscrit' : (formation.status === 'open' ? 'Je participe' : 'Bientôt disponible')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => router.push(`/formations/${formation.id}`)}
                  >
                    Voir les détails
                  </button>
                </div>
              </div>
            ))
          ) : null}
        </div>
      </section>
    </main>
  );
}
