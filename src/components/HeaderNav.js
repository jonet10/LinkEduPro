"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { clearAuth, getDarkMode, getStudent, getToken, isNsivStudent, setDarkModePreference } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

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
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [mounted, setMounted] = useState(false);

  const quickMenuRef = useRef(null);
  const notifRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

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

    if (!isAuthed) {
      setNotifications([]);
      setUnreadCount(0);
      setIsNotifOpen(false);
      setIsQuickMenuOpen(false);
      setIsMobileMenuOpen(false);
      setIsMobileNotifOpen(false);
      return;
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
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

  const canSeeGlobalAdminDashboard = isAuthed && student?.role === 'ADMIN';
  const canSeeProbableExercises = isAuthed && (student?.role !== 'STUDENT' || isNsivStudent(student));
  const canSeeCatchup = isAuthed && (student?.role !== 'STUDENT' || isNsivStudent(student));
  const avatarUrl = avatarBroken ? null : resolveMediaUrl(student?.photoUrl);
  const showBackButton = Boolean(pathname) && pathname !== '/';

  function onBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
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
      { href: '/focus', label: 'Focus', icon: '🎧' },
      { href: '/study-plans', label: 'Plans', icon: '🗂️' },
      ...(canSeeCatchup ? [{ href: '/rattrapage', label: 'Rattrapage', icon: '📅' }] : []),
      { href: '/subjects', label: 'Matieres', icon: '📘' },
      { href: '/progress', label: 'Progres', icon: '📈' },
      { href: '/library', label: 'Bibliotheque', icon: '📚' },
      { href: '/blog', label: 'Blog', icon: '📝' },
      ...(canSeeProbableExercises ? [{ href: '/probable-exercises', label: 'Exercices probables', icon: '🎯' }] : []),
      ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard', icon: '🛠️' }] : [])
    ];
  }, [isAuthed, canSeeCatchup, canSeeProbableExercises, canSeeGlobalAdminDashboard]);

  const mobileStudyItems = useMemo(
    () => [
      { href: '/subjects', label: 'Matieres', icon: '📘' },
      { href: '/focus', label: 'Focus', icon: '🎧' },
      { href: '/study-plans', label: 'Plans', icon: '🗂️' },
      ...(canSeeCatchup ? [{ href: '/rattrapage', label: 'Rattrapage', icon: '📅' }] : []),
      { href: '/progress', label: 'Progres', icon: '📈' },
      ...(canSeeProbableExercises ? [{ href: '/probable-exercises', label: 'Exercices probables', icon: '🎯' }] : [])
    ],
    [canSeeCatchup, canSeeProbableExercises]
  );

  const mobileToolItems = useMemo(
    () => [
      { href: '/library', label: 'Bibliotheque', icon: '📚' },
      { href: '/blog', label: 'Blog', icon: '📝' },
      { href: '/search', label: 'Recherche', icon: '🔎' }
    ],
    []
  );

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    setStudent(null);
    setDarkMode(false);
    setNotifications([]);
    setUnreadCount(0);
    setIsQuickMenuOpen(false);
    setIsNotifOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileNotifOpen(false);
    router.push('/');
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

  const dashboardHref = '/admin/super-dashboard';
  const mobileFourthTabHref = canSeeGlobalAdminDashboard ? dashboardHref : '/search';
  const mobileFourthTabLabel = canSeeGlobalAdminDashboard ? 'Dashboard' : 'Recherche';
  const mobileFourthTabIcon = canSeeGlobalAdminDashboard ? '📊' : '🔎';

  return (
    <>
      {showBackButton ? (
        <button
          type="button"
          className="absolute left-2 rounded-md border border-brand-100 bg-white/90 px-2 py-1 text-sm text-brand-900 shadow-sm hover:bg-brand-50 md:hidden"
          onClick={onBack}
          title="Retour"
          aria-label="Retour"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      <div className="flex items-center gap-2 text-sm">
        {showBackButton ? (
          <button
            type="button"
            className="hidden rounded-md border border-brand-100 px-3 py-1.5 hover:bg-brand-50 md:inline-flex"
            onClick={onBack}
            title="Retour"
            aria-label="Retour"
          >
            Retour
          </button>
        ) : null}
        <button
          type="button"
          className="hidden rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50 md:inline-flex"
          onClick={toggleDarkMode}
          title={darkMode ? 'Desactiver le mode sombre' : 'Activer le mode sombre'}
          aria-label={darkMode ? 'Desactiver le mode sombre' : 'Activer le mode sombre'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {isAuthed ? (
          <Link
            href="/messages"
            className="hidden rounded-md border border-brand-100 px-3 py-1.5 hover:bg-brand-50 md:flex md:items-center md:gap-1.5"
            aria-label="Messagerie"
            title="Messagerie"
          >
            <span className="text-base leading-none" aria-hidden="true">💬</span>
            <span>Message</span>
          </Link>
        ) : null}

        {isAuthed ? (
          <div className="relative hidden md:block" ref={notifRef}>
            <button
              type="button"
              className="relative rounded-md border border-brand-100 px-3 py-1.5 hover:bg-brand-50 md:flex md:items-center md:gap-1.5"
              onClick={() => {
                setIsNotifOpen((v) => !v);
                setIsQuickMenuOpen(false);
              }}
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="text-base leading-none" aria-hidden="true">🔔</span>
              <span>Notification</span>
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
        ) : null}

        {isAuthed ? (
          <Link
            href="/profile"
            className="hidden rounded-md border border-brand-100 px-3 py-1.5 hover:bg-brand-50 md:flex md:items-center md:gap-1.5"
            aria-label="Profil"
            title="Profil"
          >
            <span className="text-base leading-none" aria-hidden="true">👤</span>
            <span>Profil</span>
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden hover:text-brand-700 md:inline">Connexion</Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50 md:hidden"
              aria-label="Connexion"
              title="Connexion"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </>
        )}

        {isAuthed ? (
          <button
            type="button"
            className="hidden rounded-md border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50 md:inline-flex"
            onClick={onLogout}
          >
            Deconnexion
          </button>
        ) : null}

        {isAuthed ? (
          <div className="relative hidden md:block" ref={quickMenuRef}>
            <button
              type="button"
              className="rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
              onClick={() => {
                setIsQuickMenuOpen((v) => !v);
                setIsNotifOpen(false);
              }}
              aria-label="Menu"
              title="Menu"
            >
              <span className="text-base leading-none" aria-hidden="true">☰</span>
            </button>

            {isQuickMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-brand-100 bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Navigation</p>
                <div className="grid grid-cols-1 gap-1">
                  {desktopMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-3 py-2 text-sm hover:bg-brand-50"
                      onClick={() => setIsQuickMenuOpen(false)}
                    >
                      {item.icon} {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {mounted && isAuthed && isMobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[90] bg-[#060f1f]/70 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div
                ref={mobilePanelRef}
                className="absolute inset-0 overflow-y-auto bg-[#081223] text-white"
                style={{ animation: 'mobilePlusFade 200ms ease' }}
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
                        onClick={onBack}
                      >
                        <span>↩ Retour</span>
                        <span className="text-slate-400">›</span>
                      </button>
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
                        <span>⎋ Deconnexion</span>
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
              <nav className="grid grid-cols-5 gap-1 px-2 py-2">
                <Link href="/" className={`rounded-lg px-1 py-1 text-center text-[11px] ${isActivePath(pathname, '/') ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                  <div className="text-lg">🏠</div>
                  <div>Accueil</div>
                </Link>
                <Link href="/messages" className={`rounded-lg px-1 py-1 text-center text-[11px] ${isActivePath(pathname, '/messages') ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                  <div className="text-lg">💬</div>
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
                  aria-label="Ouvrir Activite"
                >
                  <div className="relative text-lg">
                    🔔
                    {unreadCount > 0 ? (
                      <span className="absolute -right-2 -top-1 rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div>Activite</div>
                </button>
                <Link href={mobileFourthTabHref} className={`rounded-lg px-1 py-1 text-center text-[11px] ${isActivePath(pathname, mobileFourthTabHref) ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                  <div className="text-lg">{mobileFourthTabIcon}</div>
                  <div>{mobileFourthTabLabel}</div>
                </Link>
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
