"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

export default function ParentChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState({ childName: '', childLevel: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const student = getStudent();
    if (!token || !student || student.role !== 'PARENT') {
      router.push('/login');
      return;
    }
    load(token);
  }, [router]);

  async function load(token) {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient('/parents/children', { token });
      setChildren(Array.isArray(data.children) ? data.children : []);
    } catch (e) {
      setError(e.message || 'Impossible de charger les enfants.');
    } finally {
      setLoading(false);
    }
  }

  async function addChild(e) {
    e.preventDefault();
    setError('');
    const token = getToken();
    try {
      await apiClient('/parents/children', {
        method: 'POST',
        token,
        body: JSON.stringify(form)
      });
      setForm({ childName: '', childLevel: '' });
      await load(token);
    } catch (e) {
      setError(e.message || 'Impossible d’ajouter l’enfant.');
    }
  }

  async function removeChild(id) {
    const token = getToken();
    await apiClient(`/parents/children/${id}`, { method: 'DELETE', token });
    await load(token);
  }

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-8">Chargement...</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">Mes enfants</h1>
        <p className="mt-1 text-sm text-brand-700">Gère les profils de tes enfants pour choisir un tuteur.</p>
      </div>

      <form className="card grid gap-3 md:grid-cols-2" onSubmit={addChild}>
        <input
          className="input"
          placeholder="Nom de l’enfant"
          value={form.childName}
          onChange={(e) => setForm((p) => ({ ...p, childName: e.target.value }))}
          required
        />
        <input
          className="input"
          placeholder="Niveau (ex: 7e, 8e, 9e, NSI...)"
          value={form.childLevel}
          onChange={(e) => setForm((p) => ({ ...p, childLevel: e.target.value }))}
          required
        />
        <button className="btn-primary md:col-span-2" type="submit">Ajouter</button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3">
        {children.length === 0 ? (
          <p className="text-sm text-brand-700">Aucun enfant enregistré.</p>
        ) : (
          children.map((child) => (
            <div key={child.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-brand-900">{child.childName}</p>
                <p className="text-xs text-brand-700">Niveau: {child.childLevel}</p>
              </div>
              <button className="btn-secondary" onClick={() => removeChild(child.id)}>Supprimer</button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
