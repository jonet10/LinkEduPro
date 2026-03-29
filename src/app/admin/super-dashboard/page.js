'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { AI_SERVICE_URL } from '@/lib/runtime-config';
import { getStudent, getToken } from '@/lib/auth';

function formatHtg(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function toIsoDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeCsv(value) {
  const raw = String(value ?? '');
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export default function SuperDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteRole, setInviteRole] = useState('TEACHER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionLoadingId, setUserActionLoadingId] = useState(null);
  const [showStudents, setShowStudents] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [userFilters, setUserFilters] = useState({
    q: '',
    role: ''
  });
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
  const [platformDonations, setPlatformDonations] = useState([]);
  const [donationFilters, setDonationFilters] = useState({
    status: 'SUCCESS',
    dateFrom: '',
    dateTo: '',
    q: ''
  });
  const [withdrawalsPending, setWithdrawalsPending] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalActionId, setWithdrawalActionId] = useState(null);
  const [withdrawalNotes, setWithdrawalNotes] = useState({});
  const [aiFiles, setAiFiles] = useState([]);
  const [aiUploading, setAiUploading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiDocs, setAiDocs] = useState([]);
  const [aiDocsLoading, setAiDocsLoading] = useState(false);
  const [showAiDocs, setShowAiDocs] = useState(false);
  const [partnersCount, setPartnersCount] = useState(0);
  const [aiLevel, setAiLevel] = useState('AF7');
  const [aiSubject, setAiSubject] = useState('Math');
  const [aiDocType, setAiDocType] = useState('COURSE');
  const [aiRebuildLevel, setAiRebuildLevel] = useState('');
  const [aiRebuildSubject, setAiRebuildSubject] = useState('');
  const [aiIndexLog, setAiIndexLog] = useState('');
  const [editingAiDocId, setEditingAiDocId] = useState(null);
  const [editingAiDoc, setEditingAiDoc] = useState({ level: 'AF7', subject: 'Math', docType: 'COURSE' });

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
      const [d, i, c, donationsPayload, withdrawalsPayload, partnersPayload] = await Promise.all([
        apiClient('/community/admin/super-dashboard', { token }),
        apiClient('/community/admin/teacher-invitations', { token }),
        apiClient('/community/admin/config', { token }),
        apiClient('/platform-donations/admin/all', { token }),
        apiClient('/payouts/pending', { token }),
        apiClient('/publishers', { token })
      ]);
      setDashboard(d);
      setInvites(i.invitations || []);
      setPlatformDonations(Array.isArray(donationsPayload?.donations) ? donationsPayload.donations : []);
      setWithdrawalsPending(Array.isArray(withdrawalsPayload?.pending) ? withdrawalsPayload.pending : []);
      setPartnersCount(Array.isArray(partnersPayload?.items) ? partnersPayload.items.length : 0);
      if (c?.config) {
        setCommunityConfig(c.config);
        setTiktokEditors(Array.isArray(c.config.tiktokCreators) ? c.config.tiktokCreators : []);
        setChallengeTitle(c.config.homeChallengeTitle || 'Vote de la semaine');
        setChallengeSubtitle(c.config.homeChallengeSubtitle || 'Choisis la personne qui doit rester en tête cette semaine.');
        setChallengeTheme(c.config.homeChallengeTheme || 'TIKTOKERS');
      }
      await loadStudents(token, studentFilters);
      await loadUsers(token, userFilters);
      await loadAiDocs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAiDocs() {
    setAiDocsLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${AI_SERVICE_URL}/ai/docs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail || 'Erreur chargement documents IA.');
      }
      const data = await res.json();
      setAiDocs(Array.isArray(data.files) ? data.files : []);
    } catch (e) {
      setAiMessage(e.message || 'Erreur chargement documents IA.');
    } finally {
      setAiDocsLoading(false);
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

  async function loadUsers(token, filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.role) params.set('role', filters.role);
    const query = params.toString();
    setUsersLoading(true);
    try {
      const data = await apiClient(`/community/admin/users-registry${query ? `?${query}` : ''}`, { token });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } finally {
      setUsersLoading(false);
    }
  }

  async function moderateUser(userId, action) {
    const token = getToken();
    if (!token) return;
    setUserActionLoadingId(userId);
    try {
      await apiClient(`/community/admin/users-registry/${userId}/moderate`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ action })
      });
      await loadUsers(token, userFilters);
    } catch (e) {
      setError(e.message || 'Erreur action utilisateur.');
    } finally {
      setUserActionLoadingId(null);
    }
  }

  async function deleteUser(userId) {
    const token = getToken();
    if (!token) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cet utilisateur définitivement ?')) return;
    setUserActionLoadingId(userId);
    try {
      await apiClient(`/community/admin/users-registry/${userId}`, {
        method: 'DELETE',
        token
      });
      await loadUsers(token, userFilters);
    } catch (e) {
      setError(e.message || 'Erreur suppression utilisateur.');
    } finally {
      setUserActionLoadingId(null);
    }
  }

  async function createInvite() {
    const token = getToken();
    if (!token) return;

    try {
      setError('');
      const res = await apiClient('/community/admin/teacher-invitations', {
        method: 'POST',
        token,
        body: JSON.stringify({ email, expiresInHours, role: inviteRole })
      });
      setInviteLink(res.inviteLink || '');
      setEmail('');
      setInviteRole('TEACHER');
      await load(token);
    } catch (e) {
      setError(e.message);
    }
  }

  const filteredDonations = useMemo(() => {
    return platformDonations.filter((row) => {
      const matchesStatus = !donationFilters.status || row.status === donationFilters.status;

      const rowDate = toIsoDateOnly(row.createdAt);
      const matchesFrom = !donationFilters.dateFrom || (rowDate && rowDate >= donationFilters.dateFrom);
      const matchesTo = !donationFilters.dateTo || (rowDate && rowDate <= donationFilters.dateTo);

      const q = String(donationFilters.q || '').trim().toLowerCase();
      const haystack = [
        row.donorName,
        row.donorEmail,
        row.orderRef,
        row.paymentMethod,
        row.status
      ].join(' ').toLowerCase();
      const matchesQ = !q || haystack.includes(q);

      return matchesStatus && matchesFrom && matchesTo && matchesQ;
    });
  }, [platformDonations, donationFilters]);

  const successfulDonations = filteredDonations.filter((row) => row.status === 'SUCCESS');
  const totalDonationAmount = successfulDonations.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  function exportDonationsCsv() {
    const header = [
      'id',
      'donor_name',
      'donor_email',
      'donor_role',
      'amount',
      'currency',
      'payment_method',
      'status',
      'order_ref',
      'provider_tx_id',
      'created_at',
      'paid_at'
    ];

    const lines = filteredDonations.map((row) => ([
      row.id,
      row.donorName,
      row.donorEmail || '',
      row.donorRole || '',
      row.amount,
      row.currency,
      row.paymentMethod,
      row.status,
      row.orderRef || '',
      row.providerTxId || '',
      row.createdAt ? new Date(row.createdAt).toISOString() : '',
      row.paidAt ? new Date(row.paidAt).toISOString() : ''
    ].map(escapeCsv).join(',')));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dons-linkedu-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function refreshWithdrawals(token) {
    setWithdrawalsLoading(true);
    try {
      const payload = await apiClient('/payouts/pending', { token });
      setWithdrawalsPending(Array.isArray(payload?.pending) ? payload.pending : []);
    } finally {
      setWithdrawalsLoading(false);
    }
  }

  async function reviewWithdrawalRequest(id, action) {
    const token = getToken();
    if (!token) return;
    setWithdrawalActionId(id);
    try {
      await apiClient(`/payouts/${id}/review`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          action,
          note: withdrawalNotes[id] || ''
        })
      });
      await refreshWithdrawals(token);
      setWithdrawalNotes((prev) => ({ ...prev, [id]: '' }));
    } catch (e) {
      setError(e.message || 'Erreur validation retrait.');
    } finally {
      setWithdrawalActionId(null);
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
      {aiMessage ? <p className="rounded border border-brand-200 bg-brand-50 p-3 text-brand-800">{aiMessage}</p> : null}

      {dashboard?.analytics ? (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="card"><p className="text-sm">Écoles</p><p className="text-2xl font-bold">{dashboard.analytics.schools}</p></div>
          <div className="card"><p className="text-sm">Élèves (tous niveaux)</p><p className="text-2xl font-bold">{dashboard.analytics.publicStudents}</p></div>
          <div className="card"><p className="text-sm">Professeurs</p><p className="text-2xl font-bold">{dashboard.analytics.teachers}</p></div>
          <div className="card"><p className="text-sm">Partenaires</p><p className="text-2xl font-bold">{partnersCount}</p></div>
          <div className="card">
            <p className="text-sm">Frais School Manager (mois)</p>
            <p className="text-2xl font-bold">{formatHtg(dashboard.analytics.schoolManagerMonthlyRevenue)}</p>
            <p className="text-xs text-brand-700">{formatHtg(dashboard.analytics.schoolManagerMonthlyFee)} / école</p>
            <p className="text-xs text-brand-700">Année: {formatHtg(dashboard.analytics.schoolManagerAnnualRevenue)}</p>
          </div>
        </section>
      ) : null}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-brand-900">Partenaires certifiants</h2>
            <p className="mt-1 text-sm text-brand-700">
              Gère les partenaires (institutions, universités, entreprises, organisations, auteurs) et leurs fonctionnalités.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={() => router.push('/admin/publishers')}>
              Voir tous les partenaires
            </button>
            <button className="btn-secondary" type="button" onClick={() => router.push('/admin/publishers')}>
              Paramétrer les contenus
            </button>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-brand-900">Formations certifiantes</h2>
            <p className="mt-1 text-sm text-brand-700">
              Pilote le nouveau parcours Classe Numérique: vidéos + ressources + quiz + certificat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href="/video-lessons">Gérer les vidéos</a>
            <a className="btn-secondary" href="/video-lessons">Voir l’expérience élève</a>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Contenu</p>
            <p className="mt-1 text-sm text-brand-900">Ajoute les ressources (PDF/DOC) directement sous chaque leçon.</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Certification</p>
            <p className="mt-1 text-sm text-brand-900">Validation automatique: 100% vidéo, ressources téléchargées, quiz ≥ 80%.</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Certificat</p>
            <p className="mt-1 text-sm text-brand-900">PDF dynamique avec nom élève, formation et date.</p>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Documents IA (PDF)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setAiFiles([])}
            >
              Réinitialiser
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={loadAiDocs}
              disabled={aiDocsLoading}
            >
              {aiDocsLoading ? 'Chargement...' : 'Rafraîchir liste'}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={async () => {
                setAiMessage('');
                try {
                  const token = getToken();
                  const res = await fetch(`${AI_SERVICE_URL}/ai/rebuild-docs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      level: aiRebuildLevel || null,
                      subject: aiRebuildSubject || null
                    })
                  });
                  if (!res.ok) {
                    const payload = await res.json().catch(() => ({}));
                    throw new Error(payload?.detail || 'Erreur rebuild IA.');
                  }
                  setAiMessage('Index IA reconstruit avec succès.');
                } catch (e) {
                  setAiMessage(e.message || 'Erreur rebuild IA.');
                }
              }}
            >
              Rebuild index
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={async () => {
                setAiMessage('');
                setAiIndexLog('');
                try {
                  const token = getToken();
                  const res = await fetch(`${AI_SERVICE_URL}/ai/index-existing`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (!res.ok) {
                    const payload = await res.json().catch(() => ({}));
                    throw new Error(payload?.message || 'Erreur indexation.');
                  }
                  const data = await res.json();
                  setAiIndexLog(
                    `Scan: ${data.report?.scanned || 0}, Créés: ${data.report?.created || 0}, ` +
                    `Ignorés: ${data.report?.skipped || 0}`
                  );
                  await loadAiDocs();
                } catch (e) {
                  setAiMessage(e.message || 'Erreur indexation.');
                }
              }}
            >
              Indexer les documents existants
            </button>
          </div>
        </div>
        <p className="text-sm text-brand-700">
          Ajoute des PDF pour enrichir la base documentaire IA (RAG). Les fichiers sont indexés automatiquement.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="input"
            value={aiLevel}
            onChange={(e) => setAiLevel(e.target.value)}
            required
          >
            <option value="AF7">7e AF</option>
            <option value="AF8">8e AF</option>
            <option value="AF9">9e AF</option>
            <option value="NSI">NSI</option>
            <option value="NSII">NSII</option>
            <option value="NSIII">NSIII</option>
            <option value="NSIV">NSIV</option>
            <option value="UNIVERSITAIRE">Universitaire</option>
          </select>
          <select
            className="input"
            value={aiSubject}
            onChange={(e) => setAiSubject(e.target.value)}
            required
          >
            <option value="Math">Math</option>
            <option value="Français">Français</option>
            <option value="Sciences">Sciences</option>
            <option value="Physique">Physique</option>
            <option value="Chimie">Chimie</option>
            <option value="SVT">SVT</option>
            <option value="Histoire">Histoire</option>
            <option value="Géographie">Géographie</option>
            <option value="Anglais">Anglais</option>
            <option value="Général">Général</option>
          </select>
          <select
            className="input"
            value={aiDocType}
            onChange={(e) => setAiDocType(e.target.value)}
            required
          >
            <option value="COURSE">Cours</option>
            <option value="EXAM">Examen</option>
            <option value="BOOK">Livre</option>
            <option value="EXERCISE">Exercice</option>
          </select>
          <input
            className="input md:col-span-2"
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => setAiFiles(Array.from(e.target.files || []))}
          />
          <button
            className="btn-primary"
            type="button"
            disabled={aiUploading || aiFiles.length === 0}
            onClick={async () => {
              if (aiFiles.length === 0) {
                setAiMessage('Sélectionne au moins un PDF.');
                return;
              }

              setAiUploading(true);
              setAiMessage('');
              try {
                const form = new FormData();
                aiFiles.forEach((file) => form.append('files', file));
                form.append('level', aiLevel);
                form.append('subject', aiSubject);
                form.append('docType', aiDocType);

                const token = getToken();
                const res = await fetch(`${AI_SERVICE_URL}/ai/upload-docs?rebuild=true`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: form
                });
                if (!res.ok) {
                  const payload = await res.json().catch(() => ({}));
                  throw new Error(payload?.detail || 'Erreur upload IA.');
                }
                const data = await res.json();
                setAiMessage(`Upload terminé: ${data.createdCount || 0} fichier(s) indexé(s).`);
                setAiFiles([]);
                await loadAiDocs();
              } catch (e) {
                setAiMessage(e.message || 'Erreur upload IA.');
              } finally {
                setAiUploading(false);
              }
            }}
          >
            {aiUploading ? 'Upload en cours...' : 'Uploader les PDF'}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="input"
            value={aiRebuildLevel}
            onChange={(e) => setAiRebuildLevel(e.target.value)}
          >
            <option value="">Rebuild: Tous niveaux</option>
            <option value="AF7">7e AF</option>
            <option value="AF8">8e AF</option>
            <option value="AF9">9e AF</option>
            <option value="NSI">NSI</option>
            <option value="NSII">NSII</option>
            <option value="NSIII">NSIII</option>
            <option value="NSIV">NSIV</option>
            <option value="UNIVERSITAIRE">Universitaire</option>
          </select>
          <select
            className="input"
            value={aiRebuildSubject}
            onChange={(e) => setAiRebuildSubject(e.target.value)}
          >
            <option value="">Rebuild: Toutes matières</option>
            <option value="Math">Math</option>
            <option value="Français">Français</option>
            <option value="Sciences">Sciences</option>
            <option value="Physique">Physique</option>
            <option value="Chimie">Chimie</option>
            <option value="SVT">SVT</option>
            <option value="Histoire">Histoire</option>
            <option value="Géographie">Géographie</option>
            <option value="Anglais">Anglais</option>
            <option value="Général">Général</option>
          </select>
        </div>
        {aiIndexLog ? <p className="text-sm text-brand-700">{aiIndexLog}</p> : null}
        <div className="rounded-lg border border-brand-100 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-900">PDF indexés</p>
            <div className="flex items-center gap-2 text-xs text-brand-700">
              <span>{aiDocs.length} fichier(s)</span>
              <button
                type="button"
                className="btn-secondary !px-3 !py-1"
                onClick={() => setShowAiDocs((prev) => !prev)}
              >
                {showAiDocs ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>
          {!showAiDocs ? (
            <p className="text-sm text-brand-700">Liste masquée pour garder le tableau de bord compact.</p>
          ) : aiDocs.length === 0 ? (
            <p className="text-sm text-brand-700">Aucun document pour le moment.</p>
          ) : (
            <ul className="max-h-[380px] space-y-2 overflow-auto pr-1 text-sm">
              {aiDocs.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-brand-900">
                    <div className="font-medium">{file.fileName}</div>
                    <div className="text-xs text-brand-700">
                      {file.level} · {file.subject} · {file.docType} · {file.status}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {file.fileUrl ? (
                      <button
                        className="btn-secondary !px-3 !py-1"
                        type="button"
                        onClick={() => window.open(file.fileUrl, '_blank')}
                      >
                        Voir PDF
                      </button>
                    ) : null}
                    <button
                      className="btn-secondary !px-3 !py-1"
                      type="button"
                      onClick={() => {
                        setEditingAiDocId(file.id);
                        setEditingAiDoc({
                          level: file.level,
                          subject: file.subject,
                          docType: file.docType
                        });
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn-secondary !px-3 !py-1"
                      type="button"
                      onClick={async () => {
                        if (typeof window !== 'undefined' && !window.confirm('Supprimer ce PDF ?')) return;
                        setAiMessage('');
                        try {
                          const token = getToken();
                          const res = await fetch(`${AI_SERVICE_URL}/ai/docs/${file.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (!res.ok) {
                            const payload = await res.json().catch(() => ({}));
                            throw new Error(payload?.detail || 'Erreur suppression PDF.');
                          }
                          setAiMessage('PDF supprimé.');
                          await loadAiDocs();
                        } catch (e) {
                          setAiMessage(e.message || 'Erreur suppression PDF.');
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                  {editingAiDocId === file.id ? (
                    <div className="mt-2 w-full rounded-lg border border-brand-100 p-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        <select
                          className="input"
                          value={editingAiDoc.level}
                          onChange={(e) => setEditingAiDoc((prev) => ({ ...prev, level: e.target.value }))}
                        >
                          <option value="AF7">7e AF</option>
                          <option value="AF8">8e AF</option>
                          <option value="AF9">9e AF</option>
                          <option value="NSI">NSI</option>
                          <option value="NSII">NSII</option>
                          <option value="NSIII">NSIII</option>
                          <option value="NSIV">NSIV</option>
                          <option value="UNIVERSITAIRE">Universitaire</option>
                        </select>
                        <select
                          className="input"
                          value={editingAiDoc.subject}
                          onChange={(e) => setEditingAiDoc((prev) => ({ ...prev, subject: e.target.value }))}
                        >
                          <option value="Math">Math</option>
                          <option value="Français">Français</option>
                          <option value="Sciences">Sciences</option>
                          <option value="Physique">Physique</option>
                          <option value="Chimie">Chimie</option>
                          <option value="SVT">SVT</option>
                          <option value="Histoire">Histoire</option>
                          <option value="Géographie">Géographie</option>
                          <option value="Anglais">Anglais</option>
                          <option value="Général">Général</option>
                        </select>
                        <select
                          className="input"
                          value={editingAiDoc.docType}
                          onChange={(e) => setEditingAiDoc((prev) => ({ ...prev, docType: e.target.value }))}
                        >
                          <option value="COURSE">Cours</option>
                          <option value="EXAM">Examen</option>
                          <option value="BOOK">Livre</option>
                          <option value="EXERCISE">Exercice</option>
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          className="btn-primary !px-3 !py-1"
                          type="button"
                          onClick={async () => {
                          try {
                              const token = getToken();
                              const res = await fetch(`${AI_SERVICE_URL}/ai/docs/${file.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify(editingAiDoc)
                              });
                              if (!res.ok) {
                                const payload = await res.json().catch(() => ({}));
                                throw new Error(payload?.message || 'Erreur mise à jour.');
                              }
                              setAiMessage('Métadonnées mises à jour.');
                              setEditingAiDocId(null);
                              await loadAiDocs();
                            } catch (e) {
                              setAiMessage(e.message || 'Erreur mise à jour.');
                            }
                          }}
                        >
                          Enregistrer
                        </button>
                        <button
                          className="btn-secondary !px-3 !py-1"
                          type="button"
                          onClick={() => setEditingAiDocId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {dashboard?.revenues ? (
        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Revenus plateforme (Super Admin)</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm text-brand-700">Revenu total plateforme</p>
              <p className="text-2xl font-bold text-brand-900">{formatHtg(dashboard.revenues.totals?.totalPlatformRevenue)}</p>
            </div>
            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm text-brand-700">Ventes directes (admin)</p>
              <p className="text-2xl font-bold text-brand-900">{formatHtg(dashboard.revenues.totals?.totalDirectAdminSales)}</p>
            </div>
            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm text-brand-700">Commissions plateforme</p>
              <p className="text-2xl font-bold text-brand-900">{formatHtg(dashboard.revenues.totals?.totalPlatformCommissions)}</p>
            </div>
            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm text-brand-700">Premium utilisateurs</p>
              <p className="text-2xl font-bold text-brand-900">{formatHtg(dashboard.revenues.totals?.premiumRevenue)}</p>
              <p className="text-xs text-brand-700">Bientôt activé</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm font-semibold text-brand-900">Ventes payantes publiées par Super Admin</p>
              <ul className="mt-2 space-y-1 text-sm text-brand-700">
                <li>Livres: {formatHtg(dashboard.revenues.directSales?.books)} ({dashboard.revenues.publications?.adminBookSales || 0} vente(s))</li>
                <li>Rattrapages: {formatHtg(dashboard.revenues.directSales?.remedials)}</li>
                <li>Vidéos: {formatHtg(dashboard.revenues.directSales?.videos)} (bientôt)</li>
                <li>Quiz payants: {formatHtg(dashboard.revenues.directSales?.quizzes)} (bientôt)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-brand-100 p-3">
              <p className="text-sm font-semibold text-brand-900">Commissions publications professeurs / élèves</p>
              <ul className="mt-2 space-y-1 text-sm text-brand-700">
                <li>Commissions livres (prof + élèves): {formatHtg(dashboard.revenues.commissions?.fromTeacherAndStudentBooks)}</li>
                <li>Commissions rattrapages professeurs: {formatHtg(dashboard.revenues.commissions?.fromTeacherRemedials)}</li>
                <li>Ventes livres professeurs: {dashboard.revenues.publications?.teacherBookSales || 0}</li>
                <li>Ventes livres élèves (petits recueils): {dashboard.revenues.publications?.studentBookSales || 0}</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Dons LinkEduPro (plateforme)</h2>
          <button className="btn-secondary" type="button" onClick={exportDonationsCsv} disabled={filteredDonations.length === 0}>
            Export CSV
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            className="input"
            value={donationFilters.status}
            onChange={(e) => setDonationFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Tous statuts</option>
            <option value="SUCCESS">SUCCESS</option>
          </select>
          <input
            className="input"
            type="date"
            value={donationFilters.dateFrom}
            onChange={(e) => setDonationFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
          <input
            className="input"
            type="date"
            value={donationFilters.dateTo}
            onChange={(e) => setDonationFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Recherche donateur/référence"
            value={donationFilters.q}
            onChange={(e) => setDonationFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-brand-100 p-3">
            <p className="text-sm text-brand-700">Total confirmé</p>
            <p className="text-2xl font-bold text-brand-900">{formatHtg(totalDonationAmount)}</p>
          </div>
          <div className="rounded-lg border border-brand-100 p-3">
            <p className="text-sm text-brand-700">Dons confirmés</p>
            <p className="text-2xl font-bold text-brand-900">{successfulDonations.length}</p>
          </div>
          <div className="rounded-lg border border-brand-100 p-3">
            <p className="text-sm text-brand-700">Transactions totales</p>
            <p className="text-2xl font-bold text-brand-900">{filteredDonations.length}</p>
          </div>
        </div>

        {filteredDonations.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun don enregistré.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Donateur</th>
                  <th>Email</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Statut</th>
                  <th>Référence</th>
                  <th>Créé le</th>
                  <th>Payé le</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((row) => (
                  <tr key={row.id}>
                    <td>{row.donorName}</td>
                    <td>{row.donorEmail || '-'}</td>
                    <td>{formatHtg(row.amount)}</td>
                    <td>{row.paymentMethod}</td>
                    <td>{row.status}</td>
                    <td>{row.orderRef || '-'}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{row.paidAt ? new Date(row.paidAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Demandes de retrait (MonCash/NatCash)</h2>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              const token = getToken();
              if (!token) return;
              refreshWithdrawals(token);
            }}
          >
            Actualiser
          </button>
        </div>
        {withdrawalsLoading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        {!withdrawalsLoading && withdrawalsPending.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune demande en attente.</p>
        ) : null}
        {!withdrawalsLoading && withdrawalsPending.length > 0 ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Demandeur</th>
                  <th>Rôle</th>
                  <th>Montant</th>
                  <th>Frais</th>
                  <th>Net</th>
                  <th>Méthode</th>
                  <th>Compte</th>
                  <th>Créée le</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalsPending.map((row) => (
                  <tr key={row.id}>
                    <td>{row.requester?.lastName} {row.requester?.firstName}</td>
                    <td>{row.requester?.role || '-'}</td>
                    <td>{formatHtg(row.amount)}</td>
                    <td>{formatHtg(row.fee)}</td>
                    <td>{formatHtg(row.netAmount)}</td>
                    <td>{row.method}</td>
                    <td>{row.payoutAccount}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>
                      <input
                        className="input"
                        placeholder="Note (optionnel)"
                        value={withdrawalNotes[row.id] || ''}
                        onChange={(e) => setWithdrawalNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={withdrawalActionId === row.id}
                          onClick={() => reviewWithdrawalRequest(row.id, 'approved')}
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={withdrawalActionId === row.id}
                          onClick={() => reviewWithdrawalRequest(row.id, 'rejected')}
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Liste globale des Élèves (module Élèves)</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowStudents((prev) => !prev)}
          >
            {showStudents ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {!showStudents ? (
          <p className="text-sm text-brand-700">Contenu masqué. Clique sur “Afficher” pour voir la liste.</p>
        ) : (
          <>
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
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-brand-100">
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
          </>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Gestion utilisateurs (toutes catégories)</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowUsers((prev) => !prev)}
          >
            {showUsers ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {!showUsers ? (
          <p className="text-sm text-brand-700">Contenu masqué. Clique sur “Afficher” pour voir la liste.</p>
        ) : (
          <>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className="input"
            placeholder="Recherche nom/email/École"
            value={userFilters.q}
            onChange={(e) => setUserFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
          <select
            className="input"
            value={userFilters.role}
            onChange={(e) => setUserFilters((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option value="">Tous rôles</option>
            <option value="STUDENT">Élève</option>
            <option value="TEACHER">Professeur</option>
            <option value="ADMIN">Admin</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  const token = getToken();
                  if (!token) return;
                  setError('');
                  await loadUsers(token, userFilters);
                } catch (e) {
                  setError(e.message || 'Erreur chargement utilisateurs.');
                }
              }}
            >
              Filtrer
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                const reset = { q: '', role: '' };
                setUserFilters(reset);
                try {
                  const token = getToken();
                  if (!token) return;
                  setError('');
                  await loadUsers(token, reset);
                } catch (e) {
                  setError(e.message || 'Erreur chargement utilisateurs.');
                }
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {usersLoading ? <p className="text-sm text-brand-700">Chargement utilisateurs...</p> : null}
        {!usersLoading && users.length === 0 ? <p className="text-sm text-brand-700">Aucun utilisateur trouvé.</p> : null}
        {!usersLoading && users.length > 0 ? (
          <div className="max-h-[62vh] overflow-auto rounded-lg border border-brand-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-[1] bg-white text-left">
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>École</th>
                  <th>Niveau</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.lastName} {user.firstName}</td>
                    <td>{user.email || '-'}</td>
                    <td>{user.role}</td>
                    <td>{user.school || '-'}</td>
                    <td>{user.gradeLevel || '-'}</td>
                    <td>{user.isSuspended ? 'Suspendu' : 'Actif'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {user.isSuspended ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={userActionLoadingId === user.id}
                            onClick={() => moderateUser(user.id, 'REACTIVATE')}
                          >
                            Réactiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={userActionLoadingId === user.id}
                            onClick={() => moderateUser(user.id, 'SUSPEND')}
                          >
                            Suspendre
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          disabled={userActionLoadingId === user.id}
                          onClick={() => deleteUser(user.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Inviter un professeur / partenaire</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="TEACHER">Professeur</option>
            <option value="PUBLISHER">Partenaire certifiant</option>
          </select>
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
                <th>Email</th><th>Rôle</th><th>Expire</th><th>Utilisee</th>
              </tr>
            </thead>
            <tbody>
              {invites.slice(0, 20).map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{i.role === 'PUBLISHER' ? 'Partenaire' : 'Professeur'}</td>
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
