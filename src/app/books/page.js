"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';

const LEVELS = ['7e', '8e', '9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];
const SUBJECTS = ['Math', 'Français', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire', 'Géographie'];

export default function SecureBooksPage() {
  const [token, setToken] = useState('');
  const [student, setStudent] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [paidFilter, setPaidFilter] = useState('');

  const filters = useMemo(() => ({ subject, level, paidFilter }), [subject, level, paidFilter]);

  useEffect(() => {
    setToken(getToken() || '');
    setStudent(getStudent());
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.level) params.set('level', filters.level);
    if (filters.paidFilter) params.set('isPaid', filters.paidFilter);

    setLoading(true);
    setError('');
    apiClient(`/books?${params.toString()}`, { token })
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => {
        setError(err.message || 'Impossible de charger les livres.');
      })
      .finally(() => setLoading(false));
  }, [token, filters]);

  if (!token) {
    return (
      <section className="card">
        <h1 className="text-2xl font-bold text-brand-900">Bibliothèque sécurisée</h1>
        <p className="mt-2 text-sm text-brand-700">Connecte-toi pour accéder aux livres protégés.</p>
        <div className="mt-4">
          <Link href="/login" className="btn-primary">Se connecter</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Bibliothèque sécurisée</h1>
        <p className="mt-2 text-sm text-brand-700">
          Accède aux livres validés avec protection PDF et watermark personnalisé.
        </p>
      </div>

      <div className="card grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700">Matière</p>
          <select className="input mt-2" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Toutes</option>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700">Niveau</p>
          <select className="input mt-2" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Tous</option>
            {LEVELS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700">Type</p>
          <select className="input mt-2" value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)}>
            <option value="">Tous</option>
            <option value="false">Gratuit</option>
            <option value="true">Payant</option>
          </select>
        </div>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-brand-700">Aucun livre disponible pour ces critères.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((book) => (
          <article key={book.id} className="card">
            <div className="flex items-start gap-3">
              <div className="h-20 w-16 overflow-hidden rounded-lg bg-brand-100">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-brand-600">PDF</div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-brand-900">{book.title}</p>
                <p className="text-xs text-brand-700">{book.author || 'Auteur inconnu'}</p>
                <p className="mt-1 text-xs text-brand-700">{book.subject} • {book.level}</p>
                <p className="mt-1 text-xs font-semibold text-brand-700">
                  {book.isPaid ? `Payant • ${book.price} HTG` : 'Gratuit'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-brand-700 line-clamp-3">{book.description || 'Description non disponible.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href={`/books/${book.id}`} className="btn-primary">
                {book.canAccess ? 'Lire le livre' : 'Voir les détails'}
              </Link>
              {!book.canAccess ? (
                <span className="text-xs text-amber-700">Paiement requis pour lire</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
