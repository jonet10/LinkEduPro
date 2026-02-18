"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    setDevCode('');
    try {
      const data = await apiClient('/auth/forgot-password/request', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim() })
      });
      setInfo(data.message || 'Code envoye.');
      if (data.devCode) {
        setDevCode(data.devCode);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Erreur envoi code.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }
    try {
      const data = await apiClient('/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          newPassword
        })
      });
      setInfo(data.message || 'Mot de passe reinitialise.');
      setTimeout(() => router.push('/login'), 1000);
    } catch (err) {
      setError(err.message || 'Erreur reinitialisation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md card space-y-4">
      <h1 className="text-2xl font-bold text-brand-900">Mot de passe oublie</h1>

      {step === 1 ? (
        <form onSubmit={requestCode} className="space-y-3">
          <input
            className="input"
            placeholder="Numero de telephone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le code SMS'}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-3">
          <input className="input" value={phone} disabled />
          <input
            className="input"
            placeholder="Code SMS (6 chiffres)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
          </button>
        </form>
      )}

      {devCode ? <p className="text-xs text-brand-700">Code de test: {devCode}</p> : null}
      {info ? <p className="text-sm text-green-600">{info}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Link href="/login" className="text-sm text-brand-700 hover:underline">Retour a la connexion</Link>
    </section>
  );
}

