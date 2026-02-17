'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

const SCHOOL_TOKEN_KEY = 'linkedupro_school_token';
const SCHOOL_ADMIN_KEY = 'linkedupro_school_admin';

export default function SchoolManagementLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('superadmin@linkedupro.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient('/school-management/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(SCHOOL_TOKEN_KEY, response.token);
        localStorage.setItem(SCHOOL_ADMIN_KEY, JSON.stringify(response.admin));
      }

      router.push('/admin/super-dashboard');
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <section className="card space-y-4">
        <h1 className="text-2xl font-bold text-brand-900">Connexion School Management</h1>
        <p className="text-sm text-brand-700">
          Connecte-toi avec un compte `SCHOOL_SUPER_ADMIN`, `SCHOOL_ADMIN` ou `SCHOOL_ACCOUNTANT`.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}
