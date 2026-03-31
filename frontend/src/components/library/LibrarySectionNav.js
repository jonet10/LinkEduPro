"use client";

import { LIBRARY_SECTIONS } from './library-constants';

export default function LibrarySectionNav({ activeKey, onChange }) {
  return (
    <nav className="overflow-x-auto rounded-2xl border border-brand-100 bg-white/70">
      <div className="flex min-w-max gap-2 p-2">
        {LIBRARY_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className={activeKey === section.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => onChange(section.key)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

