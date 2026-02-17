export const metadata = {
  title: 'System Status | LinkEduPro',
  description: 'État opérationnel des services LinkEduPro.'
};

const services = [
  { name: 'API principale', status: 'Operational', color: 'text-green-700' },
  { name: 'Base de données', status: 'Operational', color: 'text-green-700' },
  { name: 'Auth / Sessions', status: 'Operational', color: 'text-green-700' },
  { name: 'Média & Uploads', status: 'Monitoring', color: 'text-amber-700' }
];

export default function SystemStatusPage() {
  return (
    <section className="space-y-6">
      <header className="card">
        <h1 className="text-3xl font-bold text-brand-900">System Status</h1>
        <p className="mt-2 text-sm text-brand-700">Surveillance du statut des composants critiques de la plateforme.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <article key={service.name} className="card">
            <h2 className="text-lg font-semibold text-brand-900">{service.name}</h2>
            <p className={`mt-2 text-sm font-semibold ${service.color}`}>{service.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
