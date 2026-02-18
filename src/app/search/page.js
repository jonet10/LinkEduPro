"use client";

import SmartSearchSection from '@/components/search/SmartSearchSection';

export default function SearchPage() {
  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-black text-brand-900">Recherche</h1>
        <p className="mt-2 text-sm text-brand-700">Trouve rapidement cours, publications et enseignants.</p>
      </div>
      <SmartSearchSection />
    </section>
  );
}
