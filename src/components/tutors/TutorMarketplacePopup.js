"use client";

import Link from 'next/link';

export default function TutorMarketplacePopup() {
  return (
    <Link
      href="/tutors"
      className="fixed bottom-6 right-6 z-[120] inline-flex items-center gap-2 rounded-full bg-[#f15b5b] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
    >
      Trouver mon tuteur
      <span aria-hidden="true">→</span>
    </Link>
  );
}
