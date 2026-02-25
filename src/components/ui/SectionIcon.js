export default function SectionIcon({ name, className = 'h-4 w-4' }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };

  if (name === 'chart') {
    return <svg {...common}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20v-4" /></svg>;
  }
  if (name === 'school') {
    return <svg {...common}><path d="M3 9l9-5 9 5-9 5-9-5Z" /><path d="M6 11v6c0 1 3 3 6 3s6-2 6-3v-6" /></svg>;
  }
  if (name === 'message') {
    return <svg {...common}><path d="M4 5h16v10H8l-4 4V5Z" /></svg>;
  }
  if (name === 'collection') {
    return <svg {...common}><rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="13" width="7" height="7" rx="1.5" /><rect x="14" y="13" width="7" height="7" rx="1.5" /></svg>;
  }
  if (name === 'write') {
    return <svg {...common}><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="M12 6l4 4" /></svg>;
  }
  if (name === 'video') {
    return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3Z" /></svg>;
  }
  if (name === 'mail') {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  if (name === 'library') {
    return <svg {...common}><path d="M5 4h4v16H5z" /><path d="M10 4h4v16h-4z" /><path d="M15 4h4v16h-4z" /></svg>;
  }
  if (name === 'nsiv') {
    return <svg {...common}><path d="M4 8h16" /><path d="M6 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" /><path d="M9 4h6" /></svg>;
  }
  if (name === 'target') {
    return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>;
  }
  if (name === 'compass') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 6.2-6.2 2.2 2.2-6.2 6.2-2.2Z" /></svg>;
  }
  if (name === 'focus') {
    return <svg {...common}><circle cx="12" cy="13" r="7" /><path d="M12 9v4l2.5 2.5" /><path d="M9 3h6" /></svg>;
  }
  if (name === 'globe') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.4 2.5 15.6 0 18" /><path d="M12 3c-2.5 2.4-2.5 15.6 0 18" /></svg>;
  }
  if (name === 'brain') {
    return <svg {...common}><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 3 3h1V4H9Z" /><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-3 3h-1V4h1Z" /></svg>;
  }

  return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
}
