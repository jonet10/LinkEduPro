"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken, getStudent } from '@/lib/auth';

export default function AdminPublishersPage() {
  const token = getToken();
  const student = getStudent();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: 'INSTITUTION',
    email: '',
    phone: '',
    description: '',
    features: {
      canPublishBooks: false,
      canPublishCertifiedContent: true,
      canPublishAnnouncements: true,
      canHostLiveEvents: true,
      canViewSalesDashboard: false
    }
  });
  const [publisherEdits, setPublisherEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiClient('/publishers', { token })
      .then((data) => {
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
        setPublisherEdits((prev) => {
          const next = { ...prev };
          list.forEach((publisher) => {
            next[publisher.id] = {
              name: publisher.name,
              type: publisher.type,
              email: publisher.email,
              phone: publisher.phone || '',
              description: publisher.description || '',
              features: {
                canPublishBooks: Boolean(publisher.features?.canPublishBooks),
                canPublishCertifiedContent: Boolean(publisher.features?.canPublishCertifiedContent),
                canPublishAnnouncements: Boolean(publisher.features?.canPublishAnnouncements),
                canHostLiveEvents: Boolean(publisher.features?.canHostLiveEvents),
                canViewSalesDashboard: Boolean(publisher.features?.canViewSalesDashboard)
              }
            };
          });
          return next;
        });
      })
      .catch((err) => setError(err.message || 'Erreur chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFeatureChange = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [name]: checked }
    }));
  };

  const onEditFeatureChange = (id, name, checked) => {
    setPublisherEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        features: { ...(prev[id]?.features || {}), [name]: checked }
      }
    }));
  };

  const savePublisher = async (publisherId) => {
    const payload = publisherEdits[publisherId];
    if (!payload) return;
    setError('');
    setSuccess('');
    try {
      await apiClient(`/publishers/${publisherId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload)
      });
      setSuccess('Partenaire mis à jour.');
      load();
    } catch (err) {
      setError(err.message || 'Erreur mise à jour');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient('/publishers', {
        method: 'POST',
        token,
        body: JSON.stringify(form)
      });
      setSuccess('Éditeur ajouté.');
      setForm({
        name: '',
        type: 'INSTITUTION',
        email: '',
        phone: '',
        description: '',
        features: {
          canPublishBooks: false,
          canPublishCertifiedContent: true,
          canPublishAnnouncements: true,
          canHostLiveEvents: true,
          canViewSalesDashboard: false
        }
      });
      load();
    } catch (err) {
      setError(err.message || 'Erreur création');
    }
  };

  if (!token || student?.role !== 'ADMIN') {
    return <p className="text-sm text-brand-700">Accès réservé aux administrateurs.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <h1 className="text-3xl font-bold text-brand-900">Éditeurs</h1>
        <p className="mt-2 text-sm text-brand-700">Ajoute et gère les éditeurs partenaires.</p>
      </div>

      <form className="card space-y-3" onSubmit={onSubmit}>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <input className="input" name="name" placeholder="Nom" value={form.name} onChange={onChange} required />
        <select className="input" name="type" value={form.type} onChange={onChange}>
          <option value="INSTITUTION">Institution</option>
          <option value="UNIVERSITY">Université</option>
          <option value="VOCATIONAL_SCHOOL">École professionnelle</option>
          <option value="ORGANIZATION">Organisation</option>
          <option value="COMPANY">Entreprise</option>
          <option value="EDITOR">Maison d'édition</option>
          <option value="AUTHOR">Auteur / Écrivain</option>
        </select>
        <input className="input" name="email" placeholder="Email" value={form.email} onChange={onChange} required />
        <input className="input" name="phone" placeholder="Téléphone" value={form.phone} onChange={onChange} />
        <textarea className="input min-h-[120px]" name="description" placeholder="Description" value={form.description} onChange={onChange} />
        <div className="grid gap-2 rounded-lg border border-brand-100 p-3">
          <p className="text-sm font-semibold text-brand-900">Fonctionnalités activées</p>
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" name="canPublishBooks" checked={form.features.canPublishBooks} onChange={onFeatureChange} />
            Publier des livres
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" name="canPublishCertifiedContent" checked={form.features.canPublishCertifiedContent} onChange={onFeatureChange} />
            Publier des formations certifiantes
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" name="canPublishAnnouncements" checked={form.features.canPublishAnnouncements} onChange={onFeatureChange} />
            Publier des annonces
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" name="canHostLiveEvents" checked={form.features.canHostLiveEvents} onChange={onFeatureChange} />
            Organiser des rendez-vous en direct
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-700">
            <input type="checkbox" name="canViewSalesDashboard" checked={form.features.canViewSalesDashboard} onChange={onFeatureChange} />
            Accès au dashboard des ventes
          </label>
        </div>
        <button className="btn-primary" type="submit">Ajouter</button>
      </form>

      <div className="grid gap-3">
        {items.map((publisher) => {
          const edit = publisherEdits[publisher.id];
          return (
            <article key={publisher.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-brand-900">{publisher.name}</p>
                  <p className="text-xs text-brand-700">{publisher.type}</p>
                  <p className="text-xs text-brand-700">{publisher.email}</p>
                  {publisher.phone ? <p className="text-xs text-brand-700">{publisher.phone}</p> : null}
                </div>
                <button className="btn-secondary" type="button" onClick={() => savePublisher(publisher.id)}>
                  Sauvegarder
                </button>
              </div>
              {edit ? (
                <div className="grid gap-2 rounded-lg border border-brand-100 p-3">
                  <p className="text-sm font-semibold text-brand-900">Fonctionnalités</p>
                  <label className="flex items-center gap-2 text-sm text-brand-700">
                    <input
                      type="checkbox"
                      checked={edit.features?.canPublishBooks || false}
                      onChange={(e) => onEditFeatureChange(publisher.id, 'canPublishBooks', e.target.checked)}
                    />
                    Publier des livres
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-700">
                    <input
                      type="checkbox"
                      checked={edit.features?.canPublishCertifiedContent || false}
                      onChange={(e) => onEditFeatureChange(publisher.id, 'canPublishCertifiedContent', e.target.checked)}
                    />
                    Publier des formations certifiantes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-700">
                    <input
                      type="checkbox"
                      checked={edit.features?.canPublishAnnouncements || false}
                      onChange={(e) => onEditFeatureChange(publisher.id, 'canPublishAnnouncements', e.target.checked)}
                    />
                    Publier des annonces
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-700">
                    <input
                      type="checkbox"
                      checked={edit.features?.canHostLiveEvents || false}
                      onChange={(e) => onEditFeatureChange(publisher.id, 'canHostLiveEvents', e.target.checked)}
                    />
                    Organiser des rendez-vous en direct
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-700">
                    <input
                      type="checkbox"
                      checked={edit.features?.canViewSalesDashboard || false}
                      onChange={(e) => onEditFeatureChange(publisher.id, 'canViewSalesDashboard', e.target.checked)}
                    />
                    Accès au dashboard des ventes
                  </label>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
