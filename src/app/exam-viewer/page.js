"use client";

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ExamViewerPage() {
  const [file, setFile] = useState('');
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setFile(params.get('file') || '');
  }, []);

  useEffect(() => {
    if (!file) return;
    setSrc(`${API_URL}/public/exam-pdfs/${encodeURIComponent(file)}`);
  }, [file]);

  if (!file) {
    return <p className="text-sm text-red-600">Aucun fichier PDF selectionne.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">PDF de reference</h1>
        <p className="mt-1 text-sm text-brand-700">{file}</p>
      </div>
      <div className="card p-2">
        <iframe
          title={`PDF ${file}`}
          src={src}
          className="h-[75vh] w-full rounded border border-brand-100"
        />
      </div>
    </section>
  );
}
