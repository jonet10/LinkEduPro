'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
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
  const [platformDonations, setPlatformDonations] = useState([]);
  const [donationFilters, setDonationFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    q: ''
  });

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
      const [d, i, c, donationsPayload] = await Promise.all([
        apiClient('/community/admin/super-dashboard', { token }),
        apiClient('/community/admin/teacher-invitations', { token }),
        apiClient('/community/admin/config', { token }),
        apiClient('/platform-donations/admin/all', { token })
      ]);
      setDashboard(d);
      setInvites(i.invitations || []);
      setPlatformDonations(Array.isArray(donationsPayload?.donations) ? donationsPayload.donations : []);
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
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
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
