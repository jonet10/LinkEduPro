'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { clearSchoolAuth, getSchoolAdmin, getSchoolToken } from '@/lib/schoolAuth';

const initialForm = {
  name: '',
  type: 'PRIVATE',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Haiti',
  logo: '',
  adminFirstName: '',
  adminLastName: '',
  adminPhone: ''
};

export default function SchoolManagementSchoolsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    async function load() {
      const token = getSchoolToken();
      const currentAdmin = getSchoolAdmin();
      if (!token || !currentAdmin) {
        router.push('/school-management/login');
        return;
      }

      if (currentAdmin.role !== 'SUPER_ADMIN') {
        clearSchoolAuth();
        router.push('/school-management/login');
        return;
      }

      setAdmin(currentAdmin);
      try {
        const data = await apiClient('/school-management/schools', { token });
        setSchools(data.schools || []);
      } catch (e) {
        setError(e.message || 'Impossible de charger les ecoles.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function reloadSchools() {
    const token = getSchoolToken();
    const data = await apiClient('/school-management/schools', { token });
    setSchools(data.schools || []);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');
    setCredentials(null);

    try {
      const token = getSchoolToken();
      const payload = {
        ...form,
        logo: String(form.logo || '').trim() || null,
        adminPhone: String(form.adminPhone || '').trim() || null
      };

      const data = await apiClient('/school-management/schools', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      setSuccess('Ecole creee avec succes.');
      setCredentials(data.schoolAdmin || null);
      setForm(initialForm);
      await reloadSchools();
    } catch (e) {
      setError(e.message || 'Erreur pendant la creation de l ecole.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Chargement...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-700">Super Admin</p>
          <h1 className="text-2xl font-bold text-brand-900">Gestion des ecoles</h1>
          <p className="text-sm text-brand-700">Connecte: {admin?.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => router.push('/school-management/dashboard')}>
          Retour dashboard
        </button>
      </section>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
      {success ? <p className="rounded border border-green-200 bg-green-50 p-3 text-green-700">{success}</p> : null}

      {credentials ? (
        <section className="card space-y-1">
          <h2 className="text-lg font-semibold text-brand-900">Identifiants admin ecole</h2>
          <p className="text-sm text-brand-700">Email: <span className="font-semibold text-brand-900">{credentials.email}</span></p>
          <p className="text-sm text-brand-700">Mot de passe temporaire: <span className="font-semibold text-brand-900">{credentials.temporaryPassword}</span></p>
          <p className="text-xs text-brand-700">Conserve ces informations. L admin de l ecole devra changer son mot de passe a la premiere connexion.</p>
        </section>
      ) : null}

      <section className="card">
        <h2 className="mb-4 text-xl font-semibold text-brand-900">Ajouter une ecole</h2>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Nom de l ecole" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <select className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} required>
            <option value="PRIVATE">Privee</option>
            <option value="PUBLIC">Publique</option>
            <option value="OTHER">Autre</option>
          </select>
          <input className="input" placeholder="Telephone ecole" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
          <input className="input" type="email" placeholder="Email ecole" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="input sm:col-span-2" placeholder="Adresse" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
          <input className="input" placeholder="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} required />
          <input className="input" placeholder="Pays" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} required />
          <input className="input sm:col-span-2" placeholder="Logo URL (optionnel)" value={form.logo} onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))} />
          <input className="input" placeholder="Prenom admin ecole" value={form.adminFirstName} onChange={(e) => setForm((p) => ({ ...p, adminFirstName: e.target.value }))} required />
          <input className="input" placeholder="Nom admin ecole" value={form.adminLastName} onChange={(e) => setForm((p) => ({ ...p, adminLastName: e.target.value }))} required />
          <input className="input sm:col-span-2" placeholder="Telephone admin (optionnel)" value={form.adminPhone} onChange={(e) => setForm((p) => ({ ...p, adminPhone: e.target.value }))} />
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creation...' : 'Ajouter l ecole'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-4 text-xl font-semibold text-brand-900">Ecoles existantes ({schools.length})</h2>
        {schools.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune ecole pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200">
                  <th className="py-2 text-left">Nom</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Ville</th>
                  <th className="py-2 text-left">Telephone</th>
                  <th className="py-2 text-left">Eleves</th>
                  <th className="py-2 text-left">Classes</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b border-brand-100">
                    <td className="py-2">{school.name}</td>
                    <td className="py-2">{school.type}</td>
                    <td className="py-2">{school.city}</td>
                    <td className="py-2">{school.phone}</td>
                    <td className="py-2">{school?._count?.students ?? 0}</td>
                    <td className="py-2">{school?._count?.classes ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
