"use client";

import Link from 'next/link';
import styles from './Search.module.css';

function CategoryBlock({ title, rows, renderRow }) {
  if (!rows?.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-lg font-semibold text-brand-900">{title}</h3>
      <div className={styles.resultsGrid}>{rows.map(renderRow)}</div>
    </section>
  );
}

export default function SearchResults({ data, loading, error, query, onPageChange }) {
  if (loading) {
    return (
      <div className={styles.resultsGrid} aria-live="polite">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) return null;

  const hasAny = (data.totals?.all || 0) > 0;

  return (
    <div>
      <p className="mb-3 text-sm text-brand-700">
        {hasAny ? `${data.totals.all} résultat(s) pour "${query}"` : `Aucun résultat pour "${query}"`}
      </p>

      {!hasAny ? (
        <div className={styles.empty}>No results found. Essaye un autre mot-clé ou ajuste les filtres.</div>
      ) : (
        <div className="space-y-5">
          <CategoryBlock
            title="Cours"
            rows={data.results.courses}
            renderRow={(item) => (
              <Link key={`course_${item.id}`} href={`/quiz/${item.id}`} className={styles.resultLinkCard}>
                <article className={styles.resultCard}>
                  <p className="font-semibold text-brand-900">{item.name}</p>
                  <p className="mt-1 text-sm text-brand-700">{item.description || 'Sans description.'}</p>
                  <p className={styles.meta}>Tags: {(item.tags || []).join(', ') || 'N/A'} | Tentatives: {item.attemptCount}</p>
                </article>
              </Link>
            )}
          />

          <CategoryBlock
            title="Publications"
            rows={data.results.publications}
            renderRow={(item) => (
              <Link key={`pub_${item.id}`} href={`/blog?post=${item.id}`} className={styles.resultLinkCard}>
                <article className={styles.resultCard}>
                  <p className="font-semibold text-brand-900">{item.title}</p>
                  <p className="mt-1 text-sm text-brand-700">{item.excerpt || 'Publication éducative.'}</p>
                  <p className={styles.meta}>Auteur: {item.author?.firstName} {item.author?.lastName} | Likes: {item.likeCount}</p>
                </article>
              </Link>
            )}
          />

          <CategoryBlock
            title="Enseignants"
            rows={data.results.teachers}
            renderRow={(item) => (
              <Link key={`teacher_${item.id}`} href="/blog" className={styles.resultLinkCard}>
                <article className={styles.resultCard}>
                  <p className="font-semibold text-brand-900">{item.firstName} {item.lastName}</p>
                  <p className="mt-1 text-sm text-brand-700">École: {item.school || 'N/A'}</p>
                  <p className={styles.meta}>Niveau: {item.teacherLevel} | Réputation: {item.reputationScore}</p>
                </article>
              </Link>
            )}
          />
        </div>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={(data.pagination?.page || 1) <= 1}
          onClick={() => onPageChange((data.pagination?.page || 1) - 1)}
        >
          Précédent
        </button>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={((data.pagination?.page || 1) * (data.pagination?.limit || 10)) >= (data.totals?.all || 0)}
          onClick={() => onPageChange((data.pagination?.page || 1) + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
