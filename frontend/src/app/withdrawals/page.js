"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function formatHTG(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 2
  }).format(amount);
}

export default function WithdrawalsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);
  const canWithdraw = ['STUDENT', 'TEACHER'].includes(String(student?.role || '').toUpperCase());

  const [balance, setBalance] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [form, setForm] = useState({
    amount: '',
    method: 'MONCASH',
    payoutAccount: '',
    payoutName: ''
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!canWithdraw) {
      router.push('/profile');
      return;
    }

    Promise.all([
      apiClient('/payouts/balance', { token }),
      apiClient('/payouts/me', { token })
    ])
      .then(([balanceRes, withdrawalsRes]) => {
        setBalance(balanceRes);
        setWithdrawals(withdrawalsRes.withdrawals || []);
      })
      .catch((e) => setError(e.message || 'Impossible de charger les retraits.'))
      .finally(() => setLoading(false));
  }, [token, canWithdraw, router]);

  function onChangeField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const payload = {
        amount: Number(form.amount || 0),
        method: form.method,
        payoutAccount: form.payoutAccount,
        payoutName: form.payoutName
      };
      const res = await apiClient('/payouts/request', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      setInfo(res.message || 'Demande envoyée.');
      setForm({ amount: '', method: 'MONCASH', payoutAccount: '', payoutName: '' });
      const [balanceRes, withdrawalsRes] = await Promise.all([
        apiClient('/payouts/balance', { token }),
        apiClient('/payouts/me', { token })
      ]);
      setBalance(balanceRes);
      setWithdrawals(withdrawalsRes.withdrawals || []);
    } catch (e2) {
      setError(e2.message || 'Impossible de créer la demande.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Retrait de gains</h1>
        <p className="mt-2 text-sm text-brand-700">
          Demande un retrait via MonCash ou NatCash. Minimum: 500 HTG. Validation requise par le super admin.
        </p>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}

      {balance ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="text-xs font-semibold uppercase text-brand-700">Solde disponible</p>
            <p className="mt-2 text-2xl font-black text-brand-900">{formatHTG(balance.available)}</p>
          </div>
          <div className="card">
            <p className="text-xs font-semibold uppercase text-brand-700">Revenus totaux</p>
            <p className="mt-2 text-2xl font-black text-brand-900">{formatHTG(balance.totalEarnings)}</p>
          </div>
          <div className="card">
            <p className="text-xs font-semibold uppercase text-brand-700">Montants réservés</p>
            <p className="mt-2 text-2xl font-black text-brand-900">{formatHTG(balance.reserved)}</p>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-900">Nouvelle demande</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Montant (HTG)</span>
            <input
              className="input w-full"
              type="number"
              min="500"
              value={form.amount}
              onChange={(e) => onChangeField('amount', e.target.value)}
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Méthode</span>
            <select className="input w-full" value={form.method} onChange={(e) => onChangeField('method', e.target.value)}>
              <option value="MONCASH">MonCash</option>
              <option value="NATCASH">NatCash</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Compte (numéro)</span>
            <input
              className="input w-full"
              value={form.payoutAccount}
              onChange={(e) => onChangeField('payoutAccount', e.target.value)}
              placeholder="Ex: 509xxxxxxxx"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-brand-900">Nom du titulaire (optionnel)</span>
            <input
              className="input w-full"
              value={form.payoutName}
              onChange={(e) => onChangeField('payoutName', e.target.value)}
            />
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Demander un retrait'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-900">Historique des demandes</h2>
        <div className="mt-3 space-y-2">
          {withdrawals.map((row) => (
            <div key={row.id} className="rounded-xl border border-brand-100 bg-white/70 p-3">
              <p className="font-semibold text-brand-900">{formatHTG(row.amount)} • {row.method}</p>
              <p className="text-xs text-brand-700">Statut: {row.status}</p>
              <p className="text-xs text-brand-700">Compte: {row.payoutAccount}</p>
            </div>
          ))}
          {withdrawals.length === 0 ? <p className="text-sm text-brand-700">Aucune demande pour le moment.</p> : null}
        </div>
      </div>
    </section>
  );
}
