"use client";

import styles from './Search.module.css';

export default function SearchFilters({ filters, onChange }) {
  return (
    <div className={styles.filters} aria-label="Filtres de recherche">
      <select className={styles.control} value={filters.category} onChange={(e) => onChange('category', e.target.value)}>
        <option value="all">Toutes catégories</option>
        <option value="courses">Cours</option>
        <option value="publications">Publications</option>
        <option value="teachers">Enseignants</option>
      </select>

      <select className={styles.control} value={filters.date} onChange={(e) => onChange('date', e.target.value)}>
        <option value="newest">Plus récent</option>
        <option value="oldest">Plus ancien</option>
      </select>

      <select className={styles.control} value={filters.popularity} onChange={(e) => onChange('popularity', e.target.value)}>
        <option value="false">Date (par défaut)</option>
        <option value="most_viewed">Popularité</option>
      </select>

      <input
        className={styles.control}
        placeholder="Auteur"
        value={filters.author}
        onChange={(e) => onChange('author', e.target.value)}
      />

      <input
        className={styles.control}
        placeholder="Tags (math, bac...)"
        value={filters.tags}
        onChange={(e) => onChange('tags', e.target.value)}
      />
    </div>
  );
}
