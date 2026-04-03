"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { getStudent, getToken } from '@/lib/auth';
import { apiClient } from '@/lib/api';

const SAVE_INTERVAL_MS = 5000;

function createWatermarkDataUrl(text) {
  const canvas = document.createElement('canvas');
  const width = 520;
  const height = 260;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.font = '16px "Inter", system-ui, sans-serif';
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillText(text, -40, 140);
  ctx.fillText(text, -10, 200);
  return canvas.toDataURL('image/png');
}

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params?.id);
  const token = useMemo(() => getToken(), []);
  const student = useMemo(() => getStudent(), []);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderRef = useRef(null);
  const scrollLockRef = useRef(false);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState('');

  useEffect(() => {
    if (!token || !bookId) return;
    apiClient(`/reader/progress?documentType=BOOK&documentId=${bookId}`, { token })
      .then((data) => {
        if (data?.progress) {
          setProgress(data.progress);
          if (data.progress.page > 1 || data.progress.scrollPosition > 0) {
            setShowResume(true);
          }
        }
      })
      .catch(() => null);
  }, [token, bookId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    const handleKey = (event) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (['s', 'p', 'u', 'c'].includes(key)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKey, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const displayName = student?.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : 'Utilisateur';
    const dateLabel = new Date().toLocaleString('fr-FR');
    const watermark = createWatermarkDataUrl(`${displayName} • ${dateLabel}`);
    setWatermarkUrl(watermark);
  }, [student?.firstName, student?.lastName]);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (!token || !bookId) return;
      setLoading(true);
      setError('');
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const streamUrl = `${getApiBaseUrl()}/reader/books/${bookId}/stream`;
        const loadingTask = pdfjsLib.getDocument({
          url: streamUrl,
          httpHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: false
        });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        setLoading(false);
      } catch (err) {
        setError(err?.message || 'Impossible de charger le PDF.');
        setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [token, bookId]);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({ canvasContext: context, viewport });
        renderRef.current = renderTask;
        await renderTask.promise;

        if (progress?.page === pageNumber && progress?.scrollPosition && containerRef.current) {
          containerRef.current.scrollTop = progress.scrollPosition;
        } else if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      } finally {
        setLoading(false);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      renderRef.current?.cancel?.();
    };
  }, [pdfDoc, pageNumber, scale]);

  function computeProgressPercent() {
    if (!numPages) return 0;
    return Math.min(100, Math.round((pageNumber / numPages) * 100));
  }

  async function persistProgress(currentPage, scrollPosition) {
    if (!token || !bookId) return;
    const progressPercent = computeProgressPercent();
    try {
      await apiClient('/reader/progress', {
        method: 'POST',
        token,
        body: JSON.stringify({
          documentType: 'BOOK',
          documentId: bookId,
          page: currentPage,
          scrollPosition,
          progressPercent
        })
      });
    } catch (_) {
      // silent
    }
  }

  useEffect(() => {
    if (!token || !bookId) return undefined;
    const interval = setInterval(() => {
      const scrollPosition = containerRef.current ? Math.round(containerRef.current.scrollTop || 0) : 0;
      persistProgress(pageNumber, scrollPosition);
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, bookId, pageNumber]);

  useEffect(() => {
    const scrollHandler = () => {
      if (!containerRef.current) return;
      const scrollPosition = Math.round(containerRef.current.scrollTop || 0);
      persistProgress(pageNumber, scrollPosition);

      const container = containerRef.current;
      const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 24;
      const nearTop = container.scrollTop <= 24;
      if (scrollLockRef.current) return;
      if (nearBottom && pageNumber < numPages) {
        scrollLockRef.current = true;
        setPageNumber((p) => Math.min(numPages, p + 1));
        setTimeout(() => {
          scrollLockRef.current = false;
        }, 350);
      } else if (nearTop && pageNumber > 1) {
        scrollLockRef.current = true;
        setPageNumber((p) => Math.max(1, p - 1));
        setTimeout(() => {
          scrollLockRef.current = false;
        }, 350);
      }
    };

    const node = containerRef.current;
    if (node) {
      node.addEventListener('scroll', scrollHandler);
    }
    return () => {
      if (node) node.removeEventListener('scroll', scrollHandler);
    };
  }, [pageNumber]);

  function handleResume() {
    if (!progress) return;
    setPageNumber(Math.max(1, Math.min(progress.page || 1, numPages || 1)));
    setShowResume(false);
  }

  function handleRestart() {
    setPageNumber(1);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setShowResume(false);
    persistProgress(1, 0);
  }

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container || typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      // ignore
    }
  }

  const progressPercent = computeProgressPercent();

  return (
    <section className="relative min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Edupro Reader</p>
          <h1 className="text-lg font-semibold">Lecture sécurisée</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" type="button" onClick={() => router.back()}>
            Retour
          </button>
          <button className="btn-secondary" type="button" onClick={toggleFullscreen}>
            Plein écran
          </button>
          <button className="btn-secondary" type="button" onClick={handleRestart}>
            Reprendre depuis le début
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <button
              className="btn-secondary"
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              Page précédente
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              Page suivante
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span>Page {pageNumber} / {numPages || 0}</span>
            <span>{progressPercent}%</span>
            <input
              type="range"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => setPageNumber(Number(e.target.value))}
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}

        <div
          ref={containerRef}
          className="relative max-h-[75vh] overflow-auto rounded-3xl border border-slate-800 bg-slate-900/40 p-4"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading ? <p className="text-sm text-slate-400">Chargement du document...</p> : null}
          <div className="relative flex justify-center">
            <canvas ref={canvasRef} className="rounded-xl bg-white" />
            {watermarkUrl ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `url(${watermarkUrl})`,
                  backgroundRepeat: 'repeat',
                  mixBlendMode: 'normal'
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progression sauvegardée automatiquement.</span>
          <span>Dernière sauvegarde: {progress?.updatedAt ? new Date(progress.updatedAt).toLocaleString('fr-FR') : '—'}</span>
        </div>
      </div>

      {showResume ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white">
            <h2 className="text-lg font-semibold">Reprendre la lecture ?</h2>
            <p className="mt-2 text-sm text-slate-300">
              Voulez-vous reprendre à la page {progress?.page || 1} ?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={handleResume} type="button">Reprendre</button>
              <button className="btn-secondary" onClick={handleRestart} type="button">Reprendre depuis le début</button>
            </div>
          </div>
        </div>
      ) : null}

      {isBlurred ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 text-white">
          <p className="text-lg font-semibold">Lecture protégée · Reviens sur l&apos;écran pour continuer</p>
        </div>
      ) : null}
    </section>
  );
}
