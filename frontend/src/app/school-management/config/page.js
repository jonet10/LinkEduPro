'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

export default function SchoolConfigPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [gradingScale, setGradingScale] = useState('20');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      const allowedRoles = ['SCHOOL_ADMIN'];

      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (!allowedRoles.includes(currentAdmin.role)) {
        clearSchoolAuth();
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);
      try {
        setError('');
        const data = await apiClient(`/school-management/config/schools/${currentAdmin.schoolId}`, { token });
        setGradingScale(String(data?.config?.gradingScale || 20));
      } catch (e) {
        setError(e.message || 'Impossible de charger la configuration.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function saveConfig() {
    if (!admin) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/config/schools/${admin.schoolId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ gradingScale: Number(gradingScale) })
      });
      setSuccess('Configuration enregistrée.');
    } catch (e) {
      setError(e.message || 'Impossible de sauvegarder la configuration.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-700">Configuration</p>
          <h1 className="text-2xl font-bold text-brand-900">Paramètres des notes</h1>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour au dashboard
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <section className="card space-y-4">
        <div>
          <p className="text-sm text-brand-700">Barème de notation</p>
          <p className="text-xs text-brand-600">Choisis le barème utilisé pour les moyennes et les bulletins.</p>
        </div>
        <select
          className="input"
          value={gradingScale}
          onChange={(e) => setGradingScale(e.target.value)}
        >
          <option value="20">/20</option>
          <option value="100">/100</option>
        </select>
        <button className="btn-primary" disabled={saving} onClick={saveConfig}>
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </button>
      </section>
    </main>
  );
}
