"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent, isNsivStudent } from '@/lib/auth';
import VerifiedTestimonials from '@/components/VerifiedTestimonials';

const CALENDAR_NOTICE_KEY = 'linkedupro_calendar_notice_2025_2026_seen';
const LANDING_SUBJECTS = [
  { id: 'chimie', label: 'Chimie' },
  { id: 'mathematiques', label: 'Mathématiques' },
  { id: 'physique', label: 'Physique' },
  { id: 'histoire_geo', label: 'Histoire et géographie' },
  { id: 'philosophie', label: 'Philosophie' }
];
const LANDING_BOOKS_BY_SUBJECT = {
  chimie: [
    { title: 'Chimie NSIV - Annales MENFP', meta: '23 fiches • 120 questions' },
    { title: 'Réactions et stœchiométrie', meta: '17 fiches • 86 questions' }
  ],
  mathematiques: [
    { title: 'Mathématiques NSIV - Bac probable', meta: '34 fiches • 180 questions' },
    { title: 'Algèbre, géométrie, logique', meta: '28 fiches • 140 questions' }
  ],
  physique: [
    { title: 'Physique NSIV - Série entraînement', meta: '31 fiches • 160 questions' },
    { title: 'Mécanique, électricité, optique', meta: '19 fiches • 95 questions' }
  ],
  histoire_geo: [
    { title: 'Histoire-Géo NSIV - Examens passés', meta: '16 fiches • 72 questions' },
    { title: 'Connaissance générale Haïti', meta: '12 fiches • 64 questions' }
  ],
  philosophie: [
    { title: 'Philosophie - Concepts clés', meta: '14 fiches • 59 questions' },
    { title: 'Dissertations guidées', meta: '10 fiches • 42 questions' }
  ]
};
const LANDING_STUDY_TOOLS = [
  { title: 'Apprendre', desc: 'Parcours guidé et progressif.' },
  { title: 'Programmes d’étude', desc: 'Organisation intelligente de tes révisions.' },
  { title: 'Cartes', desc: 'Mémoire active avec flashcards.' },
  { title: 'Tests d’entraînement', desc: 'Simulation d’examen et correction.' }
];
const TIKTOK_MODELS = [
  {
    title: 'Maths en 60 secondes',
    handle: '@mathsfacile.ht',
    category: 'Mathématiques',
    search: 'maths bac haiti'
  },
  {
    title: 'Chimie visuelle',
    handle: '@chimie.simple',
    category: 'Chimie',
    search: 'chimie exercices'
  },
  {
    title: 'Histoire-Géo active',
    handle: '@histgeo.smart',
    category: 'Histoire-Géo',
    search: 'histoire geographie revision'
  },
  {
    title: 'Philo en pratique',
    handle: '@philo.express',
    category: 'Philosophie',
    search: 'philosophie terminale'
  }
];

function hasDepartmentAndCommune(schoolLabel) {
  if (!schoolLabel || typeof schoolLabel !== 'string') return false;
  const parts = schoolLabel.split('/').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 && Boolean(parts[0]) && Boolean(parts[1]);
}

function formatLastSeen(value) {
  if (!value) return 'Aucune activité récente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Aucune activité récente';
  return date.toLocaleString();
}

