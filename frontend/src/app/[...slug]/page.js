import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FOOTER_PLACEHOLDER_CONTENT } from '@/config/platform';

export default function FooterPlaceholderPage({ params }) {
  const slug = params?.slug?.[0] || '';
  const page = FOOTER_PLACEHOLDER_CONTENT[slug];

  if (!page) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <article className="card">
        <h1 className="text-3xl font-bold text-brand-900">{page.title}</h1>
        <p className="mt-3 text-sm text-brand-700">{page.description}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/" className="btn-secondary">Retour accueil</Link>
          <Link href="/contact" className="btn-primary">Contacter l’équipe</Link>
        </div>
      </article>
    </section>
  );
}
