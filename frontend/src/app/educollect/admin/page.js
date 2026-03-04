'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function formatHtg(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function EduCollectAdminPage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [partnerUserId, setPartnerUserId] = useState('');
  const [partnerVerified, setPartnerVerified] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const data = await apiClient('/educollect/admin/dashboard', { token });
      setDashboard(data);
    } catch (e) {
      setError(e.message || 'Impossible de charger le dashboard admin.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setStudent(getStudent());
    loadDashboard();
  }, []);

  async function updatePartnerVerification() {
    try {
      setError('');
      await apiClient(`/educollect/partners/${Number(partnerUserId)}/verify`, {
        method: 'PATCH',
        token: getToken(),
        body: JSON.stringify({ isVerified: partnerVerified })
      });
      setPartnerUserId('');
    } catch (e) {
      setError(e.message || 'Impossible de mettre à jour le badge partenaire.');
    }
  }

  if (!student || student.role !== 'ADMIN') {
    return <main className="mx-auto max-w-5xl px-4 py-8"><p>Accès admin requis.</p></main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card">
        <h1 className="text-2xl font-black text-brand-900">EduCollect - Dashboard Admin</h1>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}

      {dashboard ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <article className="card"><p className="text-xs text-brand-700">Projets en attente</p><p className="text-2xl font-black text-brand-900">{dashboard.stats?.pendingProjects || 0}</p></article>
            <article className="card"><p className="text-xs text-brand-700">Projets actifs</p><p className="text-2xl font-black text-brand-900">{dashboard.stats?.activeProjects || 0}</p></article>
            <article className="card"><p className="text-xs text-brand-700">Projets financés</p><p className="text-2xl font-black text-brand-900">{dashboard.stats?.fundedProjects || 0}</p></article>
            <article className="card"><p className="text-xs text-brand-700">Total collecté</p><p className="text-2xl font-black text-brand-900">{formatHtg(dashboard.stats?.totalCollected || 0)}</p></article>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-brand-900">Projets en attente</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(dashboard.pendingProjectsList || []).map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-100 px-3 py-2">
                  <p>{row.title} - {row.ownerName} ({formatHtg(row.targetAmount)})</p>
                  <Link className="btn-secondary" href={`/educollect/projects/${row.id}`}>Ouvrir</Link>
                </div>
              ))}
              {(dashboard.pendingProjectsList || []).length === 0 ? <p className="text-brand-700">Aucun projet en attente.</p> : null}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-brand-900">Transactions</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(dashboard.transactions || []).slice(0, 50).map((tx) => (
                <div key={tx.id} className="rounded border border-brand-100 px-3 py-2">
                  <p className="font-semibold text-brand-900">{tx.projectTitle}</p>
                  <p className="text-brand-700">{tx.donorName} · {tx.donorType}{tx.partnerVerified ? ' · Partenaire Vérifié' : ''}</p>
                  <p className="text-brand-700">{formatHtg(tx.amount)} · {tx.paymentMethod} · {tx.visibilityType}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-brand-900">Rapports soumis</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(dashboard.reports || []).slice(0, 30).map((row) => (
                <div key={row.id} className="rounded border border-brand-100 px-3 py-2">
                  <p className="font-semibold text-brand-900">{row.projectTitle}</p>
                  <p className="text-brand-700">Par {row.authorName}</p>
                  <p className="text-brand-700">{row.content}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold text-brand-900">Badge Partenaire Vérifié</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <input className="input" value={partnerUserId} onChange={(e) => setPartnerUserId(e.target.value)} placeholder="ID utilisateur" />
              <select className="input" value={partnerVerified ? 'yes' : 'no'} onChange={(e) => setPartnerVerified(e.target.value === 'yes')}>
                <option value="yes">Vérifié</option>
                <option value="no">Non vérifié</option>
              </select>
              <button className="btn-primary" type="button" onClick={updatePartnerVerification}>Appliquer</button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
