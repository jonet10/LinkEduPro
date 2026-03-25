"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const SUBJECT_OPTIONS = ['Math', 'Français', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire', 'Géographie'];
const LEVEL_OPTIONS = ['7e', '8e', '9e', 'NSI', 'NSII', 'NSIII', 'NSIV'];

function formatHTG(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 2
  }).format(amount);
}

function compactNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const isTeacher = student?.role === 'TEACHER';
  const isAdmin = student?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    profilePhoto: '',
    subjects: [],
    levels: [],
    experienceYears: '',
    availability: '',
    bio: '',
    isTutor: true
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (isAdmin) {
      router.push('/admin/super-dashboard');
      return;
    }
    if (!isTeacher) {
      router.push('/rattrapage');
      return;
    }
    let mounted = true;
    apiClient('/catchup/dashboard/teacher', { token })
      .then((data) => {
        if (!mounted) return;
        setDashboard(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError('');
        setDashboard({
          summary: {},
          revenuesBySession: [],
          statsByLevel: [],
          library: { revenuesByBook: [] }
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    apiClient('/teacher/profile', { token })
      .then((data) => {
        if (!mounted) return;
        const nextProfile = data?.profile || null;
        setProfile(nextProfile);
        if (nextProfile) {
          setProfileForm({
            profilePhoto: nextProfile.profilePhoto || '',
            subjects: Array.isArray(nextProfile.subjects) ? nextProfile.subjects : [],
            levels: Array.isArray(nextProfile.levels) ? nextProfile.levels : [],
            experienceYears: String(nextProfile.experienceYears || ''),
            availability: nextProfile.availability ? JSON.stringify(nextProfile.availability, null, 2) : '',
            bio: nextProfile.bio || '',
            isTutor: nextProfile.isTutor !== false
          });
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setProfileError(e.message || 'Impossible de charger le profil tuteur.');
      });
    return () => {
      mounted = false;
    };
  }, [token, isTeacher, isAdmin, router]);

  const summary = dashboard?.summary || {};
  const sessionRevenues = dashboard?.revenuesBySession || [];
  const levelStats = dashboard?.statsByLevel || [];
  const topBooks = dashboard?.library?.revenuesByBook || [];
  const needsProfile = profile && !profile.isProfileComplete;

  useEffect(() => {
    if (needsProfile) setShowProfileModal(true);
  }, [needsProfile]);

  const onProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onProfileMulti = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setProfileForm((prev) => ({ ...prev, [e.target.name]: selected }));
  };

  const parseAvailability = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        return trimmed;
      }
    }
    return trimmed;
  };

  const submitProfile = async () => {
    try {
      setProfileError('');
      setProfileSaving(true);
      const payload = {
        isTutor: profileForm.isTutor,
        profilePhoto: profileForm.profilePhoto || undefined,
        subjects: profileForm.subjects,
        levels: profileForm.levels,
        experienceYears: Number(profileForm.experienceYears || 0),
        availability: parseAvailability(profileForm.availability),
        bio: profileForm.bio || undefined
      };
      const data = await apiClient('/teacher/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(payload)
      });
      setProfile(data?.profile || null);
    } catch (e) {
      setProfileError(e.message || 'Impossible de mettre à jour le profil tuteur.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <section className="space-y-5 rattrapage-shell">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Revenus professeur</h1>
        <p className="mt-2 text-sm text-brand-700">
          Suivi des revenus (livres + rattrapages), ventes et activité de tes sessions.
        </p>
        <div className="mt-4">
          <Link href="/rattrapage" className="btn-secondary">Retour aux rattrapages</Link>
          <Link href="/withdrawals" className="btn-primary ml-2">Demander un retrait</Link>
        </div>
      </div>

      {profile ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Profil tuteur</h2>
          <p className="mt-1 text-sm text-brand-700">
            {needsProfile
              ? 'Complète ton profil pour être visible dans la section “Trouver un tuteur”.'
              : 'Ton profil tuteur est complet et visible.'}
          </p>
          {profileError ? <p className="mt-2 text-sm text-red-600">{profileError}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsProfile ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {needsProfile ? 'Profil incomplet' : 'Profil validé'}
            </span>
            <button type="button" className="btn-primary" onClick={() => setShowProfileModal(true)}>
              {needsProfile ? 'Compléter le profil' : 'Mettre à jour'}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenu total</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">Livres + rattrapages</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenus livres</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalLibraryRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalLibrarySales)} vente(s)</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Revenus rattrapages</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalRemedialRevenue)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalSessions)} session(s)</p>
            </article>
            <article className="card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Commission plateforme</p>
              <p className="mt-2 text-3xl font-black text-brand-900">{formatHTG(summary.totalCommission)}</p>
              <p className="mt-1 text-xs text-brand-700">{compactNumber(summary.totalStudents)} inscription(s) élève</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-brand-900">Top revenus rattrapages</h2>
              <div className="mt-3 space-y-2">
                {sessionRevenues.slice(0, 8).map((session) => (
                  <div key={session.sessionId} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                    <p className="font-semibold text-brand-900">{session.title}</p>
                    <p className="text-xs text-brand-700">{session.subject} • {session.level} • {session.enrollments} inscrit(s)</p>
                    <p className="mt-1 text-sm text-brand-900">Revenu: {formatHTG(session.revenue)}</p>
                  </div>
                ))}
                {sessionRevenues.length === 0 ? <p className="text-sm text-brand-700">Aucun revenu session pour le moment.</p> : null}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-brand-900">Livres vendus</h2>
              <div className="mt-3 space-y-2">
                {topBooks.slice(0, 8).map((book) => (
                  <div key={book.bookId} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                    <p className="font-semibold text-brand-900">{book.title}</p>
                    <p className="text-xs text-brand-700">{book.salesCount} vente(s)</p>
                    <p className="mt-1 text-sm text-brand-900">Revenu: {formatHTG(book.revenue)}</p>
                  </div>
                ))}
                {topBooks.length === 0 ? <p className="text-sm text-brand-700">Aucune vente de livre pour le moment.</p> : null}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-brand-900">Activité par niveau</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {levelStats.map((row) => (
                <article key={row.level} className="rounded-xl border border-brand-100 bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{row.level}</p>
                  <p className="mt-1 text-sm text-brand-900">{row.sessions} session(s)</p>
                  <p className="text-sm text-brand-700">{row.enrollments} inscription(s)</p>
                </article>
              ))}
              {levelStats.length === 0 ? <p className="text-sm text-brand-700">Aucune donnée de niveau disponible.</p> : null}
            </div>
          </div>
        </>
      ) : null}

      {showProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-900">Compléter le profil tuteur</h2>
              {!needsProfile ? (
                <button
                  type="button"
                  className="text-sm text-brand-700 hover:text-brand-900"
                  onClick={() => setShowProfileModal(false)}
                >
                  Fermer
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-brand-700">
              Ajoute tes informations pour que les élèves puissent te trouver facilement.
            </p>

            {profileError ? <p className="mt-2 text-sm text-red-600">{profileError}</p> : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="input"
                name="profilePhoto"
                placeholder="Photo de profil (URL)"
                value={profileForm.profilePhoto}
                onChange={onProfileChange}
              />
              <input
                className="input"
                type="number"
                min="0"
                max="60"
                name="experienceYears"
                placeholder="Années d'expérience"
                value={profileForm.experienceYears}
                onChange={onProfileChange}
              />

              <select
                className="input md:col-span-2"
                name="subjects"
                multiple
                value={profileForm.subjects}
                onChange={onProfileMulti}
              >
                {SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <select
                className="input md:col-span-2"
                name="levels"
                multiple
                value={profileForm.levels}
                onChange={onProfileMulti}
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-brand-600">Sélection multiple possible pour les matières et niveaux.</p>

            <textarea
              className="input mt-3 min-h-[110px]"
              name="availability"
              placeholder="Disponibilités (ex: Lundi 8h-12h, Mercredi 14h-18h)"
              value={profileForm.availability}
              onChange={onProfileChange}
            />
            <textarea
              className="input mt-3 min-h-[140px]"
              name="bio"
              placeholder="Bio (30 caractères minimum)"
              value={profileForm.bio}
              onChange={onProfileChange}
            />

            <label className="mt-3 flex items-center gap-2 text-sm text-brand-700">
              <input type="checkbox" name="isTutor" checked={profileForm.isTutor} onChange={onProfileChange} />
              Activer mon profil en tant que tuteur
            </label>

            <div className="mt-4 flex items-center justify-end gap-2">
              {!needsProfile ? (
                <button type="button" className="btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Annuler
                </button>
              ) : null}
              <button type="button" className="btn-primary" disabled={profileSaving} onClick={submitProfile}>
                {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
