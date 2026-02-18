"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

const LEVEL_OPTIONS = ['9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
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

  const [communityUsers, setCommunityUsers] = useState([]);
  const [recipientId, setRecipientId] = useState('');
  const [privateComposerText, setPrivateComposerText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingPrivate, setSendingPrivate] = useState(false);

  const [globalAudience, setGlobalAudience] = useState('ALL');
  const [globalLevel, setGlobalLevel] = useState('NSIV');
  const [globalContent, setGlobalContent] = useState('');
  const [sendingGlobal, setSendingGlobal] = useState(false);

  const privateConversations = useMemo(
    () => conversations.filter((c) => c.type === 'PRIVATE'),
    [conversations]
  );

  const announcementConversations = useMemo(
    () => conversations.filter((c) => c.type === 'GLOBAL'),
    [conversations]
  );

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

    Promise.all([
      loadConversations(currentToken),
      apiClient('/results/community', { token: currentToken })
    ])
      .then(([, community]) => {
        const users = (community?.leaderboard || [])
          .filter((row) => row.studentId !== currentStudent.id)
          .map((row) => ({ id: row.studentId, label: `${row.displayName} (${row.school})` }));
        setCommunityUsers(users);
        if (users[0]) setRecipientId(String(users[0].id));
      })
      .catch((e) => {
        setError(e.message || 'Erreur de chargement messagerie.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!token || !selectedConversationId) return;
    loadConversationById(token, selectedConversationId);
  }, [token, selectedConversationId]);

  async function handleSendPrivate(event) {
    event.preventDefault();
    if (!token) return;

    const targetId = Number(recipientId);
    const content = privateComposerText.trim();
    if (!targetId || !content) return;

    setSendingPrivate(true);
    setError('');

    try {
      await apiClient('/messages/private', {
        method: 'POST',
        token,
        body: JSON.stringify({ recipientId: targetId, content })
      });

      setPrivateComposerText('');
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
    if (!content || !targetId) return;

    setSendingPrivate(true);
    setError('');

    try {
      await apiClient('/messages/private', {
        method: 'POST',
        token,
        body: JSON.stringify({ recipientId: targetId, content })
      });
      setReplyText('');
      await loadConversationById(token, selectedConversation.id);
    } catch (e) {
      setError(e.message || 'Erreur envoi reponse.');
    } finally {
      setSendingPrivate(false);
    }
  }

  async function handleSendGlobal(event) {
    event.preventDefault();
    if (!token || student?.role !== 'ADMIN') return;

    const content = globalContent.trim();
    if (!content) return;

    const payload = {
      content,
      audience: globalAudience
    };

    if (globalAudience === 'LEVEL') {
      payload.level = globalLevel;
    }

    setSendingGlobal(true);
    setError('');

    try {
      await apiClient('/messages/global', {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      });

      setGlobalContent('');
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
    <section className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-black text-brand-900">Messagerie interne</h1>
        <p className="mt-2 text-sm text-brand-700">
          Conversations privées et section Annonces globales.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="card xl:col-span-1">
          <h2 className="mb-3 text-lg font-semibold text-brand-900">Conversations privées</h2>
          <div className="space-y-2">
            {privateConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedConversationId === conversation.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-brand-100 bg-white hover:bg-brand-50'
                }`}
              >
                <p className="font-semibold text-brand-900">{conversationLabel(conversation, student?.id)}</p>
                <p className="mt-1 line-clamp-2 text-xs text-brand-700">{conversation.lastMessage?.content || 'Aucun message'}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-brand-700">
                  <span>{formatDateTime(conversation.lastMessage?.createdAt || conversation.createdAt)}</span>
                  {conversation.unreadCount > 0 ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
            {privateConversations.length === 0 ? (
              <p className="text-xs text-brand-700">Aucune conversation privée.</p>
            ) : null}
          </div>

          <hr className="my-4 border-brand-100" />

          <h3 className="text-sm font-semibold text-brand-900">Nouveau message privé</h3>
          <form className="mt-2 space-y-2" onSubmit={handleSendPrivate}>
            <select
              className="input"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              required
            >
              <option value="">Choisir un destinataire</option>
              {communityUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.label}</option>
              ))}
            </select>
            <textarea
              className="input min-h-[90px]"
              value={privateComposerText}
              onChange={(e) => setPrivateComposerText(e.target.value)}
              placeholder="Votre message..."
              required
            />
            <button type="submit" className="btn-primary w-full" disabled={sendingPrivate || !recipientId}>
              {sendingPrivate ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        </article>

        <article className="card xl:col-span-2">
          <h2 className="text-lg font-semibold text-brand-900">
            {selectedConversation
              ? conversationLabel(selectedConversation, student?.id)
              : 'Détail de la conversation'}
          </h2>
          <p className="mt-1 text-xs text-brand-700">
            Les messages sont affichés par ordre chronologique.
          </p>

          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto rounded-lg border border-brand-100 p-3">
            {loadingConversation ? <p className="text-sm text-brand-700">Chargement...</p> : null}
            {!loadingConversation && selectedConversation?.messages?.length ? (
              selectedConversation.messages.map((message) => {
                const mine = message.sender.id === student?.id;
                return (
                  <div
                    key={message.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      mine ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white'
                    }`}
                  >
                    <p className="font-semibold text-brand-900">
                      {message.sender.firstName} {message.sender.lastName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-brand-700">{message.content}</p>
                    <p className="mt-1 text-[11px] text-brand-700">{formatDateTime(message.createdAt)}</p>
                  </div>
                );
              })
            ) : null}
            {!loadingConversation && !selectedConversation?.messages?.length ? (
              <p className="text-sm text-brand-700">Sélectionne une conversation pour voir les messages.</p>
            ) : null}
          </div>

          {selectedConversation?.type === 'PRIVATE' ? (
            <form className="mt-3 flex gap-2" onSubmit={handleReply}>
              <input
                className="input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Répondre..."
                required
              />
              <button type="submit" className="btn-primary" disabled={sendingPrivate}>
                {sendingPrivate ? '...' : 'Répondre'}
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
              <p className="mt-1 text-sm text-brand-700 line-clamp-3">{conversation.lastMessage?.content || 'Annonce'}</p>
              <p className="mt-1 text-[11px] text-brand-700">{formatDateTime(conversation.lastMessage?.createdAt || conversation.createdAt)}</p>
            </button>
          ))}
          {announcementConversations.length === 0 ? (
            <p className="text-sm text-brand-700">Aucune annonce pour le moment.</p>
          ) : null}
        </div>

        {student?.role === 'ADMIN' ? (
          <form className="mt-5 space-y-2 rounded-lg border border-brand-100 p-3" onSubmit={handleSendGlobal}>
            <h3 className="text-sm font-semibold text-brand-900">Nouvelle annonce (Admin)</h3>
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
              required
            />
            <button type="submit" className="btn-primary" disabled={sendingGlobal}>
              {sendingGlobal ? 'Envoi...' : 'Envoyer annonce'}
            </button>
          </form>
        ) : null}
      </article>
    </section>
  );
}
