"use client";

import styles from './Search.module.css';

const groups = ['courses', 'publications', 'teachers', 'events'];

function groupLabel(key) {
  if (key === 'courses') return 'Cours';
  if (key === 'publications') return 'Publications';
  if (key === 'teachers') return 'Enseignants';
  return 'Événements';
}

export default function SearchSuggestions({
  open,
  query,
  suggestions,
  recentSearches,
  activeIndex,
  onPickSuggestion,
  onPickHistory,
  onHoverIndex
}) {
  if (!open) return null;

  const hasQuery = Boolean(query.trim());
  let cursor = -1;

  return (
    <div className={styles.panel} role="listbox" aria-label="Suggestions de recherche">
      {!hasQuery ? (
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Recherches récentes</p>
          <div className={styles.historyRow}>
            {(recentSearches || []).map((item) => (
              <button key={item.id} type="button" className={styles.historyBtn} onClick={() => onPickHistory(item.query)}>
                {item.query}
              </button>
            ))}
            {!recentSearches?.length ? <span className={styles.meta}>Aucune recherche récente.</span> : null}
          </div>
        </section>
      ) : (
        groups.map((group) => {
          const rows = suggestions?.[group] || [];
          if (!rows.length) return null;

          return (
            <section key={group} className={styles.section}>
              <p className={styles.sectionTitle}>{groupLabel(group)}</p>
              {rows.map((row) => {
                cursor += 1;
                const isActive = activeIndex === cursor;
                return (
                  <button
                    key={`${group}_${row.id}`}
                    type="button"
                    className={`${styles.suggestionBtn} ${isActive ? styles.suggestionActive : ''}`}
                    onMouseEnter={() => onHoverIndex(cursor)}
                    onClick={() => onPickSuggestion(row.label)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: row.highlighted || row.label }} />
                  </button>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
