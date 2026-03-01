"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export default function FocusPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    router.replace('/video-lessons');
  }, [router]);

  return (
    <section className="card">
      <h1 className="text-2xl font-black text-brand-900">Redirection en cours...</h1>
      <p className="mt-2 text-sm text-brand-700">Le module Focus a été remplacé par Classe Numerique.</p>
    </section>
  );
}
