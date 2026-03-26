"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';

export default function AdminBooksPage() {
  const token = getToken();
  const student = getStudent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiClient('/books', { token })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => setError(err.message || 'Erreur chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await apiClient(`/books/${id}/status`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status })
      });
      load();
    } catch (err) {
      setError(err.message || 'Erreur validation');
    }
  };

  if (!token || student?.role !== 'ADMIN') {
    return <p className="text-sm text-brand-700">Accès réservé aux administrateurs.</p>;
  }

  const pending = items.filter((b) => b.status === 'PENDING');

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Validation livres</h1>
        <p className="mt-2 text-sm text-brand-700">Valide ou rejette les livres soumis par les éditeurs.</p>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {pending.length === 0 && !loading ? (
        <p className="text-sm text-brand-700">Aucun livre en attente.</p>
      ) : null}

      <div className="grid gap-4">
        {pending.map((book) => (
          <article key={book.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-brand-900">{book.title}</p>
                <p className="text-xs text-brand-700">{book.author || 'Auteur inconnu'}</p>
                <p className="text-xs text-brand-700">{book.subject} • {book.level}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">En attente</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => updateStatus(book.id, 'APPROVED')}>Approuver</button>
              <button className="btn-secondary" onClick={() => updateStatus(book.id, 'REJECTED')}>Rejeter</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
