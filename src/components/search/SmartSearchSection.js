"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import SearchBar from './SearchBar';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import SearchSuggestions from './SearchSuggestions';
import styles from './Search.module.css';

export default function SmartSearchSection() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    date: 'newest',
    popularity: 'false',
    author: '',
    tags: ''
  });
  const [results, setResults] = useState(null);
  const [suggestions, setSuggestions] = useState({ courses: [], publications: [], teachers: [], events: [] });
  const [history, setHistory] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  const flatNavigationItems = useMemo(() => {
    if (!query.trim()) {
      return history.map((item) => ({ type: 'history', label: item.query }));
    }

    return [
      ...(suggestions.courses || []).map((s) => ({ type: 'suggestion', label: s.label })),
      ...(suggestions.publications || []).map((s) => ({ type: 'suggestion', label: s.label })),
      ...(suggestions.teachers || []).map((s) => ({ type: 'suggestion', label: s.label })),
      ...(suggestions.events || []).map((s) => ({ type: 'suggestion', label: s.label }))
    ];
  }, [query, history, suggestions]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiClient('/search/history', { token })
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    function onClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    setActiveIndex(-1);

    if (!trimmed) {
      setSuggestions({ courses: [], publications: [], teachers: [], events: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const token = getToken();
        const data = await apiClient(`/search/suggestions?q=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(filters.category)}`, { token });
        setSuggestions(data);
      } catch (_) {
        setSuggestions({ courses: [], publications: [], teachers: [], events: [] });
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters.category]);

  async function runSearch(targetPage = 1, forcedQuery) {
    const q = (forcedQuery ?? query).trim();
    if (!q) return;

    setLoadingResults(true);
    setError('');

    try {
      const token = getToken();
      const params = new URLSearchParams({
        q,
        category: filters.category,
        date: filters.date,
        popularity: filters.popularity,
        page: String(targetPage),
        limit: '10'
      });

      if (filters.author.trim()) params.set('author', filters.author.trim());
      if (filters.tags.trim()) params.set('tags', filters.tags.trim());

      const data = await apiClient(`/search/advanced?${params.toString()}`, { token });
      setResults(data);

      if (token) {
        const refreshed = await apiClient('/search/history', { token });
        setHistory(refreshed.history || []);
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la recherche.');
      setResults(null);
    } finally {
      setLoadingResults(false);
    }
  }

  function onChangeFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function pickValue(value) {
    setQuery(value);
    setIsOpen(false);
    runSearch(1, value);
  }

  function onKeyDown(event) {
    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatNavigationItems.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && flatNavigationItems[activeIndex]) {
        pickValue(flatNavigationItems[activeIndex].label);
      } else {
        runSearch(1);
        setIsOpen(false);
      }
    }
  }

  return (
    <section className="card" ref={rootRef}>
      <h2 className="text-2xl font-bold text-brand-900">Recherche intelligente</h2>
      <p className="mt-2 text-sm text-brand-700">Recherche multi-catégorie avec filtres, suggestions et historique utilisateur.</p>

      <div className={styles.wrapper}>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            runSearch(1);
            setIsOpen(false);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          isLoading={loadingSuggestions}
        />

        <SearchSuggestions
          open={isOpen}
          query={query}
          suggestions={suggestions}
          recentSearches={history}
          activeIndex={activeIndex}
          onPickSuggestion={pickValue}
          onPickHistory={pickValue}
          onHoverIndex={setActiveIndex}
        />
      </div>

      <SearchFilters filters={filters} onChange={onChangeFilter} />

      <SearchResults
        data={results}
        loading={loadingResults}
        error={error}
        query={query}
        onPageChange={(nextPage) => runSearch(nextPage)}
      />
    </section>
  );
}
