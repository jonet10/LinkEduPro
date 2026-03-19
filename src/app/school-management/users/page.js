'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const ROLE_OPTIONS = [
  { value: 'SCHOOL_ADMIN', label: 'Administrateur école' },
  { value: 'SCHOOL_PAYMENTS_MANAGER', label: 'Gestionnaire des paiements' },
  { value: 'SCHOOL_REPORTS_MANAGER', label: 'Gestionnaire des bulletins' },
  { value: 'SCHOOL_ACCOUNTANT', label: 'Comptable' },
  { value: 'SCHOOL_TEACHER', label: 'Enseignant (futur)' }
];

export default function SchoolUsersPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'SCHOOL_PAYMENTS_MANAGER'
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');

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
        const res = await apiClient(`/school-management/admins/schools/${currentAdmin.schoolId}`, { token });
        setAdmins(res.admins || []);
      } catch (e) {
        setError(e.message || 'Impossible de charger les comptes.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function reloadAdmins() {
    if (!admin) return;
    const token = getSchoolToken();
    const res = await apiClient(`/school-management/admins/schools/${admin.schoolId}`, { token });
    setAdmins(res.admins || []);
  }

  async function createAdmin(e) {
    e.preventDefault();
    if (!admin) return;
    setCreating(true);
    setError('');
    setSuccess('');
    setTempPassword('');
    try {
      const token = getSchoolToken();
      const res = await apiClient('/school-management/admins', {
        method: 'POST',
        token,
        body: JSON.stringify({
          schoolId: admin.schoolId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || null,
          role: form.role
        })
      });
      setTempPassword(res.temporaryPassword || '');
      setSuccess('Compte créé avec succès.');
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'SCHOOL_PAYMENTS_MANAGER'
      });
      await reloadAdmins();
    } catch (e) {
      setError(e.message || 'Impossible de créer le compte.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(target) {
    if (!admin) return;
    const token = getSchoolToken();
    setError('');
    setSuccess('');
    try {
      await apiClient(`/school-management/admins/${target.id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: !target.isActive })
      });
      await reloadAdmins();
      setSuccess('Statut mis à jour.');
    } catch (e) {
      setError(e.message || 'Impossible de modifier le statut.');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Comptes utilisateurs</p>
          <h1 className="text-2xl font-bold text-brand-900">Gestion des rôles</h1>
        </div>
        <button className="btn-secondary" type="button" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {success ? <p className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</p> : null}
      {tempPassword ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
          Mot de passe temporaire: <span className="font-semibold">{tempPassword}</span>
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Créer un compte</h2>
          <form onSubmit={createAdmin} className="grid gap-3 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Prénom"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Nom"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              className="input"
              placeholder="Téléphone (optionnel)"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <select
              className="input sm:col-span-2"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary w-fit" disabled={creating}>
              {creating ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </article>

        <article className="card">
          <h2 className="text-lg font-semibold text-brand-900 mb-4">Comptes existants</h2>
          {admins.length === 0 ? (
            <p className="text-sm text-brand-700">Aucun compte supplémentaire.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-200">
                    <th className="py-2 text-left">Nom</th>
                    <th className="py-2 text-left">Email</th>
                    <th className="py-2 text-left">Rôle</th>
                    <th className="py-2 text-left">Statut</th>
                    <th className="py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((item) => (
                    <tr key={item.id} className="border-b border-brand-100">
                      <td className="py-2">{item.firstName} {item.lastName}</td>
                      <td className="py-2">{item.email}</td>
                      <td className="py-2">{ROLE_OPTIONS.find((r) => r.value === item.role)?.label || item.role}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-2">
                        {item.id === admin?.id ? (
                          <span className="text-xs text-brand-700">Compte actuel</span>
                        ) : (
                          <button
                            className="btn-secondary !px-3 !py-1"
                            type="button"
                            onClick={() => toggleStatus(item)}
                          >
                            {item.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
