'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LessonProgressButton({ courseId, lessonId }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (!API_BASE) return;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) {
      window.alert('Connecte-toi pour enregistrer ta progression.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v2/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, lessonId })
      });
      if (res.ok) {
        setDone(true);
      }
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn" onClick={handleClick} disabled={loading}>
      {done ? 'Lecon terminee' : loading ? 'Enregistrement...' : 'Marquer comme termine'}
    </button>
  );
}
