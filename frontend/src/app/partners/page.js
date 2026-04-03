"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

const LEVEL_OPTIONS = ['9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite'];
const ANNOUNCE_LEVEL_OPTIONS = ['9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];
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

  const [activeTab, setActiveTab] = useState('dashboard');
  const [publisher, setPublisher] = useState(null);
  const [publisherSales, setPublisherSales] = useState(null);
  const [books, setBooks] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [announcementConversations, setAnnouncementConversations] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [globalAudience, setGlobalAudience] = useState('ALL');
  const [globalLevel, setGlobalLevel] = useState('NSIV');
  const [globalContent, setGlobalContent] = useState('');
  const [globalFiles, setGlobalFiles] = useState([]);
  const [sendingGlobal, setSendingGlobal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
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
  const canPublishAnnouncements = ['ADMIN', 'SUPER_ADMIN', 'PUBLISHER'].includes(roleUpper)
    && (roleUpper !== 'PUBLISHER' || Boolean(publisher?.features?.canPublishAnnouncements));
  const panelClass = 'rounded-3xl border border-slate-700/60 bg-slate-900/70 text-slate-100 shadow-lg shadow-slate-950/20';
  const cardClass = 'rounded-2xl border border-slate-700/60 bg-slate-900/50 text-slate-100';
  const subduedText = 'text-slate-300';

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
      requests.push(apiClient('/books', { token }).then((data) => setBooks(data.items || [])));
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

  useEffect(() => {
    if (!token) return;
    setAnnouncementsLoading(true);
    apiClient('/messages/conversations', { token })
      .then((data) => {
        const rows = Array.isArray(data.conversations) ? data.conversations : [];
        const mine = rows.filter((row) => row.type === 'GLOBAL' && row.lastMessage?.sender?.id === student?.id);
        setAnnouncementConversations(mine);
      })
      .catch(() => setAnnouncementConversations([]))
      .finally(() => setAnnouncementsLoading(false));
  }, [token, student?.id]);

  useEffect(() => {
    if (!token) return;
    setBookingsLoading(true);
    apiClient('/bookings', { token })
      .then((data) => setBookings(Array.isArray(data.bookings) ? data.bookings : []))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [token]);

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

  if (!token) {
    return (
      <section className="space-y-6">
        <header className={`${panelClass} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Compte partenaire</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Espace partenaire LinkEduPro</h1>
          <p className={`mt-3 text-sm ${subduedText}`}>
            Ce formulaire s&apos;affiche via un lien d&apos;inscription généré par un administrateur.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login" className="btn-primary">Se connecter</Link>
            <Link href="/tutor-partner" className="btn-secondary">Demander un accès partenaire</Link>
          </div>
        </header>
      </section>
    );
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    if (!token || !canPublishAnnouncements) return;
    const content = globalContent.trim();
    if (!content && globalFiles.length === 0) return;

    setSendingGlobal(true);
    setError('');
    setSuccess('');

    try {
      const body = new FormData();
      body.append('content', content);
      body.append('audience', globalAudience);
      if (globalAudience === 'LEVEL') {
        body.append('level', globalLevel);
      }
      globalFiles.forEach((file) => body.append('files', file, file.name));

      await apiClient('/messages/global', {
        method: 'POST',
        token,
        body
      });

      setGlobalContent('');
      setGlobalFiles([]);
      setSuccess('Annonce envoyée.');
      const refreshed = await apiClient('/messages/conversations', { token });
      const rows = Array.isArray(refreshed.conversations) ? refreshed.conversations : [];
      const mine = rows.filter((row) => row.type === 'GLOBAL' && row.lastMessage?.sender?.id === student?.id);
      setAnnouncementConversations(mine);
    } catch (err) {
      setError(err.message || 'Erreur envoi annonce.');
    } finally {
      setSendingGlobal(false);
    }
  }

  return (
    <section className="space-y-8">
      <header className={`${panelClass} p-6`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Compte partenaire</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Gérez vos contenus certifiants et publications</h1>
        <p className={`mt-3 text-sm ${subduedText}`}>
          Publiez des livres, modules certifiants et annonces. Suivez vos ventes et vos performances.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#publish-training" className="btn-primary">Publier une formation</a>
          <a href="#publish-book" className="btn-secondary">Publier un livre</a>
        </div>
      </header>

      {loading ? (
        <div className={`${cardClass} p-6`}>Chargement...</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={`${panelClass} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Espace partenaire</p>
          <p className="mt-3 text-lg font-semibold text-white">{student?.firstName || 'Partenaire'}</p>
          <p className="text-xs text-slate-400">{student?.email}</p>
          <div className="mt-4 space-y-2">
            {[
              { href: '#dashboard', label: 'Tableau de bord' },
              { href: '#books', label: 'Mes livres' },
              { href: '#formations', label: 'Mes formations' },
              { href: '#annonces', label: 'Mes annonces' },
              { href: '#rendezvous', label: 'Mes rendez-vous' }
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-slate-700/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/70"
              >
                {item.label}
                <span className="text-slate-400">›</span>
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3 text-xs text-slate-300">
            Type partenaire
            <div className="mt-2 text-sm font-semibold text-white">{publisher?.type || (isPublisher ? 'AUTHOR' : 'PARTNER')}</div>
          </div>
        </aside>

        <main className="space-y-6">
          <nav className={`${panelClass} flex flex-wrap gap-2 p-3`}>
            {[
              { key: 'dashboard', label: 'Tableau de bord' },
              { key: 'books', label: 'Mes livres' },
              { key: 'formations', label: 'Mes formations' },
              { key: 'annonces', label: 'Mes annonces' },
              { key: 'rendezvous', label: 'Mes rendez-vous' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'dashboard' ? (
            <section id="dashboard" className="grid gap-4 md:grid-cols-3">
              <div className={`${cardClass} p-4`}>
                <p className="text-xs text-slate-300">Mes livres</p>
                <p className="text-2xl font-bold text-white">{books.length}</p>
              </div>
              <div className={`${cardClass} p-4`}>
                <p className="text-xs text-slate-300">Mes formations</p>
                <p className="text-2xl font-bold text-white">{contentItems.length}</p>
              </div>
              <div className={`${cardClass} p-4`}>
                <p className="text-xs text-slate-300">Revenu net</p>
                <p className="text-2xl font-bold text-white">{formatHtg(publisherSales?.summary?.netRevenue)}</p>
              </div>
            </section>
          ) : null}

          {activeTab === 'books' ? (
            <section className={`space-y-4 ${panelClass} p-6`}>
              <h2 className="text-xl font-semibold text-white">Espace Écrivain / Éditeur</h2>
              <p className={`text-sm ${subduedText}`}>
                Publiez vos livres (PDF) gratuits ou payants et suivez vos ventes.
              </p>

              {!isPublisher ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Votre compte n&apos;est pas encore configuré comme éditeur. Contactez un administrateur
                  pour activer le statut partenaire.
                </div>
              ) : null}

              {publisher ? (
                <div className="flex items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4">
                  {publisher.logo ? (
                    <img src={resolveMediaUrl(publisher.logo)} alt="Logo partenaire" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-white">
                      {publisher.name?.slice(0, 2) || 'PR'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{publisher.name}</p>
                    <p className="text-xs text-slate-300">{publisher.type}</p>
                  </div>
                </div>
              ) : null}

              {publisherSales ? (
                <div className="grid gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-200 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">Ventes</p>
                    <p className="text-lg font-bold text-white">{publisherSales.summary?.totalSales || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Revenu net</p>
                    <p className="text-lg font-bold text-white">{formatHtg(publisherSales.summary?.netRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Livres</p>
                    <p className="text-lg font-bold text-white">{publisherSales.summary?.totalBooks || 0}</p>
                  </div>
                </div>
              ) : null}

              <div id="publish-book" className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <h3 className="text-lg font-semibold text-white">Publier un livre</h3>
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
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={bookForm.isPaid} onChange={(e) => setBookForm((p) => ({ ...p, isPaid: e.target.checked }))} />
                    Livre payant
                  </label>
                  {bookForm.isPaid ? (
                    <input className="input" placeholder="Prix HTG" value={bookForm.price} onChange={(e) => setBookForm((p) => ({ ...p, price: e.target.value }))} />
                  ) : null}
                  <div className="grid gap-2 text-sm text-slate-300">
                    <label>Fichier PDF</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setBookFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="grid gap-2 text-sm text-slate-300">
                    <label>Image de couverture (optionnel)</label>
                    <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                  </div>
                  <button className="btn-primary" type="button" onClick={submitBook} disabled={!isPublisher || submittingBook}>
                    {submittingBook ? 'Publication...' : 'Publier le livre'}
                  </button>
                </div>
              </div>

              <div id="books" className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <h3 className="text-lg font-semibold text-white">Mes livres</h3>
                {books.length ? (
                  books.slice(0, 6).map((book) => (
                    <div key={book.id} className="flex items-center justify-between rounded-xl border border-slate-700/60 px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-white">{book.title}</p>
                        <p className="text-xs text-slate-300">{book.subject} • {book.level}</p>
                      </div>
                      <span className="text-xs text-slate-200">{book.isPaid ? formatHtg(book.price) : 'Gratuit'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">Aucun livre pour le moment.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'formations' ? (
            <section id="formations" className={`space-y-4 ${panelClass} p-6`}>
              <h2 className="text-xl font-semibold text-white">Espace Formation certifiante</h2>
              <p className={`text-sm ${subduedText}`}>
                Publiez des modules certifiants (vidéos, PDF, quiz) pour les écoles, universités et ONG.
              </p>

              {!canPublishContent ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Ce module nécessite un compte Administrateur ou Enseignant. Contactez l&apos;équipe pour
                  activer les droits formation certifiante.
                </div>
              ) : null}

              <div id="publish-training" className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <h3 className="text-lg font-semibold text-white">Publier une formation</h3>
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
                  <label className="flex items-center gap-2 text-sm text-slate-300">
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

              <div className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
                <h3 className="text-lg font-semibold text-white">Mes formations</h3>
                {contentItems.length ? (
                  contentItems.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-700/60 px-3 py-2 text-sm">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-300">{item.type?.toUpperCase()} • {item.level}</p>
                      <p className="text-xs text-slate-400">Statut: {item.status}</p>
                      <p className="text-xs text-slate-400">
                        {item.isPaid ? `Payant • ${formatHtg(item.price)}` : 'Gratuit'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">Aucune formation pour le moment.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === 'annonces' ? (
            <section id="annonces" className={`space-y-4 ${panelClass} p-6`}>
              <h2 className="text-xl font-semibold text-white">Mes annonces</h2>
              <p className={`text-sm ${subduedText}`}>Diffusez des annonces à la communauté.</p>

              {announcementsLoading ? <p className="text-sm text-slate-300">Chargement...</p> : null}
              {!announcementsLoading && announcementConversations.length === 0 ? (
                <p className="text-sm text-slate-300">Aucune annonce publiée.</p>
              ) : null}
              {!announcementsLoading && announcementConversations.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {announcementConversations.map((conv) => (
                    <div key={conv.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm">
                      <p className="font-semibold text-white">{conv.lastMessage?.content?.slice(0, 80) || 'Annonce'}</p>
                      <p className="text-xs text-slate-400">
                        {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleString() : new Date(conv.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {canPublishAnnouncements ? (
                <form className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4" onSubmit={submitAnnouncement}>
                  <h3 className="text-sm font-semibold text-white">Nouvelle annonce</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    <select className="input" value={globalAudience} onChange={(e) => setGlobalAudience(e.target.value)}>
                      <option value="ALL">Tous les utilisateurs</option>
                      <option value="LEVEL">Niveau spécifique</option>
                    </select>
                    <select
                      className="input"
                      value={globalLevel}
                      onChange={(e) => setGlobalLevel(e.target.value)}
                      disabled={globalAudience !== 'LEVEL'}
                    >
                      {ANNOUNCE_LEVEL_OPTIONS.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="input min-h-[110px]"
                    value={globalContent}
                    onChange={(e) => setGlobalContent(e.target.value)}
                    placeholder="Message de l’annonce..."
                  />
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70">
                    <span>{globalFiles.length ? `${globalFiles.length} fichier(s) sélectionné(s)` : '📎 Joindre des fichiers'}</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setGlobalFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {globalFiles.length ? (
                    <button type="button" className="btn-secondary" onClick={() => setGlobalFiles([])}>
                      Retirer les fichiers
                    </button>
                  ) : null}
                  <button type="submit" className="btn-primary" disabled={sendingGlobal}>
                    {sendingGlobal ? 'Envoi...' : 'Envoyer l’annonce'}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-amber-200">Demandez l&apos;autorisation pour publier des annonces.</p>
              )}
            </section>
          ) : null}

          {activeTab === 'rendezvous' ? (
            <section id="rendezvous" className={`space-y-4 ${panelClass} p-6`}>
              <h2 className="text-xl font-semibold text-white">Mes rendez-vous</h2>
              <p className={`text-sm ${subduedText}`}>Rendez-vous réservés via la plateforme.</p>
              {bookingsLoading ? <p className="text-sm text-slate-300">Chargement...</p> : null}
              {!bookingsLoading && bookings.length === 0 ? (
                <p className="text-sm text-slate-300">Aucun rendez-vous pour le moment.</p>
              ) : null}
              {!bookingsLoading && bookings.length > 0 ? (
                <div className="space-y-2">
                  {bookings.slice(0, 8).map((booking) => (
                    <div key={booking.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm">
                      <p className="font-semibold text-white">
                        {booking.tutor?.firstName} {booking.tutor?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {booking.startsAt ? new Date(booking.startsAt).toLocaleString() : ''}
                      </p>
                      <p className="text-xs text-slate-300">Statut: {booking.status}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </section>
  );
}
