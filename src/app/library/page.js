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

function formatHTG(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 2
  }).format(amount);
}

const LIBRARY_LEVEL_OPTIONS = [
  '9e',
  'NSI',
  'NSII',
  'NSIII',
  'NSIV',
  'Universitaire'
];

function BookCard({ book, preordered = false, onPreorder = null, onPurchase = null, purchasingId = null }) {
  return (
    <article className="card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-brand-900">{book.title}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${book.upcoming ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
          {book.upcoming ? 'Bientôt disponible' : 'Approuvé'}
        </span>
      </div>
      {(book.coverImageUrl || book.coverImage) ? (
        <img
          src={getStorageUrl(book.coverImageUrl || book.coverImage)}
          alt={`Couverture - ${book.title}`}
          className="mb-3 h-52 w-full rounded-lg border border-brand-100 object-cover"
        />
      ) : null}
      <p className="text-sm text-brand-700">{book.description || 'Aucune description'}</p>
      <p className="mt-2 text-xs text-brand-500">{book.subject} | {book.level}</p>
      {book.isPaid && !book.upcoming ? <p className="mt-2 text-sm font-semibold text-brand-900">Prix: {formatHTG(book.price)}</p> : null}
      {book.upcoming ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-brand-900">Prix: {formatHTG(book.priceHtg)}</p>
          <p className="text-xs text-brand-700">Visualisation uniquement. Le téléchargement sera désactivé.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled>
              PDF à venir
            </button>
            <button type="button" className={`${preordered ? 'btn-secondary' : 'btn-primary'}`} disabled={preordered} onClick={() => onPreorder?.(book)}>
              {preordered ? 'Précommandé' : `Précommander (${formatHTG(book.priceHtg)})`}
            </button>
          </div>
        </div>
      ) : book.isPaid && !book.canAccess ? (
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => onPurchase?.(book)}
          disabled={purchasingId === book.id}
        >
          {purchasingId === book.id ? 'Redirection...' : `Acheter (${formatHTG(book.price)})`}
        </button>
      ) : (
        <a className="btn-primary mt-4 inline-block" href={getStorageUrl(book.fileUrl)} target="_blank" rel="noreferrer">Ouvrir le PDF</a>
      )}
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
  const [editingBookId, setEditingBookId] = useState(null);
  const [purchasingId, setPurchasingId] = useState(null);
  const [preorderedBooks, setPreorderedBooks] = useState([]);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const canUpload = useMemo(() => {
    return student && ['ADMIN', 'TEACHER'].includes(student.role);
  }, [student]);

  const canReview = useMemo(() => {
    return student && student.role === 'ADMIN';
  }, [student]);

  const preordersStorageKey = useMemo(() => {
    if (!student?.id) return 'linkedupro_library_preorders_guest';
    return `linkedupro_library_preorders_${student.id}`;
  }, [student?.id]);

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
      setApprovedBooks([]);
      setPendingBooks([]);
      setRejectedBooks([]);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const provider = String(query.get('provider') || '').trim().toLowerCase();
    const payment = String(query.get('payment') || '').trim().toLowerCase();
    if (provider === 'moncash') {
      if (payment === 'success') setSuccess('Achat validé. Le livre est maintenant accessible.');
      if (payment === 'failed') setError('Paiement non validé.');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(preordersStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setPreorderedBooks(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPreorderedBooks([]);
    }
  }, [preordersStorageKey]);

  function savePreorder(book) {
    if (!book?.id) return;
    if (preorderedBooks.includes(book.id)) return;
    const next = [...preorderedBooks, book.id];
    setPreorderedBooks(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(preordersStorageKey, JSON.stringify(next));
    }
    setSuccess(`Précommande enregistrée: ${book.title} (${formatHTG(book.priceHtg)}).`);
  }

  async function onSubmitBook(e) {
    e.preventDefault();
    const normalizedTitle = String(title || '').trim();
    const normalizedSubject = String(subject || '').trim();
    const normalizedLevel = String(level || '').trim();
    const normalizedDescription = String(description || '').trim();

    if (!editingBookId && !pdfFile) {
      setError('Fichier PDF requis.');
      return;
    }
    if (normalizedTitle.length < 3) {
      setError('Titre invalide (minimum 3 caractères).');
      return;
    }
    if (normalizedSubject.length < 2) {
      setError('Matière invalide (minimum 2 caractères).');
      return;
    }
    if (normalizedLevel.length < 2) {
      setError('Niveau invalide.');
      return;
    }
    if (normalizedDescription.length > 2000) {
      setError('Description trop longue (maximum 2000 caractères).');
      return;
    }
    if (isPaid && Number(price || 0) <= 0) {
      setError('Prix requis pour un livre payant.');
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
      form.append('title', normalizedTitle);
      form.append('subject', normalizedSubject);
      form.append('level', normalizedLevel);
      form.append('description', normalizedDescription);
      form.append('isPaid', String(isPaid));
      form.append('price', String(isPaid ? Number(price || 0) : 0));
      if (pdfFile) form.append('file', pdfFile);
      if (coverImage) form.append('coverImage', coverImage);

      await apiClient(editingBookId ? `/library/books/${editingBookId}` : '/library/books', {
        method: editingBookId ? 'PATCH' : 'POST',
        token,
        body: form
      });

      setTitle('');
      setSubject('');
      setLevel('');
      setDescription('');
      setIsPaid(false);
      setPrice('');
      setCoverImage(null);
      setPdfFile(null);
      setEditingBookId(null);
      setSuccess(editingBookId ? 'Livre modifié avec succès.' : 'Livre soumis avec succès.');
      await loadBooks();
    } catch (e) {
      const details = Array.isArray(e?.data?.details) ? e.data.details.join(' | ') : '';
      setError(details || e.message || (editingBookId ? 'Erreur lors de la modification du livre.' : 'Erreur lors de la soumission du livre.'));
    } finally {
      setUploading(false);
    }
  }

  function canEditBook(book) {
    if (!canUpload || !book || typeof book.id !== 'number') return false;
    if (student?.role === 'ADMIN') return true;
    return Number(book.uploadedBy?.id) === Number(student?.id);
  }

  function startEditBook(book) {
    setEditingBookId(book.id);
    setTitle(book.title || '');
    setSubject(book.subject || '');
    setLevel(book.level || '');
    setDescription(book.description || '');
    setIsPaid(Boolean(book.isPaid));
    setPrice(book.isPaid ? String(book.price || '') : '');
    setCoverImage(null);
    setPdfFile(null);
    setError('');
    setSuccess(`Modification: ${book.title}`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function cancelEditBook() {
    setEditingBookId(null);
    setTitle('');
    setSubject('');
    setLevel('');
    setDescription('');
    setIsPaid(false);
    setPrice('');
    setCoverImage(null);
    setPdfFile(null);
    setError('');
    setSuccess('');
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

  function canDeleteBook(book) {
    if (!book || typeof book.id !== 'number' || !student) return false;
    if (student.role === 'ADMIN') return true;
    return canUpload && Number(book.uploadedBy?.id) === Number(student.id);
  }

  async function deleteBook(id) {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce livre ?')) return;

    try {
      setError('');
      setSuccess('');
      await apiClient(`/library/books/${id}`, {
        method: 'DELETE',
        token
      });
      setSuccess('Livre supprimé.');
      await loadBooks();
    } catch (e) {
      setError(e.message || 'Impossible de supprimer ce livre.');
    }
  }

  async function purchaseBook(book) {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setPurchasingId(book.id);
      const data = await apiClient(`/library/books/${book.id}/purchase`, {
        method: 'POST',
        token,
        body: JSON.stringify({ paymentMethod: 'MONCASH' })
      });

      if (data.redirectUrl && typeof window !== 'undefined') {
        window.location.assign(data.redirectUrl);
        return;
      }
      setSuccess(data.message || 'Achat validé.');
      await loadBooks();
    } catch (e) {
      setError(e.message || 'Impossible de lancer cet achat.');
    } finally {
      setPurchasingId(null);
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
          <h2 className="mb-3 text-xl font-bold text-brand-900">{editingBookId ? 'Modifier un livre PDF' : 'Ajouter un livre PDF'}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitBook}>
            <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="input" placeholder="Matière" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)} required>
              <option value="" disabled>Sélectionner un niveau</option>
              {LIBRARY_LEVEL_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
              {level && !LIBRARY_LEVEL_OPTIONS.includes(level) ? (
                <option value={level}>{level}</option>
              ) : null}
            </select>
            <label className="space-y-1 text-sm text-brand-800">
              <span className="font-medium text-brand-900">Image de couverture (optionnel)</span>
              <input
                className="input w-full"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  setCoverImage(e.target.files?.[0] || null);
                  setError('');
                }}
              />
            </label>
            <label className="space-y-1 text-sm text-brand-800 md:col-span-2">
              <span className="font-medium text-brand-900">Fichier PDF du livre {editingBookId ? '(laisser vide pour garder le PDF actuel)' : ''}</span>
              <input
                className="input w-full"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  setPdfFile(e.target.files?.[0] || null);
                  setError('');
                }}
                required={!editingBookId}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-brand-800">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              Livre payant
            </label>
            {isPaid ? (
              <input className="input" type="number" min={1} step="0.01" placeholder="Prix (HTG)" value={price} onChange={(e) => setPrice(e.target.value)} required />
            ) : null}
            <textarea
              className="input md:col-span-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <button className="btn-primary md:col-span-2" disabled={uploading} type="submit">
              {uploading ? (editingBookId ? 'Mise à jour...' : 'Envoi en cours...') : (editingBookId ? 'Sauvegarder les modifications' : 'Soumettre le livre')}
            </button>
            {editingBookId ? (
              <button className="btn-secondary md:col-span-2" onClick={cancelEditBook} type="button">
                Annuler la modification
              </button>
            ) : null}
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
                {book.coverImageUrl ? (
                  <img
                    src={getStorageUrl(book.coverImageUrl)}
                    alt={`Couverture - ${book.title}`}
                    className="mt-2 h-40 w-full rounded border border-brand-100 object-cover"
                  />
                ) : null}
                {book.isPaid ? <p className="mt-2 text-sm font-semibold text-brand-900">Prix: {formatHTG(book.price)}</p> : null}
                <p className="mt-1 text-xs text-brand-500">Ajouté par: {book.uploadedBy?.firstName} {book.uploadedBy?.lastName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn-secondary" href={getStorageUrl(book.fileUrl)} target="_blank" rel="noreferrer">Voir PDF</a>
                  {canEditBook(book) ? (
                    <button className="btn-secondary" onClick={() => startEditBook(book)} type="button">Modifier</button>
                  ) : null}
                  {canDeleteBook(book) ? (
                    <button className="btn-secondary" onClick={() => deleteBook(book.id)} type="button">Supprimer</button>
                  ) : null}
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
          {approvedBooks.map((book) => (
            <div key={book.id} className="space-y-2">
              <BookCard
                book={book}
                preordered={preorderedBooks.includes(book.id)}
                onPreorder={savePreorder}
                onPurchase={purchaseBook}
                purchasingId={purchasingId}
              />
              {canEditBook(book) ? (
                <button type="button" className="btn-secondary w-full" onClick={() => startEditBook(book)}>
                  Modifier ce livre
                </button>
              ) : null}
              {canDeleteBook(book) ? (
                <button type="button" className="btn-secondary w-full" onClick={() => deleteBook(book.id)}>
                  Supprimer ce livre
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {!loading && approvedBooks.length === 0 ? <p className="text-sm text-brand-700">Aucun livre disponible.</p> : null}
      </section>

      {canUpload && rejectedBooks.length > 0 ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Livres rejetés</h2>
          <div className="space-y-2 text-sm text-brand-700">
            {rejectedBooks.map((book) => (
              <div key={book.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-100 px-3 py-2">
                <p>{book.title} ({book.subject} | {book.level})</p>
                {canDeleteBook(book) ? (
                  <button type="button" className="btn-secondary" onClick={() => deleteBook(book.id)}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
