"use client";

const CONTACT_EMAIL = 'infolinkedupro@gmail.com';
const CONTACT_WHATSAPP_URL = 'https://wa.me/50938378375';

export default function TutorPartnerJoinPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Programme Partenaires</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Devenir tuteur ou partenaire LinkEduPro</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Contribue à l’éducation en Haïti avec des parcours vidéo certifiants, des ressources pédagogiques
          et un impact mesurable sur les élèves.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn-primary bg-white text-brand-900 hover:bg-white/90"
            href={`${CONTACT_WHATSAPP_URL}?text=Bonjour%20LinkEduPro%2C%20je%20souhaite%20devenir%20tuteur%20ou%20partenaire.`}
            target="_blank"
            rel="noreferrer"
          >
            Parler sur WhatsApp
          </a>
          <a
            className="btn-secondary border-white/30 text-white hover:bg-white/10"
            href={`mailto:${CONTACT_EMAIL}?subject=Demande%20tuteur%20ou%20partenaire`}
          >
            Écrire un email
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Tuteurs</p>
          <h2 className="mt-2 text-lg font-bold text-brand-900">Encadre des cours certifiants</h2>
          <p className="mt-2 text-sm text-brand-700">
            Publie des séries de leçons, anime la communauté et suis la progression des élèves.
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Institutions</p>
          <h2 className="mt-2 text-lg font-bold text-brand-900">Crée des parcours officiels</h2>
          <p className="mt-2 text-sm text-brand-700">
            Déploie des programmes certifiants pour préparer examens et concours nationaux.
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Marques</p>
          <h2 className="mt-2 text-lg font-bold text-brand-900">Sponsorise l’impact</h2>
          <p className="mt-2 text-sm text-brand-700">
            Associe ton image à l’éducation numérique et soutiens l’accès aux ressources.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold text-brand-900">Ce que nous demandons</h3>
          <div className="mt-3 grid gap-2 text-sm text-brand-700">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Expertise confirmée dans votre domaine.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Disponibilité pour des sessions de suivi.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Capacité à fournir des ressources pédagogiques de qualité.
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-brand-900">Ce que vous obtenez</h3>
          <div className="mt-3 grid gap-2 text-sm text-brand-700">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Visibilité dans la communauté éducative.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Outils de suivi et certification automatisés.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Impact concret et mesurable sur les élèves.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-brand-900">Processus d’intégration</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">1. Contact</p>
            <p className="mt-1 text-sm text-brand-700">Écris‑nous sur WhatsApp ou email avec ton profil.</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">2. Entretien</p>
            <p className="mt-1 text-sm text-brand-700">On définit ensemble le format, la durée et les objectifs.</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">3. Lancement</p>
            <p className="mt-1 text-sm text-brand-700">Tu publies ton premier module certifiant.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
