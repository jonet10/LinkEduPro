'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';
import LibrarySectionNav from '@/components/library/LibrarySectionNav';
import LibrarySearchPanel from '@/components/library/LibrarySearchPanel';
import ResourcesSection from '@/components/library/ResourcesSection';
import DictionarySection from '@/components/library/DictionarySection';
import FavoritesSection from '@/components/library/FavoritesSection';
import { LIBRARY_SECTIONS } from '@/components/library/library-constants';

function getStorageUrl(fileUrl) {
  if (!fileUrl) return '#';
  return resolveMediaUrl(fileUrl) || '#';
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

const LIBRARY_SUBJECT_SUGGESTIONS = [
  'Mathématiques',
  'Physique',
  'Chimie',
  'SVT',
  'Français',
  'Histoire',
  'Géographie',
  'Philosophie',
  'Anglais',
  'Espagnol',
  'Informatique',
  'Dictionnaires',
  'Encyclopédies'
];

function BookCard({ book, preordered = false, onPreorder = null, onPurchase = null, purchasingId = null, onOpenPdf = null }) {
  const [showDescription, setShowDescription] = useState(false);
  const hasDescription = Boolean(String(book.description || '').trim());
  return (
    <article className="card flex h-full flex-col">
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
      {hasDescription ? (
        <button
          type="button"
          className="w-fit text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
          onClick={() => setShowDescription((prev) => !prev)}
        >
          {showDescription ? 'Masquer la description' : 'Voir la description'}
        </button>
      ) : (
        <p className="text-sm text-brand-500">Aucune description</p>
      )}
      {showDescription && hasDescription ? (
        <p className="mt-2 text-sm text-brand-700">{book.description}</p>
      ) : null}
      {book.author ? <p className="mt-2 text-sm text-brand-800">Auteur: {book.author}</p> : null}
      <p className="mt-2 text-xs text-brand-500">{book.subject} | {book.level}</p>
      <div className="mt-auto">
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
        <button type="button" className="btn-primary mt-4" onClick={() => onOpenPdf?.(book)}>
          Lire le PDF
        </button>
      )}
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState('');
  const [activeSection, setActiveSection] = useState('livres');
  const [focusTermId, setFocusTermId] = useState(0);
  const [focusResourceId, setFocusResourceId] = useState(0);
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
  const [pdfViewer, setPdfViewer] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const pdfViewerRef = useRef(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [description, setDescription] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestedBookId, setRequestedBookId] = useState(0);
  const requestedBookOpenedRef = useRef(false);

  const canUpload = useMemo(() => {
    return student && ['ADMIN', 'TEACHER', 'STUDENT'].includes(student.role);
  }, [student]);

  const filteredApprovedBooks = useMemo(() => {
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return approvedBooks;
    return approvedBooks.filter((book) => {
      const titleMatch = String(book.title || '').toLowerCase().includes(q);
      const authorMatch = String(book.author || '').toLowerCase().includes(q);
      return titleMatch || authorMatch;
    });
  }, [approvedBooks, searchTerm]);

  const canReview = useMemo(() => {
    return student && student.role === 'ADMIN';
  }, [student]);

  const canManageResources = useMemo(() => {
    return student && ['ADMIN', 'TEACHER'].includes(student.role);
  }, [student]);

  const activeMeta = useMemo(() => {
    return LIBRARY_SECTIONS.find((row) => row.key === activeSection) || LIBRARY_SECTIONS[0];
  }, [activeSection]);

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
    const tokenValue = getToken();
    const me = getStudent();
    if (!tokenValue || !me) {
      router.push('/login');
      return;
    }

    setStudent(me);
    setToken(tokenValue);
    loadBooks();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = String(params.get('prefill') || params.get('q') || '').trim();
    if (q) setSearchTerm(q);
    const bookId = Number(params.get('bookId') || params.get('book') || 0);
    if (bookId > 0) setRequestedBookId(bookId);

    const section = String(params.get('section') || '').trim().toLowerCase();
    if (section) setActiveSection(section);

    const termId = Number(params.get('termId') || 0);
    if (termId > 0) setFocusTermId(termId);

    const resourceId = Number(params.get('resourceId') || 0);
    if (resourceId > 0) setFocusResourceId(resourceId);
  }, []);

  function setSection(nextKey) {
    const next = String(nextKey || 'livres').trim().toLowerCase();
    setActiveSection(next);
    setFocusTermId(0);
    setFocusResourceId(0);

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('section', next);
    params.delete('termId');
    params.delete('resourceId');
    // keep prefill/bookId if present
    router.replace(`/library?${params.toString()}`);
  }

  function openBookFromLibrary(bookId) {
    const id = Number(bookId || 0);
    if (!id) return;
    setActiveSection('livres');
    setRequestedBookId(id);
    router.push(`/library?section=livres&bookId=${encodeURIComponent(id)}`);
  }

  function openDictionaryTerm(termId) {
    const id = Number(termId || 0);
    if (!id) return;
    setActiveSection('dictionnaires');
    setFocusTermId(id);
    router.push(`/library?section=dictionnaires&termId=${encodeURIComponent(id)}`);
  }

  function openResource(resourceId, sectionKey = 'supports') {
    const id = Number(resourceId || 0);
    if (!id) return;
    const section = String(sectionKey || 'supports').trim().toLowerCase();
    setActiveSection(section);
    setFocusResourceId(id);
    router.push(`/library?section=${encodeURIComponent(section)}&resourceId=${encodeURIComponent(id)}`);
  }

  useEffect(() => {
    if (!requestedBookId || requestedBookOpenedRef.current) return;
    if (!approvedBooks.length) return;

    const book = approvedBooks.find((item) => Number(item.id) === Number(requestedBookId));
    if (!book) return;
    requestedBookOpenedRef.current = true;
    openPdfViewer(book);
  }, [approvedBooks, requestedBookId]);

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
    const normalizedAuthor = String(author || '').trim();
    const normalizedSubject = String(subject || '').trim();
    const normalizedLevels = selectedLevels.map((item) => String(item || '').trim()).filter(Boolean);
    const normalizedDescription = String(description || '').trim();

    if (!editingBookId && !pdfFile) {
      setError('Fichier PDF requis.');
      return;
    }
    if (normalizedTitle.length < 3) {
      setError('Titre invalide (minimum 3 caractères).');
      return;
    }
    if (normalizedAuthor.length < 2) {
      setError('Auteur invalide (minimum 2 caractères).');
      return;
    }
    if (normalizedSubject.length < 2) {
      setError('Matière invalide (minimum 2 caractères).');
      return;
    }
    if (!normalizedLevels.length) {
      setError('Sélectionne au moins un niveau.');
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
      form.append('author', normalizedAuthor);
      form.append('subject', normalizedSubject);
      form.append('level', normalizedLevels.join(', '));
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
      setAuthor('');
      setSubject('');
      setSelectedLevels([]);
      setDescription('');
      setIsPaid(false);
      setPrice('');
      setCoverImage(null);
      setPdfFile(null);
      setEditingBookId(null);
      setShowUploadForm(false);
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
    setShowUploadForm(true);
    setTitle(book.title || '');
    setAuthor(book.author || '');
    setSubject(book.subject || '');
    setSelectedLevels(
      String(book.level || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );
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
    setAuthor('');
    setSubject('');
    setSelectedLevels([]);
    setDescription('');
    setIsPaid(false);
    setPrice('');
    setCoverImage(null);
    setPdfFile(null);
    setError('');
    setSuccess('');
    setShowUploadForm(false);
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

  function openPdfViewer(book) {
    if (!book?.fileUrl) return;
    const url = getStorageUrl(book.fileUrl);
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;

    if (isMobileViewport && typeof window !== 'undefined') {
      window.location.assign(url);
      return;
    }

    setPdfViewer({
      title: book.title || 'Lecture PDF',
      url
    });
  }

  async function togglePdfFullscreen() {
    const container = pdfViewerRef.current;
    if (!container || typeof document === 'undefined') return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      // Ignore fullscreen API errors on unsupported browsers.
    }
  }

  return (
    <section className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-black text-brand-900">Bibliothèque numérique</h1>
        <p className="mt-2 text-sm text-brand-700">
          Centre de ressources et d'apprentissage: livres, supports pédagogiques, dictionnaire informatique, examens et favoris.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-2 text-sm text-green-700">{success}</p> : null}
      </div>

      <LibrarySearchPanel token={token} />

      <LibrarySectionNav activeKey={activeSection} onChange={setSection} />

      {activeSection === 'livres' ? (
        <>
        {canUpload ? (
          <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-900">{editingBookId ? 'Modifier un livre PDF' : 'Ajouter un livre PDF'}</h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (editingBookId) {
                  cancelEditBook();
                  return;
                }
                setShowUploadForm((v) => !v);
              }}
            >
              {editingBookId ? 'Fermer le formulaire' : (showUploadForm ? 'Masquer le formulaire' : 'Ajouter un livre PDF')}
            </button>
          </div>
          {showUploadForm ? (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitBook}>
            <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="input" placeholder="Auteur" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            <div className="md:col-span-2">
              <input
                className="input"
                placeholder="Matière"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                list="linkedupro-library-subject-suggestions"
                required
              />
              <datalist id="linkedupro-library-subject-suggestions">
                {LIBRARY_SUBJECT_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 rounded-lg border border-brand-100 p-3 md:col-span-2">
              <p className="text-sm font-medium text-brand-900">Niveaux concernés (choix multiple)</p>
              <div className="flex flex-wrap gap-3">
                {LIBRARY_LEVEL_OPTIONS.map((item) => (
                  <label key={item} className="inline-flex items-center gap-2 text-sm text-brand-800">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(item)}
                      onChange={(e) => {
                        setSelectedLevels((prev) => (
                          e.target.checked
                            ? [...prev, item]
                            : prev.filter((level) => level !== item)
                        ));
                        setError('');
                      }}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
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
          ) : (
            <p className="text-sm text-brand-700">Clique sur « Ajouter un livre PDF » pour afficher le formulaire.</p>
          )}
        </section>
      ) : null}

      {canReview ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Livres en attente de validation</h2>
          <div className="space-y-3">
            {pendingBooks.map((book) => (
              <article key={book.id} className="rounded-xl border border-brand-100 p-4">
                <h3 className="font-semibold text-brand-900">{book.title}</h3>
                {book.author ? <p className="text-sm text-brand-700">Auteur: {book.author}</p> : null}
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
                  <button className="btn-secondary" type="button" onClick={() => openPdfViewer(book)}>Voir PDF</button>
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

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-brand-900">Livres approuvés</h2>
          <input
            className="input w-full md:w-96"
            placeholder="Rechercher par titre ou auteur"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredApprovedBooks.map((book) => (
              <div key={book.id} className="space-y-2">
                <BookCard
                  book={book}
                  preordered={preorderedBooks.includes(book.id)}
                  onPreorder={savePreorder}
                  onPurchase={purchaseBook}
                  purchasingId={purchasingId}
                  onOpenPdf={openPdfViewer}
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
        </div>
        {!loading && filteredApprovedBooks.length === 0 ? <p className="text-sm text-brand-700">Aucun livre trouvé pour cette recherche.</p> : null}
      </section>

      {canUpload && rejectedBooks.length > 0 ? (
        <section className="card">
          <h2 className="mb-3 text-xl font-bold text-brand-900">Livres rejetés</h2>
          <div className="space-y-2 text-sm text-brand-700">
            {rejectedBooks.map((book) => (
              <div key={book.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-100 px-3 py-2">
                <p>{book.title}{book.author ? ` - ${book.author}` : ''} ({book.subject} | {book.level})</p>
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
        </>
      ) : activeSection === 'dictionnaires' ? (
        <DictionarySection token={token} focusTermId={focusTermId} />
      ) : activeSection === 'favoris' ? (
        <FavoritesSection
          token={token}
          onOpenBook={openBookFromLibrary}
          onOpenDictionaryTerm={openDictionaryTerm}
          onOpenResource={(id) => openResource(id, 'supports')}
        />
      ) : (
        <ResourcesSection
          token={token}
          canManage={canManageResources}
          defaultCategory={activeMeta?.category || ''}
          focusResourceId={focusResourceId}
        />
      )}

      {pdfViewer ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-3">
          <div ref={pdfViewerRef} className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-brand-100 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-4 py-3">
              <h3 className="line-clamp-1 text-base font-semibold text-brand-900">{pdfViewer.title}</h3>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary" onClick={togglePdfFullscreen}>Plein écran</button>
                <button type="button" className="btn-secondary" onClick={() => setPdfViewer(null)}>Fermer</button>
              </div>
            </div>
            <iframe
              src={pdfViewer.url}
              title={pdfViewer.title}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
