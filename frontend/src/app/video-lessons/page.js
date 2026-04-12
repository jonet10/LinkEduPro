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
  const [comingCourses, setComingCourses] = useState([]);
  const [comingLoading, setComingLoading] = useState(true);
  const [comingError, setComingError] = useState('');
  const [comingMessage, setComingMessage] = useState('');
  const [partnerFormations, setPartnerFormations] = useState([]);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [partnerError, setPartnerError] = useState('');
  const [partnerMessage, setPartnerMessage] = useState('');
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

    async function fetchComingCourses() {
      try {
        setComingLoading(true);
        setComingError('');
        const data = await apiClient('/courses', { token });
        if (!mounted) return;
        setComingCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (err) {
        if (!mounted) return;
        setComingError(err?.message || 'Impossible de charger les cours à venir.');
        setComingCourses([]);
      } finally {
        if (mounted) setComingLoading(false);
      }
    }

    async function fetchPartnerFormations() {
      try {
        setPartnerLoading(true);
        setPartnerError('');
        const data = await apiClient('/partner-formations/public', { token });
        if (!mounted) return;
        setPartnerFormations(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!mounted) return;
        setPartnerError(err?.message || 'Impossible de charger les formations partenaires.');
        setPartnerFormations([]);
      } finally {
        if (mounted) setPartnerLoading(false);
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
    fetchComingCourses();
    fetchPartnerFormations();
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

  async function registerComingCourse(courseId) {
    if (!token) return;
    try {
      setComingMessage('');
      setComingError('');
      setActionLoading(true);
      await apiClient(`/courses/${courseId}/register`, { method: 'POST', token });
      const data = await apiClient('/courses', { token });
      setComingCourses(Array.isArray(data?.courses) ? data.courses : []);
      setComingMessage('Vous serez notifié dès que le cours sera disponible.');
    } catch (err) {
      setComingError(err?.message || "Impossible de s'inscrire au cours.");
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

  function openCourseDetails(courseId) {
    if (!courseId) return;
    router.push(`/video-lessons/${courseId}`);
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
          {comingError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {comingError}
            </div>
          ) : null}
          {comingMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {comingMessage}
            </div>
          ) : null}
          {partnerError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {partnerError}
            </div>
          ) : null}
          {partnerMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {partnerMessage}
            </div>
          ) : null}

          {loading ? <p className="text-sm text-slate-500">Chargement des cours...</p> : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {!formationsLoading && formations.length ? (
              formations.map((formation) => (
                <article key={`formation-${formation.id}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="relative h-40 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Formation certifiante</span>
                    <h3 className="mt-3 text-sm font-bold">{formation.title}</h3>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-slate-600">{formation.shortDescription}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                      <span>Durée : {formation.durationWeeks}</span>
                      <span>Modules : {formation.modulesCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">{formation.participantsCount || 0} participants</span>
                    <button
                      type="button"
                      className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white"
                      onClick={() => router.push(`/formations/${formation.id}`)}
                    >
                      Voir les détails
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-[11px] font-semibold text-white">
                    <span>{formation.status === 'open' ? 'Ouvert à inscription' : 'Bientôt disponible'}</span>
                    <button
                      type="button"
                      className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                      disabled={formation.enrolled || actionLoading || formation.status !== 'open'}
                      onClick={() => enrollFormation(formation.id)}
                    >
                      {formation.enrolled ? 'Déjà inscrit' : 'Je participe'}
                    </button>
                  </div>
                </article>
              ))
            ) : null}

            {!comingLoading && comingCourses.length ? (
              comingCourses.map((course) => (
                <article key={`coming-${course.id}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="relative h-40 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Parcours certifiant</span>
                    <h3 className="mt-3 text-sm font-bold">{course.title}</h3>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-slate-600">{course.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                      {course.durationWeeks ? <span>Durée : {course.durationWeeks}</span> : null}
                      {course.modulesCount ? <span>Modules : {course.modulesCount}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">{course.waitlistCount || 0} inscrits</span>
                    <button
                      type="button"
                      className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white"
                      onClick={() => router.push(`/video-lessons/coming/${course.id}`)}
                    >
                      Voir les détails
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-[11px] font-semibold text-white">
                    <span>Bientôt disponible</span>
                    <button
                      type="button"
                      className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                      disabled={course.registered || actionLoading}
                      onClick={() => registerComingCourse(course.id)}
                    >
                      {course.registered ? 'Inscrit ✔' : 'Je participe'}
                    </button>
                  </div>
                </article>
              ))
            ) : null}

            {!partnerLoading && partnerFormations.length ? (
              partnerFormations.map((formation) => (
                <article key={`partner-${formation.id}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="relative h-40 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Formation certifiante</span>
                    <h3 className="mt-3 text-sm font-bold">{formation.title}</h3>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-slate-600">{formation.shortDescription || formation.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                      {formation.durationWeeks ? <span>Durée : {formation.durationWeeks}</span> : null}
                      {formation.modulesCount ? <span>Modules : {formation.modulesCount}</span> : null}
                      <span>{formation.isFree ? 'Gratuit' : `${formation.price || 0} ${formation.currency || 'HTG'}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">{formation.participantsCount || 0} participants</span>
                    <button
                      type="button"
                      className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-semibold text-white"
                      onClick={() => router.push(`/video-lessons/partner/${formation.id}`)}
                    >
                      Voir les détails
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-[11px] font-semibold text-white">
                    <span>{formation.status === 'PUBLISHED' ? 'Disponible' : 'En validation'}</span>
                    <button
                      type="button"
                      className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                      disabled={actionLoading}
                      onClick={async () => {
                        if (formation.enrolled) return;
                        if (formation.isFree) {
                          router.push(`/video-lessons/partner/${formation.id}`);
                          return;
                        }
                        try {
                          setPartnerMessage('');
                          setPartnerError('');
                          setActionLoading(true);
                          const data = await apiClient(`/partner-formations/${formation.id}/checkout`, { method: 'POST', token });
                          if (data?.redirectUrl) {
                            window.location.assign(data.redirectUrl);
                          } else {
                            setPartnerError("Impossible de démarrer le paiement.");
                          }
                        } catch (err) {
                          setPartnerError(err?.message || 'Paiement indisponible.');
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                    >
                      {formation.enrolled ? 'Inscrit' : (formation.isFree ? 'Je participe' : 'Payer')}
                    </button>
                  </div>
                </article>
              ))
            ) : null}

            {filteredCourses.map((course, index) => {
              const enrolled = enrollments.get(course.id);
              const progress = enrolled?.progress?.progressPercentage || course?.progress?.progressPercentage || 0;
              const certificateReady = course.certificate && progress >= 100;
              const banner = course.thumbnail || pickFallbackImage(index);
              return (
                <article key={course.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <button
                    type="button"
                    className="relative h-40 w-full bg-slate-100 text-left"
                    onClick={() => openCourseDetails(course.id)}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${banner})` }}
                    />
                  </button>

                  <div className="p-4">
                    <button
                      type="button"
                      className="text-left text-sm font-bold text-slate-900 hover:text-blue-700"
                      onClick={() => openCourseDetails(course.id)}
                    >
                      {course.title}
                    </button>
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
                      <button
                        type="button"
                        className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white"
                        disabled={actionLoading || enrolled}
                        onClick={() => enroll(course.id)}
                      >
                        {enrolled ? 'Déjà inscrit' : 'Ouvert à inscription'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

    </main>
  );
}
