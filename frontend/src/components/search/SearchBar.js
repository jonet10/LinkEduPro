"use client";

import styles from './Search.module.css';

export default function SearchBar({ value, onChange, onSubmit, onFocus, onKeyDown, isLoading }) {
  return (
    <form
      className={styles.row}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      role="search"
      aria-label="Recherche avancée"
    >
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder="Rechercher quiz, examens passés, livres, vidéos..."
          aria-label="Champ de recherche"
        />
        {isLoading ? <span className={styles.loaderDot} aria-hidden="true" /> : null}
      </div>
      <button type="submit" className={styles.searchBtn}>Rechercher</button>
    </form>
  );
}
