"use client";

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function FocusMusicPlayer() {
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

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
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const currentTrack = tracks[currentIndex] || null;

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.url;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

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
    if (!audioRef.current || !currentTrack) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      logListen(currentTrack.id);
    } catch (_) {
      setIsPlaying(false);
    }
  }

  function onPause() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }

  function onStop() {
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
              <button
                key={track.id}
                type="button"
                className={`rounded-lg border px-3 py-2 text-left text-sm ${idx === currentIndex ? 'border-brand-500 bg-brand-50' : 'border-brand-100'}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <p className="font-semibold text-brand-900">{track.title}</p>
                <p className="text-xs text-brand-700">{track.category || 'focus'}</p>
              </button>
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
    </article>
  );
}
