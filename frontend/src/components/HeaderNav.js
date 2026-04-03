"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { clearAuth, getDarkMode, getStudent, getToken, isNsivStudent, setDarkModePreference } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { resolveMediaUrl } from '@/lib/media';
import { prepareNotices, pushNotice } from '@/lib/notices';

function isActivePath(pathname, href) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPublicToolsOpen, setIsPublicToolsOpen] = useState(false);
  const [isPublicMobileMenuOpen, setIsPublicMobileMenuOpen] = useState(false);
  const [desktopSearch, setDesktopSearch] = useState('');
  const [isDiscoverMegaOpen, setIsDiscoverMegaOpen] = useState(false);
  const [locale, setLocale] = useState('fr');

  const quickMenuRef = useRef(null);
  const notifRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const publicToolsRef = useRef(null);
  const publicMobilePanelRef = useRef(null);
  const loadNotificationsRef = useRef(async () => {});
  const loadUnreadMessagesRef = useRef(async () => {});
  const hasInitializedNoticeRefs = useRef(false);
  const prevUnreadCountRef = useRef(0);
  const prevUnreadMessagesRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const hidePublicMobileMenu = ['/login', '/register', '/forgot-password', '/verify-email'].includes(pathname || '');
  const roleUpper = String(student?.role || '').toUpperCase();
  const t = useMemo(
    () => (
      locale === 'ht'
        ? {
            discover: 'Dekouvri',
            students: 'Elèv',
            teachers: 'Pwofesè',
            quickAccess: 'Aksè rapid',
            learn: 'Aprann',
            studyPlans: 'Pwogram etid',
            trainingTest: 'Tès fòmasyon',
            expertSolutions: 'Solisyon ekspè',
            studySearch: 'Rechèch etid',
            publishResources: 'Pibliye resous',
            liveCatchup: 'Live / ratrapaj',
            digitalLibrary: 'Bibliyotèk dijital',
            digitalClass: 'Klas dijital',
            practiceQuiz: 'Quiz fòmasyon',
            supportLinkedu: 'Fè yon Don',
            publicSearchPlaceholder: 'Kisa ou vle aprann?',
            login: 'Konekte',
            register: 'Enskri',
            langLabel: 'Lang',
            menuTitle: 'Meni LinkEduPro',
            close: 'Fèmen',
            studyToolsTitle: 'Zouti pou etidye',
            display: 'Afiche',
            language: 'Lang',
            french: 'Franse',
            creole: 'Kreyòl'
          }
        : {
            discover: 'Découvrir',
            students: 'Étudiants',
            teachers: 'Enseignants',
            quickAccess: 'Accès rapide',
            learn: 'Apprendre',
            studyPlans: "Programmes d'étude",
            trainingTest: "Test d'entraînement",
            expertSolutions: 'Solutions expertes',
            studySearch: "Recherche d'étude",
            publishResources: 'Publier des ressources',
            liveCatchup: 'Live / rattrapage',
            digitalLibrary: 'Bibliothèque numérique',
            digitalClass: 'Classe numérique',
            practiceQuiz: "Quiz d'entraînement",
            supportLinkedu: 'Faire un Don',
            publicSearchPlaceholder: 'Que souhaitez-vous apprendre ?',
            login: 'Se connecter',
            register: "S'inscrire",
            langLabel: 'Langue',
            menuTitle: 'Menu LinkEduPro',
            close: 'Fermer',
            studyToolsTitle: 'Outils pour étudier',
            display: 'Affichage',
            language: 'Langue',
            french: 'Français',
            creole: 'Kreyòl'
          }
    ),
    [locale]
  );

  const languageBadge = locale === 'ht' ? 'KR' : 'FR';

  const publicStudyTools = useMemo(() => ([
    { href: '/subjects', label: t.learn, icon: '🧠' },
    { href: '/study-plans', label: t.studyPlans, icon: '🗂️' },
    { href: '/subjects', label: t.trainingTest, icon: '🧪' },
    { href: '/blog', label: t.expertSolutions, icon: '✅' },
    { href: '/search', label: t.studySearch, icon: '🔎' }
  ]), [t]);

  const publicTeacherTools = useMemo(() => ([
    { href: '/blog', label: t.publishResources, icon: '📝' },
    { href: '/rattrapage', label: t.liveCatchup, icon: '📅' }
  ]), [t]);
  const globalAuthedTabs = useMemo(() => {
    const tabs = [
      { href: '/', label: 'Accueil' },
      { href: '/video-lessons', label: 'Classe Numerique' },
      { href: '/rattrapage', label: 'Rattrapage' },
      ...(isAuthed && roleUpper === 'TEACHER' ? [{ href: '/teacher/dashboard', label: 'Revenus' }] : []),
      { href: '/subjects', label: 'Quiz' },
      { href: '/probable-exercises', label: 'Examens passés' },
      { href: '/library', label: 'Bibliothèque' },
      { href: '/blog', label: 'Forum' },
      { href: '/support', label: 'Faire un Don' }
    ];
    if (isAuthed && (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN')) {
      tabs.push({ href: '/admin/super-dashboard', label: 'Dashboard' });
    }
    return tabs;
  }, [isAuthed, roleUpper]);
  const quickDiscoverLinks = useMemo(
    () => ([
      { href: '/library', label: t.digitalLibrary, icon: '📚' },
      { href: '/video-lessons', label: t.digitalClass, icon: '🎬' },
      { href: '/subjects', label: t.practiceQuiz, icon: '🧪' },
      { href: '/support', label: t.supportLinkedu, icon: '💝' }
    ]),
    [t]
  );

  useEffect(() => {
    const refresh = () => {
      setIsAuthed(Boolean(getToken()));
      const currentStudent = getStudent();
      setStudent(currentStudent);
      setAvatarBroken(false);
      setDarkMode(typeof currentStudent?.darkMode === 'boolean' ? currentStudent.darkMode : getDarkMode());
    };

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('auth-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('auth-changed', refresh);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLocale = localStorage.getItem('linkedupro_locale');
    if (savedLocale === 'fr' || savedLocale === 'ht') {
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      const token = getToken();
      if (!token) return;
      try {
        setNotifLoading(true);
        setNotifError('');
        const data = await apiClient('/notifications', { token });
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (e) {
        setNotifError(e.message || 'Erreur notifications');
      } finally {
        setNotifLoading(false);
      }
    }

    async function loadUnreadMessages() {
      const token = getToken();
      if (!token) return;
      try {
        const data = await apiClient('/messages/unread-summary', { token });
        setUnreadMessagesCount(Number(data?.unreadMessages || 0));
      } catch (_) {
        // Keep message badge silent if endpoint temporarily fails.
      }
    }

    loadNotificationsRef.current = loadNotifications;
    loadUnreadMessagesRef.current = loadUnreadMessages;

    if (!isAuthed) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      setIsNotifOpen(false);
      setIsQuickMenuOpen(false);
      setIsMobileMenuOpen(false);
      setIsMobileNotifOpen(false);
      setIsPublicToolsOpen(false);
      setIsDiscoverMegaOpen(false);
      setIsPublicMobileMenuOpen(false);
      return;
    }

    loadNotifications();
    loadUnreadMessages();
    const timer = setInterval(() => {
      loadNotifications();
      loadUnreadMessages();
    }, 30000);
    return () => clearInterval(timer);
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return undefined;

    const token = getToken();
    if (!token) return undefined;

    const streamUrl = `${getApiBaseUrl()}/realtime/stream?token=${encodeURIComponent(token)}`;
    let source = null;
    try {
      source = new EventSource(streamUrl);
    } catch (_) {
      return undefined;
    }

    const onRefresh = () => {
      loadNotificationsRef.current();
      loadUnreadMessagesRef.current();
    };

    source.addEventListener('connected', onRefresh);
    source.addEventListener('refresh', onRefresh);

    return () => {
      source.removeEventListener('connected', onRefresh);
      source.removeEventListener('refresh', onRefresh);
      source.close();
    };
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) {
      hasInitializedNoticeRefs.current = false;
      prevUnreadCountRef.current = 0;
      prevUnreadMessagesRef.current = 0;
      return;
    }

    if (!hasInitializedNoticeRefs.current) {
      hasInitializedNoticeRefs.current = true;
      prevUnreadCountRef.current = unreadCount;
      prevUnreadMessagesRef.current = unreadMessagesCount;
      return;
    }

    const notifDelta = unreadCount - prevUnreadCountRef.current;
    const msgDelta = unreadMessagesCount - prevUnreadMessagesRef.current;

    if (notifDelta > 0) {
      void pushNotice({
        title: 'Nouvelle activité',
        body: notifDelta === 1
          ? 'Vous avez 1 nouvelle notification.'
          : `Vous avez ${notifDelta} nouvelles notifications.`
      });
    }

    if (msgDelta > 0) {
      void pushNotice({
        title: 'Nouveau message',
        body: msgDelta === 1
          ? 'Vous avez reçu 1 nouveau message.'
          : `Vous avez reçu ${msgDelta} nouveaux messages.`
      });
    }

    prevUnreadCountRef.current = unreadCount;
    prevUnreadMessagesRef.current = unreadMessagesCount;
  }, [isAuthed, unreadCount, unreadMessagesCount]);

  useEffect(() => {
    if (!isAuthed) return;
    void prepareNotices();
  }, [isAuthed]);

  useEffect(() => {
    if (!isQuickMenuOpen) return undefined;

    function onClickOutside(event) {
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target)) {
        setIsQuickMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isQuickMenuOpen]);

  useEffect(() => {
    if (!isNotifOpen) return undefined;

    function onClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isNotifOpen]);

  useEffect(() => {
    if (!isPublicToolsOpen) return undefined;
    function onClickOutside(event) {
      if (publicToolsRef.current && !publicToolsRef.current.contains(event.target)) {
        setIsPublicToolsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isPublicToolsOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || !mounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = mobilePanelRef.current;
      if (!panel) return;

      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const panel = mobilePanelRef.current;
    const autofocusTarget = panel?.querySelector('button, a[href]');
    if (autofocusTarget) autofocusTarget.focus();

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen, mounted]);

  useEffect(() => {
    if (!isPublicMobileMenuOpen || !mounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsPublicMobileMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isPublicMobileMenuOpen, mounted]);

  useEffect(() => {
    if (hidePublicMobileMenu) {
      setIsPublicMobileMenuOpen(false);
    }
  }, [hidePublicMobileMenu]);

  const canSeeGlobalAdminDashboard = isAuthed && ['ADMIN', 'SUPER_ADMIN'].includes(roleUpper);
  const canSeeTeacherDashboard = isAuthed && roleUpper === 'TEACHER';
  const canSeeProbableExercises = isAuthed && (student?.role !== 'STUDENT' || isNsivStudent(student));
  const canSeeCatchup = isAuthed && (student?.role !== 'STUDENT' || isNsivStudent(student));
  const canSeeStudyPlans = isAuthed && student?.role !== 'STUDENT';
  const avatarUrl = avatarBroken ? null : resolveMediaUrl(student?.photoUrl);
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

  async function onNotificationOpen(notification) {
    if (!notification) return;
    if (!notification.isRead) {
      await markOneRead(notification.id);
    }
    setIsNotifOpen(false);
    setIsMobileNotifOpen(false);
    setIsQuickMenuOpen(false);
    setIsMobileMenuOpen(false);
    router.push(resolveNotificationHref(notification));
  }

  const desktopMenuItems = useMemo(() => {
    if (!isAuthed) return [];
    return [
      { href: '/', label: 'Accueil', icon: '🏠' },
      { href: '/video-lessons', label: 'Classe Numerique', icon: '🎬' },
      ...(canSeeCatchup ? [{ href: '/rattrapage', label: 'Rattrapage', icon: '📅' }] : []),
      ...(canSeeTeacherDashboard ? [{ href: '/teacher/dashboard', label: 'Revenus', icon: '💼' }] : []),
      { href: '/subjects', label: 'Quiz', icon: '📘' },
      ...(canSeeProbableExercises ? [{ href: '/probable-exercises', label: 'Examens passés', icon: '🎯' }] : []),
      ...(canSeeStudyPlans ? [{ href: '/study-plans', label: 'Plans', icon: '🗂️' }] : []),
      { href: '/library', label: 'Bibliothèque', icon: '📚' },
      { href: '/blog', label: 'Forum', icon: '📝' },
      { href: '/support', label: 'Faire un Don', icon: '💝' },
      ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard', icon: '🛠️' }] : [])
    ];
  }, [isAuthed, canSeeCatchup, canSeeProbableExercises, canSeeGlobalAdminDashboard, canSeeStudyPlans, canSeeTeacherDashboard]);

  const mobileStudyItems = useMemo(
    () => [
      { href: '/video-lessons', label: 'Classe Numerique', icon: '🎬' },
      ...(canSeeCatchup ? [{ href: '/rattrapage', label: 'Rattrapage', icon: '📅' }] : []),
      { href: '/subjects', label: 'Quiz', icon: '📘' },
      ...(canSeeProbableExercises ? [{ href: '/probable-exercises', label: 'Examens passés', icon: '🎯' }] : []),
      ...(canSeeStudyPlans ? [{ href: '/study-plans', label: 'Plans', icon: '🗂️' }] : [])
    ],
    [canSeeCatchup, canSeeProbableExercises, canSeeStudyPlans]
  );

  const mobileToolItems = useMemo(
    () => [
      { href: '/library', label: 'Bibliothèque', icon: '📚' },
      { href: '/blog', label: 'Forum', icon: '📝' },
      { href: '/support', label: 'Faire un Don', icon: '💝' },
      ...(canSeeTeacherDashboard ? [{ href: '/teacher/dashboard', label: 'Revenus', icon: '💼' }] : []),
      ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard', icon: '🛠️' }] : []),
      { href: '/search', label: 'Recherche', icon: '🔎' }
    ],
    [canSeeTeacherDashboard, canSeeGlobalAdminDashboard]
  );

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    setStudent(null);
    setDarkMode(false);
    setNotifications([]);
    setUnreadCount(0);
    setUnreadMessagesCount(0);
    setIsQuickMenuOpen(false);
    setIsNotifOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileNotifOpen(false);
    router.push('/');
  };

  const onDesktopSearch = (event) => {
    event.preventDefault();
    const q = String(desktopSearch || '').trim();
    if (!q) {
      router.push('/search');
      return;
    }
    router.push(`/search?prefill=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    if (!isMobileNotifOpen || !mounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMobileNotifOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileNotifOpen, mounted]);

  async function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    setDarkModePreference(next);

    const token = getToken();
    if (!token) return;

    try {
      await apiClient('/v2/profile/dark-mode', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ darkMode: next })
      });
    } catch (_) {
      // Keep local preference even if remote persistence fails.
    }
  }

  function toggleLocale() {
    const next = locale === 'fr' ? 'ht' : 'fr';
    setLocale(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('linkedupro_locale', next);
    }
  }

  async function markAllRead() {
    const token = getToken();
    if (!token) return;
    try {
      await apiClient('/notifications/read-all', {
        method: 'PATCH',
        token
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      setNotifError(e.message || 'Erreur notifications');
    }
  }

  async function markOneRead(id) {
    const token = getToken();
    if (!token) return;
    try {
      await apiClient(`/notifications/${id}/read`, {
        method: 'PATCH',
        token
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((v) => Math.max(0, v - 1));
    } catch (e) {
      setNotifError(e.message || 'Erreur notifications');
    }
  }

  return (
    <>
      <div className="w-full">
        {!isAuthed ? (
          <div className="public-top-nav glass hidden w-full items-center gap-3 text-sm md:flex">
          <div
            className="relative"
            ref={publicToolsRef}
            onMouseEnter={() => setIsDiscoverMegaOpen(true)}
            onMouseLeave={() => setIsDiscoverMegaOpen(false)}
          >
            <button
              type="button"
              className="public-top-link rounded-lg px-3 py-2 font-medium text-brand-900 hover:bg-brand-50"
              onClick={() => setIsDiscoverMegaOpen((v) => !v)}
              aria-label={t.discover}
            >
              {t.discover}
            </button>
            {isDiscoverMegaOpen ? (
              <div className="absolute left-0 z-50 mt-3 w-[760px] rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-2xl backdrop-blur">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.students}</p>
                    <div className="space-y-1">
                      {publicStudyTools.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white"
                          onClick={() => setIsDiscoverMegaOpen(false)}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.teachers}</p>
                    <div className="space-y-1">
                      {publicTeacherTools.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white"
                          onClick={() => setIsDiscoverMegaOpen(false)}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-100 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.quickAccess}</p>
                    <div className="space-y-1">
                      {quickDiscoverLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-brand-50"
                          onClick={() => setIsDiscoverMegaOpen(false)}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mx-2 flex flex-1 items-center gap-2">
            <Link
              href="/tutors"
              className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Trouver un tuteur
            </Link>
            <Link
              href="/tutor-partner"
              className="rounded-full border border-brand-200 bg-white px-5 py-2 text-xs font-semibold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              Devenir tuteur
            </Link>
            <Link
              href="/tutor-partner"
              className="rounded-full border border-brand-200 bg-white px-5 py-2 text-xs font-semibold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              Devenir partenaire
            </Link>
          </div>

          <button
            type="button"
            className="public-icon-btn inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-2 hover:bg-brand-50"
            onClick={toggleLocale}
            aria-label={`${t.langLabel}: ${locale === 'fr' ? t.french : t.creole}`}
            title={`${t.language}: ${locale === 'fr' ? t.french : t.creole}`}
          >
            <span>🌐</span>
            <span className="text-[11px] font-semibold">{languageBadge}</span>
          </button>
          <button
            type="button"
            className="public-icon-btn rounded-lg border border-brand-200 p-2 hover:bg-brand-50"
            onClick={toggleDarkMode}
            title={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
            aria-label={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <Link href="/login" className="public-auth-btn rounded-lg border border-brand-500 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50">
            {t.login}
          </Link>
          <Link href="/register" className="public-auth-btn primary rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">
            {t.register}
          </Link>
          </div>
        ) : (
          <div className="hidden w-full items-center gap-2 text-sm md:flex">
          <form
            onSubmit={onDesktopSearch}
            className="mx-2 flex min-w-[260px] flex-1 items-center rounded-full border border-brand-300 bg-white px-4 py-2 shadow-sm transition-all duration-200 focus-within:-translate-y-[1px] focus-within:border-brand-500 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-brand-200"
          >
            <span className="mr-2 text-brand-600">🔎</span>
            <input
              className="w-full bg-transparent text-sm text-brand-900 outline-none placeholder:text-brand-500"
              placeholder="Rechercher un cours, quiz, livre..."
              value={desktopSearch}
              onChange={(e) => setDesktopSearch(e.target.value)}
            />
          </form>

          <Link
            href="/messages"
            className="hidden rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50 lg:flex lg:items-center lg:gap-1.5"
            aria-label="Messagerie"
            title="Messagerie"
          >
            <span className="text-base leading-none" aria-hidden="true">💬</span>
            <span>Message</span>
            {unreadMessagesCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            ) : null}
          </Link>

          <div className="relative hidden md:block" ref={notifRef}>
            <button
              type="button"
              className="relative rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50 md:flex md:items-center md:gap-1.5"
              onClick={() => {
                setIsNotifOpen((v) => !v);
                setIsQuickMenuOpen(false);
              }}
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="text-base leading-none" aria-hidden="true">🔔</span>
              <span className="hidden lg:inline">Notification</span>
              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            {isNotifOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-lg border border-brand-100 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-900">Notifications</p>
                  <button className="text-xs text-brand-700 hover:underline" onClick={markAllRead}>
                    Tout marquer lu
                  </button>
                </div>
                {notifLoading ? <p className="text-xs text-brand-700">Chargement...</p> : null}
                {notifError ? <p className="text-xs text-red-600">{notifError}</p> : null}
                <div className="max-h-80 space-y-2 overflow-auto">
                  {notifications.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                        n.isRead ? 'border-brand-100 bg-white text-brand-700' : 'border-brand-500 bg-brand-50 text-brand-900'
                      }`}
                      onClick={() => {
                        onNotificationOpen(n);
                      }}
                    >
                      <p className="font-semibold">{n.title}</p>
                      <p className="mt-1">{n.message}</p>
                      <p className="mt-1 text-[11px] opacity-80">{new Date(n.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
                  {notifications.length === 0 && !notifLoading ? <p className="text-xs text-brand-700">Aucune notification.</p> : null}
                </div>
              </div>
            ) : null}
          </div>

          <Link
            href="/profile"
            className="hidden rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50 lg:flex lg:items-center lg:gap-1.5"
            aria-label="Profil"
            title="Profil"
          >
            <span className="text-base leading-none" aria-hidden="true">👤</span>
            <span>Profil</span>
          </Link>

          <button
            type="button"
            className="rounded-lg border border-brand-100 px-2 py-2 hover:bg-brand-50"
            onClick={toggleDarkMode}
            title={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
            aria-label={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button
            type="button"
            className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
            onClick={onLogout}
          >
            Déconnexion
          </button>

          </div>
        )}

        {isAuthed ? (
          <div className="hidden w-full items-center gap-1 overflow-x-auto border-t border-brand-100 pt-2 md:flex">
            {globalAuthedTabs.map((tab) => (
              <Link
                key={`${tab.href}-${tab.label}`}
                href={tab.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActivePath(pathname, tab.href)
                    ? 'bg-brand-50 font-semibold text-brand-900'
                    : 'text-brand-800 hover:bg-brand-50 hover:text-brand-900'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex w-full items-center justify-end gap-2 text-sm md:hidden">
          {!isAuthed ? (
            <>
              {!hidePublicMobileMenu ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
                  aria-label="Menu public"
                  title="Menu public"
                  onClick={() => setIsPublicMobileMenuOpen(true)}
                >
                  ☰
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
                aria-label={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
                title={darkMode ? 'Désactiver le mode sombre' : 'Activer le mode sombre'}
                onClick={toggleDarkMode}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
                aria-label={`${t.langLabel}: ${locale === 'fr' ? t.french : t.creole}`}
                title={`${t.language}: ${locale === 'fr' ? t.french : t.creole}`}
                onClick={toggleLocale}
              >
                <span>🌐</span>
                <span className="text-[11px] font-semibold">{languageBadge}</span>
              </button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
                aria-label={t.login}
                title={t.login}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {mounted && !isAuthed && isPublicMobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[90] bg-[#060f1f]/70 backdrop-blur-sm md:hidden" onClick={() => setIsPublicMobileMenuOpen(false)}>
              <div
                ref={publicMobilePanelRef}
                className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-brand-100 bg-white p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-brand-900">{t.menuTitle}</p>
                  <button
                    type="button"
                    className="rounded-md border border-brand-100 px-2 py-1 text-xs"
                    onClick={() => setIsPublicMobileMenuOpen(false)}
                  >
                    {t.close}
                  </button>
                </div>

                <section className="rounded-xl border border-brand-100 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.studyToolsTitle}</p>
                  <div className="space-y-1">
                    {publicStudyTools.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-brand-50"
                        onClick={() => setIsPublicMobileMenuOpen(false)}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                <section className="mt-3 rounded-xl border border-brand-100 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">{t.display}</p>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={toggleDarkMode}
                  >
                    <span>{darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}</span>
                    <span className="text-brand-500">›</span>
                  </button>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={toggleLocale}
                  >
                    <span>{t.language}: {locale === 'fr' ? t.french : t.creole}</span>
                    <span className="text-brand-500">›</span>
                  </button>
                </section>

                <div className="mt-4 flex gap-2">
                  <Link href="/register" className="btn-primary" onClick={() => setIsPublicMobileMenuOpen(false)}>{t.register}</Link>
                  <Link href="/login" className="btn-secondary" onClick={() => setIsPublicMobileMenuOpen(false)}>{t.login}</Link>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && isAuthed && isMobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[90] bg-[#060f1f]/70 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div
                ref={mobilePanelRef}
                className="absolute inset-0 overflow-y-auto bg-[#081223] text-white"
                style={{
                  animation: 'mobilePlusFade 200ms ease',
                  paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 pb-3 pt-6">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Photo profil"
                        className="h-12 w-12 rounded-full border border-white/20 object-cover"
                        onError={() => setAvatarBroken(true)}
                      />
                    ) : (
                      <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-full border border-white/20 object-cover" />
                    )}
                    <div>
                      <p className="text-xs text-slate-300">Mon espace</p>
                      <p className="text-lg font-bold">{student?.firstName || 'Utilisateur'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mx-auto w-full max-w-md px-5 pb-28" style={{ animation: 'mobilePlusSlide 220ms ease' }}>
                  <section className="rounded-2xl border border-white/10 bg-[#0b1830] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Etudes</p>
                    <div className="space-y-1">
                      {mobileStudyItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>{item.icon} {item.label}</span>
                          <span className="text-slate-400">›</span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className="mt-3 rounded-2xl border border-white/10 bg-[#0b1830] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Outils</p>
                    <div className="space-y-1">
                      {mobileToolItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>{item.icon} {item.label}</span>
                          <span className="text-slate-400">›</span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section className="mt-3 rounded-2xl border border-white/10 bg-[#0b1830] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">Compte</p>
                    <div className="space-y-1">
                      <Link
                        href="/profile"
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>👤 Profil</span>
                        <span className="text-slate-400">›</span>
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                        onClick={toggleDarkMode}
                      >
                        <span>{darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}</span>
                        <span className="text-slate-400">›</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                        onClick={onLogout}
                      >
                        <span>⎋ Déconnexion</span>
                        <span className="text-red-300">›</span>
                      </button>
                    </div>
                  </section>

                  <p className="mt-4 text-center text-xs text-slate-400">LinkEduPro Mobile Navigation v1</p>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && isAuthed && isMobileNotifOpen
        ? createPortal(
            <div className="fixed inset-0 z-[91] bg-[#060f1f]/70 backdrop-blur-sm md:hidden" onClick={() => setIsMobileNotifOpen(false)}>
              <div
                className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-brand-100 bg-white p-4"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-brand-900">Notifications</p>
                  <div className="flex items-center gap-3">
                    <button className="text-xs text-brand-700 hover:underline" onClick={markAllRead}>
                      Tout marquer lu
                    </button>
                    <button type="button" className="rounded-md border border-brand-100 px-2 py-1 text-xs" onClick={() => setIsMobileNotifOpen(false)}>
                      Fermer
                    </button>
                  </div>
                </div>
                {notifLoading ? <p className="text-xs text-brand-700">Chargement...</p> : null}
                {notifError ? <p className="text-xs text-red-600">{notifError}</p> : null}
                <div className="space-y-2">
                  {notifications.slice(0, 25).map((n) => (
                    <button
                      key={n.id}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                        n.isRead ? 'border-brand-100 bg-white text-brand-700' : 'border-brand-500 bg-brand-50 text-brand-900'
                      }`}
                      onClick={() => {
                        onNotificationOpen(n);
                      }}
                    >
                      <p className="font-semibold">{n.title}</p>
                      <p className="mt-1">{n.message}</p>
                      <p className="mt-1 text-[11px] opacity-80">{new Date(n.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
                  {notifications.length === 0 && !notifLoading ? <p className="text-xs text-brand-700">Aucune notification.</p> : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && isAuthed
        ? createPortal(
            <div
              className="z-[80] border-t border-slate-800 bg-[#0a1427]/95 text-slate-200 backdrop-blur md:hidden"
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <nav className="grid grid-cols-4 gap-1 px-2 py-2">
                <Link href="/" className={`rounded-lg px-1 py-1 text-center text-[11px] ${isActivePath(pathname, '/') ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                  <div className="text-lg">🏠</div>
                  <div>Accueil</div>
                </Link>
                <Link href="/messages" className={`rounded-lg px-1 py-1 text-center text-[11px] ${isActivePath(pathname, '/messages') ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                  <div className="relative text-lg">
                    💬
                    {unreadMessagesCount > 0 ? (
                      <span className="absolute -right-2 -top-1 rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    ) : null}
                  </div>
                  <div>Messages</div>
                </Link>
                <button
                  type="button"
                  className={`rounded-lg px-1 py-1 text-center text-[11px] ${isMobileNotifOpen ? 'bg-white/15 text-white' : 'text-slate-300'}`}
                  onClick={() => {
                    setIsMobileNotifOpen(true);
                    setIsMobileMenuOpen(false);
                    setIsQuickMenuOpen(false);
                    setIsNotifOpen(false);
                  }}
                  aria-label="Ouvrir Activité"
                >
                  <div className="relative text-lg">
                    🔔
                    {unreadCount > 0 ? (
                      <span className="absolute -right-2 -top-1 rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div>Activité</div>
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-1 py-1 text-center text-[11px] ${isMobileMenuOpen ? 'bg-white/15 text-white' : 'text-slate-300'}`}
                  onClick={() => {
                    setIsMobileMenuOpen(true);
                    setIsMobileNotifOpen(false);
                    setIsNotifOpen(false);
                    setIsQuickMenuOpen(false);
                  }}
                  aria-label="Ouvrir Plus"
                >
                  <div className="text-lg">⋯</div>
                  <div>Plus</div>
                </button>
              </nav>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
