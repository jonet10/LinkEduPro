'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function getStorageUrl(fileUrl) {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const origin = api.replace(/\/api\/?$/, '');
  return `${origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

function BookCard({ book }) {
  return (
    <article className="card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-brand-900">{book.title}</h3>
        <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">Approuvé</span>
      </div>
      <p className="text-sm text-brand-700">{book.description || 'Aucune description'}</p>
      <p className="mt-2 text-xs text-brand-500">{book.subject} | {book.level}</p>
      <a className="btn-primary mt-4 inline-block" href={getStorageUrl(book.fileUrl)} target="_blank" rel="noreferrer">Ouvrir le PDF</a>
    </article>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [approvedBooks, setApprovedBooks] = useState([]);
  const [pendingBooks, setPendingBooks] = useState([]);
  const [rejectedBooks, setRejectedBooks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const canUpload = useMemo(() => {
    return student && ['ADMIN', 'TEACHER'].includes(student.role);
  }, [student]);

  const canReview = useMemo(() => {
    return student && student.role === 'ADMIN';
  }, [student]);

  async function loadBooks() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      const data = await apiClient('/library/books', { token });
      setApprovedBooks(data.approved || []);
      setPendingBooks(data.pending || []);
      setRejectedBooks(data.rejected || []);
    } catch (e) {
      setError(e.message || 'Impossible de charger la bibliothèque');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    const me = getStudent();
    if (!token || !me) {
      router.push('/login');
      return;
    }

    setStudent(me);
    loadBooks();
  }, [router]);

  async function onSubmitBook(e) {
    e.preventDefault();

    if (!file) {
      setError('Fichier PDF requis.');
      return;
    }

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setUploading(true);

      const form = new FormData();
      form.append('title', title);
      form.append('subject', subject);
      form.append('level', level);
      form.append('description', description);
      form.append('file', file);

      await apiClient('/library/books', {
        method: 'POST',
        token,
        body: form
      });

      setTitle('');
      setSubject('');
      setLevel('');
      setDescription('');
      setFile(null);
      setSuccess('Livre soumis avec succès.');
      await loadBooks();
    } catch (e) {
      setError(e.message || 'Erreur lors de la soumission du livre.');
    } finally {
      setUploading(false);
    }
  }

  async function reviewBook(id, status) {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      await apiClient(`/library/books/${id}/review`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status })
      });
      await loadBooks();
    } catch (e) {
      setError(e.message || 'Impossible de valider ce livre.');
    }
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-black text-brand-900">Bibliothèque numérique</h1>
        <p className="mt-2 text-sm text-brand-700">
          Ressources PDF validées pour les élèves. Les professeurs peuvent proposer des livres, le super admin valide.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-2 text-sm text-green-700">{success}</p> : null}
      </div>

      {canUpload ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Ajouter un livre PDF</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitBook}>
            <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="input" placeholder="Matière" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <input className="input" placeholder="Niveau" value={level} onChange={(e) => setLevel(e.target.value)} required />
            <input className="input" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            <textarea
              className="input md:col-span-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <button className="btn-primary md:col-span-2" disabled={uploading} type="submit">
              {uploading ? 'Envoi en cours...' : 'Soumettre le livre'}
            </button>
          </form>
        </section>
      ) : null}

      {canReview ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Livres en attente de validation</h2>
          <div className="space-y-3">
            {pendingBooks.map((book) => (
              <article key={book.id} className="rounded-xl border border-brand-100 p-4">
                <h3 className="font-semibold text-brand-900">{book.title}</h3>
                <p className="text-sm text-brand-700">{book.subject} | {book.level}</p>
                <p className="mt-1 text-xs text-brand-500">Ajouté par: {book.uploadedBy?.firstName} {book.uploadedBy?.lastName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn-secondary" href={getStorageUrl(book.fileUrl)} target="_blank" rel="noreferrer">Voir PDF</a>
                  <button className="btn-primary" onClick={() => reviewBook(book.id, 'APPROVED')} type="button">Approuver</button>
                  <button className="btn-secondary" onClick={() => reviewBook(book.id, 'REJECTED')} type="button">Rejeter</button>
                </div>
              </article>
            ))}
            {pendingBooks.length === 0 ? <p className="text-sm text-brand-700">Aucun livre en attente.</p> : null}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-2xl font-bold text-brand-900">Livres approuvés</h2>
        {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approvedBooks.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
        {!loading && approvedBooks.length === 0 ? <p className="text-sm text-brand-700">Aucun livre disponible.</p> : null}
      </section>

      {canUpload && rejectedBooks.length > 0 ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Livres rejetés</h2>
          <div className="space-y-2 text-sm text-brand-700">
            {rejectedBooks.map((book) => (
              <p key={book.id}>{book.title} ({book.subject} | {book.level})</p>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
