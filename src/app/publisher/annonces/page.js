"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/runtime-config';

const LEVEL_OPTIONS = ['9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function PublisherAnnoncesPage() {
  const token = getToken();
  const student = getStudent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [level, setLevel] = useState('NSIV');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!token || student?.role !== 'PUBLISHER') return;
    let mounted = true;
    setLoading(true);
    setError('');
    apiClient('/messages/conversations', { token })
      .then((data) => {
        if (!mounted) return;
        const items = Array.isArray(data?.conversations) ? data.conversations : [];
        setAnnouncements(items.filter((c) => c.type === 'GLOBAL'));
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Erreur chargement annonces.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, student?.role]);

  if (!token || student?.role !== 'PUBLISHER') {
    return <p className="text-sm text-brand-700">Accès réservé aux partenaires.</p>;
  }

  async function sendAnnouncement(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!content.trim() && files.length === 0) {
      setError('Veuillez écrire un message ou ajouter un fichier.');
      return;
    }
    try {
      const body = new FormData();
      body.append('content', content.trim());
      body.append('audience', audience);
      if (audience === 'LEVEL') body.append('level', level);
      files.forEach((file) => body.append('files', file));

      const res = await fetch(`${getApiBaseUrl()}/messages/global`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || 'Erreur envoi annonce.');
      }

      setInfo('Annonce envoyée.');
      setContent('');
      setFiles([]);
      const refreshed = await apiClient('/messages/conversations', { token });
      const items = Array.isArray(refreshed?.conversations) ? refreshed.conversations : [];
      setAnnouncements(items.filter((c) => c.type === 'GLOBAL'));
    } catch (e) {
      setError(e.message || 'Erreur envoi annonce.');
    }
  }

  return (
    <main className="space-y-5">
      <section className="card space-y-2">
        <h1 className="text-3xl font-bold text-brand-900">Annonces partenaires</h1>
        <p className="text-sm text-brand-700">Publiez des annonces globales ou ciblées.</p>
      </section>

      <form className="card space-y-3" onSubmit={sendAnnouncement}>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-600">{info}</p> : null}
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="ALL">Tous les élèves</option>
            <option value="LEVEL">Par niveau</option>
          </select>
          {audience === 'LEVEL' ? (
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          ) : null}
        </div>
        <textarea
          className="input min-h-[120px]"
          placeholder="Écris ton annonce ici..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        <button className="btn-primary" type="submit">
          Publier l'annonce
        </button>
      </form>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-900">Annonces envoyées</h2>
        </div>
        {loading ? <p className="text-sm text-brand-700">Chargement...</p> : null}
        {!loading && announcements.length === 0 ? (
          <p className="text-sm text-brand-700">Aucune annonce pour le moment.</p>
        ) : null}
        <div className="mt-3 space-y-3">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-lg border border-brand-100 p-3">
              <p className="text-xs text-brand-700">{announcement.targetLevel ? `Niveau: ${announcement.targetLevel}` : 'Annonce globale'}</p>
              <p className="text-sm font-semibold text-brand-900">{announcement.lastMessage?.content || 'Annonce'}</p>
              <p className="text-xs text-brand-700">{formatDateTime(announcement.lastMessage?.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
