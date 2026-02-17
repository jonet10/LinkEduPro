"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

export default function VerifiedTestimonials() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiClient('/public/blog/recent?limit=6')
      .then((data) => {
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
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
        <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Contenus de la communauté</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-brand-100">
            <Link href={`/blog?post=${item.id}`} className="block">
              {item.imageUrl ? (
                <img
                  src={resolveMediaUrl(item.imageUrl)}
                  alt={item.title}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 text-base font-semibold text-brand-900 hover:text-brand-700">{item.title}</h3>
                <p className="text-xs text-brand-500">
                  {item.author?.firstName} {item.author?.lastName} · {item.author?.role}
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
