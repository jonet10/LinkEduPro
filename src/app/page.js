"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent, isNsivStudent, normalizeAcademicLevel } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';
import VerifiedTestimonials from '@/components/VerifiedTestimonials';
import SectionIcon from '@/components/ui/SectionIcon';

const CALENDAR_NOTICE_KEY = 'linkedupro_calendar_notice_2025_2026_seen';
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
const LANDING_HERO_VISUAL = {
  image: '/slides/HTC.jpg',
  caption: 'Outils modernes pour réussir les examens'
};
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
      { title: 'Rattrapage Physique (mécanique)', author: 'Professeurs vérifiés', rating: '4,8', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/images/tool-rattrapage-live.png' },
      { title: 'Rattrapage Maths (algèbre)', author: 'Professeurs vérifiés', rating: '4,7', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/slides/H.jpeg' },
      { title: 'Rattrapage Chimie (stoéchiométrie)', author: 'Professeurs vérifiés', rating: '4,6', price: 'À partir de 120 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/slides/HC.jpg' },
      { title: 'Rattrapage Philosophie', author: 'Professeurs vérifiés', rating: '4,6', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/slides/HTC.jpg' },
      { title: 'Rattrapage Histoire-Géo', author: 'Professeurs vérifiés', rating: '4,5', price: 'À partir de 100 HTG', oldPrice: '', badge: 'Live', href: '/rattrapage', image: '/slides/HL.jpg' }
    ]
  },
  {
    id: 'video-pop',
    title: 'Vidéos classe numérique',
    subtitle: 'Leçons vidéo recommandées',
    items: [
      { title: 'Physique: mouvement rectiligne', author: 'Classe numérique', rating: '4,8', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/tool-rubriques-nsiv.png' },
      { title: 'Maths: fonctions et dérivées', author: 'Classe numérique', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/images/tool-communaute-scolaire.png' },
      { title: 'Chimie: réactions et bilans', author: 'Classe numérique', rating: '4,6', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/slides/H.jpeg' },
      { title: 'Philo: méthode dissertation', author: 'Classe numérique', rating: '4,7', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/slides/HC.jpg' },
      { title: 'Hist-Géo: cartes et repères', author: 'Classe numérique', rating: '4,5', price: 'Gratuit', oldPrice: '', badge: 'Vidéo', href: '/video-lessons', image: '/slides/HL.jpg' }
    ]
  }
];

function normalizeLevelValue(rawLevel) {
  const value = String(rawLevel || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (!value) return '';
  if (value === '9E' || value === 'LEVEL_9E') return '9E';
  if (value === 'NS1' || value === 'NSI') return 'NSI';
  if (value === 'NS2' || value === 'NSII') return 'NSII';
  if (value === 'NS3' || value === 'NSIII') return 'NSIII';
  if (value === 'TERMINALE' || value === 'NSIV') return 'NSIV';
  if (value === 'UNIVERSITAIRE' || value === 'UNIVERSITE') return 'UNIVERSITAIRE';
  return value;
}

function detectLevelFromText(rawText) {
  const text = String(rawText || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (!text) return '';
  if (/\b(9E|9EME|9E AF|LEVEL_9E)\b/.test(text)) return '9E';
  if (/\b(NSI|NS1)\b/.test(text)) return 'NSI';
  if (/\b(NSII|NS2)\b/.test(text)) return 'NSII';
  if (/\b(NSIII|NS3)\b/.test(text)) return 'NSIII';
  if (/\b(NSIV|TERMINALE)\b/.test(text)) return 'NSIV';
  if (/\b(UNIVERSITAIRE|UNIVERSITE)\b/.test(text)) return 'UNIVERSITAIRE';
  return '';
}

function isShowcaseItemVisibleForLevel(itemLevel, viewerLevel, title = '') {
  if (!viewerLevel) return true;
  const normalizedItemLevel = normalizeLevelValue(itemLevel);
  if (normalizedItemLevel) return normalizedItemLevel === viewerLevel;
  const levelInTitle = detectLevelFromText(title);
  if (levelInTitle) return levelInTitle === viewerLevel;
  return true;
}

function toShowcaseImage(title, fallback = '/slides/H.jpeg') {
  const normalized = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized.includes('svt') || normalized.includes('biologie') || normalized.includes('geologie')) return '/images/subject-physique.png';
  if (normalized.includes('physique')) return '/images/subject-physique.png';
  if (normalized.includes('math')) return '/images/subject-mathematiques.png';
  if (normalized.includes('informatique')) return '/images/subject-mathematiques.png';
  if (normalized.includes('chimie')) return '/images/subject-chimie.png';
  if (normalized.includes('histoire') || normalized.includes('geo')) return '/images/subject-histoire-geo.png';
  if (normalized.includes('econom') || normalized.includes('civique') || normalized.includes('citoyennete')) return '/images/subject-histoire-geo.png';
  if (normalized.includes('philo')) return '/images/subject-philosophie.png';
  if (normalized.includes('anglais') || normalized.includes('espagnol') || normalized.includes('creole') || normalized.includes('grammaire')) return '/images/subject-francais.png';
  if (normalized.includes('francais') || normalized.includes('français')) return '/images/subject-francais.png';
  if (normalized.includes('rattrapage') || normalized.includes('live')) return '/images/tool-rattrapage-live.png';
  if (normalized.includes('video')) return '/images/tool-communaute-scolaire.png';
  return fallback;
}

function parseVideoContentBody(rawBody) {
  if (typeof rawBody !== 'string') {
    return { description: '', videoUrl: '', isPaid: false, price: 0 };
  }
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object') {
      return {
        description: String(parsed.description || ''),
        videoUrl: String(parsed.videoUrl || ''),
        isPaid: Boolean(parsed.isPaid),
        price: Number(parsed.price || 0)
      };
    }
  } catch (_) {
    // Legacy plain text body fallback.
  }
  return { description: String(rawBody || ''), videoUrl: '', isPaid: false, price: 0 };
}

function formatPriceTag(amount) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Gratuit';
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(numeric))} HTG`;
}
const DEFAULT_HOME_CHALLENGE = {
  title: 'Vote de la semaine',
  subtitle: 'Choisis la personne qui doit rester en tête cette semaine.',
  theme: 'TIKTOKERS',
  weekKey: '',
  totalVotes: 0,
  myVote: null,
  recentComments: [],
  items: [
    { title: 'Maths en 60 secondes', handle: '@mathsfacile.ht', category: 'Mathématiques', search: 'maths bac haiti', votes: 0 },
    { title: 'Chimie visuelle', handle: '@chimie.simple', category: 'Chimie', search: 'chimie exercices', votes: 0 },
    { title: 'Histoire-Géo active', handle: '@histgeo.smart', category: 'Histoire-Géo', search: 'histoire geographie revision', votes: 0 },
    { title: 'Philo en pratique', handle: '@philo.express', category: 'Philosophie', search: 'philosophie terminale', votes: 0 }
  ]
};

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

function getWeekCountdownLabel(now = new Date()) {
  const current = new Date(now);
  const day = current.getDay(); // 0 Sunday ... 6 Saturday
  const diffToSunday = day === 0 ? 0 : (7 - day);
  const end = new Date(current);
  end.setDate(current.getDate() + diffToSunday);
  end.setHours(23, 59, 59, 999);

  const ms = Math.max(0, end.getTime() - current.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}j ${hours}h ${minutes}m`;
}

