"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';

export default function AdminPublishersPage() {
  const token = getToken();
  const student = getStudent();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: 'EDITOR',
    email: '',
    phone: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiClient('/publishers', { token })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => setError(err.message || 'Erreur chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient('/publishers', {
        method: 'POST',
        token,
        body: JSON.stringify(form)
      });
      setSuccess('Éditeur ajouté.');
      setForm({ name: '', type: 'EDITOR', email: '', phone: '', description: '' });
      load();
    } catch (err) {
      setError(err.message || 'Erreur création');
    }
  };

  if (!token || student?.role !== 'ADMIN') {
    return <p className="text-sm text-brand-700">Accès réservé aux administrateurs.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Éditeurs</h1>
        <p className="mt-2 text-sm text-brand-700">Ajoute et gère les éditeurs partenaires.</p>
      </div>

      <form className="card space-y-3" onSubmit={onSubmit}>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <input className="input" name="name" placeholder="Nom" value={form.name} onChange={onChange} required />
        <select className="input" name="type" value={form.type} onChange={onChange}>
          <option value="EDITOR">Éditeur</option>
          <option value="AUTHOR">Auteur</option>
        </select>
        <input className="input" name="email" placeholder="Email" value={form.email} onChange={onChange} required />
        <input className="input" name="phone" placeholder="Téléphone" value={form.phone} onChange={onChange} />
        <textarea className="input min-h-[120px]" name="description" placeholder="Description" value={form.description} onChange={onChange} />
        <button className="btn-primary" type="submit">Ajouter</button>
      </form>

      <div className="grid gap-3">
        {items.map((publisher) => (
          <article key={publisher.id} className="card">
            <p className="text-lg font-semibold text-brand-900">{publisher.name}</p>
            <p className="text-xs text-brand-700">{publisher.type}</p>
            <p className="text-xs text-brand-700">{publisher.email}</p>
            {publisher.phone ? <p className="text-xs text-brand-700">{publisher.phone}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
