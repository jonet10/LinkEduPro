"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export default function ProgressPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    router.replace('/');
    setRedirecting(false);
  }, [router]);

  return <p>{redirecting ? 'Redirection...' : ''}</p>;
}
