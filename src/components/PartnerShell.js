"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken } from '@/lib/auth';

function getInitials(student) {
  const first = String(student?.firstName || '').trim();
  const last = String(student?.lastName || '').trim();
  const combo = `${first} ${last}`.trim();
  if (!combo) return 'LP';
  const parts = combo.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function PartnerShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = getToken();
  const student = getStudent();
  const [publisher, setPublisher] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || student?.role !== 'PUBLISHER') return;
    let mounted = true;
    apiClient('/publishers/me', { token })
      .then((data) => {
        if (!mounted) return;
        setPublisher(data?.publisher || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Impossible de charger le profil partenaire.');
      });
    return () => {
      mounted = false;
    };
  }, [token, student?.role]);

  const items = useMemo(() => {
    const list = [
      { href: '/', label: 'Tableau de bord' },
      { href: '/publisher/books', label: 'Mes livres' },
      { href: '/publisher/formations', label: 'Mes formations' },
      { href: '/publisher/annonces', label: 'Mes annonces' },
      { href: '/publisher/rendezvous', label: 'Mes rendez-vous' }
    ];
    if (publisher?.features?.canViewSalesDashboard) {
      list.push({ href: '/publisher/sales', label: 'Statistiques de ventes' });
    }
    return list;
  }, [publisher?.features?.canViewSalesDashboard]);

  const name = publisher?.name || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Partenaire';
  const type = publisher?.type || 'PARTENAIRE';

  return (
    <section className="partner-shell">
      <aside className="partner-shell-sidebar">
        <div className="partner-dash-brand">
          <div className="partner-avatar">{getInitials(student)}</div>
          <div>
            <p className="partner-brand-title">Espace Partenaire</p>
            <p className="partner-brand-subtitle">{name}</p>
          </div>
        </div>
        <div className="partner-dash-menu">
          {items.map((item) => (
            <button
              key={item.href}
              className={`partner-menu-item ${pathname === item.href ? 'is-active' : ''}`}
              type="button"
              onClick={() => router.push(item.href)}
            >
              {item.label}
            </button>
          ))}
          <button
            className="partner-menu-item"
            type="button"
            onClick={() => router.push('/')}
          >
            Retour accueil
          </button>
        </div>
        <div className="partner-dash-meta">
          <p className="partner-meta-label">Type partenaire</p>
          <p className="partner-meta-value">{type}</p>
          <p className="partner-meta-label">Email</p>
          <p className="partner-meta-value">{student?.email || '—'}</p>
          {error ? <p className="text-xs text-red-200">{error}</p> : null}
        </div>
      </aside>
      <div className="partner-shell-content">
        {children}
      </div>
    </section>
  );
}
