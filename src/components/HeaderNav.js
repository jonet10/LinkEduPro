"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { clearAuth, getDarkMode, getStudent, getToken, setDarkModePreference } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [mounted, setMounted] = useState(false);

  const avatarRef = useRef(null);
  const quickMenuRef = useRef(null);
  const router = useRouter();

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
      return;
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [isAuthed]);

  useEffect(() => {
    if (!isAvatarOpen) return undefined;

    function onClickOutside(event) {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setIsAvatarOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isAvatarOpen]);

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

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    setStudent(null);
    setDarkMode(false);
    setNotifications([]);
    setUnreadCount(0);
    setIsAvatarOpen(false);
    setIsQuickMenuOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/login');
  };

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

  const canSeeGlobalAdminDashboard = isAuthed && student?.role === 'ADMIN';
  const canSeeProbableExercises = isAuthed && (student?.role !== 'STUDENT' || student?.academicLevel === 'NSIV');
  const initials = `${(student?.firstName || '').charAt(0)}${(student?.lastName || '').charAt(0)}`.toUpperCase() || 'U';
  const avatarUrl = avatarBroken ? null : resolveMediaUrl(student?.photoUrl);

  const menuItems = useMemo(() => {
    if (!isAuthed) return [];
    return [
      { href: '/', label: 'Accueil', icon: '🏠' },
      { href: '/focus', label: 'Focus', icon: '🎧' },
      { href: '/study-plans', label: 'Plans', icon: '🗂️' },
      { href: '/subjects', label: 'Matières', icon: '📘' },
      { href: '/progress', label: 'Progrès', icon: '📈' },
      { href: '/library', label: 'Bibliothèque', icon: '📚' },
      { href: '/blog', label: 'Blog', icon: '📝' },
      ...(canSeeProbableExercises ? [{ href: '/probable-exercises', label: 'Exercices probables', icon: '🎯' }] : []),
      ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard', icon: '🛠️' }] : [])
    ];
  }, [isAuthed, canSeeProbableExercises, canSeeGlobalAdminDashboard]);

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          className="rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
          onClick={toggleDarkMode}
          title={darkMode ? 'Desactiver le mode sombre' : 'Activer le mode sombre'}
          aria-label={darkMode ? 'Desactiver le mode sombre' : 'Activer le mode sombre'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {isAuthed ? (
          <Link
            href="/messages"
            className="rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50 md:hidden"
            aria-label="Messagerie"
            title="Messagerie"
          >
            <span className="text-base leading-none" aria-hidden="true">💬</span>
          </Link>
        ) : null}

        {isAuthed ? (
          <Link
            href="/messages"
            className="hidden rounded-md border border-brand-100 px-3 py-1.5 hover:bg-brand-50 md:flex md:items-center md:gap-1.5"
            aria-label="Messagerie"
            title="Messagerie"
          >
            <span className="text-base leading-none" aria-hidden="true">💬</span>
            <span>Messagerie</span>
          </Link>
        ) : null}

        {isAuthed ? (
          <div className="relative">
            <button
              type="button"
              className="relative rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50 md:flex md:items-center md:gap-1.5 md:px-3"
              onClick={() => {
                setIsNotifOpen((v) => !v);
                setIsQuickMenuOpen(false);
              }}
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="text-base leading-none" aria-hidden="true">🔔</span>
              <span className="hidden md:inline">Notification</span>
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
                        if (!n.isRead) markOneRead(n.id);
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
        ) : null}

        {isAuthed ? (
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-white/90 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              onClick={() => {
                setIsAvatarOpen((v) => !v);
                setIsQuickMenuOpen(false);
              }}
              title="Profil utilisateur"
              aria-label="Profil utilisateur"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Photo de profil"
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>

            {isAvatarOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-brand-100 bg-white p-2 shadow-xl">
                <Link href="/profile" className="block rounded-md px-3 py-2 text-sm hover:bg-brand-50" onClick={() => setIsAvatarOpen(false)}>
                  Voir profil
                </Link>
                <Link href="/profile?edit=1" className="block rounded-md px-3 py-2 text-sm hover:bg-brand-50" onClick={() => setIsAvatarOpen(false)}>
                  Modifier profil
                </Link>
                <button
                  type="button"
                  className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={onLogout}
                >
                  Deconnexion
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="hover:text-brand-700">Connexion</Link>
        )}

        <div className="hidden lg:flex lg:items-center lg:gap-3">
          {isAuthed ? (
            <>
              <Link href="/" className="hover:text-brand-700">🏠 Accueil</Link>
              <Link href="/focus" className="hover:text-brand-700">🎧 Focus</Link>
              <Link href="/study-plans" className="hover:text-brand-700">🗂️ Plans</Link>
              <Link href="/subjects" className="hover:text-brand-700">📘 Matières</Link>
              <Link href="/progress" className="hover:text-brand-700">📈 Progrès</Link>
              <Link href="/library" className="hover:text-brand-700">📚 Bibliothèque</Link>
              <Link href="/blog" className="hover:text-brand-700">📝 Blog</Link>
              {canSeeProbableExercises ? (
                <Link href="/probable-exercises" className="hover:text-brand-700">🎯 Exercices probables</Link>
              ) : null}
              {canSeeGlobalAdminDashboard ? (
                <Link href="/admin/super-dashboard" className="hover:text-brand-700">🛠️ Dashboard</Link>
              ) : null}
            </>
          ) : null}
        </div>

        {isAuthed ? (
          <div className="relative" ref={quickMenuRef}>
            <button
              type="button"
              className="rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
              onClick={() => {
                setIsQuickMenuOpen((v) => !v);
                setIsNotifOpen(false);
                setIsAvatarOpen(false);
              }}
              aria-label="Menu"
              title="Menu"
            >
              <span className="text-base leading-none" aria-hidden="true">☰</span>
            </button>

            {isQuickMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 hidden w-64 rounded-xl border border-brand-100 bg-white p-3 shadow-xl md:block">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Navigation</p>
                <div className="grid grid-cols-1 gap-1">
                  {menuItems.map((item) => (
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
            <div className="fixed inset-0 z-[80] bg-[#041d39]/70 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-brand-100 bg-white px-5 pb-8 pt-5"
                style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-brand-100" />
                <div className="mb-3 flex justify-center">
                  <img src="/logo.png" alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
                </div>
                <div className="mb-4 flex justify-end">
                  <button type="button" className="rounded-md border border-brand-100 px-3 py-1.5 text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Link href="/messages" className="rounded-xl border border-brand-100 px-3 py-3 text-center text-xl font-medium" onClick={() => setIsMobileMenuOpen(false)} aria-label="Messagerie" title="Messagerie">
                    💬
                  </Link>
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl border border-brand-100 px-3 py-3 text-center text-xl font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-label={item.label}
                      title={item.label}
                    >
                      {item.icon}
                    </Link>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isAuthed ? (
        <div className="pointer-events-none fixed bottom-0 right-0 z-[70] pb-3 pr-4 md:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-xl"
            onClick={() => {
              setIsMobileMenuOpen(true);
              setIsNotifOpen(false);
              setIsAvatarOpen(false);
              setIsQuickMenuOpen(false);
            }}
            aria-label="Ouvrir le menu"
            title="Menu"
          >
            ☰
          </button>
        </div>
      ) : null}
    </>
  );
}
