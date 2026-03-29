"use client";

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

export default function PublisherSalesDashboard() {
  const router = useRouter();
  const token = getToken();
  const student = getStudent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token || student?.role !== 'PUBLISHER') return;
    let mounted = true;
    setLoading(true);
    setError('');
    apiClient('/publishers/me/sales', { token })
      .then((payload) => {
        if (!mounted) return;
        setData(payload || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Impossible de charger les ventes.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, student?.role]);

  if (!token || student?.role !== 'PUBLISHER') {
    return <p className="text-sm text-brand-700">Accès réservé aux partenaires.</p>;
  }

  if (loading) {
    return <p className="text-sm text-brand-700">Chargement du dashboard ventes...</p>;
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{error}</p>
        <button className="btn-secondary mt-3" type="button" onClick={() => router.push('/')}>
          Retour accueil
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const monthly = Array.isArray(data?.monthly) ? data.monthly : [];
  const recentSales = Array.isArray(data?.recentSales) ? data.recentSales : [];
  const canView = data?.publisher?.features?.canViewSalesDashboard !== false;

  if (!canView) {
    return <p className="text-sm text-brand-700">Le super admin a désactivé votre dashboard des ventes.</p>;
  }

  const topMonth = useMemo(() => {
    if (!monthly.length) return null;
    return monthly.reduce((best, row) => (row.total > (best?.total || 0) ? row : best), monthly[0]);
  }, [monthly]);

  return (
    <main className="space-y-5">
      <section className="card space-y-2">
        <h1 className="text-3xl font-bold text-brand-900">Tableau de bord des ventes</h1>
        <p className="text-sm text-brand-700">Suivez vos revenus, ventes et tendances mensuelles.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-brand-700">Revenus nets</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{formatHtg(summary.netRevenue)}</p>
          <p className="mt-1 text-xs text-brand-700">Commission: {formatHtg(summary.commission)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-brand-700">Ventes totales</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{summary.totalSales || 0}</p>
          <p className="mt-1 text-xs text-brand-700">Acheteurs uniques: {summary.totalBuyers || 0}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-brand-700">Catalogue</p>
          <p className="mt-2 text-3xl font-black text-brand-900">{summary.totalBooks || 0}</p>
          <p className="mt-1 text-xs text-brand-700">Top mois: {topMonth ? `${topMonth.month} (${formatHtg(topMonth.total)})` : '—'}</p>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">Revenus mensuels</h2>
            <span className="text-xs text-brand-700">6 derniers mois</span>
          </div>
          <div className="mt-4 space-y-2">
            {monthly.length ? monthly.map((row) => (
              <div key={row.month} className="flex items-center gap-3">
                <div className="w-16 text-xs text-brand-700">{row.month}</div>
                <div className="h-2 flex-1 rounded-full bg-brand-100">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, Math.max(8, (row.total / (topMonth?.total || 1)) * 100))}%` }}
                  />
                </div>
                <div className="text-sm font-semibold text-brand-900">{formatHtg(row.total)}</div>
              </div>
            )) : <p className="text-sm text-brand-700">Aucune donnée mensuelle.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">Dernières ventes</h2>
          </div>
          <div className="mt-3 space-y-3">
            {recentSales.length ? recentSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border border-brand-100 p-3">
                <p className="text-sm font-semibold text-brand-900">{sale.book?.title || 'Livre'}</p>
                <p className="text-xs text-brand-700">{new Date(sale.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm text-brand-900">{formatHtg(sale.sellerAmount || sale.amount)}</p>
              </div>
            )) : <p className="text-sm text-brand-700">Aucune vente récente.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
