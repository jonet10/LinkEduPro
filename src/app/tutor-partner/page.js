"use client";

const CONTACT_EMAIL = 'infolinkedupro@gmail.com';
const CONTACT_WHATSAPP_URL = 'https://wa.me/50938378375';

export default function TutorPartnerJoinPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-900">Devenir tuteur ou partenaire</h1>
        <p className="mt-2 text-sm text-brand-700">
          Pour l’instant, l’inscription directe n’est pas disponible. Choisis un moyen de contact ci‑dessous.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Contacter via WhatsApp</h2>
          <p className="mt-1 text-sm text-brand-700">
            Écris‑nous pour devenir tuteur ou partenaire.
          </p>
          <a
            className="btn-primary mt-4 inline-flex"
            href={`${CONTACT_WHATSAPP_URL}?text=Bonjour%20LinkEduPro%2C%20je%20souhaite%20devenir%20tuteur%20ou%20partenaire.`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir WhatsApp
          </a>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-brand-900">Contacter par email</h2>
          <p className="mt-1 text-sm text-brand-700">
            Envoie un email à l’équipe LinkEduPro.
          </p>
          <a
            className="btn-secondary mt-4 inline-flex"
            href={`mailto:${CONTACT_EMAIL}?subject=Demande%20tuteur%20ou%20partenaire`}
          >
            Envoyer un email
          </a>
        </div>
      </div>
    </section>
  );
}
