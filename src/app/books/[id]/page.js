"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import SecurePDFViewer from '@/components/books/SecurePDFViewer';

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params?.id;
  const token = getToken();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookId || !token) return;
    setLoading(true);
    setError('');
    apiClient(`/books/${bookId}`, { token })
      .then((data) => {
        setBook(data?.book || null);
      })
      .catch((err) => {
        setError(err.message || 'Impossible de charger le livre.');
      })
      .finally(() => setLoading(false));
  }, [bookId, token]);

  if (!token) {
    return (
      <section className="card">
        <h1 className="text-2xl font-bold text-brand-900">Accès sécurisé</h1>
        <p className="mt-2 text-sm text-brand-700">Connecte-toi pour lire ce livre.</p>
        <div className="mt-4">
          <Link href="/login" className="btn-primary">Se connecter</Link>
        </div>
      </section>
    );
  }

  if (loading) return <p className="text-sm text-brand-700">Chargement...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!book) return <p className="text-sm text-brand-700">Livre introuvable.</p>;

  return (
    <section className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-28 w-20 overflow-hidden rounded-xl bg-brand-100">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-brand-600">PDF</div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-brand-900">{book.title}</h1>
            <p className="text-sm text-brand-700">{book.author || 'Auteur inconnu'}</p>
            <p className="mt-1 text-sm text-brand-700">{book.subject} • {book.level}</p>
            <p className="mt-2 text-sm font-semibold text-brand-700">
              {book.isPaid ? `Payant • ${book.price} HTG` : 'Gratuit'}
            </p>
            {book.publisher ? (
              <p className="mt-1 text-xs text-brand-600">Éditeur: {book.publisher.name}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-sm text-brand-700">{book.description || 'Aucune description fournie.'}</p>
      </div>

      {book.canAccess ? (
        <SecurePDFViewer bookId={book.id} />
      ) : (
        <div className="card border border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Accès payant requis</p>
          <p className="mt-1 text-sm text-amber-900">
            Ce livre est payant. Procède au paiement pour obtenir l’accès.
          </p>
        </div>
      )}
    </section>
  );
}
