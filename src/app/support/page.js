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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function SupportPage() {
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalDonations: 0,
    totalDonors: 0
  });
  const [donations, setDonations] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const [summaryData, mineData] = await Promise.all([
        apiClient('/platform-donations/summary'),
        token ? apiClient('/platform-donations/mine', { token }) : Promise.resolve({ donations: [] })
      ]);
      setSummary({
        totalCollected: Number(summaryData?.totalCollected || 0),
        totalDonations: Number(summaryData?.totalDonations || 0),
        totalDonors: Number(summaryData?.totalDonors || 0)
      });
      setDonations(Array.isArray(mineData?.donations) ? mineData.donations : []);
    } catch (e) {
      setError(e.message || 'Impossible de charger la page support.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setStudent(getStudent());
    loadData();

    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search);
      const provider = String(query.get('provider') || '').trim().toLowerCase();
      const payment = String(query.get('payment') || '').trim().toLowerCase();
      if (provider === 'moncash' && payment === 'success') {
        setInfo('Merci. Ton don a été confirmé.');
      } else if (provider === 'moncash' && payment === 'failed') {
        setError('Le paiement du don a échoué.');
      }
    }
  }, []);

  async function startDonation() {
    const token = getToken();
    if (!token) {
      setInfo('Connecte-toi pour faire un don.');
      return;
    }
    const numericAmount = Number(amount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Montant invalide.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      setInfo('');
      const data = await apiClient('/platform-donations/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({
          amount: numericAmount,
          paymentMethod: 'MONCASH'
        })
      });
      if (data.redirectUrl && typeof window !== 'undefined') {
        window.location.assign(data.redirectUrl);
        return;
      }
      setError('URL de paiement indisponible.');
    } catch (e) {
      setError(e.message || 'Impossible de démarrer le paiement.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Support LinkEduPro</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">Soutenir la plateforme</h1>
        <p className="mt-2 text-sm text-brand-700">
          Tes contributions financent les contenus éducatifs, l’infrastructure et les améliorations continues.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-brand-700 sm:grid-cols-3">
          <p>Total collecté: <strong>{formatHtg(summary.totalCollected)}</strong></p>
          <p>Dons confirmés: <strong>{summary.totalDonations}</strong></p>
          <p>Donateurs: <strong>{summary.totalDonors}</strong></p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900">Faire un don (MonCash)</h2>
        {!student ? (
          <p className="mt-2 text-sm text-brand-700">
            Connecte-toi pour donner. <Link className="underline" href="/login">Se connecter</Link>
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Montant (HTG)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" className="btn-primary" onClick={startDonation} disabled={busy}>
              {busy ? 'Redirection...' : 'Payer avec MonCash'}
            </button>
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {info ? <p className="mt-2 text-sm text-green-700">{info}</p> : null}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900">Mes dons</h2>
        {loading ? <p className="mt-2 text-sm text-brand-700">Chargement...</p> : null}
        {!loading && donations.length === 0 ? (
          <p className="mt-2 text-sm text-brand-700">Aucun don enregistré pour le moment.</p>
        ) : null}
        <div className="mt-3 space-y-2">
          {donations.map((row) => (
            <article key={row.id} className="rounded-lg border border-brand-100 px-3 py-2 text-sm">
              <p className="font-semibold text-brand-900">{formatHtg(row.amount)} · {row.paymentMethod}</p>
              <p className="text-brand-700">Statut: {row.status}</p>
              <p className="text-brand-700">Référence: {row.orderRef || '-'}</p>
              <p className="text-brand-700">Créé le: {formatDate(row.createdAt)}</p>
              {row.paidAt ? <p className="text-brand-700">Confirmé le: {formatDate(row.paidAt)}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
