'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

export default function SupportPage() {
  const [student, setStudent] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    setStudent(getStudent());

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

    const hasCustom = String(customAmount || '').trim() !== '';
    const numericAmount = hasCustom ? Number(customAmount || 0) : Number(selectedAmount || 0);
    if (hasCustom && numericAmount <= 10) {
      setError('Le montant personnalisé doit être supérieur à 10 HTG.');
      return;
    }
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
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-brand-900">Faire un don (MonCash)</h2>
        {!student ? (
          <p className="mt-2 text-sm text-brand-700">
            Connecte-toi pour donner. <Link className="underline" href="/login">Se connecter</Link>
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={`amt-${value}`}
                  type="button"
                  className={selectedAmount === value && String(customAmount || '').trim() === '' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => {
                    setSelectedAmount(value);
                    setCustomAmount('');
                    setError('');
                  }}
                >
                  {value} HTG
                </button>
              ))}
            </div>
            <p className="text-xs text-brand-700">Ou entre un montant personnalisé supérieur à 10 HTG.</p>
            <input
              className="input"
              type="number"
              min="11"
              placeholder="Montant personnalisé (HTG)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setError('');
              }}
            />
            <button type="button" className="btn-primary" onClick={startDonation} disabled={busy}>
              {busy ? 'Redirection...' : 'Payer avec MonCash'}
            </button>
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {info ? <p className="mt-2 text-sm text-green-700">{info}</p> : null}
      </section>
    </main>
  );
}
