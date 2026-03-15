import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/runtime-config';

function getApiBaseUrl() {
  return API_BASE_URL.replace(/\/+$/, '');
}

async function verifyToken(token) {
  if (!token) {
    return { ok: false, message: 'Token de verification manquant.' };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      message: data.message || (res.ok ? 'Email vérifié avec succès.' : 'Lien invalide ou expiré.')
    };
  } catch (_) {
    return { ok: false, message: 'Erreur de verification. Reessayez plus tard.' };
  }
}

export default async function VerifyEmailPage({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : '';
  const result = await verifyToken(token);
  const query = `verified=${result.ok ? '1' : '0'}&message=${encodeURIComponent(result.message)}`;
  redirect(`/login?${query}`);
}
