"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      setAuth(data.token, data.student);
      router.push('/subjects');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl font-bold text-brand-900">Connexion eleve</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input" placeholder="Email ou telephone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
      </form>
    </section>
  );
}
