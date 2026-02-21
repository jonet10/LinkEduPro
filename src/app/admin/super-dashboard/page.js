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
      const [d, i] = await Promise.all([
        apiClient('/community/admin/super-dashboard', { token }),
        apiClient('/community/admin/teacher-invitations', { token })
      ]);
      setDashboard(d);
      setInvites(i.invitations || []);
      await loadStudents(token, studentFilters);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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
          <div className="card"><p className="text-sm">Ecoles</p><p className="text-2xl font-bold">{dashboard.analytics.schools}</p></div>
          <div className="card"><p className="text-sm">Eleves NS4</p><p className="text-2xl font-bold">{dashboard.analytics.publicStudents}</p></div>
          <div className="card"><p className="text-sm">Professeurs</p><p className="text-2xl font-bold">{dashboard.analytics.teachers}</p></div>
          <div className="card"><p className="text-sm">Paiements mensuels</p><p className="text-2xl font-bold">{String(dashboard.analytics.monthlyInternalPayments)}</p></div>
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Liste globale des eleves (module eleves)</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            className="input"
            value={studentFilters.school}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, school: e.target.value }))}
          >
            <option value="">Global - toutes ecoles</option>
            {studentFilterOptions.schools.map((school) => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
          <select
            className="input"
            value={studentFilters.department}
            onChange={(e) => setStudentFilters((prev) => ({ ...prev, department: e.target.value }))}
          >
            <option value="">Tous departements</option>
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
            placeholder="Recherche nom/email/ecole"
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
          <p className="text-sm text-brand-700">Aucun eleve trouve.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Ecole</th>
                  <th>Departement</th>
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
