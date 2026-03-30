'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

function formatName(user) {
  if (!user) return 'Utilisateur';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';
}

export default function CourseDiscussion({ courseId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');

  const loadComments = async () => {
    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/v2/courses/${courseId}/comments`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments || []);
    } catch (_) {
      // silent
    }
  };

  useEffect(() => {
    loadComments();
  }, [courseId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!API_BASE || !content.trim()) return;
    const token = window.localStorage.getItem('token');
    if (!token) {
      window.alert('Connecte-toi pour commenter.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v2/courses/${courseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setContent('');
        await loadComments();
      }
    } catch (_) {
      // silent
    }
  };

  return (
    <section style={{ marginTop: '32px' }}>
      <h2 className="section-title">Discussion</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Pose une question ou laisse un commentaire..."
          style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid #d6cfc3' }}
        />
        <button className="btn" type="submit">Publier</button>
      </form>

      <div className="module-list">
        {comments.map((comment) => (
          <div className="module-card" key={comment.id}>
            <strong>{formatName(comment.user)}</strong>
            <p style={{ marginTop: '6px' }}>{comment.content}</p>
            {comment.replies?.length ? (
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {comment.replies.map((reply) => (
                  <div key={reply.id} style={{ padding: '8px 10px', background: '#f5f1ea', borderRadius: '10px' }}>
                    <strong>{formatName(reply.user)}</strong>
                    <p>{reply.content}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {comments.length === 0 && (
          <div className="module-card">
            <p className="meta">Aucun commentaire pour le moment.</p>
          </div>
        )}
      </div>
    </section>
  );
}
