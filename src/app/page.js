"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken, getStudent, isNsivStudent } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';
import VerifiedTestimonials from '@/components/VerifiedTestimonials';
import SectionIcon from '@/components/ui/SectionIcon';
import StudentDashboard from '@/components/student-dashboard/StudentDashboard';

const LANDING_SUBJECTS = [
  { id: 'chimie', label: 'Chimie', iconImage: '/images/subject-chimie.png' },
  { id: 'mathematiques', label: 'Mathématiques', iconImage: '/images/subject-mathematiques.png' },
  { id: 'physique', label: 'Physique', iconImage: '/images/subject-physique.png' },
  { id: 'histoire_geo', label: 'Histoire et géographie', iconImage: '/images/subject-histoire-geo.png' },
  { id: 'philosophie', label: 'Philosophie', iconImage: '/images/subject-philosophie.png' },
  { id: 'francais', label: 'Français', iconImage: '/images/subject-francais.png' }
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
  ],
  francais: [
    { title: 'Français NSIV - Compréhension et analyse', meta: '18 fiches • 96 questions' },
    { title: 'Expression écrite et grammaire', meta: '13 fiches • 70 questions' }
  ]
};
const LANDING_STUDY_TOOLS = [
  {
    title: 'Quiz Bac ciblés',
    desc: 'Entraînement par matière avec correction immédiate.',
    iconImage: '/images/tool-quiz-bac.png'
  },
  {
    title: 'Rattrapage live',
    desc: 'Sessions avec professeurs, gratuites ou payantes.',
    iconImage: '/images/tool-rattrapage-live.png'
  },
  {
    title: 'Rubriques NSIV',
    desc: 'Contenus structurés pour réviser plus vite.',
    iconImage: '/images/tool-rubriques-nsiv.png'
  },
  {
    title: 'Communauté scolaire',
    desc: 'Publications, échanges et défis éducatifs.',
    iconImage: '/images/tool-communaute-scolaire.png'
  }
];
const LANDING_HERO_SLIDES = [
  { image: '/slides/HTC.jpg', caption: 'Outils modernes pour réussir les examens' },
  { image: '/slides/H.jpeg', caption: 'Révisions guidées avec des ressources ciblées' },
  { image: '/slides/HC.jpg', caption: 'Exercices et accompagnement pour chaque matière' },
  { image: '/slides/HL.jpg', caption: 'Progression continue vers les examens officiels' }
];
const LEARNING_SHOWCASE_SECTIONS = [
  {
    id: 'quiz-pop',
    title: 'Quiz les plus populaires',
    subtitle: 'Entraînements recommandés cette semaine',
    items: [
      { title: 'Quiz Physique NSIV - Bases', author: 'LinkEduPro', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Populaire', href: '/subjects', image: '/images/subject-physique.png' },
      { title: 'Quiz Maths - Révision rapide', author: 'LinkEduPro', rating: '4,8', price: 'Gratuit', oldPrice: '', badge: 'Top', href: '/subjects', image: '/images/subject-mathematiques.png' },
      { title: 'Quiz Chimie - Annales ciblées', author: 'LinkEduPro', rating: '4,6', price: 'Gratuit', oldPrice: '', badge: 'Recommandé', href: '/subjects', image: '/images/subject-chimie.png' },
      { title: 'Quiz Hist-Géo - NSIV', author: 'LinkEduPro', rating: '4,5', price: 'Gratuit', oldPrice: '', badge: 'Nouveau', href: '/subjects', image: '/images/subject-histoire-geo.png' },
      { title: 'Quiz Philosophie - Concepts clés', author: 'LinkEduPro', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Populaire', href: '/subjects', image: '/images/subject-philosophie.png' }
    ]
  },
  {
    id: 'catchup-pop',
    title: 'Rattrapages en vedette',
    subtitle: 'Sessions live les plus consultées',
    items: [
      { title: 'Rattrapage Physique (mécanique)', author: 'Professeurs vérifiés', rating: '4,8', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/subject-physique.png' },
      { title: 'Rattrapage Maths (algèbre)', author: 'Professeurs vérifiés', rating: '4,7', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/subject-mathematiques.png' },
      { title: 'Rattrapage Chimie (stoéchiométrie)', author: 'Professeurs vérifiés', rating: '4,6', price: 'À partir de 120 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/subject-chimie.png' },
      { title: 'Rattrapage Philosophie', author: 'Professeurs vérifiés', rating: '4,6', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/subject-philosophie.png' },
      { title: 'Rattrapage Histoire-Géo', author: 'Professeurs vérifiés', rating: '4,5', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/subject-histoire-geo.png' }
    ]
  },
  {
    id: 'video-pop',
    title: 'Vidéos classe numérique',
    subtitle: 'Leçons vidéo recommandées',
    items: [
      { title: 'Physique: mouvement rectiligne', author: 'Classe numérique', rating: '4,8', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/subject-physique.png' },
      { title: 'Maths: fonctions et dérivées', author: 'Classe numérique', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/subject-mathematiques.png' },
      { title: 'Chimie: réactions et bilans', author: 'Classe numérique', rating: '4,6', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/subject-chimie.png' },
      { title: 'Philo: méthode dissertation', author: 'Classe numérique', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/subject-philosophie.png' },
      { title: 'Hist-Géo: cartes et repères', author: 'Classe numérique', rating: '4,5', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/subject-histoire-geo.png' }
    ]
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

function getUserInitials(student) {
  const first = String(student?.firstName || '').trim();
  const last = String(student?.lastName || '').trim();
  const combo = `${first} ${last}`.trim();
  if (!combo) return 'LE';
  const parts = combo.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
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
      description: 'Travaille 1 série SVT, puis visionne une courte leçon vidéo pour consolider.',
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
      description: 'Fais 1 quiz de base et 1 vidéo d’entraînement pour rester constant.',
      ctaLabel: 'Lancer ma session',
      ctaHref: '/video-lessons'
    }
  };

  return byTrack[track] || byTrack.ORDINAIRE;
}

function normalizeCommunityPayload(payload) {
  return {
    leaderboard: Array.isArray(payload?.leaderboard) ? payload.leaderboard : [],
    recent: Array.isArray(payload?.recent) ? payload.recent : [],
    schools: Array.isArray(payload?.schools) ? payload.schools : []
  };
}

function LearningShowcaseSection({ section }) {
  const isSubjectIconImage = (src) => /^\/images\/subject-/.test(String(src || ''));
  const trackRef = useRef(null);
  const autoDirectionRef = useRef(1);
  const [canSlide, setCanSlide] = useState(false);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return undefined;

    function updateSlideState() {
      const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      setCanSlide(maxLeft > 4);
    }

    updateSlideState();
    node.addEventListener('scroll', updateSlideState, { passive: true });
    window.addEventListener('resize', updateSlideState);
    return () => {
      node.removeEventListener('scroll', updateSlideState);
      window.removeEventListener('resize', updateSlideState);
    };
  }, [section.items.length]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node || !canSlide || section.items.length < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
    const stepDelay = isMobileViewport ? 2600 : 3000;

    const timer = window.setInterval(() => {
      const firstCard = node.querySelector('.showcase-card');
      if (!firstCard) return;
      const gap = Number.parseFloat(window.getComputedStyle(node).columnGap || window.getComputedStyle(node).gap || '16') || 16;
      const step = firstCard.getBoundingClientRect().width + gap;
      const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      const next = node.scrollLeft + (autoDirectionRef.current * step);

      if (next <= 0) {
        autoDirectionRef.current = 1;
        node.scrollTo({ left: 0, behavior: 'auto' });
        return;
      }
      if (next >= maxLeft) {
        autoDirectionRef.current = -1;
        node.scrollTo({ left: maxLeft, behavior: 'auto' });
        return;
      }

      node.scrollTo({ left: next, behavior: 'auto' });
    }, stepDelay);

    return () => {
      window.clearInterval(timer);
    };
  }, [canSlide, section.items.length]);

  return (
    <section className="card">
      <h2 className="public-landing-section-title text-3xl font-black text-brand-900">{section.title}</h2>
      <p className="public-landing-section-subtitle mt-2 text-sm text-brand-700">{section.subtitle}</p>
      {Array.isArray(section.items) && section.items.length === 0 ? (
        <p className="mt-4 text-sm text-brand-700">Aucun contenu disponible pour ton niveau pour le moment.</p>
      ) : null}
      <div className="mt-4">
        <div
          ref={trackRef}
          className="showcase-track flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
        >
        {section.items.map((item) => (
          <article key={`${section.id}-${item.title}`} className="showcase-card w-[260px] shrink-0 snap-start overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
            <div className={`h-36 w-full ${isSubjectIconImage(item.image) ? 'flex items-center justify-center bg-brand-50 p-3' : 'overflow-hidden'}`}>
              <img
                src={item.image}
                alt={item.title}
                className={isSubjectIconImage(item.image) ? 'h-full w-full object-contain object-center' : 'h-36 w-full object-cover object-center'}
              />
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-base font-semibold text-brand-900">{item.title}</p>
              <p className="mt-1 text-xs text-brand-700">{item.author}</p>
              <p className="mt-1 text-xs font-semibold text-brand-700">{item.rating} ★</p>
              <p className="mt-1 text-sm font-bold text-brand-900">{item.price}</p>
              {item.oldPrice ? <p className="text-xs text-brand-700 line-through">{item.oldPrice}</p> : null}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">{item.badge}</span>
                <Link href={item.href} className="text-xs font-semibold text-brand-500 hover:underline">Voir</Link>
              </div>
            </div>
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [community, setCommunity] = useState({ leaderboard: [], recent: [], schools: [] });
  const [publisherProfile, setPublisherProfile] = useState(null);
  const [publisherError, setPublisherError] = useState('');
  const [onlineStats, setOnlineStats] = useState({
    counts: { total: 0, students: 0, teachers: 0, admins: 0, others: 0 },
    latestSeenAt: null,
    lastSeenByRole: { students: null, teachers: null, admins: null, others: null },
    mineLastSeenAt: null
  });
  const [progress, setProgress] = useState({
    overview: { totalAttempts: 0, averageScore: 0 },
    subjectStats: [],
    recentAttempts: []
  });
  const [platformDonationFeedback, setPlatformDonationFeedback] = useState('');
  const [error, setError] = useState('');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [teacherProfileError, setTeacherProfileError] = useState('');
  const [activeLandingSubject, setActiveLandingSubject] = useState(LANDING_SUBJECTS[0].id);
  const [learningShowcaseSections, setLearningShowcaseSections] = useState(LEARNING_SHOWCASE_SECTIONS);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  const myRanking = useMemo(() => {
    if (!student?.id) return null;
    const leaderboard = Array.isArray(community?.leaderboard) ? community.leaderboard : [];
    const index = leaderboard.findIndex((row) => row?.studentId === student.id);
    if (index < 0) return null;
    return {
      position: index + 1,
      average: leaderboard[index]?.average,
      best: leaderboard[index]?.best
    };
  }, [community?.leaderboard, student?.id]);
  const dailyObjective = useMemo(() => getDailyObjective(student), [student]);
  const isStudentRole = student?.role === 'STUDENT';
  const isAdminRole = student?.role === 'ADMIN';
  const isTeacherRole = student?.role === 'TEACHER';
  const isPublisherRole = student?.role === 'PUBLISHER';

  const openTutorProfile = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openTutorProfile', '1');
    }
    router.push('/teacher/dashboard?profile=1');
  };

  const quizProgressPercent = useMemo(() => {
    const preferred = Number(progress?.overview?.averageScore || 0);
    const fallback = Number(myRanking?.average || 0);
    const value = Number.isFinite(preferred) && preferred > 0 ? preferred : fallback;
    if (!Number.isFinite(value) || value <= 0) return 20;
    return Math.max(5, Math.min(95, Math.round(value)));
  }, [myRanking?.average, progress?.overview?.averageScore]);
  const studentTrackLabel = useMemo(() => {
    const track = String(student?.nsivTrack || '').trim().toUpperCase();
    if (!track) return 'Général';
    return track;
  }, [student?.nsivTrack]);


  const managerQuickActions = useMemo(() => {
    if (isAdminRole) {
      return [
        { href: '/admin/super-dashboard', title: 'Supervision globale', desc: 'Suivre les Élèves, Écoles et activités.', icon: 'chart' },
        { href: '/school-management/dashboard', title: 'Gestion scolaire', desc: 'Piloter classes, Élèves et paiements.', icon: 'school' },
        { href: '/teacher/exams', title: 'Examens passés', desc: 'Ajouter des PDF (annales, sujets, modèles).', icon: 'target' },
        { href: '/messages', title: 'Communication', desc: 'Publier des annonces et gérer les messages.', icon: 'message' },
        { href: '/blog', title: 'Contenus communauté', desc: 'Valider et organiser les publications.', icon: 'collection' }
      ];
    }

    return [
      { href: '/blog', title: 'Publications pédagogiques', desc: 'Poster supports, conseils et ressources.', icon: 'write' },
      { href: '/rattrapage', title: 'Sessions rattrapage', desc: 'Programmer et suivre les sessions live.', icon: 'video' },
      { href: '/teacher/exams', title: 'Examens passés', desc: 'Ajouter des PDF pour les élèves.', icon: 'target' },
      { href: '/messages', title: 'Messagerie', desc: 'Répondre aux Élèves et diffuser des annonces.', icon: 'mail' },
      { href: '/library', title: 'Ressources', desc: 'Partager des PDF et références utiles.', icon: 'library' }
    ];
  }, [isAdminRole]);
  const activeLandingBooks = useMemo(
    () => LANDING_BOOKS_BY_SUBJECT[activeLandingSubject] || [],
    [activeLandingSubject]
  );
  const activeLandingSubjectMeta = useMemo(
    () => LANDING_SUBJECTS.find((subject) => subject.id === activeLandingSubject) || LANDING_SUBJECTS[0],
    [activeLandingSubject]
  );
  const currentHeroSlide = LANDING_HERO_SLIDES[activeHeroSlide] || LANDING_HERO_SLIDES[0];

  useEffect(() => {
    if (isAuthed || LANDING_HERO_SLIDES.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % LANDING_HERO_SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isAuthed]);

  useEffect(() => {
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
      apiClient('/results/progress', { token })
    ])
      .then(([communityData, progressData]) => {
        setCommunity(normalizeCommunityPayload(communityData));
        if (progressData?.overview) {
          setProgress(progressData);
        }
        setReady(true);
      })
      .catch((e) => {
        setError(e.message || 'Erreur de chargement des données de progression');
        setReady(true);
      });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || !isTeacherRole) return;
    let mounted = true;
    setTeacherProfileError('');
    apiClient('/teacher/profile', { token })
      .then((data) => {
        if (!mounted) return;
        setTeacherProfile(data?.profile || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setTeacherProfileError(e.message || 'Impossible de charger le profil tuteur.');
      });
    return () => {
      mounted = false;
    };
  }, [isTeacherRole]);

  useEffect(() => {
    const token = getToken();
    if (!token || !isPublisherRole) {
      setPublisherProfile(null);
      setPublisherError('');
      return;
    }
    let mounted = true;
    setPublisherError('');
    apiClient('/publishers/me', { token })
      .then((data) => {
        if (!mounted) return;
        setPublisherProfile(data?.publisher || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setPublisherError(e.message || 'Impossible de charger le profil partenaire.');
      });
    return () => {
      mounted = false;
    };
  }, [isPublisherRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search);
      const provider = String(query.get('provider') || '').trim().toLowerCase();
      const payment = String(query.get('payment') || '').trim().toLowerCase();
      if (provider === 'moncash' && payment === 'success') {
        setPlatformDonationFeedback('Merci. Ton don LinkEduPro a été confirmé.');
      } else if (provider === 'moncash' && payment === 'failed') {
        setPlatformDonationFeedback('Le paiement du don a échoué.');
      }
    }

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
    if (!isAuthed) {
      setLearningShowcaseSections(LEARNING_SHOWCASE_SECTIONS);
    }
  }, [isAuthed]);

  if (!ready) return <p>Chargement...</p>;

  if (!isAuthed) {
    return (
      <section className="landing-shell landing-glass-clean space-y-8">
        {platformDonationFeedback ? <p className="text-sm text-brand-700">{platformDonationFeedback}</p> : null}

        <section className="landing-hero content-grid card">
          <div className="landing-hero-copy glass">
            <p className="landing-kicker">LinkEduPro</p>
            <h1 className="landing-title">LinkEduPro, c&apos;est une plateforme éducative qui relie élèves, professeurs et écoles.</h1>
            <ul className="mt-5 space-y-2 text-base text-brand-900">
              <li>Un espace unique pour apprendre, pratiquer et publier des contenus académiques.</li>
              <li>Des quiz, exercices, rattrapages, challenges et outils de suivi des performances.</li>
              <li>Une communauté structurée pour préparer efficacement les examens en Haïti.</li>
            </ul>
          </div>
          <div className="landing-hero-art animate-float">
            <div className="landing-hero-slide-shell glass hologram-effect">
              <img
                src={currentHeroSlide.image}
                alt={currentHeroSlide.caption}
                className="landing-hero-slide-image"
              />
              <div className="landing-hero-slide-overlay">
                <p className="text-sm font-semibold text-white">{currentHeroSlide.caption}</p>
              </div>
            </div>
            <div className="landing-hero-dots" role="tablist" aria-label="Slides de présentation">
              {LANDING_HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.image}
                  type="button"
                  className={`landing-hero-dot ${idx === activeHeroSlide ? 'is-active' : ''}`}
                  onClick={() => setActiveHeroSlide(idx)}
                  aria-label={`Aller au slide ${idx + 1}`}
                  aria-selected={idx === activeHeroSlide}
                  role="tab"
                />
              ))}
            </div>
            <div className="landing-hero-actions">
              <Link href="/support" className="landing-hero-action-btn">
                Soutenir LinkEduPro
              </Link>
              <a href="/apk/linkedupro.apk" download className="landing-hero-action-btn">
                Télécharger l&apos;APK Android
              </a>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="how-title">
          <h2 id="how-title" className="public-landing-section-title text-4xl font-black text-brand-900">Ce que propose LinkEduPro</h2>
          <p className="public-landing-section-subtitle mt-3 max-w-3xl text-lg text-brand-700">
            Une plateforme éducative pour s&apos;entraîner, réviser avec méthode et collaborer avec les professeurs.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LANDING_STUDY_TOOLS.map((tool, idx) => (
              <article key={tool.title} className={`landing-tool-card landing-tool-${idx + 1}`}>
                <img
                  src={tool.iconImage}
                  alt={tool.title}
                  className="landing-tool-image"
                />
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="subjects-title">
          <h2 id="subjects-title" className="public-landing-section-title text-4xl font-black text-brand-900">Parcourir par sujet</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {LANDING_SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => setActiveLandingSubject(subject.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                  activeLandingSubject === subject.id
                    ? 'bg-brand-500 text-white'
                    : 'border border-brand-100 bg-white text-brand-700'
                }`}
              >
                <img src={subject.iconImage} alt={subject.label} className="h-5 w-5 rounded-full object-cover" />
                {subject.label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {activeLandingBooks.map((book) => (
              <article key={book.title} className="palette-card rounded-xl border border-brand-100 bg-white/90 p-4 backdrop-blur-sm dark:bg-slate-900/70">
                <div className="mb-2 flex items-center gap-2">
                  <img
                    src={activeLandingSubjectMeta.iconImage}
                    alt={activeLandingSubjectMeta.label}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{activeLandingSubjectMeta.label}</p>
                </div>
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

        {learningShowcaseSections.map((section) => (
          <LearningShowcaseSection key={`public-${section.id}`} section={section} />
        ))}

        <VerifiedTestimonials />
      </section>
    );
  }

  if (isPublisherRole) {
    const publisherName = publisherProfile?.name || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Partenaire';
    const publisherType = publisherProfile?.type || 'PARTENAIRE';
    const features = publisherProfile?.features || {};
    const featureState = (value) => {
      if (value === true) return 'enabled';
      if (value === false) return 'disabled';
      return 'unset';
    };
    const featureBadge = (state, label) => (
      <span className={`partner-chip partner-chip-${state}`}>{label}</span>
    );

    return (
      <section className="home-gold-shell authed-transparent-scope space-y-6">
        {platformDonationFeedback ? <p className="text-sm text-brand-700">{platformDonationFeedback}</p> : null}
        {publisherError ? <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{publisherError}</p> : null}

        <div className="partner-dash-shell">
          <aside className="partner-dash-sidebar">
            <div className="partner-dash-brand">
              <div className="partner-avatar">{getUserInitials(student)}</div>
              <div>
                <p className="partner-brand-title">Espace Partenaire</p>
                <p className="partner-brand-subtitle">{publisherName}</p>
              </div>
            </div>
            <div className="partner-dash-menu">
              <button className="partner-menu-item is-active" type="button">Tableau de bord</button>
              <button className="partner-menu-item" type="button" onClick={() => router.push('/publisher/books')}>
                Mes livres
              </button>
              <button className="partner-menu-item" type="button" onClick={() => router.push('/video-lessons')}>
                Mes formations
              </button>
              <button className="partner-menu-item" type="button" onClick={() => router.push('/messages')}>
                Mes annonces
              </button>
              <button className="partner-menu-item" type="button" onClick={() => router.push('/rattrapage')}>
                Mes rendez-vous
              </button>
              {features.canViewSalesDashboard ? (
                <button className="partner-menu-item" type="button" onClick={() => router.push('/publisher/sales')}>
                  Statistiques de ventes
                </button>
              ) : null}
            </div>
            <div className="partner-dash-meta">
              <p className="partner-meta-label">Type partenaire</p>
              <p className="partner-meta-value">{publisherType}</p>
              <p className="partner-meta-label">Email</p>
              <p className="partner-meta-value">{student?.email || '—'}</p>
            </div>
          </aside>

          <div className="partner-dash-main">
            <div className="partner-hero">
              <div>
                <p className="partner-hero-kicker">Bienvenue dans votre cockpit</p>
                <h1 className="partner-hero-title">Gérez vos contenus certifiants et vos publications</h1>
                <p className="partner-hero-subtitle">
                  Activez vos modules, suivez les performances et planifiez vos conférences live.
                </p>
              </div>
              <div className="partner-hero-actions">
                <button className="btn-primary" type="button" onClick={() => router.push('/video-lessons')}>
                  Publier une formation
                </button>
                <button className="btn-secondary" type="button" onClick={() => router.push('/publisher/books')}>
                  Publier un livre
                </button>
              </div>
            </div>

            <div className="partner-kpi-grid">
              <article className="partner-kpi-card">
                <div>
                  <p className="partner-kpi-label">Mes livres</p>
                  <p className="partner-kpi-value">—</p>
                  <p className="partner-kpi-meta">Catalogue & ventes</p>
                </div>
                {featureBadge(featureState(features.canPublishBooks), 'Livres')}
              </article>
              <article className="partner-kpi-card">
                <div>
                  <p className="partner-kpi-label">Mes formations</p>
                  <p className="partner-kpi-value">—</p>
                  <p className="partner-kpi-meta">Cours certifiants</p>
                </div>
                {featureBadge(featureState(features.canPublishCertifiedContent), 'Formations')}
              </article>
              <article className="partner-kpi-card">
                <div>
                  <p className="partner-kpi-label">Mes annonces</p>
                  <p className="partner-kpi-value">—</p>
                  <p className="partner-kpi-meta">Actualités partenaires</p>
                </div>
                {featureBadge(featureState(features.canPublishAnnouncements), 'Annonces')}
              </article>
              <article className="partner-kpi-card">
                <div>
                  <p className="partner-kpi-label">Rendez-vous live</p>
                  <p className="partner-kpi-value">—</p>
                  <p className="partner-kpi-meta">Webinaires & conférences</p>
                </div>
                {featureBadge(featureState(features.canHostLiveEvents), 'Live')}
              </article>
            </div>

            <div className="partner-grid-2">
              <section className="partner-panel">
                <div className="partner-panel-head">
                  <h3>Fonctionnalités activées</h3>
                  <span className="partner-panel-chip">Paramétrées par le super admin</span>
                </div>
                <div className="partner-feature-list">
                  <div className="partner-feature-row">
                    <p>Publication de livres</p>
                    {featureBadge(featureState(features.canPublishBooks), 'Livres')}
                  </div>
                  <div className="partner-feature-row">
                    <p>Formations certifiantes</p>
                    {featureBadge(featureState(features.canPublishCertifiedContent), 'Formations')}
                  </div>
                  <div className="partner-feature-row">
                    <p>Annonces globales</p>
                    {featureBadge(featureState(features.canPublishAnnouncements), 'Annonces')}
                  </div>
                  <div className="partner-feature-row">
                    <p>Rendez-vous en direct</p>
                    {featureBadge(featureState(features.canHostLiveEvents), 'Live')}
                  </div>
                  <div className="partner-feature-row">
                    <p>Dashboard des ventes</p>
                    {featureBadge(featureState(features.canViewSalesDashboard), 'Ventes')}
                  </div>
                </div>
              </section>

              <section className="partner-panel">
                <div className="partner-panel-head">
                  <h3>Actions rapides</h3>
                  <span className="partner-panel-chip">Boostez votre visibilité</span>
                </div>
                <div className="partner-action-list">
                  <button className="partner-action" type="button" onClick={() => router.push('/publisher/books')}>
                    Publier un livre
                  </button>
                  <button className="partner-action" type="button" onClick={() => router.push('/video-lessons')}>
                    Créer une formation certifiante
                  </button>
                  <button className="partner-action" type="button" onClick={() => router.push('/messages')}>
                    Publier une annonce globale
                  </button>
                  <button className="partner-action" type="button" onClick={() => router.push('/rattrapage')}>
                    Programmer un rendez-vous live
                  </button>
                  {features.canViewSalesDashboard ? (
                    <button className="partner-action" type="button" onClick={() => router.push('/publisher/sales')}>
                      Ouvrir dashboard des ventes
                    </button>
                  ) : null}
                </div>
                <div className="partner-panel-foot">
                  <p className="partner-panel-note">
                    Certains modules peuvent être désactivés selon votre profil (auteur, institution, entreprise, organisation).
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-gold-shell authed-transparent-scope space-y-6">
      {platformDonationFeedback ? <p className="text-sm text-brand-700">{platformDonationFeedback}</p> : null}

      {isAdminRole ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="card lift-card palette-card palette-1">
              <div className="text-brand-700" aria-label="Utilisateurs en ligne" title="Utilisateurs en ligne">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M3.5 18.5a5.5 5.5 0 0 1 11 0" />
                  <circle cx="17.5" cy="9" r="2.5" />
                  <path d="M14.5 18.5a4.5 4.5 0 0 1 7 0" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.total}</p>
              <p className="mt-1 text-xs text-brand-700">Dernière activité: {formatLastSeen(onlineStats.latestSeenAt)}</p>
            </article>
            <article className="card lift-card palette-card palette-2">
              <div className="text-brand-700" aria-label="Élèves" title="Élèves">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M3 9 12 4l9 5-9 5-9-5Z" />
                  <path d="M6 11.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.5" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.students}</p>
              <p className="mt-1 text-xs text-brand-700">{formatLastSeen(onlineStats.lastSeenByRole?.students)}</p>
            </article>
            <article className="card lift-card palette-card palette-3">
              <div className="text-brand-700" aria-label="Professeurs" title="Professeurs">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3.5" y="5.5" width="13" height="10" rx="1.5" />
                  <path d="M16.5 8.5h4v8h-4M7 19.5h6" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-black text-brand-900">{onlineStats.counts.teachers}</p>
              <p className="mt-1 text-xs text-brand-700">{formatLastSeen(onlineStats.lastSeenByRole?.teachers)}</p>
            </article>
            <article className="card lift-card palette-card palette-4">
              <div className="text-brand-700" aria-label="Admins" title="Admins">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 3.5 5 6.5v5c0 4.2 2.7 7.4 7 9 4.3-1.6 7-4.8 7-9v-5l-7-3Z" />
                  <path d="m9.5 12 1.7 1.7L14.8 10" />
                </svg>
              </div>
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
        </>
      ) : null}

      {isStudentRole ? (
        <StudentDashboard
          student={student}
          progress={progress}
          dailyObjective={dailyObjective}
          trackLabel={studentTrackLabel}
          overallPercent={quizProgressPercent}
          community={community}
        />
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
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="nsiv" />
                </span>
                Espace NSIV
              </p>
              <p className="mt-1 text-sm text-brand-700">Tableau complet des rubriques et progression.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 lift-card palette-card palette-2">
              <p className="flex items-center gap-2 font-semibold text-brand-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                  <SectionIcon name="target" />
                </span>
                Exercices probables
              </p>
              <p className="mt-1 text-sm text-brand-700">Sujets récurrents du Bac NSIV.</p>
            </Link>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-red-600">{error}</p> : null}

      {isStudentRole ? null : (
        <article className="card motion-enter motion-delay-3 lift-card home-gold-soft">
          <h2 className="home-gold-title mb-3 text-xl font-semibold text-brand-900">Centre de gestion</h2>
          {isTeacherRole ? (
            <div className="mb-4 rounded-2xl border border-brand-100 bg-white/80 p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-brand-900">Profil tuteur</h3>
              <p className="mt-1 text-sm text-brand-700">
                {teacherProfile?.isProfileComplete
                  ? 'Ton profil tuteur est complet et visible.'
                  : 'Complète ton profil tuteur pour apparaître dans la liste.'}
              </p>
              {teacherProfileError ? <p className="mt-1 text-sm text-red-600">{teacherProfileError}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  teacherProfile?.isProfileComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {teacherProfile?.isProfileComplete ? 'Profil validé' : 'Profil à compléter'}
                </span>
                <button type="button" className="btn-primary" onClick={openTutorProfile}>
                  Mettre à jour
                </button>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {managerQuickActions.map((action, idx) => (
              <Link key={action.href} href={action.href} className={`rounded-xl border border-brand-100 p-4 lift-card palette-card palette-${(idx % 4) + 1}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                    <SectionIcon name={action.icon || 'collection'} />
                  </span>
                  {action.title}
                </p>
                <p className="mt-1 text-sm text-brand-700">{action.desc}</p>
              </Link>
            ))}
          </div>
        </article>
      )}

      <VerifiedTestimonials />
    </section>
  );
}