function getParticipantInitials(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'P';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
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

function LearningShowcaseSection({ section }) {
  const isSubjectIconImage = (src) => /^\/images\/subject-/.test(String(src || ''));

  return (
    <section className="card">
      <h2 className="text-3xl font-black text-brand-900">{section.title}</h2>
      <p className="mt-2 text-sm text-brand-700">{section.subtitle}</p>
      {Array.isArray(section.items) && section.items.length === 0 ? (
        <p className="mt-4 text-sm text-brand-700">Aucun contenu disponible pour ton niveau pour le moment.</p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {section.items.map((item) => (
          <article key={`${section.id}-${item.title}`} className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
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
    </section>
  );
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
  const [homeChallenge, setHomeChallenge] = useState(DEFAULT_HOME_CHALLENGE);
  const [selectedChallengeHandle, setSelectedChallengeHandle] = useState('');
  const [challengeComment, setChallengeComment] = useState('');
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [challengeDeleting, setChallengeDeleting] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState('');
  const [weekCountdown, setWeekCountdown] = useState(getWeekCountdownLabel());
  const [error, setError] = useState('');
  const [welcomePopup, setWelcomePopup] = useState(null);
  const [showCalendarNotice, setShowCalendarNotice] = useState(false);
  const [activeLandingSubject, setActiveLandingSubject] = useState(LANDING_SUBJECTS[0].id);
  const [learningShowcaseSections, setLearningShowcaseSections] = useState(LEARNING_SHOWCASE_SECTIONS);

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
  const normalizedViewerLevel = useMemo(
    () => normalizeLevelValue(normalizeAcademicLevel(student) || student?.level),
    [student]
  );

  const challengeLeaderHandle = useMemo(
    () => (Array.isArray(homeChallenge.items) && homeChallenge.items.length ? homeChallenge.items[0].handle : ''),
    [homeChallenge.items]
  );
  const selectedChallengeItem = useMemo(
    () => (homeChallenge.items || []).find((item) => item.handle === selectedChallengeHandle) || null,
    [homeChallenge.items, selectedChallengeHandle]
  );

  const managerQuickActions = useMemo(() => {
    if (isAdminRole) {
      return [
        { href: '/admin/super-dashboard', title: 'Supervision globale', desc: 'Suivre les Élèves, Écoles et activités.', icon: 'chart' },
        { href: '/school-management/dashboard', title: 'Gestion scolaire', desc: 'Piloter classes, Élèves et paiements.', icon: 'school' },
        { href: '/messages', title: 'Communication', desc: 'Publier annonces et Gérer les messages.', icon: 'message' },
        { href: '/blog', title: 'Contenus communauté', desc: 'Valider et organiser les publications.', icon: 'collection' }
      ];
    }

    return [
      { href: '/blog', title: 'Publications pédagogiques', desc: 'Poster supports, conseils et ressources.', icon: 'write' },
      { href: '/rattrapage', title: 'Sessions rattrapage', desc: 'Programmer et suivre les sessions live.', icon: 'video' },
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
    const timer = window.setInterval(() => {
      setWeekCountdown(getWeekCountdownLabel());
    }, 60000);
    setWeekCountdown(getWeekCountdownLabel());
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    apiClient('/public/home/challenge', { token: getToken() || undefined })
      .then((data) => {
        if (isMounted && Array.isArray(data?.items) && data.items.length > 0) {
          const merged = {
            ...DEFAULT_HOME_CHALLENGE,
            ...data,
            items: data.items
          };
          setHomeChallenge(merged);
          if (data?.myVote?.candidateHandle) {
            setSelectedChallengeHandle(data.myVote.candidateHandle);
            setChallengeComment(data?.myVote?.comment || '');
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isAuthed]);

  useEffect(() => {
    let cancelled = false;

    async function loadLearningShowcaseSections() {
      if (!isAuthed) {
        if (!cancelled) setLearningShowcaseSections(LEARNING_SHOWCASE_SECTIONS);
        return;
      }

      const token = getToken();
      if (!token) {
        if (!cancelled) setLearningShowcaseSections(LEARNING_SHOWCASE_SECTIONS);
        return;
      }

      try {
        const currentRole = String(student?.role || '').toUpperCase();
        const subjectsPromise = apiClient('/subjects', { token }).catch(() => []);
        const catchupPromise = apiClient('/catchup?page=1&pageSize=12', { token }).catch(() => ({ sessions: [] }));
        const videosPromise = currentRole === 'STUDENT'
          ? apiClient('/v2/contents/my-level', { token }).catch(() => ({ contents: [] }))
          : apiClient('/v2/contents/mine', { token }).catch(() => ({ contents: [] }));

        const [subjectsData, catchupData, videosData] = await Promise.all([
          subjectsPromise,
          catchupPromise,
          videosPromise
        ]);

        const quizzes = Array.isArray(subjectsData) ? subjectsData : [];
        const sessions = Array.isArray(catchupData?.sessions) ? catchupData.sessions : [];
        const videos = Array.isArray(videosData?.contents) ? videosData.contents : [];

        const quizItems = quizzes
          .slice()
          .sort((a, b) => Number(b?.questionCount || 0) - Number(a?.questionCount || 0))
          .slice(0, 8)
          .map((item) => ({
            title: item?.name ? `Quiz ${item.name}` : 'Quiz',
            author: `${Number(item?.questionCount || 0)} questions`,
            rating: `${Number(item?.questionCount || 0)} Q`,
            price: 'Gratuit',
            oldPrice: '',
            badge: 'Quiz',
            href: `/quiz/${item?.id}`,
            image: toShowcaseImage(item?.name, '/images/tool-quiz-bac.png')
          }))
          .filter((item) => isShowcaseItemVisibleForLevel('', normalizedViewerLevel, item.title));

        const catchupItems = sessions
          .slice()
          .sort((a, b) => Number(b?.enrolledCount || 0) - Number(a?.enrolledCount || 0))
          .slice(0, 8)
          .map((session) => ({
            title: session?.title || 'Session de rattrapage',
            author: session?.createdBy
              ? `${session.createdBy.firstName || ''} ${session.createdBy.lastName || ''}`.trim()
              : (session?.subject || 'Professeur vérifié'),
            rating: `${Number(session?.enrolledCount || 0)} inscrits`,
            price: session?.isFree ? 'Gratuit' : `À partir de ${formatPriceTag(session?.price)}`,
            oldPrice: '',
            badge: 'Live',
            href: `/rattrapage?session=${encodeURIComponent(session?.id)}`,
            image: toShowcaseImage(`${session?.subject || ''} ${session?.title || ''}`, '/images/tool-rattrapage-live.png'),
            level: session?.level
          }))
          .filter((item) => isShowcaseItemVisibleForLevel(item.level, normalizedViewerLevel, item.title))
          .map(({ level, ...rest }) => rest);

        const videoItems = videos
          .filter((entry) => String(entry?.type || '').toLowerCase() === 'video')
          .filter((entry) => String(entry?.status || '').toUpperCase() === 'APPROVED')
          .slice(0, 12)
          .map((entry) => {
            const body = parseVideoContentBody(entry?.body);
            const title = String(entry?.title || 'Vidéo éducative');
            const level = entry?.level;
            return {
              title,
              author: body.description ? body.description.slice(0, 48) : 'Classe numérique',
              rating: 'Vidéo',
              price: body.isPaid ? formatPriceTag(body.price) : 'Gratuit',
              oldPrice: '',
              badge: 'Vidéo',
              href: '/video-lessons',
              image: toShowcaseImage(title, '/images/tool-communaute-scolaire.png'),
              level
            };
          })
          .filter((item) => isShowcaseItemVisibleForLevel(item.level, normalizedViewerLevel, item.title))
          .map(({ level, ...rest }) => rest)
          .slice(0, 8);

        const nextSections = [
          {
            id: 'quiz-pop',
            title: 'Quiz les plus populaires',
            subtitle: 'Basés sur les rubriques déjà publiées',
            items: quizItems
          },
          {
            id: 'catchup-pop',
            title: 'Rattrapages en vedette',
            subtitle: 'Basés sur les sessions existantes',
            items: catchupItems
          },
          {
            id: 'video-pop',
            title: 'Vidéos classe numérique',
            subtitle: 'Basées sur les contenus validés',
            items: videoItems
          }
        ];

        if (!cancelled) {
          setLearningShowcaseSections(nextSections);
        }
      } catch (_) {
        if (!cancelled) {
          setLearningShowcaseSections(LEARNING_SHOWCASE_SECTIONS);
        }
      }
    }

    loadLearningShowcaseSections();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, student, normalizedViewerLevel]);

  async function submitChallengeVote() {
    const token = getToken();
    if (!token) {
      setChallengeFeedback('Connecte-toi pour participer au challenge.');
      return;
    }
    if (!selectedChallengeHandle) {
      setChallengeFeedback('Choisis une personne avant de voter.');
      return;
    }

    try {
      setChallengeSubmitting(true);
      setChallengeFeedback('');
      await apiClient('/public/home/challenge/vote', {
        method: 'POST',
        token,
        body: JSON.stringify({
          handle: selectedChallengeHandle,
          comment: challengeComment
        })
      });

      const refreshed = await apiClient('/public/home/challenge', { token });
      setHomeChallenge({
        ...DEFAULT_HOME_CHALLENGE,
        ...refreshed,
        items: Array.isArray(refreshed?.items) ? refreshed.items : DEFAULT_HOME_CHALLENGE.items
      });
      setChallengeFeedback('Vote enregistré avec succès.');
    } catch (e) {
      setChallengeFeedback(e.message || 'Impossible d’enregistrer le vote.');
    } finally {
      setChallengeSubmitting(false);
    }
  }

  async function updateChallengeVote() {
    const token = getToken();
    if (!token) {
      setChallengeFeedback('Connecte-toi pour modifier ton vote.');
      return;
    }
    if (!selectedChallengeHandle) {
      setChallengeFeedback('Choisis une personne avant de modifier.');
      return;
    }

    try {
      setChallengeSubmitting(true);
      setChallengeFeedback('');
      await apiClient('/public/home/challenge/vote', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          handle: selectedChallengeHandle,
          comment: challengeComment
        })
      });

      const refreshed = await apiClient('/public/home/challenge', { token });
      setHomeChallenge({
        ...DEFAULT_HOME_CHALLENGE,
        ...refreshed,
        items: Array.isArray(refreshed?.items) ? refreshed.items : DEFAULT_HOME_CHALLENGE.items
      });
      setChallengeFeedback('Vote modifié avec succès.');
    } catch (e) {
      setChallengeFeedback(e.message || 'Impossible de modifier le vote.');
    } finally {
      setChallengeSubmitting(false);
    }
  }

  async function deleteChallengeVote() {
    const token = getToken();
    if (!token) {
      setChallengeFeedback('Connecte-toi pour supprimer ton vote.');
      return;
    }

    try {
      setChallengeDeleting(true);
      setChallengeFeedback('');
      await apiClient('/public/home/challenge/vote', {
        method: 'DELETE',
        token
      });

      const refreshed = await apiClient('/public/home/challenge', { token });
      setHomeChallenge({
        ...DEFAULT_HOME_CHALLENGE,
        ...refreshed,
        items: Array.isArray(refreshed?.items) ? refreshed.items : DEFAULT_HOME_CHALLENGE.items
      });
      setSelectedChallengeHandle('');
      setChallengeComment('');
      setChallengeFeedback('Vote supprimé. Tu peux voter à nouveau.');
    } catch (e) {
      setChallengeFeedback(e.message || 'Impossible de supprimer le vote.');
    } finally {
      setChallengeDeleting(false);
    }
  }

  async function shareChallengeChoice() {
    if (!selectedChallengeHandle) {
      setChallengeFeedback('Choisis d’abord une personne à partager.');
      return;
    }

    const candidate = selectedChallengeItem;
    const candidateLabel = candidate?.title || selectedChallengeHandle;
    const text = `Je soutiens ${candidateLabel} (${selectedChallengeHandle}) sur LinkEduPro !`;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mon choix de la semaine - LinkEduPro',
          text,
          url
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`.trim());
      }
      setChallengeFeedback('Ton choix est prêt à être partagé.');
    } catch (_) {
      setChallengeFeedback('Impossible de partager pour le moment.');
    }
  }

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
      <section className="landing-shell landing-glass-clean space-y-8">
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

        <section className="landing-hero content-grid card">
          <div className="landing-hero-topline" aria-hidden="true" />
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
                src={LANDING_HERO_VISUAL.image}
                alt={LANDING_HERO_VISUAL.caption}
                className="landing-hero-slide-image"
              />
              <div className="landing-hero-slide-overlay">
                <p className="text-sm font-semibold text-white">{LANDING_HERO_VISUAL.caption}</p>
              </div>
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
          <h2 id="how-title" className="text-4xl font-black text-brand-900">Ce que propose LinkEduPro</h2>
          <p className="mt-3 max-w-3xl text-lg text-brand-700">
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
          <h2 id="subjects-title" className="text-4xl font-black text-brand-900">Parcourir par sujet</h2>
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
              <article key={book.title} className="palette-card rounded-xl border border-brand-100 p-4">
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

        <section className="card" aria-labelledby="tiktok-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="tiktok-title" className="text-2xl font-black text-brand-900">{homeChallenge.title}</h2>
              <p className="mt-1 text-sm text-brand-700">{homeChallenge.subtitle}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {homeChallenge.totalVotes} vote(s)
            </span>
          </div>
          <p className="mt-2 text-xs text-brand-700">
            Semaine: {homeChallenge.weekKey || '-'}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {homeChallenge.items.map((item, idx) => (
              <a
                key={item.handle}
                href={`https://www.tiktok.com/search?q=${encodeURIComponent(item.search)}`}
                target="_blank"
                rel="noreferrer"
                className={`palette-card palette-${(idx % 4) + 1} rounded-xl border border-brand-100 p-4`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {resolveMediaUrl(item.photoUrl) ? (
                    <img
                      src={resolveMediaUrl(item.photoUrl)}
                      alt={item.title}
                      className="h-10 w-10 rounded-full border border-brand-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-100 bg-white/80 text-xs font-bold text-brand-900">
                      {getParticipantInitials(item.title)}
                    </div>
                  )}
                  {item.handle === challengeLeaderHandle ? (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">⭐ En tête</span>
                  ) : null}
                </div>
                <p className="text-base font-semibold text-brand-900">{item.title}</p>
                <p className="mt-1 text-sm text-brand-700">{item.handle} · {item.category}</p>
                <p className="mt-2 text-xs font-semibold text-brand-500">Votes: {item.votes || 0}</p>
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-700">Connecte-toi pour voter et laisser ton commentaire.</p>
        </section>

        <VerifiedTestimonials />
      </section>
    );
  }

  return (
    <section className="home-gold-shell authed-transparent-scope space-y-6">
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

      {learningShowcaseSections.map((section) => (
        <LearningShowcaseSection key={`authed-${section.id}`} section={section} />
      ))}

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

      {isStudentRole ? (
        <div className="grid gap-4 lg:grid-cols-3 motion-enter motion-delay-3">
          <article className="card lg:col-span-2 lift-card">
            <h2 className="mb-3 text-xl font-semibold text-brand-900">Plan rapide du jour</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/subjects" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                    <SectionIcon name="compass" />
                  </span>
                  Rubriques du jour
                </p>
                <p className="mt-1 text-sm text-brand-700">Révision ciblée par matière.</p>
              </Link>
              <Link href="/probable-exercises" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                    <SectionIcon name="target" />
                  </span>
                  Exercices probables
                </p>
                <p className="mt-1 text-sm text-brand-700">Sujets les plus fréquents à l&apos;examen.</p>
              </Link>
              <Link href="/video-lessons" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                    <SectionIcon name="video" />
                  </span>
                  Classe Numerique
                </p>
                <p className="mt-1 text-sm text-brand-700">Leçons et exercices vidéo gratuits ou payants.</p>
              </Link>
              <Link href="/library" className="rounded-xl border border-brand-100 p-4 lift-card palette-card palette-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d9d3] text-[#2f5eea] ring-1 ring-[#d8c6bf]/70 shadow-sm">
                    <SectionIcon name="library" />
                  </span>
                  Bibliothèque
                </p>
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
            <h2 className="home-gold-title text-xl font-semibold text-brand-900">{homeChallenge.title}</h2>
            <p className="mt-1 text-sm text-brand-700">{homeChallenge.subtitle}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {homeChallenge.totalVotes} vote(s)
          </span>
        </div>
        <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-brand-800">
          <p className="font-semibold">Challenge de la semaine {homeChallenge.weekKey || '-'}</p>
          <p className="mt-1">Fin de ce cycle dans: {weekCountdown}. Un nouveau vote est disponible chaque semaine.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {homeChallenge.items.map((item, idx) => (
            <button
              key={item.handle}
              type="button"
              onClick={() => setSelectedChallengeHandle(item.handle)}
              className={`rounded-xl border border-brand-100 p-4 palette-card palette-${(idx % 4) + 1}`}
            >
              <div className="mb-2 flex items-center gap-2">
                {resolveMediaUrl(item.photoUrl) ? (
                  <img
                    src={resolveMediaUrl(item.photoUrl)}
                    alt={item.title}
                    className="h-10 w-10 rounded-full border border-brand-100 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-100 bg-white/80 text-xs font-bold text-brand-900">
                    {getParticipantInitials(item.title)}
                  </div>
                )}
                {item.handle === challengeLeaderHandle ? (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">⭐ En tête</span>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-brand-900">{item.title}</p>
              <p className="mt-1 text-xs text-brand-700">{item.handle}</p>
              <p className="mt-2 text-xs font-semibold text-brand-500">{item.category}</p>
              <p className="mt-1 text-xs text-brand-700">Votes: {item.votes || 0}</p>
              {selectedChallengeHandle === item.handle ? (
                <p className="mt-1 text-xs font-semibold text-emerald-700">🏅 Je me reconnais ici</p>
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            className="input min-h-[92px]"
            placeholder="Laisse un commentaire (optionnel)"
            value={challengeComment}
            onChange={(e) => setChallengeComment(e.target.value)}
            maxLength={500}
          />
          {homeChallenge.myVote ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={shareChallengeChoice}
                disabled={challengeSubmitting || challengeDeleting || !selectedChallengeHandle}
              >
                📢 Partager mon choix
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={updateChallengeVote}
                disabled={challengeSubmitting || challengeDeleting}
              >
                {challengeSubmitting ? 'Modification...' : 'Modifier mon vote'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={deleteChallengeVote}
                disabled={challengeSubmitting || challengeDeleting}
              >
                {challengeDeleting ? 'Suppression...' : 'Supprimer mon vote'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={shareChallengeChoice}
                disabled={challengeSubmitting || challengeDeleting || !selectedChallengeHandle}
              >
                📢 Partager mon choix
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitChallengeVote}
                disabled={challengeSubmitting || challengeDeleting}
              >
                {challengeSubmitting ? 'Envoi...' : 'Voter maintenant'}
              </button>
            </div>
          )}
        </div>
        {homeChallenge.myVote ? (
          <p className="mt-2 text-xs text-brand-700">
            Tu as voté pour {homeChallenge.myVote.candidateHandle} le {formatLastSeen(homeChallenge.myVote.createdAt)}.
          </p>
        ) : null}
        {challengeFeedback ? <p className="mt-2 text-xs text-brand-700">{challengeFeedback}</p> : null}
        {Array.isArray(homeChallenge.recentComments) && homeChallenge.recentComments.length > 0 ? (
          <div className="mt-4 rounded-lg border border-brand-100 p-3">
            <p className="text-sm font-semibold text-brand-900">Commentaires récents</p>
            <div className="mt-2 space-y-2">
              {homeChallenge.recentComments.map((row) => (
                <div key={row.id} className="rounded-md border border-brand-100 px-3 py-2 text-xs">
                  <p className="font-semibold text-brand-900">{row.author} • {row.candidateHandle}</p>
                  <p className="mt-1 text-brand-700">{row.comment}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <VerifiedTestimonials />
    </section>
  );
}
