"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

export default function VerifiedTestimonials() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const token = getToken();
    const blogPromise = apiClient('/public/blog/recent?limit=6')
      .then((data) => (Array.isArray(data.items) ? data.items : []));
    const catchupPromise = token
      ? apiClient('/catchup', { token })
        .then((data) => (Array.isArray(data.sessions) ? data.sessions : []))
        .catch(() => [])
      : Promise.resolve([]);

    Promise.all([blogPromise, catchupPromise])
      .then(([blogItems, catchupItems]) => {
        const mappedBlog = blogItems.map((item) => ({
          type: 'BLOG',
          id: `blog_${item.id}`,
          link: `/blog/post/${item.id}`,
          title: item.title,
          excerpt: item.excerpt || '',
          imageUrl: item.imageUrl || null,
          authorLabel: `${item.author?.firstName || ''} ${item.author?.lastName || ''} · ${item.author?.role || ''}`.trim(),
          sortDate: item.createdAt ? new Date(item.createdAt).getTime() : 0
        }));

        const mappedCatchup = catchupItems.map((session) => ({
          type: 'CATCHUP',
          id: `catchup_${session.id}`,
          link: `/rattrapage?session=${encodeURIComponent(session.id)}`,
          title: `Rattrapage: ${session.title}`,
          excerpt: session.invitationMessage || session.description || '',
          imageUrl: null,
          authorLabel: `Session ${session.subject} · ${session.createdBy?.firstName || ''} ${session.createdBy?.lastName || ''}`.trim(),
          sortDate: session.createdAt ? new Date(session.createdAt).getTime() : (session.startsAt ? new Date(session.startsAt).getTime() : 0)
        }));

        const merged = [...mappedBlog, ...mappedCatchup]
          .sort((a, b) => b.sortDate - a.sortDate)
          .slice(0, 6);

        if (!cancelled) {
          setItems(merged);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || 'Erreur de chargement.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card" aria-labelledby="recent-publications-title">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="recent-publications-title" className="text-2xl font-bold text-brand-900">Publications récentes</h2>
        <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Contenus de la communauté et rattrapages</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-brand-100">
            <Link href={item.link} className="block">
              {item.imageUrl ? (
                <img
                  src={resolveMediaUrl(item.imageUrl)}
                  alt={item.title}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/article-placeholder.svg';
                  }}
                />
              ) : (
                <div className="flex h-44 items-center justify-center bg-brand-50">
                  <p className="text-xs font-semibold text-brand-700">
                    {item.type === 'CATCHUP' ? 'Rattrapage' : 'Image indisponible'}
                  </p>
                </div>
              )}
              <div className="space-y-2 p-4">
                {item.type === 'CATCHUP' ? (
                  <p className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Rendez-vous rattrapage
                  </p>
                ) : null}
                <h3 className="line-clamp-2 text-base font-semibold text-brand-900 hover:text-brand-700">{item.title}</h3>
                <p className="text-xs text-brand-500">
                  {item.authorLabel}
                </p>
                {item.excerpt ? <p className="line-clamp-3 text-sm text-brand-700">{item.excerpt}</p> : null}
              </div>
            </Link>
          </article>
        ))}
        {items.length === 0 && !error ? <p className="text-sm text-brand-700">Aucune publication récente pour le moment.</p> : null}
      </div>
    </section>
  );
}
