'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

export default function SuperDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState({
    school: '',
    department: '',
    commune: '',
    q: ''
  });
  const [studentFilterOptions, setStudentFilterOptions] = useState({
    schools: [],
    departments: [],
    communes: []
  });
  const [communityConfig, setCommunityConfig] = useState(null);
  const [tiktokEditors, setTiktokEditors] = useState([]);
  const [challengeTitle, setChallengeTitle] = useState('Vote de la semaine');
  const [challengeSubtitle, setChallengeSubtitle] = useState('Choisis la personne qui doit rester en tête cette semaine.');
  const [challengeTheme, setChallengeTheme] = useState('TIKTOKERS');
  const [savingTiktok, setSavingTiktok] = useState(false);

  useEffect(() => {
    const token = getToken();
    const student = getStudent();

    if (!token || !student || student.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    load(token);
  }, [router]);

  async function load(forcedToken = null) {
    const token = forcedToken || getToken();
    if (!token) return;

    try {
      setError('');
      setLoading(true);
      const [d, i, c] = await Promise.all([
        apiClient('/community/admin/super-dashboard', { token }),
        apiClient('/community/admin/teacher-invitations', { token }),
        apiClient('/community/admin/config', { token })
      ]);
      setDashboard(d);
      setInvites(i.invitations || []);
      if (c?.config) {
        setCommunityConfig(c.config);
        setTiktokEditors(Array.isArray(c.config.tiktokCreators) ? c.config.tiktokCreators : []);
        setChallengeTitle(c.config.homeChallengeTitle || 'Vote de la semaine');
        setChallengeSubtitle(c.config.homeChallengeSubtitle || 'Choisis la personne qui doit rester en tête cette semaine.');
        setChallengeTheme(c.config.homeChallengeTheme || 'TIKTOKERS');
      }
      await loadStudents(token, studentFilters);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateTiktokRow(index, field, value) {
    setTiktokEditors((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  }

  function addTiktokRow() {
    setTiktokEditors((prev) => (
      [...prev, { title: '', handle: '', category: '', search: '', photoUrl: '' }].slice(0, 12)
    ));
  }

  function removeTiktokRow(index) {
    setTiktokEditors((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function saveTiktokModels() {
    const token = getToken();
    if (!token || !communityConfig) return;

    const cleaned = tiktokEditors
      .map((row) => ({
        title: String(row?.title || '').trim(),
        handle: String(row?.handle || '').trim(),
        category: String(row?.category || '').trim(),
        search: String(row?.search || '').trim(),
        photoUrl: String(row?.photoUrl || '').trim()
      }))
      .filter((row) => row.title && row.handle && row.category && row.search)
      .slice(0, 12);

    try {
      setSavingTiktok(true);
      setError('');
      const data = await apiClient('/community/admin/config', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          maxPostsPerDay: communityConfig.maxPostsPerDay,
          maxPostsPerMonth: communityConfig.maxPostsPerMonth,
          commentRatePerMin: communityConfig.commentRatePerMin,
          homeChallengeTitle: challengeTitle,
          homeChallengeSubtitle: challengeSubtitle,
          homeChallengeTheme: challengeTheme,
          tiktokCreators: cleaned
        })
      });
      setCommunityConfig(data.config);
      setTiktokEditors(Array.isArray(data.config?.tiktokCreators) ? data.config.tiktokCreators : []);
    } catch (e) {
      setError(e.message || 'Erreur pendant la sauvegarde des modèles TikTok.');
    } finally {
      setSavingTiktok(false);
    }
  }

  async function loadStudents(token, filters) {
    const params = new URLSearchParams();
    if (filters.school) params.set('school', filters.school);
    if (filters.department) params.set('department', filters.department);
    if (filters.commune) params.set('commune', filters.commune);
    if (filters.q) params.set('q', filters.q);
    const query = params.toString();
    const data = await apiClient(`/community/admin/students-registry${query ? `?${query}` : ''}`, { token });
    setStudents(data.students || []);
    setStudentFilterOptions({
      schools: data.filters?.schools || [],
      departments: data.filters?.departments || [],
      communes: data.filters?.communes || []
    });
  }

  async function createInvite() {
    const token = getToken();
    if (!token) return;

    try {
      setError('');
      const res = await apiClient('/community/admin/teacher-invitations', {
        method: 'POST',
        token,
        body: JSON.stringify({ email, expiresInHours })
      });
      setInviteLink(res.inviteLink || '');
      setEmail('');
      await load(token);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <button className="btn-primary" onClick={() => load()}>Actualiser</button>
      </section>

      {error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p> : null}

      {dashboard?.analytics ? (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card"><p className="text-sm">Écoles</p><p className="text-2xl font-bold">{dashboard.analytics.schools}</p></div>
          <div className="card"><p className="text-sm">Élèves NS4</p><p className="text-2xl font-bold">{dashboard.analytics.publicStudents}</p></div>
          <div className="card"><p className="text-sm">Professeurs</p><p className="text-2xl font-bold">{dashboard.analytics.teachers}</p></div>
          <div className="card"><p className="text-sm">Paiements mensuels</p><p className="text-2xl font-bold">{String(dashboard.analytics.monthlyInternalPayments)}</p></div>
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Liste globale des Élèves (module Élèves)</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            className="input"
            value={studentFilters.school}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, school: e.target.value }))}
          >
            <option value="">Global - toutes Écoles</option>
            {studentFilterOptions.schools.map((school) => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
          <select
            className="input"
            value={studentFilters.department}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, department: e.target.value }))}
          >
            <option value="">Tous départements</option>
            {studentFilterOptions.departments.map((dpt) => (
              <option key={dpt} value={dpt}>{dpt}</option>
            ))}
          </select>
          <select
            className="input"
            value={studentFilters.commune}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, commune: e.target.value }))}
          >
            <option value="">Toutes communes</option>
            {studentFilterOptions.communes.map((commune) => (
              <option key={commune} value={commune}>{commune}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Recherche nom/email/École"
            value={studentFilters.q}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={async () => {
              try {
                setError('');
                const token = getToken();
                if (!token) return;
                await loadStudents(token, studentFilters);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Filtrer
          </button>
          <button
            className="btn-secondary"
            onClick={async () => {
              const reset = { school: '', department: '', commune: '', q: '' };
              setStudentFilters(reset);
              try {
                setError('');
                const token = getToken();
                if (!token) return;
                await loadStudents(token, reset);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Reinitialiser
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun élève trouvé.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Nom</th>
                  <th>Email</th>
                  <th>École</th>
                  <th>département</th>
                  <th>Commune</th>
                  <th>Niveau</th>
                  <th>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td>{st.lastName} {st.firstName}</td>
                    <td>{st.email || '-'}</td>
                    <td>{st.school || '-'}</td>
                    <td>{st.department || '-'}</td>
                    <td>{st.commune || '-'}</td>
                    <td>{st.gradeLevel || '-'}</td>
                    <td>{new Date(st.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Inviter un professeur</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input className="input" placeholder="Email professeur" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="number" min={1} max={168} value={expiresInHours} onChange={(e) => setExpiresInHours(Number(e.target.value || 72))} />
          <button className="btn-primary" onClick={createInvite}>Generer invitation</button>
        </div>
        {inviteLink ? <p className="rounded border border-brand-100 bg-brand-50 p-2 text-sm break-all">{inviteLink}</p> : null}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Challenge hebdomadaire (page d&apos;accueil)</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={addTiktokRow}
            disabled={tiktokEditors.length >= 12}
          >
            Ajouter
          </button>
        </div>
        <p className="text-sm text-brand-700">Tu peux gérer jusqu&apos;à 12 modèles. Les champs vides ne seront pas sauvegardés.</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className="input md:col-span-2"
            placeholder="Titre du challenge"
            value={challengeTitle}
            onChange={(e) => setChallengeTitle(e.target.value)}
          />
          <select
            className="input"
            value={challengeTheme}
            onChange={(e) => setChallengeTheme(e.target.value)}
          >
            <option value="TIKTOKERS">TikTokeurs/TikTokeuses</option>
            <option value="MUSICIENS">Musiciens</option>
            <option value="CHANTEURS">Chanteurs/Chanteuses</option>
            <option value="LIBRE">Challenge libre</option>
          </select>
          <input
            className="input md:col-span-3"
            placeholder="Sous-titre du challenge"
            value={challengeSubtitle}
            onChange={(e) => setChallengeSubtitle(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {tiktokEditors.map((row, index) => (
            <div key={`${index}-${row.handle || 'model'}`} className="grid grid-cols-1 gap-2 rounded-lg border border-brand-100 p-3 md:grid-cols-6">
              <input
                className="input"
                placeholder="Titre"
                value={row.title || ''}
                onChange={(e) => updateTiktokRow(index, 'title', e.target.value)}
              />
              <input
                className="input"
                placeholder="@handle"
                value={row.handle || ''}
                onChange={(e) => updateTiktokRow(index, 'handle', e.target.value)}
              />
              <input
                className="input"
                placeholder="Catégorie"
                value={row.category || ''}
                onChange={(e) => updateTiktokRow(index, 'category', e.target.value)}
              />
              <input
                className="input"
                placeholder="Mots-clés de recherche"
                value={row.search || ''}
                onChange={(e) => updateTiktokRow(index, 'search', e.target.value)}
              />
              <input
                className="input"
                placeholder="Photo URL (optionnel)"
                value={row.photoUrl || ''}
                onChange={(e) => updateTiktokRow(index, 'photoUrl', e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => removeTiktokRow(index)}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={saveTiktokModels} disabled={savingTiktok}>
            {savingTiktok ? 'Sauvegarde...' : 'Sauvegarder les modèles'}
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-xl font-semibold">Invitations recentes</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Email</th><th>Expire</th><th>Utilisee</th>
              </tr>
            </thead>
            <tbody>
              {invites.slice(0, 20).map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{new Date(i.expiresAt).toLocaleString()}</td>
                  <td>{i.used ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
