'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function CourseEnrollButton({ courseId }) {
  const [state, setState] = useState('idle');

  const handleEnroll = async () => {
    if (!API_BASE) return;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) {
      window.alert('Connecte-toi pour t’inscrire au cours.');
      return;
    }

    setState('loading');
    try {
      const res = await fetch(`${API_BASE}/v2/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setState('done');
      else setState('idle');
    } catch (_) {
      setState('idle');
    }
  };

  return (
    <button className="btn" onClick={handleEnroll} disabled={state === 'loading'}>
      {state === 'done' ? 'Inscrit' : state === 'loading' ? 'Inscription...' : "S'inscrire"}
    </button>
  );
}
