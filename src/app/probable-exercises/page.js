"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import Link from 'next/link';

export default function ProbableExercisesPage() {
  const [items, setItems] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('PHYSIQUE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [feedback, setFeedback] = useState('');
  const [submittingKey, setSubmittingKey] = useState('');
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);

  function getKey(subject, topic) {
    return `${subject}__${topic}`;
  }

  function normalizeSubjectName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
    setStudent(getStudent());

    apiClient('/public/probable-exercises', { token: authToken })
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e.message || 'Impossible de charger les exercices probables.'))
      .finally(() => setLoading(false));
  }, []);

  async function onToggleLike(subject, topic) {
    if (!token) {
      setFeedback('Connecte-toi pour aimer un exercice.');
      return;
    }

    const key = getKey(subject, topic);
    setSubmittingKey(`like:${key}`);
    setFeedback('');
    try {
      const data = await apiClient('/public/probable-exercises/like', {
        method: 'POST',
        token,
        body: JSON.stringify({ subject, topic })
      });

      setItems((prev) =>
        prev.map((subjectItem) => {
          if (subjectItem.subject !== subject) return subjectItem;
          return {
            ...subjectItem,
            topics: (subjectItem.topics || []).map((topicItem) =>
              topicItem.topic === topic
                ? {
                    ...topicItem,
                    likes: data.likes,
                    likedByMe: Boolean(data.liked)
                  }
                : topicItem
            )
          };
        })
      );
    } catch (e) {
      setFeedback(e.message || 'Erreur lors du like.');
    } finally {
      setSubmittingKey('');
    }
  }

  async function onComment(subject, topic) {
    if (!token) {
      setFeedback('Connecte-toi pour commenter.');
      return;
    }

    const key = getKey(subject, topic);
    const content = String(commentDrafts[key] || '').trim();
    if (!content) return;

    setSubmittingKey(`comment:${key}`);
    setFeedback('');
    try {
      const data = await apiClient('/public/probable-exercises/comment', {
        method: 'POST',
        token,
        body: JSON.stringify({ subject, topic, content })
      });

      setItems((prev) =>
        prev.map((subjectItem) => {
          if (subjectItem.subject !== subject) return subjectItem;
          return {
            ...subjectItem,
            topics: (subjectItem.topics || []).map((topicItem) => {
              if (topicItem.topic !== topic) return topicItem;
              const currentComments = Array.isArray(topicItem.comments) ? topicItem.comments : [];
              return {
                ...topicItem,
                commentsCount: Number(topicItem.commentsCount || 0) + 1,
                comments: [
                  {
                    id: data.comment?.id || `${Date.now()}`,
                    content,
                    createdAt: data.comment?.createdAt || new Date().toISOString(),
                    author: {
                      id: student?.id || null,
                      firstName: student?.firstName || 'Moi',
                      lastName: student?.lastName || ''
                    }
                  },
                  ...currentComments
                ].slice(0, 3)
              };
            })
          };
        })
      );
      setCommentDrafts((prev) => ({ ...prev, [key]: '' }));
    } catch (e) {
      setFeedback(e.message || 'Erreur lors du commentaire.');
    } finally {
      setSubmittingKey('');
    }
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Exercices les plus probables</h1>
        <p className="mt-2 text-sm text-brand-700">
          Analyse globale des examens passés pour le niveau NSIV (toutes écoles confondues).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className={`card text-left ${selectedSubject === 'PHYSIQUE' ? 'ring-2 ring-brand-400' : ''}`}
          onClick={() => setSelectedSubject('PHYSIQUE')}
        >
          <p className="text-lg font-semibold text-brand-900">Physique</p>
          <p className="mt-1 text-sm text-brand-700">Voir tous les exercices probables de Physique.</p>
        </button>
        <button
          type="button"
          className={`card text-left ${selectedSubject === 'MATHEMATIQUE' ? 'ring-2 ring-brand-400' : ''}`}
          onClick={() => setSelectedSubject('MATHEMATIQUE')}
        >
          <p className="text-lg font-semibold text-brand-900">Mathématique</p>
          <p className="mt-1 text-sm text-brand-700">Contenu en préparation.</p>
        </button>
        <button
          type="button"
          className={`card text-left ${selectedSubject === 'CHIMIE' ? 'ring-2 ring-brand-400' : ''}`}
          onClick={() => setSelectedSubject('CHIMIE')}
        >
          <p className="text-lg font-semibold text-brand-900">Chimie</p>
          <p className="mt-1 text-sm text-brand-700">Contenu en préparation.</p>
        </button>
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {feedback ? <p className="text-sm text-red-600">{feedback}</p> : null}

      {!loading && !error ? (
        selectedSubject !== 'PHYSIQUE' ? (
          <div className="card">
            <p className="text-lg font-semibold text-brand-900">
              {selectedSubject === 'MATHEMATIQUE' ? 'Mathématique' : 'Chimie'}
            </p>
            <p className="mt-2 text-sm text-brand-700">Ce contenu sera disponible bientôt.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items
              .filter((subjectItem) => normalizeSubjectName(subjectItem.subject).includes('PHYSIQUE'))
              .map((subjectItem) => (
                <article key={subjectItem.subject} className="card space-y-3">
                  <h2 className="text-xl font-semibold text-brand-900">{subjectItem.subject}</h2>
                  <div className="space-y-2">
                    {(subjectItem.topics || []).map((topicItem) => (
                      <div key={`${subjectItem.subject}_${topicItem.topic}`} className="rounded-lg border border-brand-100 px-3 py-2">
                        <p className="font-semibold text-brand-900">{topicItem.topic}</p>
                        <p className="text-xs text-brand-700">Apparitions: {topicItem.frequency}</p>
                        <p className="text-xs text-brand-700">Classification: {topicItem.classification}</p>
                        {topicItem.sampleQuestion ? (
                          <div className="mt-2 rounded border border-brand-100 bg-brand-50 px-2 py-2">
                            <p className="text-[11px] font-semibold text-brand-900">Exercice réel (extrait)</p>
                            <p className="text-xs text-brand-700">{topicItem.sampleQuestion}</p>
                          </div>
                        ) : null}
                        {(topicItem.sources || []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {topicItem.sources.map((source) => (
                              <Link
                                key={`${subjectItem.subject}_${topicItem.topic}_${source.fileName}`}
                                href={`/exam-viewer?file=${encodeURIComponent(source.fileName)}`}
                                className="btn-secondary !px-3 !py-1 text-xs"
                              >
                                Ouvrir PDF
                              </Link>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1 text-xs"
                            onClick={() => onToggleLike(subjectItem.subject, topicItem.topic)}
                            disabled={submittingKey === `like:${getKey(subjectItem.subject, topicItem.topic)}`}
                          >
                            {topicItem.likedByMe ? '💙 J’aime' : '🤍 J’aime'} ({topicItem.likes || 0})
                          </button>
                          <span className="text-xs text-brand-700">Commentaires: {topicItem.commentsCount || 0}</span>
                        </div>

                        <div className="mt-2 space-y-2">
                          {(topicItem.comments || []).map((comment) => (
                            <div key={comment.id} className="rounded border border-brand-100 bg-brand-50 px-2 py-1">
                              <p className="text-xs text-brand-900">{comment.content}</p>
                              <p className="text-[11px] text-brand-700">
                                {comment.author?.firstName || 'Utilisateur'} {comment.author?.lastName || ''} • {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <input
                            className="input !py-1 text-xs"
                            placeholder={token ? 'Ajouter un commentaire...' : 'Connecte-toi pour commenter'}
                            value={commentDrafts[getKey(subjectItem.subject, topicItem.topic)] || ''}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [getKey(subjectItem.subject, topicItem.topic)]: e.target.value
                              }))
                            }
                            disabled={!token || submittingKey === `comment:${getKey(subjectItem.subject, topicItem.topic)}`}
                          />
                          <button
                            type="button"
                            className="btn-primary !px-3 !py-1 text-xs"
                            onClick={() => onComment(subjectItem.subject, topicItem.topic)}
                            disabled={!token || submittingKey === `comment:${getKey(subjectItem.subject, topicItem.topic)}`}
                          >
                            Commenter
                          </button>
                        </div>
                      </div>
                    ))}
                    {(subjectItem.topics || []).length === 0 ? (
                      <p className="text-sm text-brand-700">Aucune donnée disponible.</p>
                    ) : null}
                  </div>
                </article>
              ))}
            {items.filter((subjectItem) => normalizeSubjectName(subjectItem.subject).includes('PHYSIQUE')).length === 0 ? (
              <p className="text-sm text-brand-700">Aucune donnée de Physique disponible pour le moment.</p>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  );
}
