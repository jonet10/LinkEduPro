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
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'PRIVATE',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Haiti',
    logo: ''
  });
  const [actingSchoolId, setActingSchoolId] = useState(null);

  function computeInactivity(lastPaymentDate) {
    if (!lastPaymentDate) return { days: null, label: 'Aucun paiement', tone: 'text-red-700' };
    const date = new Date(lastPaymentDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 60) return { days: diff, label: `Inactif ${diff}j`, tone: 'text-red-700' };
    if (diff >= 30) return { days: diff, label: `Attention ${diff}j`, tone: 'text-yellow-700' };
    return { days: diff, label: `Actif ${diff}j`, tone: 'text-green-700' };
  }

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

  function startEditSchool(school) {
    setEditingSchoolId(school.id);
    setEditForm({
      name: school.name || '',
      type: school.type || 'PRIVATE',
      phone: school.phone || '',
      email: school.email || '',
      address: school.address || '',
      city: school.city || '',
      country: school.country || 'Haiti',
      logo: school.logo || ''
    });
    setError('');
    setSuccess('');
  }

  async function saveEditSchool(schoolId) {
    setActingSchoolId(schoolId);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      await apiClient(`/school-management/schools/${schoolId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          ...editForm,
          logo: String(editForm.logo || '').trim() || null
        })
      });
      setEditingSchoolId(null);
      setSuccess('Informations de l ecole mises a jour.');
      await reloadSchools();
    } catch (e) {
      setError(e.message || 'Impossible de modifier cette ecole.');
    } finally {
      setActingSchoolId(null);
    }
  }

  async function toggleSchoolStatus(school) {
    const willSuspend = Boolean(school.isActive);
    const confirmMsg = willSuspend
      ? 'Suspendre cette ecole pour paiement inactif ?'
      : 'Reactiver cette ecole ?';
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    let reason = '';
    if (willSuspend) {
      reason = window.prompt('Motif de suspension (ex: paiement inactif):', 'paiement inactif') || '';
    }

    setActingSchoolId(school.id);
    setError('');
    setSuccess('');
    try {
      const token = getSchoolToken();
      const data = await apiClient(`/school-management/schools/${school.id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          isActive: !willSuspend,
          reason: reason || null
        })
      });
      setSuccess(data.message || (willSuspend ? 'Ecole suspendue.' : 'Ecole reactivee.'));
      await reloadSchools();
    } catch (e) {
      setError(e.message || 'Impossible de changer le statut de l ecole.');
    } finally {
      setActingSchoolId(null);
    }
  }

  async function resetAdminPassword(school) {
    const confirmed = window.confirm(`Reinitialiser le mot de passe de l admin pour ${school.name} ?`);
    if (!confirmed) return;

    setActingSchoolId(school.id);
    setError('');
    setSuccess('');
    setCredentials(null);
    try {
      const token = getSchoolToken();
      const data = await apiClient(`/school-management/schools/${school.id}/reset-admin-password`, {
        method: 'POST',
        token
      });
      setCredentials(data.schoolAdmin || null);
      setSuccess(data.message || 'Mot de passe admin reinitialise.');
      await reloadSchools();
    } catch (e) {
      setError(e.message || 'Impossible de reinitialiser le mot de passe admin.');
    } finally {
      setActingSchoolId(null);
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
          <h2 className="text-lg font-semibold text-brand-900">Identifiants admin ecole (creation / reinitialisation)</h2>
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
                  <th className="py-2 text-left">Email admin ecole</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-left">Ville</th>
                  <th className="py-2 text-left">Telephone</th>
                  <th className="py-2 text-left">Dernier paiement</th>
                  <th className="py-2 text-left">Statut</th>
                  <th className="py-2 text-left">Eleves</th>
                  <th className="py-2 text-left">Classes</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b border-brand-100">
                    <td className="py-2">
                      <div className="space-y-1">
                        <p>{school.primaryAdminEmail || '-'}</p>
                        <p className={`text-xs ${school.primaryAdminActive === false ? 'text-red-700' : 'text-brand-700'}`}>
                          {school.primaryAdminActive === false ? 'Compte admin inactif' : 'Compte admin actif'}
                        </p>
                      </div>
                    </td>
                    <td className="py-2">
                      {editingSchoolId === school.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : school.name}
                    </td>
                    <td className="py-2">
                      {editingSchoolId === school.id ? (
                        <select
                          className="input !py-1"
                          value={editForm.type}
                          onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                        >
                          <option value="PRIVATE">Privee</option>
                          <option value="PUBLIC">Publique</option>
                          <option value="OTHER">Autre</option>
                        </select>
                      ) : school.type}
                    </td>
                    <td className="py-2">
                      {editingSchoolId === school.id ? (
                        <input
                          className="input !py-1"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                        />
                      ) : school.email}
                    </td>
                    <td className="py-2">
                      {editingSchoolId === school.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.city}
                          onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                        />
                      ) : school.city}
                    </td>
                    <td className="py-2">
                      {editingSchoolId === school.id ? (
                        <input
                          className="input !py-1"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                      ) : school.phone}
                    </td>
                    <td className="py-2">
                      {(() => {
                        const state = computeInactivity(school.lastPaymentDate);
                        return (
                          <div className="space-y-1">
                            <p>{school.lastPaymentDate ? new Date(school.lastPaymentDate).toLocaleDateString('fr-FR') : '-'}</p>
                            <p className={`text-xs font-semibold ${state.tone}`}>{state.label}</p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${school.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                        {school.isActive ? 'Active' : 'Suspendue'}
                      </span>
                    </td>
                    <td className="py-2">{school?._count?.students ?? 0}</td>
                    <td className="py-2">{school?._count?.classes ?? 0}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {editingSchoolId === school.id ? (
                          <>
                            <button
                              type="button"
                              className="btn-primary !px-3 !py-1"
                              disabled={actingSchoolId === school.id}
                              onClick={() => saveEditSchool(school.id)}
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-1"
                              onClick={() => setEditingSchoolId(null)}
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-1"
                              onClick={() => startEditSchool(school)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-1"
                              disabled={actingSchoolId === school.id}
                              onClick={() => toggleSchoolStatus(school)}
                            >
                              {school.isActive ? 'Suspendre (paiement)' : 'Reactiver'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-1"
                              disabled={actingSchoolId === school.id}
                              onClick={() => resetAdminPassword(school)}
                            >
                              Reset mot de passe
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
