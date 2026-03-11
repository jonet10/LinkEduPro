"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

const LEVEL_OPTIONS = ['9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function formatTimeShort(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function conversationLabel(conversation, currentUserId) {
  if (conversation.type === 'GLOBAL') {
    return conversation.targetLevel
      ? `Annonce ${conversation.targetLevel}`
      : 'Annonce globale';
  }

  const other = (conversation.participants || []).find((p) => p.userId !== currentUserId);
  if (!other) return 'Conversation privée';
  return `${other.firstName} ${other.lastName}`.trim();
}

function conversationRecipientId(conversation, currentUserId) {
  if (conversation.type !== 'PRIVATE') return null;
  const other = (conversation.participants || []).find((p) => p.userId !== currentUserId);
  return other ? other.userId : null;
}

function messagePreview(message) {
  if (!message) return 'Aucun message';
  const content = String(message.content || '').trim();
  if (content) return content;
  const files = Array.isArray(message.attachments) ? message.attachments : [];
  if (files.length === 1) return '📎 1 pièce jointe';
  if (files.length > 1) return `📎 ${files.length} pièces jointes`;
  return 'Message';
}

export default function MessagesPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(0);

  const [communityUsers, setCommunityUsers] = useState([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientRoleFilter, setRecipientRoleFilter] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [selectedRecipientLabel, setSelectedRecipientLabel] = useState('');
  const [searchingRecipients, setSearchingRecipients] = useState(false);
  const [privateComposerText, setPrivateComposerText] = useState('');
  const [privateFiles, setPrivateFiles] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [sendingPrivate, setSendingPrivate] = useState(false);
  const recipientSearchSeq = useRef(0);

  const [globalAudience, setGlobalAudience] = useState('ALL');
  const [globalLevel, setGlobalLevel] = useState('NSIV');
  const [globalContent, setGlobalContent] = useState('');
  const [globalFiles, setGlobalFiles] = useState([]);
  const [sendingGlobal, setSendingGlobal] = useState(false);
  const [showNewMessageComposer, setShowNewMessageComposer] = useState(false);
  const isDarkMode = Boolean(student?.darkMode);

  const privateConversations = useMemo(
    () => conversations.filter((c) => c.type === 'PRIVATE'),
    [conversations]
  );

  const announcementConversations = useMemo(
    () => conversations.filter((c) => c.type === 'GLOBAL'),
    [conversations]
  );
  const [requestedConversationId, setRequestedConversationId] = useState(0);

  async function loadConversations(currentToken) {
    const data = await apiClient('/messages/conversations', { token: currentToken });
    const items = Array.isArray(data.conversations) ? data.conversations : [];
    setConversations(items);

    if (!items.length) {
      setSelectedConversationId(null);
      setSelectedConversation(null);
      return;
    }

    setSelectedConversationId((prev) => {
      if (prev && items.some((item) => item.id === prev)) return prev;
      return items[0].id;
    });
  }

  async function loadConversationById(currentToken, id) {
    if (!id) {
      setSelectedConversation(null);
      return;
    }

    setLoadingConversation(true);
    try {
      const data = await apiClient(`/messages/conversations/${id}`, { token: currentToken });
      setSelectedConversation(data.conversation || null);
      await loadConversations(currentToken);
    } catch (e) {
      setError(e.message || 'Erreur de chargement de la conversation.');
    } finally {
      setLoadingConversation(false);
    }
  }

  useEffect(() => {
    const currentToken = getToken();
    const currentStudent = getStudent();

    if (!currentToken || !currentStudent) {
      router.replace('/login');
      return;
    }

    setToken(currentToken);
    setStudent(currentStudent);
    if (currentStudent.role === 'TEACHER') {
      setRecipientRoleFilter('STUDENT');
    } else if (currentStudent.role === 'STUDENT') {
      setRecipientRoleFilter('TEACHER');
    }

    loadConversations(currentToken)
      .catch((e) => {
        setError(e.message || 'Erreur de chargement messagerie.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const q = recipientQuery.trim();
    if (q.length < 2) {
      setCommunityUsers([]);
      setSearchingRecipients(false);
      return;
    }

    const currentSeq = ++recipientSearchSeq.current;
    setSearchingRecipients(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          limit: '15'
        });
        if (recipientRoleFilter) params.set('role', recipientRoleFilter);
        const data = await apiClient(`/messages/recipients?${params.toString()}`, { token });
        if (recipientSearchSeq.current !== currentSeq) return;
        const users = (data?.recipients || []).map((row) => ({
          id: row.id,
          label: `${row.firstName} ${row.lastName}${row.school ? ` (${row.school})` : ''}`
        }));
        setCommunityUsers(users);
      } catch (e) {
        if (recipientSearchSeq.current !== currentSeq) return;
        setError(e.message || 'Erreur de recherche destinataires.');
      } finally {
        if (recipientSearchSeq.current === currentSeq) {
          setSearchingRecipients(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [token, recipientQuery, recipientRoleFilter]);

  useEffect(() => {
    if (!token || !selectedConversationId) return;
    loadConversationById(token, selectedConversationId);
  }, [token, selectedConversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const nextId = Number(query.get('conversation') || 0);
    if (nextId > 0) {
      setRequestedConversationId(nextId);
    }
  }, []);

  useEffect(() => {
    if (!requestedConversationId || !conversations.length) return;
    if (conversations.some((conversation) => conversation.id === requestedConversationId)) {
      setSelectedConversationId(requestedConversationId);
    }
  }, [requestedConversationId, conversations]);

  async function handleSendPrivate(event) {
    event.preventDefault();
    if (!token) return;

    const targetId = Number(recipientId);
    const content = privateComposerText.trim();
    if (!targetId) {
      setError('Sélectionne un destinataire depuis les résultats de recherche.');
      return;
    }
    if (!content && privateFiles.length === 0) return;

    setSendingPrivate(true);
    setError('');

    try {
      const body = new FormData();
      body.append('recipientId', String(targetId));
      body.append('content', content);
      privateFiles.forEach((file) => body.append('files', file, file.name));

      await apiClient('/messages/private', {
        method: 'POST',
        token,
        body
      });

      setPrivateComposerText('');
      setPrivateFiles([]);
      setRecipientId('');
      setRecipientQuery('');
      setSelectedRecipientLabel('');
      setCommunityUsers([]);
      setShowNewMessageComposer(false);
      await loadConversations(token);
    } catch (e) {
      setError(e.message || 'Erreur envoi message privé.');
    } finally {
      setSendingPrivate(false);
    }
  }

  async function handleReply(event) {
    event.preventDefault();
    if (!token || !selectedConversation || selectedConversation.type !== 'PRIVATE') return;

    const content = replyText.trim();
    const targetId = conversationRecipientId(selectedConversation, student?.id);
    if (!targetId) return;
    if (!content && replyFiles.length === 0) return;

    setSendingPrivate(true);
    setError('');

    try {
      const body = new FormData();
      body.append('recipientId', String(targetId));
      body.append('content', content);
      replyFiles.forEach((file) => body.append('files', file, file.name));

      await apiClient('/messages/private', {
        method: 'POST',
        token,
        body
      });
      setReplyText('');
      setReplyFiles([]);
      await loadConversationById(token, selectedConversation.id);
    } catch (e) {
      setError(e.message || 'Erreur envoi réponse.');
    } finally {
      setSendingPrivate(false);
    }
  }

  async function handleDeleteConversation() {
    if (!token || !selectedConversation?.id) return;
    const ok = typeof window === 'undefined'
      ? true
      : window.confirm('Supprimer cette conversation ?');
    if (!ok) return;

    setDeletingConversation(true);
    setError('');
    try {
      await apiClient(`/messages/conversations/${selectedConversation.id}`, {
        method: 'DELETE',
        token
      });
      setSelectedConversation(null);
      setSelectedConversationId(null);
      await loadConversations(token);
    } catch (e) {
      setError(e.message || 'Erreur de suppression conversation.');
    } finally {
      setDeletingConversation(false);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!token || !selectedConversation?.id || !messageId) return;
    const ok = typeof window === 'undefined'
      ? true
      : window.confirm('Supprimer ce message ?');
    if (!ok) return;

    setDeletingMessageId(messageId);
    setError('');
    try {
      await apiClient(`/messages/${messageId}`, {
        method: 'DELETE',
        token
      });
      await loadConversations(token);
    } catch (e) {
      setError(e.message || 'Erreur de suppression message.');
    } finally {
      setDeletingMessageId(0);
    }
  }

  async function handleSendGlobal(event) {
    event.preventDefault();
    if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(student?.role)) return;

    const content = globalContent.trim();
    if (!content && globalFiles.length === 0) return;

    setSendingGlobal(true);
    setError('');

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
      await loadConversations(token);
    } catch (e) {
      setError(e.message || 'Erreur envoi annonce.');
    } finally {
      setSendingGlobal(false);
    }
  }

  if (loading) {
    return <p>Chargement de la messagerie...</p>;
  }

  return (
    <section className="space-y-5">

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-brand-100 bg-brand-900 p-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Messagerie LinkEduPro</h2>
                <p className="text-xs text-slate-300">Discussions privées instantanées</p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                onClick={() => setShowNewMessageComposer((v) => !v)}
              >
                {showNewMessageComposer ? 'Fermer' : 'Nouveau message'}
              </button>
            </div>
          </div>

          {showNewMessageComposer ? (
            <div className="border-b border-slate-200 bg-slate-50 p-3">
              <form className="space-y-2" onSubmit={handleSendPrivate}>
                {student?.role !== 'STUDENT' ? (
                  <label className="block text-xs text-brand-700">
                    Mode d'envoi
                    <select
                      className="input mt-1"
                      value={recipientRoleFilter}
                      onChange={(e) => {
                        setRecipientRoleFilter(e.target.value);
                        setRecipientId('');
                        setSelectedRecipientLabel('');
                        setCommunityUsers([]);
                      }}
                    >
                      <option value="">Tous</option>
                      <option value="STUDENT">Leçon particulière (élèves)</option>
                      <option value="TEACHER">Professeurs</option>
                      <option value="ADMIN">Administrateurs</option>
                    </select>
                  </label>
                ) : (
                  <label className="block text-xs text-brand-700">
                    Destinataire autorisé
                    <select
                      className="input mt-1"
                      value={recipientRoleFilter}
                      onChange={(e) => {
                        setRecipientRoleFilter(e.target.value);
                        setRecipientId('');
                        setSelectedRecipientLabel('');
                        setCommunityUsers([]);
                      }}
                    >
                      <option value="TEACHER">Professeurs</option>
                      <option value="ADMIN">Administrateurs</option>
                    </select>
                  </label>
                )}
                <input
                  className="input"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setRecipientId('');
                    setSelectedRecipientLabel('');
                  }}
                  placeholder="Chercher un contact..."
                  required
                />
                {searchingRecipients ? <p className="text-xs text-brand-700">Recherche...</p> : null}
                {recipientQuery.trim().length >= 2 && communityUsers.length > 0 ? (
                  <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white">
                    {communityUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="block w-full border-b border-brand-100 px-3 py-2 text-left text-sm text-brand-900 hover:bg-brand-50 last:border-b-0"
                        onClick={() => {
                          setRecipientId(String(user.id));
                          setSelectedRecipientLabel(user.label);
                          setRecipientQuery(user.label);
                          setCommunityUsers([]);
                        }}
                      >
                        {user.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <textarea
                  className="input min-h-[80px]"
                  value={privateComposerText}
                  onChange={(e) => setPrivateComposerText(e.target.value)}
                  placeholder={
                    student?.role === 'TEACHER' && recipientRoleFilter === 'STUDENT'
                      ? 'Consigne de devoir, objectifs, date limite...'
                      : 'Écrire un message...'
                  }
                />
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-700 hover:bg-brand-50">
                  <span>{privateFiles.length ? `${privateFiles.length} fichier(s) sélectionné(s)` : '📎 Joindre des fichiers'}</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setPrivateFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {privateFiles.length ? (
                  <button type="button" className="btn-secondary w-full" onClick={() => setPrivateFiles([])}>
                    Retirer les fichiers
                  </button>
                ) : null}
                <button type="submit" className="btn-primary w-full" disabled={sendingPrivate || !recipientId}>
                  {sendingPrivate ? 'Envoi...' : 'Envoyer'}
                </button>
              </form>
            </div>
          ) : null}

          <div className="max-h-[560px] overflow-auto bg-white">
            {privateConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full border-b px-3 py-3 text-left text-sm ${
                  selectedConversationId === conversation.id
                    ? 'border-l-4 border-l-emerald-500 bg-brand-50'
                    : 'border-transparent bg-white hover:bg-brand-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-900">{conversationLabel(conversation, student?.id)}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-brand-700">{messagePreview(conversation.lastMessage)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-brand-700">{formatTimeShort(conversation.lastMessage?.createdAt || conversation.createdAt)}</p>
                    {conversation.unreadCount > 0 ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
            {privateConversations.length === 0 ? (
              <p className="px-3 py-3 text-xs text-brand-700">Aucune conversation privée.</p>
            ) : null}
          </div>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-brand-100 bg-brand-900 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {selectedConversation
                    ? conversationLabel(selectedConversation, student?.id)
                    : 'Sélectionne une conversation'}
                </h2>
                <p className="text-xs text-slate-300">
                  {selectedConversation?.type === 'PRIVATE' ? 'En ligne récemment' : 'Annonce globale'}
                </p>
              </div>
              {selectedConversation ? (
                <button
                  type="button"
                  className="rounded-md border border-white/30 px-2 py-1 text-[11px] hover:bg-white/10"
                  onClick={handleDeleteConversation}
                  disabled={deletingConversation}
                >
                  {deletingConversation ? 'Suppression...' : 'Supprimer'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-auto bg-brand-50 p-3">
            {loadingConversation ? <p className="text-sm text-brand-700">Chargement...</p> : null}
            {!loadingConversation && selectedConversation?.messages?.length ? (
              selectedConversation.messages.map((message) => {
                const mine = message.sender.id === student?.id;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? (isDarkMode ? 'ml-auto bg-brand-500 text-white' : 'ml-auto bg-[#d9fdd3] text-brand-900')
                        : 'mr-auto bg-white text-brand-900'
                    }`}
                  >
                    {!mine ? (
                      <p className="text-xs font-semibold text-brand-700">
                        {message.sender.firstName} {message.sender.lastName}
                      </p>
                    ) : null}
                    {String(message.content || '').trim() ? (
                      <p className="mt-0.5 whitespace-pre-wrap">{message.content}</p>
                    ) : null}
                    {Array.isArray(message.attachments) && message.attachments.length ? (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((att, idx) => (
                          <a
                            key={`${message.id}-${att?.storedName || idx}`}
                            href={resolveMediaUrl(att?.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block rounded-lg border px-2 py-1 text-xs font-semibold ${
                              mine && isDarkMode
                                ? 'border-white/30 bg-white/10 text-white'
                                : 'border-brand-100 bg-white/70 text-brand-900'
                            }`}
                          >
                            📎 {att?.originalName || att?.storedName || 'Fichier'}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <p className={`text-right text-[11px] ${mine && isDarkMode ? 'text-white/80' : 'text-brand-700'}`}>{formatTimeShort(message.createdAt)}</p>
                      {(mine || ['ADMIN', 'SUPER_ADMIN'].includes(student?.role)) ? (
                        <button
                          type="button"
                          className={`text-[11px] underline ${mine && isDarkMode ? 'text-white/80' : 'text-brand-700'}`}
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                        >
                          {deletingMessageId === message.id ? '...' : 'Supprimer'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : null}
            {!loadingConversation && !selectedConversation?.messages?.length ? (
              <p className="text-sm text-brand-700">Sélectionne une conversation pour voir les messages.</p>
            ) : null}
          </div>

          {selectedConversation?.type === 'PRIVATE' ? (
            <form className="flex gap-2 border-t border-slate-200 bg-white p-3" onSubmit={handleReply}>
              <label className="flex items-center justify-center rounded-full border border-slate-200 px-3 text-sm hover:bg-brand-50">
                <span className="select-none">📎</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setReplyFiles(Array.from(e.target.files || []))}
                />
              </label>
              <input
                className="input !rounded-full"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Écrire un message..."
              />
              <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" disabled={sendingPrivate}>
                {sendingPrivate ? '...' : 'Envoyer'}
              </button>
            </form>
          ) : null}
        </article>
      </div>

      <article className="card">
        <h2 className="text-xl font-semibold text-brand-900">Annonces</h2>
        <p className="mt-1 text-sm text-brand-700">
          Messages globaux envoyés par l&apos;administration.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {announcementConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedConversationId(conversation.id)}
              className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-left hover:bg-brand-50"
            >
              <p className="font-semibold text-brand-900">{conversationLabel(conversation, student?.id)}</p>
              <p className="mt-1 text-sm text-brand-700 line-clamp-3">{messagePreview(conversation.lastMessage) || 'Annonce'}</p>
              <p className="mt-1 text-[11px] text-brand-700">{formatDateTime(conversation.lastMessage?.createdAt || conversation.createdAt)}</p>
            </button>
          ))}
          {announcementConversations.length === 0 ? (
            <p className="text-sm text-brand-700">Aucune annonce pour le moment.</p>
          ) : null}
        </div>

        {['ADMIN', 'SUPER_ADMIN'].includes(student?.role) ? (
          <form className="mt-5 space-y-2 rounded-lg border border-brand-100 p-3" onSubmit={handleSendGlobal}>
            <h3 className="text-sm font-semibold text-brand-900">Nouvelle annonce</h3>
            <div className="grid gap-2 md:grid-cols-3">
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
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <textarea
              className="input min-h-[110px]"
              value={globalContent}
              onChange={(e) => setGlobalContent(e.target.value)}
              placeholder="Message global..."
            />
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-700 hover:bg-brand-50">
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
        ) : null}
      </article>
    </section>
  );
}
