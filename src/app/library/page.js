"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

function BookCard({ book, premium }) {
  return (
    <article className="card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-brand-900">{book.title}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${premium ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>
          {premium ? 'Premium' : 'Gratuit'}
        </span>
      </div>
      <p className="text-sm text-brand-700">{book.description}</p>
      <p className="mt-2 text-xs text-brand-500">{book.subject} | {book.level} | {book.format}</p>
      {premium ? (
        <button className="btn-secondary mt-4" type="button">Debloquer Premium</button>
      ) : (
        <a className="btn-primary mt-4 inline-block" href={book.url} target="_blank" rel="noreferrer">Ouvrir le livre</a>
      )}
    </article>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [freeBooks, setFreeBooks] = useState([]);
  const [premiumBooks, setPremiumBooks] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    apiClient('/library/books', { token })
      .then((data) => {
        setFreeBooks(data.free || []);
        setPremiumBooks(data.premium || []);
        setNote(data.note || '');
      })
      .catch((e) => setError(e.message || 'Impossible de charger la bibliotheque'));
  }, [router]);

  return (
    <section className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-black text-brand-900">Bibliotheque numerique</h1>
        <p className="mt-2 text-sm text-brand-700">Decouvre les livres gratuits et les ressources premium pour accelerer tes revisions.</p>
        {note ? <p className="mt-2 text-xs text-brand-500">{note}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <section>
        <h2 className="mb-3 text-2xl font-bold text-brand-900">Livres gratuits</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {freeBooks.map((book) => <BookCard key={book.id} book={book} premium={false} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold text-brand-900">Livres premium</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {premiumBooks.map((book) => <BookCard key={book.id} book={book} premium />)}
        </div>
      </section>
    </section>
  );
}
