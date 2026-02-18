"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { clearAuth, getDarkMode, getStudent, getToken, setDarkModePreference } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

export default function HeaderNav() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [student, setStudent] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      return;
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [isAuthed]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  const onLogout = () => {
    clearAuth();
    setIsAuthed(false);
    setStudent(null);
    setDarkMode(false);
    setNotifications([]);
    setUnreadCount(0);
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
  const initials = `${(student?.firstName || '').charAt(0)}${(student?.lastName || '').charAt(0)}`.toUpperCase() || 'U';
  const avatarUrl = avatarBroken ? null : resolveMediaUrl(student?.photoUrl);

  const mobileLinks = isAuthed
    ? [
        { href: '/focus', label: 'Focus', icon: '🎧' },
        { href: '/study-plans', label: 'Plans', icon: '🗂️' },
        { href: '/subjects', label: 'Matières', icon: '📘' },
        { href: '/progress', label: 'Progrès', icon: '📈' },
        { href: '/library', label: 'Bibliothèque', icon: '📚' },
        { href: '/blog', label: 'Blog', icon: '📝' },
        ...(canSeeGlobalAdminDashboard ? [{ href: '/admin/super-dashboard', label: 'Dashboard', icon: '🛠️' }] : [])
      ]
    : [];

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
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
          <div className="relative">
            <button
              type="button"
              className="relative rounded-md border border-brand-100 px-2 py-1.5 hover:bg-brand-50"
              onClick={() => setIsNotifOpen((v) => !v)}
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="text-base leading-none" aria-hidden="true">🔔</span>
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
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-white/90 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              onClick={() => setIsAvatarOpen((v) => !v)}
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
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => {
                    toggleDarkMode();
                    setIsAvatarOpen(false);
                  }}
                >
                  Parametres ({darkMode ? 'mode sombre' : 'mode clair'})
                </button>
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

        <div className="hidden md:flex md:items-center md:gap-3">
          {isAuthed ? (
            <>
              <Link href="/focus" className="hover:text-brand-700">🎧 Focus</Link>
              <Link href="/study-plans" className="hover:text-brand-700">🗂️ Plans</Link>
              <Link href="/subjects" className="hover:text-brand-700">📘 Matières</Link>
              <Link href="/progress" className="hover:text-brand-700">📈 Progrès</Link>
              <Link href="/library" className="hover:text-brand-700">📚 Bibliothèque</Link>
              <Link href="/blog" className="hover:text-brand-700">📝 Blog</Link>
              {canSeeGlobalAdminDashboard ? (
                <Link href="/admin/super-dashboard" className="hover:text-brand-700">🛠️ Dashboard</Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {mounted && mobileLinks.length > 0
        ? createPortal(
            <>
              {!isMobileMenuOpen ? (
                <div
                  className="fixed inset-x-0 bottom-0 z-[70] flex justify-end pr-4 pb-4 md:hidden"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <button
                    type="button"
                    className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-lg"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    Menu
                  </button>
                </div>
              ) : null}

              {isMobileMenuOpen ? (
                <div className="fixed inset-0 z-[69] bg-black/40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                  <div
                    className="absolute bottom-0 right-0 w-[88vw] max-w-sm rounded-tl-2xl bg-white p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-3 h-1.5 w-12 rounded-full bg-brand-100" />
                    <nav className="flex flex-col gap-3 text-sm">
                      {mobileLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon ? `${item.icon} ` : ''}{item.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              ) : null}
            </>,
            document.body
          )
        : null}
    </>
  );
}
