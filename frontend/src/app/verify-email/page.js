import { redirect } from 'next/navigation';

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  if (/^https?:\/\//i.test(apiUrl)) {
    return apiUrl.replace(/\/+$/, '');
  }

  return `${backendUrl.replace(/\/+$/, '')}${apiUrl.startsWith('/') ? apiUrl : `/${apiUrl}`}`;
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
      message: data.message || (res.ok ? 'Email verifie avec succes.' : 'Lien invalide ou expire.')
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
