"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

const LEVEL_OPTIONS = ['9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite'];
const CONTENT_TYPES = [
  { value: 'video', label: 'Vidéo' },
  { value: 'pdf', label: 'PDF' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'revision', label: 'Révision' }
];

function formatHtg(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '0 HTG';
  return `${value.toLocaleString('fr-FR')} HTG`;
}

export default function PartnersPage() {
  const student = useMemo(() => getStudent(), []);
  const token = useMemo(() => getToken(), []);

  const [publisher, setPublisher] = useState(null);
  const [publisherSales, setPublisherSales] = useState(null);
  const [books, setBooks] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    subject: '',
    level: 'NSIV',
    description: '',
    isPaid: false,
    price: ''
  });
  const [bookFile, setBookFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [submittingBook, setSubmittingBook] = useState(false);

  const [contentForm, setContentForm] = useState({
    title: '',
    body: '',
    level: 'NSIV',
    type: 'video',
    isPaid: false,
    price: ''
  });
  const [submittingContent, setSubmittingContent] = useState(false);

  const roleUpper = String(student?.role || '').toUpperCase();
  const isPublisher = roleUpper === 'PUBLISHER';
  const canPublishContent = ['ADMIN', 'TEACHER'].includes(roleUpper) || Boolean(publisher?.features?.canPublishCertifiedContent);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const requests = [];
    if (isPublisher) {
      requests.push(
        apiClient('/publishers/me', { token }).then((data) => setPublisher(data.publisher))
      );
      requests.push(
        apiClient('/publishers/me/sales', { token })
          .then((data) => setPublisherSales(data))
          .catch(() => null)
      );
      requests.push(
        apiClient('/books', { token }).then((data) => setBooks(data.items || []))
      );
    }

    Promise.all(requests)
      .catch((err) => setError(err.message || 'Erreur de chargement du compte partenaire.'))
      .finally(() => setLoading(false));
  }, [token, isPublisher, canPublishContent]);

  useEffect(() => {
    if (!token) return;
    if (!canPublishContent) return;
    apiClient('/v2/content/mine', { token })
      .then((data) => setContentItems(data.contents || []))
      .catch(() => null);
  }, [token, canPublishContent]);

  async function submitBook() {
    if (!token) {
      setError('Connecte-toi pour publier un livre.');
      return;
    }

    if (!bookForm.title || !bookForm.subject || !bookForm.level) {
      setError('Titre, matière et niveau sont requis.');
      return;
    }
    if (!bookFile) {
      setError('Ajoute le fichier PDF du livre.');
      return;
    }

    setSubmittingBook(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', bookForm.title);
      formData.append('author', bookForm.author);
      formData.append('subject', bookForm.subject);
      formData.append('level', bookForm.level);
      formData.append('description', bookForm.description);
      formData.append('isPaid', bookForm.isPaid ? 'true' : 'false');
      if (bookForm.isPaid) {
        formData.append('price', String(bookForm.price || '0'));
      }
      formData.append('file', bookFile);
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }

      const data = await apiClient('/books', {
        method: 'POST',
        token,
        body: formData
      });

      setBooks((prev) => [data.book, ...prev]);
      setBookForm({
        title: '',
        author: '',
        subject: '',
        level: 'NSIV',
        description: '',
        isPaid: false,
        price: ''
      });
      setBookFile(null);
      setCoverFile(null);
      setSuccess('Livre soumis avec succès.');
    } catch (err) {
      setError(err.message || 'Impossible de publier le livre.');
    } finally {
      setSubmittingBook(false);
    }
  }

  async function submitContent() {
    if (!token) {
      setError('Connecte-toi pour publier une formation.');
      return;
    }
    if (!contentForm.title || !contentForm.body || !contentForm.level) {
      setError('Titre, contenu et niveau sont requis.');
      return;
    }

    setSubmittingContent(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: contentForm.title,
        body: contentForm.body,
        level: contentForm.level,
        type: contentForm.type,
        status: 'pending',
        isPaid: Boolean(contentForm.isPaid),
        price: contentForm.isPaid ? Number(contentForm.price || 0) : 0
      };
      const data = await apiClient('/v2/content', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });
      if (data?.content) {
        setContentItems((prev) => [data.content, ...prev]);
      }
      setContentForm({
        title: '',
        body: '',
        level: 'NSIV',
        type: 'video',
        isPaid: false,
        price: ''
      });
      setSuccess('Formation soumise pour validation.');
    } catch (err) {
      setError(err.message || 'Impossible de publier la formation.');
    } finally {
      setSubmittingContent(false);
    }
  }

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-brand-100 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-600">Compte partenaire</p>
        <h1 className="mt-2 text-3xl font-black text-brand-900">Publier vos contenus éducatifs</h1>
        <p className="mt-3 text-sm text-brand-700">
          Les partenaires LinkEduPro peuvent être des écrivains, des écoles professionnelles/universités,
          ou des ONG. Publiez des livres gratuits ou payants, et des modules de formation certifiante.
        </p>
        {!token ? (
          <div className="mt-4">
            <Link href="/login" className="btn-primary">Se connecter</Link>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-2xl border border-brand-100 bg-white/80 p-6">Chargement...</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-brand-100 bg-white/90 p-6">
          <h2 className="text-xl font-bold text-brand-900">Espace Écrivain / Éditeur</h2>
          <p className="text-sm text-brand-700">
            Publiez vos livres (PDF) gratuits ou payants et suivez vos ventes.
          </p>

          {!isPublisher ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Votre compte n&apos;est pas encore configuré comme éditeur. Contactez un administrateur
              pour activer le statut partenaire.
            </div>
          ) : null}

          {publisher ? (
            <div className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              {publisher.logo ? (
                <img src={resolveMediaUrl(publisher.logo)} alt="Logo partenaire" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-200 text-brand-900">
                  {publisher.name?.slice(0, 2) || 'PR'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-brand-900">{publisher.name}</p>
                <p className="text-xs text-brand-700">{publisher.type}</p>
              </div>
            </div>
          ) : null}

          {publisherSales ? (
            <div className="grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 text-sm text-brand-800 md:grid-cols-3">
              <div>
                <p className="text-xs text-brand-500">Ventes</p>
                <p className="text-lg font-bold">{publisherSales.summary?.totalSales || 0}</p>
              </div>
              <div>
                <p className="text-xs text-brand-500">Revenu net</p>
                <p className="text-lg font-bold">{formatHtg(publisherSales.summary?.netRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-500">Livres</p>
                <p className="text-lg font-bold">{publisherSales.summary?.totalBooks || 0}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-brand-900">Publier un livre</h3>
            <div className="grid gap-3">
              <input className="input" placeholder="Titre du livre" value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} />
              <input className="input" placeholder="Auteur" value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} />
              <input className="input" placeholder="Matière" value={bookForm.subject} onChange={(e) => setBookForm((p) => ({ ...p, subject: e.target.value }))} />
              <select className="input" value={bookForm.level} onChange={(e) => setBookForm((p) => ({ ...p, level: e.target.value }))}>
                {LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <textarea className="input min-h-[120px]" placeholder="Description" value={bookForm.description} onChange={(e) => setBookForm((p) => ({ ...p, description: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-brand-700">
                <input type="checkbox" checked={bookForm.isPaid} onChange={(e) => setBookForm((p) => ({ ...p, isPaid: e.target.checked }))} />
                Livre payant
              </label>
              {bookForm.isPaid ? (
                <input className="input" placeholder="Prix HTG" value={bookForm.price} onChange={(e) => setBookForm((p) => ({ ...p, price: e.target.value }))} />
              ) : null}
              <div className="grid gap-2 text-sm text-brand-700">
                <label>Fichier PDF</label>
                <input type="file" accept="application/pdf" onChange={(e) => setBookFile(e.target.files?.[0] || null)} />
              </div>
              <div className="grid gap-2 text-sm text-brand-700">
                <label>Image de couverture (optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </div>
              <button className="btn-primary" type="button" onClick={submitBook} disabled={!isPublisher || submittingBook}>
                {submittingBook ? 'Publication...' : 'Publier le livre'}
              </button>
            </div>
          </div>

          {books.length ? (
            <div className="space-y-2 rounded-2xl border border-brand-100 bg-white p-4">
              <h3 className="text-lg font-semibold text-brand-900">Mes livres</h3>
              {books.slice(0, 6).map((book) => (
                <div key={book.id} className="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-brand-900">{book.title}</p>
                    <p className="text-xs text-brand-600">{book.subject} • {book.level}</p>
                  </div>
                  <span className="text-xs text-brand-700">{book.isPaid ? formatHtg(book.price) : 'Gratuit'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl border border-brand-100 bg-white/90 p-6">
          <h2 className="text-xl font-bold text-brand-900">Espace Formation certifiante</h2>
          <p className="text-sm text-brand-700">
            Publiez des modules certifiants (vidéos, PDF, quiz) pour les écoles, universités et ONG.
          </p>

          {!canPublishContent ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Ce module nécessite un compte Administrateur ou Enseignant. Contactez l&apos;équipe pour
              activer les droits formation certifiante.
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-brand-900">Publier une formation</h3>
            <div className="grid gap-3">
              <input className="input" placeholder="Titre de la formation" value={contentForm.title} onChange={(e) => setContentForm((p) => ({ ...p, title: e.target.value }))} />
              <textarea className="input min-h-[140px]" placeholder="Description / contenu principal" value={contentForm.body} onChange={(e) => setContentForm((p) => ({ ...p, body: e.target.value }))} />
              <select className="input" value={contentForm.level} onChange={(e) => setContentForm((p) => ({ ...p, level: e.target.value }))}>
                {LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
              <select className="input" value={contentForm.type} onChange={(e) => setContentForm((p) => ({ ...p, type: e.target.value }))}>
                {CONTENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-brand-700">
                <input
                  type="checkbox"
                  checked={contentForm.isPaid}
                  onChange={(e) => setContentForm((p) => ({ ...p, isPaid: e.target.checked }))}
                />
                Formation payante
              </label>
              {contentForm.isPaid ? (
                <input
                  className="input"
                  placeholder="Prix HTG"
                  value={contentForm.price}
                  onChange={(e) => setContentForm((p) => ({ ...p, price: e.target.value }))}
                />
              ) : null}
              <button className="btn-primary" type="button" onClick={submitContent} disabled={!canPublishContent || submittingContent}>
                {submittingContent ? 'Publication...' : 'Soumettre la formation'}
              </button>
            </div>
          </div>

          {contentItems.length ? (
            <div className="space-y-2 rounded-2xl border border-brand-100 bg-white p-4">
              <h3 className="text-lg font-semibold text-brand-900">Mes formations</h3>
              {contentItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border border-brand-100 px-3 py-2 text-sm">
                  <p className="font-semibold text-brand-900">{item.title}</p>
                  <p className="text-xs text-brand-600">{item.type?.toUpperCase()} • {item.level}</p>
                  <p className="text-xs text-brand-500">Statut: {item.status}</p>
                  <p className="text-xs text-brand-500">
                    {item.isPaid ? `Payant • ${formatHtg(item.price)}` : 'Gratuit'}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
