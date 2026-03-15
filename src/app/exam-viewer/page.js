"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/runtime-config';

export default function ExamViewerPage() {
  const router = useRouter();
  const [file, setFile] = useState('');
  const [src, setSrc] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setFile(params.get('file') || '');
  }, []);

  useEffect(() => {
    if (!file) return;
    setSrc(`${getApiBaseUrl()}/public/exam-pdfs/${encodeURIComponent(file)}`);
  }, [file]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href || '';
  }, [file]);

  async function handleShare() {
    try {
      setShareStatus('');
      if (typeof window === 'undefined') return;

      const payload = { title: 'Examen PDF', text: file || 'Document', url: shareUrl || window.location.href };
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
        setShareStatus('Lien copié.');
        return;
      }

      setShareStatus('Partage indisponible sur ce navigateur.');
    } catch (error) {
      // Ignore user cancel on native share.
      const message = String(error?.message || '');
      if (message.toLowerCase().includes('abort')) return;
      setShareStatus('Impossible de partager.');
    }
  }

  function handleBack() {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/probable-exercises');
  }

  function openDirect() {
    if (typeof window === 'undefined' || !src) return;
    window.open(src, '_blank', 'noopener,noreferrer');
  }

  if (!file) {
    return <p className="text-sm text-red-600">Aucun fichier PDF sélectionné.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[220px]">
            <h1 className="text-2xl font-bold text-brand-900">PDF de reference</h1>
            <p className="mt-1 break-all text-sm text-brand-700">{file}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={handleBack} title="Retour">
              ← Retour
            </button>
            <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={openDirect} disabled={!src}>
              Ouvrir dans un onglet
            </button>
            <button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={handleShare}>
              Partager
            </button>
          </div>
        </div>
        {shareStatus ? <p className="mt-2 text-xs font-semibold text-brand-700">{shareStatus}</p> : null}
      </div>
      <div className="card p-2">
        <iframe
          title={`PDF ${file}`}
          src={src}
          className="h-[75vh] w-full rounded border border-brand-100"
          referrerPolicy="no-referrer"
        />
      </div>
    </section>
  );
}
