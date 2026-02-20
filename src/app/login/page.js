"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [showUpdateEmail, setShowUpdateEmail] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    const verified = params.get('verified');
    if (!message) return;

    if (verified === '1') {
      setInfo(message);
      setError('');
      return;
    }

    setError(message);
    setInfo('');
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setShowResend(false);
    setShowUpdateEmail(false);
    setLoading(true);
    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      setAuth(data.token, data.student);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setShowResend(true);
        setShowUpdateEmail(true);
        setResendEmail(err.data?.email || (identifier.includes('@') ? identifier.trim() : ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError('');
    setInfo('');
    if (!resendEmail) {
      setError('Email requis pour renvoyer la vérification.');
      return;
    }
    setResending(true);
    try {
      const data = await apiClient('/auth/resend-verification-email', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail })
      });
      setInfo(data.message || 'Email de vérification renvoyé.');
      if (data.devVerificationToken) {
        setInfo((prev) => `${prev} Token dev: ${data.devVerificationToken}`);
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi.");
    } finally {
      setResending(false);
    }
  };

  const onUpdateEmail = async () => {
    setError('');
    setInfo('');

    if (!resendEmail || !newEmail || !password) {
      setError('Email actuel, nouvel email et mot de passe sont requis.');
      return;
    }

    setUpdatingEmail(true);
    try {
      const data = await apiClient('/auth/update-unverified-email', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail, newEmail, password })
      });
      setInfo(data.message || 'Email mis à jour.');
      setResendEmail(newEmail);
      setNewEmail('');
      if (data.devVerificationToken) {
        setInfo((prev) => `${prev} Token dev: ${data.devVerificationToken}`);
      }
    } catch (err) {
      setError(err.message || "Erreur mise à jour de l'email.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  return (
    <section className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl font-bold text-brand-900">Connexion élève</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input" placeholder="Email ou téléphone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-green-600">{info}</p> : null}
        {showResend ? (
          <div className="space-y-2">
            <input className="input" type="email" placeholder="Votre email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} required />
            <button className="btn-secondary w-full" type="button" onClick={onResend} disabled={resending}>
              {resending ? 'Envoi...' : 'Renvoyer email de vérification'}
            </button>
            {showUpdateEmail ? (
              <>
                <input className="input" type="email" placeholder="Nouvel email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <button className="btn-secondary w-full" type="button" onClick={onUpdateEmail} disabled={updatingEmail}>
                  {updatingEmail ? 'Mise à jour...' : "Modifier l'adresse email"}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
      </form>
      <div className="mt-4 text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">Mot de passe oublié ?</Link>
      </div>
    </section>
  );
}
