"use client";

import { useEffect, useState } from 'react';
import { getToken, getStudent } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { apiClient } from '@/lib/api';

export default function PublisherBooksPage() {
  const token = getToken();
  const student = getStudent();
  const [publisher, setPublisher] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    subject: '',
    level: '',
    description: '',
    isPaid: false,
    price: ''
  });
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token || student?.role !== 'PUBLISHER') return;
    apiClient('/publishers/me', { token })
      .then((data) => setPublisher(data?.publisher || null))
      .catch(() => setPublisher(null));
  }, [token, student?.role]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) {
      setError('PDF obligatoire.');
      return;
    }
    try {
      setLoading(true);
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) body.append(key, value);
      });
      body.append('file', file);
      if (cover) body.append('coverImage', cover);

      const res = await fetch(`${getApiBaseUrl()}/books`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Erreur upload');
      }

      setSuccess('Livre envoyé avec succès. Validation admin requise.');
      setForm({
        title: '',
        author: '',
        subject: '',
        level: '',
        description: '',
        isPaid: false,
        price: ''
      });
      setFile(null);
      setCover(null);
    } catch (err) {
      setError(err.message || 'Erreur upload');
    } finally {
      setLoading(false);
    }
  };

  if (!token || student?.role !== 'PUBLISHER') {
    return <p className="text-sm text-brand-700">Accès réservé aux éditeurs.</p>;
  }

  if (publisher?.features && publisher.features.canPublishBooks === false) {
    return <p className="text-sm text-brand-700">L&apos;administration a désactivé la publication de livres pour ce compte.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Soumettre un livre</h1>
        <p className="mt-2 text-sm text-brand-700">Téléverse un PDF, il sera validé par l&apos;admin.</p>
      </div>

      <form className="card space-y-3" onSubmit={onSubmit}>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <input className="input" name="title" placeholder="Titre" value={form.title} onChange={onChange} required />
        <input className="input" name="author" placeholder="Auteur" value={form.author} onChange={onChange} />
        <input className="input" name="subject" placeholder="Matière" value={form.subject} onChange={onChange} required />
        <input className="input" name="level" placeholder="Niveau" value={form.level} onChange={onChange} required />
        <textarea className="input min-h-[120px]" name="description" placeholder="Description" value={form.description} onChange={onChange} />
        <label className="flex items-center gap-2 text-sm text-brand-700">
          <input type="checkbox" name="isPaid" checked={form.isPaid} onChange={onChange} />
          Livre payant
        </label>
        {form.isPaid ? (
          <input className="input" name="price" type="number" min="0" step="1" placeholder="Prix (HTG)" value={form.price} onChange={onChange} />
        ) : null}
        <div className="grid gap-2">
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </section>
  );
}
