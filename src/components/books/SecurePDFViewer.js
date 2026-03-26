"use client";

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/runtime-config';

export default function SecurePDFViewer({ bookId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    if (!bookId) return undefined;
    const token = getToken();
    if (!token) {
      setError('Connexion requise pour lire ce livre.');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let objectUrl = '';

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}/books/view/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) {
          const message = await res.text().catch(() => '');
          throw new Error(message || 'Impossible de charger le PDF.');
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Erreur PDF.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookId]);

  if (loading) {
    return <p className="text-sm text-brand-700">Chargement du PDF...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!fileUrl) {
    return <p className="text-sm text-brand-700">Aucun document disponible.</p>;
  }

  return (
    <div
      className="rounded-2xl border border-brand-100 bg-white/70 p-2"
      onContextMenu={(event) => event.preventDefault()}
    >
      <iframe
        title="Secure PDF"
        src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        className="h-[75vh] w-full rounded-xl"
      />
    </div>
  );
}
