"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent, isNsivStudent } from '@/lib/auth';
import HomeCarousel from '@/components/HomeCarousel';
import VerifiedTestimonials from '@/components/VerifiedTestimonials';

const CALENDAR_NOTICE_KEY = 'linkedupro_calendar_notice_2025_2026_seen';

function hasDepartmentAndCommune(schoolLabel) {
  if (!schoolLabel || typeof schoolLabel !== 'string') return false;
  const parts = schoolLabel.split('/').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 && Boolean(parts[0]) && Boolean(parts[1]);
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
      description: 'Révise 2 rubriques clés et termine avec un quiz d’évaluation rapide.',
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
  const [error, setError] = useState('');
  const [welcomePopup, setWelcomePopup] = useState(null);
  const [showCalendarNotice, setShowCalendarNotice] = useState(false);

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
      <section className="space-y-8">
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

        <HomeCarousel isAuthed={isAuthed} />

        <section className="card" aria-labelledby="cta-title">
          <h2 id="cta-title" className="text-2xl font-bold text-brand-900">Prêt à progresser dès aujourd'hui ?</h2>
          <p className="mt-2 text-sm text-brand-700">
            Lance un quiz, découvre les séries disponibles et commence ton entraînement.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">Commencer un Quiz</Link>
            <Link href="/subjects" className="btn-secondary">Explorer les Quiz</Link>
            <Link href="/register" className="btn-secondary">Créer un compte</Link>
          </div>
        </section>

        <section className="card" aria-labelledby="features-title">
          <h2 id="features-title" className="mb-4 text-2xl font-bold text-brand-900">Fonctionnalités principales</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Quiz interactifs</h3>
              <p className="mt-2 text-sm text-brand-700">Questions dynamiques, chronomètre et correction immédiate.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Statistiques</h3>
              <p className="mt-2 text-sm text-brand-700">Suivi des scores, moyenne par matière et progression.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Profils</h3>
              <p className="mt-2 text-sm text-brand-700">Profil élève avec niveau, école et historique des tentatives.</p>
            </article>
            <article className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-semibold text-brand-900">Opportunités</h3>
              <p className="mt-2 text-sm text-brand-700">Concours actifs, annonces académiques et recommandations ciblées.</p>
            </article>
          </div>
        </section>

        <VerifiedTestimonials />
      </section>
    );
  }

  return (
    <section className="space-y-6">
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

      <div className="card motion-enter lift-card">
        <p className="text-sm text-brand-700">Bienvenue</p>
        <h1 className="text-3xl font-black text-brand-900">
          {student ? `${student.firstName} ${student.lastName}` : 'Espace élève'}
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          Compare tes performances avec d'autres élèves et découvre les écoles les plus actives.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/subjects" className="btn-primary cta-pulse">Commencer un quiz</Link>
          <Link href="/progress" className="btn-secondary">Voir mes progrès</Link>
        </div>
      </div>

      <div className="card motion-enter motion-delay-1 lift-card border border-brand-200 bg-gradient-to-r from-brand-50 to-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Coaching intelligent</p>
        <h2 className="mt-1 text-xl font-bold text-brand-900">{dailyObjective.title}</h2>
        <p className="mt-2 text-sm text-brand-700">{dailyObjective.description}</p>
        <div className="mt-4">
          <Link href={dailyObjective.ctaHref} className="btn-primary cta-pulse">{dailyObjective.ctaLabel}</Link>
        </div>
      </div>

      {!hasDepartmentAndCommune(student?.school) ? (
        <div className="card motion-enter motion-delay-2 lift-card border border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Mise a jour de profil requise</p>
          <p className="mt-1 text-sm text-amber-900">
            Ton departement et ta commune sont manquants. Merci de mettre a jour ton profil pour continuer avec des contenus personnalises.
          </p>
          <div className="mt-3">
            <Link href="/profile?edit=1" className="btn-primary">Mettre a jour mon profil</Link>
          </div>
        </div>
      ) : null}

      {isNsivStudent(student) ? (
        <div className="card motion-enter motion-delay-2 lift-card">
          <h2 className="text-xl font-semibold text-brand-900">Rubriques NSIV</h2>
          <p className="mt-2 text-sm text-brand-700">Acces direct aux rubriques principales de Terminale.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/nsiv" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50 lift-card">
              <p className="font-semibold text-brand-900">Espace NSIV</p>
              <p className="mt-1 text-sm text-brand-700">Tableau complet des rubriques et progression.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-lg border border-brand-100 p-3 hover:bg-brand-50 lift-card">
              <p className="font-semibold text-brand-900">Exercices probables</p>
              <p className="mt-1 text-sm text-brand-700">Sujets recurrents du Bac NSIV.</p>
            </Link>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3 motion-enter motion-delay-3">
        <article className="card lg:col-span-2 lift-card">
          <h2 className="mb-3 text-xl font-semibold text-brand-900">Plan rapide du jour</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/subjects" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50 lift-card">
              <p className="text-sm font-semibold text-brand-900">Rubriques du jour</p>
              <p className="mt-1 text-sm text-brand-700">Révision ciblée par matière.</p>
            </Link>
            <Link href="/probable-exercises" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50 lift-card">
              <p className="text-sm font-semibold text-brand-900">Exercices probables</p>
              <p className="mt-1 text-sm text-brand-700">Sujets les plus fréquents à l&apos;examen.</p>
            </Link>
            <Link href="/focus" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50 lift-card">
              <p className="text-sm font-semibold text-brand-900">Session Focus</p>
              <p className="mt-1 text-sm text-brand-700">Concentration en 25 minutes.</p>
            </Link>
            <Link href="/library" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50 lift-card">
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

      <article className="card motion-enter motion-delay-4 lift-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-900">Annonces et alertes</h2>
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

      <VerifiedTestimonials />
    </section>
  );
}
