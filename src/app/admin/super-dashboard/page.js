'use client';

import { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function SuperDashboardPage() {
  const token = useMemo(() => getToken(), []);
  const [dashboard, setDashboard] = useState(null);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const [d, i] = await Promise.all([
        apiClient('/community/admin/super-dashboard', { token }),
        apiClient('/community/admin/teacher-invitations', { token })
      ]);
      setDashboard(d);
      setInvites(i.invitations || []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createInvite() {
    try {
      setError('');
      const res = await apiClient('/community/admin/teacher-invitations', {
        method: 'POST',
        token,
        body: JSON.stringify({ email, expiresInHours })
      });
      setInviteLink(res.inviteLink || '');
      setEmail('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <button className="btn-primary" onClick={load}>Actualiser</button>
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
