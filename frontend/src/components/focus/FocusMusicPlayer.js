"use client";

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

function extractYouTubeVideoId(url) {
  if (!url) return null;
  const raw = String(url).trim();
  const match = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(videoId, autoplay = false) {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&autoplay=${autoplay ? 1 : 0}`;
}

export default function FocusMusicPlayer() {
  const audioRef = useRef(null);
  const youtubeRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [canManageTracks, setCanManageTracks] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiClient('/focus/music', { token })
      .then((data) => {
        setTracks(data.tracks || []);
      })
      .catch((e) => setError(e.message || 'Erreur de chargement audio'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiClient('/focus/music/can-manage', { token })
      .then((data) => setCanManageTracks(Boolean(data?.canManage)))
      .catch(() => setCanManageTracks(false));
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const currentTrack = tracks[currentIndex] || null;
  const youtubeVideoId = extractYouTubeVideoId(currentTrack?.url);
  const isYouTubeTrack = Boolean(youtubeVideoId);

  useEffect(() => {
    if (!currentTrack) return;

    if (isYouTubeTrack) {
      setYoutubeEmbedUrl(getYouTubeEmbedUrl(youtubeVideoId, isPlaying));
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      return;
    }

    setYoutubeEmbedUrl('');
    if (!audioRef.current) return;
    audioRef.current.src = currentTrack.url;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying, isYouTubeTrack, youtubeVideoId]);

  function sendYouTubeCommand(command) {
    if (!youtubeRef.current || !youtubeRef.current.contentWindow) return;
    youtubeRef.current.contentWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: command,
        args: []
      }),
      '*'
    );
  }

  async function logListen(songId) {
    const token = getToken();
    if (!token) return;
    try {
      await apiClient('/focus/music/listen', {
        method: 'POST',
        token,
        body: JSON.stringify({ songId })
      });
    } catch (_) {
      // best effort logging
    }
  }

  async function onPlay() {
    if (!currentTrack) return;
    if (isYouTubeTrack) {
      if (youtubeVideoId) {
        if (!youtubeEmbedUrl) {
          setYoutubeEmbedUrl(getYouTubeEmbedUrl(youtubeVideoId, true));
        } else {
          sendYouTubeCommand('playVideo');
        }
      }
      setIsPlaying(true);
      logListen(currentTrack.id);
      return;
    }
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      logListen(currentTrack.id);
    } catch (_) {
      setIsPlaying(false);
    }
  }

  function onPause() {
    if (isYouTubeTrack) {
      sendYouTubeCommand('pauseVideo');
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }

  function onStop() {
    if (isYouTubeTrack) {
      sendYouTubeCommand('stopVideo');
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  }

  async function onAddCustomTrack(event) {
    event.preventDefault();
    const token = getToken();
    if (!token || !customTitle.trim() || !customUrl.trim()) return;

    try {
      const data = await apiClient('/focus/music/custom', {
        method: 'POST',
        token,
        body: JSON.stringify({ title: customTitle.trim(), url: customUrl.trim(), category: 'custom' })
      });
      setTracks((prev) => [data.track, ...prev]);
      setCustomTitle('');
      setCustomUrl('');
    } catch (e) {
      setError(e.message || 'Erreur ajout piste personnalisée');
    }
  }

  function startEditTrack(track) {
    setEditingTrackId(track.id);
    setEditTitle(track.title || '');
    setEditUrl(track.url || '');
    setEditCategory(track.category || '');
  }

  function cancelEditTrack() {
    setEditingTrackId(null);
    setEditTitle('');
    setEditUrl('');
    setEditCategory('');
  }

  async function onUpdateTrack(trackId) {
    const token = getToken();
    if (!token) return;

    try {
      const payload = {};
      if (editTitle.trim()) payload.title = editTitle.trim();
      if (editUrl.trim()) payload.url = editUrl.trim();
      payload.category = editCategory.trim() || 'custom';

      const data = await apiClient(`/focus/music/${trackId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload)
      });

      setTracks((prev) => prev.map((t) => (t.id === trackId ? data.track : t)));
      cancelEditTrack();
    } catch (e) {
      setError(e.message || 'Erreur modification piste');
    }
  }

  async function onDeleteTrack(trackId) {
    const token = getToken();
    if (!token) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm('Supprimer cette piste ?') : false;
    if (!confirmed) return;

    try {
      await apiClient(`/focus/music/${trackId}`, {
        method: 'DELETE',
        token
      });

      setTracks((prev) => {
        const next = prev.filter((t) => t.id !== trackId);
        if (currentIndex >= next.length) {
          setCurrentIndex(Math.max(0, next.length - 1));
        }
        return next;
      });
      if (editingTrackId === trackId) {
        cancelEditTrack();
      }
    } catch (e) {
      setError(e.message || 'Erreur suppression piste');
    }
  }

  return (
    <article className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-brand-900">Concentration Music Player</h2>
        {currentTrack ? <p className="text-sm text-brand-700">En cours: {currentTrack.title}</p> : null}
      </div>

      {loading ? <p className="text-sm text-brand-700">Chargement des pistes...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tracks.length > 0 ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map((track, idx) => (
              <div key={track.id} className={`rounded-lg border px-3 py-2 text-left text-sm ${idx === currentIndex ? 'border-brand-500 bg-brand-50' : 'border-brand-100'}`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setCurrentIndex(idx)}
                >
                  <p className="font-semibold text-brand-900">{track.title}</p>
                  <p className="text-xs text-brand-700">{track.category || 'focus'}</p>
                </button>

                {canManageTracks ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => startEditTrack(track)}>Modifier</button>
                    <button type="button" className="btn-secondary" onClick={() => onDeleteTrack(track.id)}>Supprimer</button>
                  </div>
                ) : null}

                {canManageTracks && editingTrackId === track.id ? (
                  <div className="mt-2 space-y-2">
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre" />
                    <input className="input" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL audio (https://...)" />
                    <input className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Categorie" />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary" onClick={() => onUpdateTrack(track.id)}>Enregistrer</button>
                      <button type="button" className="btn-secondary" onClick={cancelEditTrack}>Annuler</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={onPlay}>Play</button>
            <button type="button" className="btn-secondary" onClick={onPause}>Pause</button>
            <button type="button" className="btn-secondary" onClick={onStop}>Stop</button>
            <label className="ml-auto flex items-center gap-2 text-sm text-brand-700">
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </label>
          </div>
        </>
      ) : null}

      {canManageTracks ? (
        <form className="grid gap-2 sm:grid-cols-3" onSubmit={onAddCustomTrack}>
          <input
            className="input"
            placeholder="Titre piste personnalisée"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
          <input
            className="input"
            placeholder="URL audio (https://...)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <button type="submit" className="btn-secondary">Ajouter URL perso</button>
        </form>
      ) : null}

      {isYouTubeTrack && youtubeEmbedUrl ? (
        <div className="overflow-hidden rounded-lg border border-brand-100">
          <iframe
            ref={youtubeRef}
            title={currentTrack?.title || 'YouTube Focus'}
            src={youtubeEmbedUrl}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-56 w-full"
          />
        </div>
      ) : (
        <audio
          ref={audioRef}
          onEnded={() => {
            const hasNext = currentIndex + 1 < tracks.length;
            if (hasNext) {
              setCurrentIndex((prev) => prev + 1);
            } else {
              setIsPlaying(false);
            }
          }}
        />
      )}
    </article>
  );
}
