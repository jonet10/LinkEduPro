"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStudent, getToken, setAuth } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/media';

const ACADEMIC_LEVEL_OPTIONS = ['9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire'];
const LEGACY_TO_ACADEMIC = {
  NS1: 'NSI',
  NS2: 'NSII',
  NS3: 'NSIII',
  Terminale: 'NSIV',
  Universite: 'Universitaire'
};

function normalizeAcademicLevel(value) {
  if (!value) return '';
  if (ACADEMIC_LEVEL_OPTIONS.includes(value)) return value;
  return LEGACY_TO_ACADEMIC[value] || '';
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ email: '', phone: '', address: '', password: '', level: '' });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setEditMode(params.get('edit') === '1');

    apiClient('/v2/profile/me', { token })
      .then((data) => {
        const p = data.profile;
        setProfile(p);
        setAvatarBroken(false);
        setForm({
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
          password: '',
          level: normalizeAcademicLevel(p.academicLevel || p.level)
        });
      })
      .catch((e) => setError(e.message || 'Erreur de chargement du profil'))
      .finally(() => setLoading(false));
  }, [router]);

  const avatarSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (avatarBroken) return null;
    return resolveMediaUrl(profile?.photoUrl);
  }, [photoPreview, profile?.photoUrl, avatarBroken]);

  function onChangeField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSelectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedPhoto(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  }

  async function onUploadPhoto() {
    const token = getToken();
    if (!token || !selectedPhoto) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const body = new FormData();
      body.append('photo', selectedPhoto);

      const data = await apiClient('/v2/profile/photo', {
        method: 'POST',
        token,
        body
      });

      setProfile(data.profile);
      setAvatarBroken(false);
      const student = getStudent();
      if (student) {
        setAuth(token, {
          ...student,
          photoUrl: data.profile.photoUrl,
          darkMode: data.profile.darkMode
        });
      }

      setSelectedPhoto(null);
      setPhotoPreview('');
      setSuccess('Photo de profil mise a jour.');
    } catch (e) {
      setError(e.message || 'Erreur upload photo');
    } finally {
      setUploading(false);
    }
  }

  async function onSaveProfile() {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null
      };
      if (profile.role === 'STUDENT' && form.level) {
        payload.level = form.level;
      }

      if (form.password.trim()) {
        payload.password = form.password;
      }

      const data = await apiClient('/v2/profile/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload)
      });

      setProfile(data.profile);
      setForm((prev) => ({ ...prev, password: '' }));

      const student = getStudent();
      if (student) {
        setAuth(token, {
          ...student,
          email: data.profile.email,
          phone: data.profile.phone,
          academicLevel: data.profile.academicLevel || normalizeAcademicLevel(data.profile.level),
          level: data.profile.level,
          darkMode: data.profile.darkMode,
          photoUrl: data.profile.photoUrl
        });
      }

      setEditMode(false);
      setSuccess('Profil mis a jour avec succes.');
    } catch (e) {
      setError(e.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    if (!profile) return;
    setForm({
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      password: '',
      level: normalizeAcademicLevel(profile.academicLevel || profile.level)
    });
    setSelectedPhoto(null);
    setPhotoPreview('');
    setEditMode(false);
    setError('');
    setSuccess('');
  }

  if (loading) return <p>Chargement du profil...</p>;

  if (!profile) {
    return <p className="text-red-600">Impossible de charger le profil.</p>;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="card">
        <h1 className="mb-4 text-2xl font-bold text-brand-900">Profil utilisateur</h1>

        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-brand-50 text-xl font-bold text-brand-700">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Photo de profil"
                className="h-full w-full object-cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <span>{`${(profile.firstName || '').charAt(0)}${(profile.lastName || '').charAt(0)}`.toUpperCase()}</span>
            )}
          </div>

          <div className="w-full space-y-2">
            <p className="text-sm text-brand-700">{profile.firstName} {profile.lastName}</p>
            <p className="text-xs text-brand-700">Role: {profile.role}</p>
            {editMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*" onChange={onSelectPhoto} className="text-xs" />
                <button type="button" className="btn-secondary" onClick={onUploadPhoto} disabled={!selectedPhoto || uploading}>
                  {uploading ? 'Upload...' : 'Mettre a jour photo'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <input className="input" value={`${profile.firstName} ${profile.lastName}`} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input className="input" value={form.email} onChange={(e) => onChangeField('email', e.target.value)} disabled={!editMode} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telephone</label>
            <input className="input" value={form.phone} onChange={(e) => onChangeField('phone', e.target.value)} disabled={!editMode} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => onChangeField('address', e.target.value)} disabled={!editMode} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
            <input
              className="input"
              type="password"
              placeholder="Laisser vide pour ne pas changer"
              value={form.password}
              onChange={(e) => onChangeField('password', e.target.value)}
              disabled={!editMode}
            />
          </div>
          {profile.role === 'STUDENT' ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Niveau academique</label>
              <select
                className="input"
                value={form.level}
                onChange={(e) => onChangeField('level', e.target.value)}
                disabled={!editMode}
              >
                <option value="">Selectionner un niveau</option>
                {ACADEMIC_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-green-600">{success}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {!editMode ? (
            <button type="button" className="btn-primary" onClick={() => setEditMode(true)}>
              Modifier profil
            </button>
          ) : (
            <>
              <button type="button" className="btn-primary" onClick={onSaveProfile} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button type="button" className="btn-secondary" onClick={onCancelEdit}>
                Annuler
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
