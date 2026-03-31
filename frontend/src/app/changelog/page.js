import { CHANGELOG_ENTRIES, PLATFORM_VERSION } from '@/config/platform';

export const metadata = {
  title: 'Changelog | LinkEduPro',
  description: 'Historique des mises à jour de la plateforme LinkEduPro.'
};

export default function ChangelogPage() {
  return (
    <section className="space-y-6">
      <header className="card">
        <p className="text-sm text-brand-700">Version active: {PLATFORM_VERSION}</p>
        <h1 className="mt-1 text-3xl font-bold text-brand-900">Changelog</h1>
        <p className="mt-2 text-sm text-brand-700">Suivi des évolutions produit et techniques de LinkEduPro.</p>
      </header>

      <div className="space-y-4">
        {CHANGELOG_ENTRIES.map((entry) => (
          <article key={`${entry.version}_${entry.date}`} className="card">
            <h2 className="text-xl font-semibold text-brand-900">{entry.version}</h2>
            <p className="mt-1 text-xs text-brand-700">Publié le {new Date(entry.date).toLocaleDateString('fr-FR')}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brand-700">
              {entry.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