function getDailyObjective(student) {
  const track = String(student?.nsivTrack || 'ORDINAIRE').toUpperCase();
  const isNsiv = isNsivStudent(student);

  if (!isNsiv) {
    return {
      title: 'Objectif du jour',
      description: 'Fais 1 quiz ciblé + 20 minutes de révision dans la bibliothèque.',
      ctaLabel: 'Démarrer maintenant',
      ctaHref: '/subjects'
    };
  }

  const byTrack = {
    SVT: {
      title: 'Objectif du jour - Filière SVT',
      description: 'Travaille 1 série SVT, puis fais 15 minutes de Focus pour consolider.',
      ctaLabel: 'Lancer SVT',
      ctaHref: '/subjects'
    },
    SMP: {
      title: 'Objectif du jour - Filière SMP',
      description: 'Fais 1 quiz math + 1 quiz physique, puis passe aux exercices probables.',
      ctaLabel: 'M’entraîner SMP',
      ctaHref: '/probable-exercises'
    },
    SES: {
      title: 'Objectif du jour - Filière SES',
      description: 'Révise 2 rubriques clés et terminé avec un quiz d’évaluation rapide.',
      ctaLabel: 'Commencer SES',
      ctaHref: '/subjects'
    },
    LLA: {
      title: 'Objectif du jour - Filière LLA',
      description: 'Lis une ressource de bibliothèque puis fais un quiz de validation.',
      ctaLabel: 'Étudier en LLA',
      ctaHref: '/library'
    },
    AUTRE: {
      title: 'Objectif du jour - Filière personnalisée',
      description: 'Choisis une rubrique prioritaire et fais un entraînement ciblé.',
      ctaLabel: 'Choisir ma rubrique',
      ctaHref: '/subjects'
    },
    ORDINAIRE: {
      title: 'Objectif du jour - Filière Ordinaire',
      description: 'Fais 1 quiz de base et 1 session Focus pour rester constant.',
      ctaLabel: 'Lancer ma session',
      ctaHref: '/focus'
    }
  };

  return byTrack[track] || byTrack.ORDINAIRE;
}

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [community, setCommunity] = useState({ leaderboard: [], recent: [], schools: [] });
  const [notifications, setNotifications] = useState([]);
  const [onlineStats, setOnlineStats] = useState({
    counts: { total: 0, students: 0, teachers: 0, admins: 0, others: 0 },
    latestSeenAt: null,
    lastSeenByRole: { students: null, teachers: null, admins: null, others: null },
    mineLastSeenAt: null
  });
  const [tiktokModels, setTiktokModels] = useState(TIKTOK_MODELS);
  const [error, setError] = useState('');
  const [welcomePopup, setWelcomePopup] = useState(null);
  const [showCalendarNotice, setShowCalendarNotice] = useState(false);
  const [activeLandingSubject, setActiveLandingSubject] = useState(LANDING_SUBJECTS[0].id);

  const myRanking = useMemo(() => {
    if (!student?.id) return null;
    const index = community.leaderboard.findIndex((row) => row.studentId === student.id);
    if (index < 0) return null;
    return {
      position: index + 1,
      average: community.leaderboard[index].average,
      best: community.leaderboard[index].best
    };
  }, [community.leaderboard, student?.id]);
  const dailyObjective = useMemo(() => getDailyObjective(student), [student]);
  const isStudentRole = student?.role === 'STUDENT';
  const isTeacherRole = student?.role === 'TEACHER';
  const isAdminRole = student?.role === 'ADMIN';

  const homeIntro = useMemo(() => {
    if (isAdminRole) {
      return {
        title: 'Super Admin',
        subtitle: 'Pilote la plateforme, supervise les Écoles, les contenus et les communications.',
        primaryHref: '/admin/super-dashboard',
        primaryLabel: 'Ouvrir le dashboard',
        secondaryHref: '/messages',
        secondaryLabel: 'Gérer les annonces'
      };
    }

    if (isTeacherRole) {
      return {
        title: 'Espace Professeur',
        subtitle: 'Crée des contenus, accompagne les élèves et organise les sessions de rattrapage.',
        primaryHref: '/blog',
        primaryLabel: 'Créer une publication',
        secondaryHref: '/rattrapage',
        secondaryLabel: 'Planifier rattrapage'
      };
    }

    return {
      title: student ? `${student.firstName} ${student.lastName}` : 'Espace élève',
      subtitle: 'Compare tes performances avec d\'autres élèves et découvre les écoles les plus actives.',
      primaryHref: '/subjects',
      primaryLabel: 'Commencer un quiz',
      secondaryHref: '/progress',
      secondaryLabel: 'Voir mes progrès'
    };
  }, [isAdminRole, isTeacherRole, student]);

  const managerQuickActions = useMemo(() => {
    if (isAdminRole) {
      return [
        { href: '/admin/super-dashboard', title: 'Supervision globale', desc: 'Suivre les Élèves, Écoles et activités.' },
        { href: '/school-management/dashboard', title: 'Gestion scolaire', desc: 'Piloter classes, Élèves et paiements.' },
        { href: '/messages', title: 'Communication', desc: 'Publier annonces et Gérer les messages.' },
        { href: '/blog', title: 'Contenus communauté', desc: 'Valider et organiser les publications.' }
      ];
    }

    return [
      { href: '/blog', title: 'Publications pédagogiques', desc: 'Poster supports, conseils et ressources.' },
      { href: '/rattrapage', title: 'Sessions rattrapage', desc: 'Programmer et suivre les sessions live.' },
      { href: '/messages', title: 'Messagerie', desc: 'Répondre aux Élèves et diffuser des annonces.' },
      { href: '/library', title: 'Ressources', desc: 'Partager des PDF et références utiles.' }
    ];
  }, [isAdminRole]);
  const activeLandingBooks = useMemo(
    () => LANDING_BOOKS_BY_SUBJECT[activeLandingSubject] || [],
    [activeLandingSubject]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const alreadySeen = localStorage.getItem(CALENDAR_NOTICE_KEY) === '1';
      if (!alreadySeen) {
        setShowCalendarNotice(true);
      }
    }

    const token = getToken();
    const me = getStudent();
    setStudent(me);
    setIsAuthed(Boolean(token));

    if (!token) {
      setReady(true);
      return;
    }

    Promise.all([
      apiClient('/results/community', { token }),
      apiClient('/v2/profile/daily-welcome-popup', { token }),
      apiClient('/notifications', { token })
    ])
      .then(([communityData, popupData, notifData]) => {
        setCommunity(communityData);
        setNotifications((notifData?.notifications || []).slice(0, 6));
        if (popupData?.shouldShow) {
          setWelcomePopup(popupData);
        }
        setReady(true);
      })
      .catch((e) => {
        setError(e.message || 'Erreur de chargement des données communautaires');
        setReady(true);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const loadOnlineStats = async () => {
      const token = getToken();
      try {
        if (token) {
          const pingData = await apiClient('/public/online/ping', { method: 'POST', token });
          if (isMounted && pingData?.stats?.counts) {
            setOnlineStats(pingData.stats);
            return;
          }
        }

        const statsData = await apiClient('/public/online/stats');
        if (isMounted && statsData?.counts) {
          setOnlineStats(statsData);
        }
      } catch (_) {
      }
    };

    loadOnlineStats();
    timer = window.setInterval(loadOnlineStats, 30000);

    return () => {
      isMounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [isAuthed]);

  useEffect(() => {
    let isMounted = true;

    apiClient('/public/home/tiktok-creators')
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (isMounted && items.length > 0) {
          setTiktokModels(items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  function closeCalendarNotice() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CALENDAR_NOTICE_KEY, '1');
    }
    setShowCalendarNotice(false);
  }

  function resolveNotificationHref(notification) {
    const entityId = notification?.entityId ? String(notification.entityId) : '';
    if (notification?.entityType === 'CATCHUP_SESSION' && entityId) {
      return `/rattrapage?session=${encodeURIComponent(entityId)}`;
    }
    if (notification?.entityType === 'Conversation' && entityId) {
      return `/messages?conversation=${encodeURIComponent(entityId)}`;
    }
    if (notification?.entityType === 'Post' && entityId) {
      return `/blog?post=${encodeURIComponent(entityId)}`;
    }
    if (notification?.entityType === 'LibraryBook') {
      return '/library';
    }
    return '/messages';
  }

  if (!ready) return <p>Chargement...</p>;

  if (!isAuthed) {
    return (
      <section className="landing-shell space-y-8">
        {showCalendarNotice ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Information importante</p>
              <h2 className="mt-2 text-xl font-black text-brand-900">Calendrier scolaire et examens officiels 2025-2026</h2>
              <p className="mt-3 text-sm text-brand-700">
                Le MENFP (Ministere de l'Education Nationale et de la Formation Professionnelle) a publie le calendrier scolaire 2025-2026.
              </p>
              <p className="mt-3 text-sm text-brand-700">Ce calendrier inclut:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700">
                <li>Les periodes de cours.</li>
                <li>Les conges scolaires.</li>
                <li>Les dates des examens officiels (9e annee fondamentale, ENIJE, CEF et baccalaureat).</li>
              </ul>
              <p className="mt-3 text-sm text-brand-700">
                Les examens d'Etat restent programmes en juin et juillet 2026, comme les annees precedentes:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700">
                <li>Fin juin 2026: examens de la 9e annee fondamentale, ENIJE et CEF.</li>
                <li>Mi-juillet 2026: examens du baccalaureat (fin d'etudes secondaires).</li>
              </ul>
              <div className="mt-5 flex justify-end">
                <button type="button" className="btn-primary" onClick={closeCalendarNotice}>J'ai compris</button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="landing-hero card">
          <div>
            <p className="landing-kicker">LinkEduPro</p>
            <h1 className="landing-title">Trouvez des solutions fiables tirées des contenus scolaires</h1>
            <ul className="mt-5 space-y-2 text-base text-brand-900">
              <li>Explications détaillées et progressives</li>
              <li>Réponses vérifiées pour l'entraînement</li>
              <li>Ressources utiles pour le Bac et les examens</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">S’inscrire gratuitement</Link>
              <Link href="/login" className="btn-secondary">Se connecter</Link>
            </div>
          </div>
          <div className="landing-hero-art" aria-hidden="true">
            <div className="landing-device-card">
              <p className="font-semibold text-brand-900">Exercice vérifié</p>
              <p className="mt-1 text-sm text-brand-700">Solution étape par étape</p>
            </div>
            <div className="landing-device-card">
              <p className="font-semibold text-brand-900">Test d’entraînement</p>
              <p className="mt-1 text-sm text-brand-700">Score, correction et révision</p>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="landing-search-box">
            <span className="text-xl text-brand-700">⌕</span>
            <input
              className="landing-search-input"
              placeholder="Rechercher un manuel, une question ou un sujet"
              type="text"
            />
          </div>
        </section>

        <section className="card" aria-labelledby="how-title">
          <h2 id="how-title" className="text-4xl font-black text-brand-900">Comment souhaitez-vous étudier ?</h2>
          <p className="mt-3 max-w-3xl text-lg text-brand-700">
            Maîtrisez vos matières grâce aux cartes, tests d'entraînement, programmes d'étude et activités guidées.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LANDING_STUDY_TOOLS.map((tool, idx) => (
              <article key={tool.title} className={`landing-tool-card landing-tool-${idx + 1}`}>
                <p className="text-2xl font-bold text-brand-900">{tool.title}</p>
                <p className="mt-2 text-sm text-brand-700">{tool.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="subjects-title">
          <h2 id="subjects-title" className="text-4xl font-black text-brand-900">Parcourir par sujet</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {LANDING_SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => setActiveLandingSubject(subject.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  activeLandingSubject === subject.id
                    ? 'bg-brand-500 text-white'
                    : 'border border-brand-100 bg-white text-brand-700'
                }`}
              >
                {subject.label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {activeLandingBooks.map((book) => (
              <article key={book.title} className="palette-card rounded-xl border border-brand-100 p-4">
                <p className="text-lg font-bold text-brand-900">{book.title}</p>
                <p className="mt-2 text-sm text-brand-700">{book.meta}</p>
                <div className="mt-3">
                  <Link href="/register" className="text-sm font-semibold text-brand-500 hover:underline">
                    Voir le contenu
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="tiktok-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="tiktok-title" className="text-2xl font-black text-brand-900">Modèles TikTokeurs ou TikTokeuses à suivre</h2>
              <p className="mt-1 text-sm text-brand-700">Sélection orientée éducation pour apprendre vite et rester motivé.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {onlineStats.counts.total} en ligne
            </span>
          </div>
          <p className="mt-2 text-xs text-brand-700">
            Dernière activité: {formatLastSeen(onlineStats.latestSeenAt)}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {tiktokModels.map((item, idx) => (
              <a
                key={item.handle}
                href={`https://www.tiktok.com/search?q=${encodeURIComponent(item.search)}`}
                target="_blank"
                rel="noreferrer"
                className={`palette-card palette-${(idx % 4) + 1} rounded-xl border border-brand-100 p-4`}
              >
                <p className="text-base font-semibold text-brand-900">{item.title}</p>
                <p className="mt-1 text-sm text-brand-700">{item.handle} · {item.category}</p>
                <p className="mt-2 text-xs font-semibold text-brand-500">Explorer</p>
              </a>
            ))}
          </div>
        </section>

        <VerifiedTestimonials />
      </section>
    );
  }

  return (
    <section className="home-gold-shell space-y-6">
      {showCalendarNotice ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Information importante</p>
            <h2 className="mt-2 text-xl font-black text-brand-900">Calendrier scolaire et examens officiels 2025-2026</h2>
            <p className="mt-3 text-sm text-brand-700">
              Le MENFP (Ministere de l'Education Nationale et de la Formation Professionnelle) a publie le calendrier scolaire 2025-2026.
            </p>
            <p className="mt-3 text-sm text-brand-700">Ce calendrier inclut:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700">
              <li>Les periodes de cours.</li>
              <li>Les conges scolaires.</li>
              <li>Les dates des examens officiels (9e annee fondamentale, ENIJE, CEF et baccalaureat).</li>
            </ul>
            <p className="mt-3 text-sm text-brand-700">
              Les examens d'Etat restent programmes en juin et juillet 2026, comme les annees precedentes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700">
              <li>Fin juin 2026: examens de la 9e annee fondamentale, ENIJE et CEF.</li>
              <li>Mi-juillet 2026: examens du baccalaureat (fin d'etudes secondaires).</li>
            </ul>
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn-primary" onClick={closeCalendarNotice}>J'ai compris</button>
            </div>
          </div>
        </div>
      ) : null}

      {welcomePopup ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl" style={{ animation: 'fadeInWelcome 300ms ease' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Daily Personalized Welcome</p>
            <h2 className="mt-2 text-2xl font-black text-brand-900">Bienvenue, {welcomePopup.firstName}</h2>
            <p className="mt-3 text-sm text-brand-700">
              Aujourd&apos;hui marque ton {welcomePopup.daysLived}e jour d&apos;existence.
              <br />
              {welcomePopup.message?.text}
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => setWelcomePopup(null)}>Commencer ma journée</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card motion-enter lift-card home-gold-card">
        <p className="text-sm text-brand-700">Bienvenue</p>
        <h1 className="home-gold-title text-3xl font-black text-brand-900">
          {homeIntro.title}
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          {homeIntro.subtitle}
        </p>
        <div className="mt-4 flex gap-3">
          <Link href={homeIntro.primaryHref} className="btn-primary cta-pulse home-gold-cta">{homeIntro.primaryLabel}</Link>
          <Link href={homeIntro.secondaryHref} className="btn-secondary">{homeIntro.secondaryLabel}</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card lift-card palette-card palette-1">
          <p className="text-xs uppercase tracking-wide text-brand-700">Utilisateurs en ligne</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.total}</p>
          <p className="mt-1 text-xs text-brand-700">Dernière activité: {formatLastSeen(onlineStats.latestSeenAt)}</p>
        </article>
        <article className="card lift-card palette-card palette-2">
          <p className="text-xs uppercase tracking-wide text-brand-700">Élèves</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.students}</p>
          <p className="mt-1 text-xs text-brand-700">{formatLastSeen(onlineStats.lastSeenByRole?.students)}</p>
        </article>
        <article className="card lift-card palette-card palette-3">
          <p className="text-xs uppercase tracking-wide text-brand-700">Professeurs</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.teachers}</p>
          <p className="mt-1 text-xs text-brand-700">{formatLastSeen(onlineStats.lastSeenByRole?.teachers)}</p>
        </article>
        <article className="card lift-card palette-card palette-4">
          <p className="text-xs uppercase tracking-wide text-brand-700">Admins</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.admins}</p>
          <p className="mt-1 text-xs text-brand-700">{formatLastSeen(onlineStats.lastSeenByRole?.admins)}</p>
        </article>
      </div>

      <div className="card lift-card">
        <p className="text-xs uppercase tracking-wide text-brand-700">Ma dernière activité</p>
        <p className="mt-2 text-sm text-brand-900">{formatLastSeen(onlineStats.mineLastSeenAt)}</p>
        <p className="mt-1 text-xs text-brand-700">
          Dernière connexion: {formatLastSeen(student?.lastLoginAt)}
        </p>
      </div>

      {isStudentRole ? (
        <div className="card motion-enter motion-delay-1 lift-card home-gold-soft border border-brand-200 bg-gradient-to-r from-brand-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Coaching intelligent</p>
          <h2 className="home-gold-title mt-1 text-xl font-bold text-brand-900">{dailyObjective.title}</h2>
          <p className="mt-2 text-sm text-brand-700">{dailyObjective.description}</p>
          <div className="mt-4">
            <Link href={dailyObjective.ctaHref} className="btn-primary cta-pulse home-gold-cta">{dailyObjective.ctaLabel}</Link>
          </div>
        </div>
      ) : null}

      {isStudentRole && !hasDepartmentAndCommune(student?.school) ? (
        <div className="card motion-enter motion-delay-2 lift-card border border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Mise à jour de profil requise</p>
          <p className="mt-1 text-sm text-amber-900">
            Ton département et ta commune sont manquants. Merci de mettre à jour ton profil pour continuer avec des contenus personnalisés.
          </p>
          <div className="mt-3">
            <Link href="/profile?edit=1" className="btn-primary">Mettre à jour mon profil</Link>
          </div>
        </div>
      ) : null}

      {isStudentRole && isNsivStudent(student) ? (
        <div className="card motion-enter motion-delay-2 lift-card">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques NSIV</h2>
          <p className="mt-2 text-sm text-brand-700">Accès direct aux rubriques principales de Terminale.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/nsiv" className="rounded-lg border border-brand-100 p-3 lift-card palette-card palette-1">
              <p className="font-semibold text-brand-900">Espace NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Tableau complet des rubriques et progression.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 lift-card palette-card palette-2">
              <p className="font-semibold text-brand-900">Exercices probables</p>
              <p className="mt-1 text-sm text-brand-700">Sujets récurrents du Bac NSIV.</p>
            </Link>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-red-600">{error}</p> : null}

      {isStudentRole ? (
        <div className="grid gap-4 lg:grid-cols-3 motion-enter motion-delay-3">
          <article className="card lg:col-span-2 lift-card">
            <h2 className="mb-3 text-xl font-semibold text-brand-900">Plan rapide du jour</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/subjects" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-1">
                <p className="text-sm font-semibold text-brand-900">Rubriques du jour</p>
                <p className="mt-1 text-sm text-brand-700">Révision ciblée par matière.</p>
              </Link>
              <Link href="/probable-exercises" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-2">
                <p className="text-sm font-semibold text-brand-900">Exercices probables</p>
                <p className="mt-1 text-sm text-brand-700">Sujets les plus fréquents à l&apos;examen.</p>
              </Link>
              <Link href="/focus" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-3">
                <p className="text-sm font-semibold text-brand-900">Session Focus</p>
                <p className="mt-1 text-sm text-brand-700">Concentration en 25 minutes.</p>
              </Link>
              <Link href="/library" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-4">
                <p className="text-sm font-semibold text-brand-900">Bibliothèque</p>
                <p className="mt-1 text-sm text-brand-700">PDF, ressources et fiches utiles.</p>
              </Link>
            </div>
          </article>

          <article className="card lift-card">
            <h2 className="mb-3 text-xl font-semibold text-brand-900">Mon niveau actuel</h2>
            {myRanking ? (
              <div className="space-y-2 text-sm text-brand-800">
                <p>Classement: <strong>#{myRanking.position}</strong></p>
                <p>Moyenne: <strong>{myRanking.average}%</strong></p>
                <p>Meilleur score: <strong>{myRanking.best}%</strong></p>
              </div>
            ) : (
              <p className="text-sm text-brand-700">Fais un quiz pour débloquer tes stats.</p>
            )}
            <div className="mt-4">
              <Link href="/subjects" className="btn-primary">Lancer un entraînement</Link>
            </div>
          </article>
        </div>
      ) : (
        <article className="card motion-enter motion-delay-3 lift-card home-gold-soft">
          <h2 className="home-gold-title mb-3 text-xl font-semibold text-brand-900">Centre de gestion</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {managerQuickActions.map((action, idx) => (
              <Link key={action.href} href={action.href} className={`rounded-xl border border-brand-100 p-4 lift-card palette-card palette-${(idx % 4) + 1}`}>
                <p className="text-sm font-semibold text-brand-900">{action.title}</p>
                <p className="mt-1 text-sm text-brand-700">{action.desc}</p>
              </Link>
            ))}
          </div>
        </article>
      )}

      <article className="card motion-enter motion-delay-4 lift-card home-gold-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="home-gold-title text-xl font-semibold text-brand-900">Annonces et alertes</h2>
          <Link href="/messages" className="text-sm text-brand-700 hover:underline">Voir tout</Link>
        </div>
        <div className="space-y-2 text-sm">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={resolveNotificationHref(n)}
              className={`block rounded border px-3 py-2 lift-card ${n.isRead ? 'border-brand-100' : 'border-brand-500 bg-brand-50'}`}
            >
              <p className="font-semibold text-brand-900">{n.title}</p>
              <p className="text-brand-700">{n.message}</p>
              <p className="text-xs text-brand-700">{new Date(n.createdAt).toLocaleString()}</p>
            </Link>
          ))}
          {notifications.length === 0 ? <p className="text-brand-700">Aucune alerte pour le moment.</p> : null}
        </div>
      </article>

      <article className="card motion-enter motion-delay-4 lift-card home-gold-soft">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="home-gold-title text-xl font-semibold text-brand-900">Modèles TikTokeurs ou TikTokeuses à suivre</h2>
            <p className="mt-1 text-sm text-brand-700">Comptes et thèmes utiles pour apprendre rapidement.</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {onlineStats.counts.total} actifs
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiktokModels.map((item, idx) => (
            <a
              key={item.handle}
              href={`https://www.tiktok.com/search?q=${encodeURIComponent(item.search)}`}
              target="_blank"
              rel="noreferrer"
              className={`rounded-xl border border-brand-100 p-4 palette-card palette-${(idx % 4) + 1}`}
            >
              <p className="text-sm font-semibold text-brand-900">{item.title}</p>
              <p className="mt-1 text-xs text-brand-700">{item.handle}</p>
              <p className="mt-2 text-xs font-semibold text-brand-500">{item.category}</p>
            </a>
          ))}
        </div>
      </article>

      <VerifiedTestimonials />
    </section>
  );
}
