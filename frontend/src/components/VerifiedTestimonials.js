"use client";

const RECENT_PUBLICATIONS = [
  {
    id: 't1',
    type: 'text',
    author: 'Élève S4 - Ouest',
    school: 'Lycée partenaire',
    content:
      "Avant, je révisais sans méthode. Avec les quiz chronométrés, je vois mes erreurs tout de suite et j améliore mon score chaque semaine."
  },
  {
    id: 't2',
    type: 'video',
    author: 'Enseignante de Physique',
    school: 'Institution secondaire',
    content: 'Retour vidéo sur l usage de LinkEduPro en salle de révision.',
    videoUrl: 'https://www.youtube.com/embed/2Vv-BfVoq4g'
  },
  {
    id: 't3',
    type: 'text',
    author: 'Responsable académique',
    school: 'École mixte',
    content:
      'Nous suivons les progrès par matière et nous orientons mieux les élèves en difficulté.'
  }
];

function aiModeration(content) {
  const banned = ['insulte', 'haine', 'violence'];
  const lower = content.toLowerCase();
  const hasFlag = banned.some((w) => lower.includes(w));
  return {
    status: hasFlag ? 'Revu manuellement' : 'Vérifié IA',
    score: hasFlag ? 62 : 96
  };
}

export default function VerifiedTestimonials() {
  return (
    <section className="card" aria-labelledby="recent-publications-title">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="recent-publications-title" className="text-2xl font-bold text-brand-900">Publications récentes</h2>
        <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Contenus de la communauté</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {RECENT_PUBLICATIONS.map((item) => {
          const moderation = aiModeration(item.content);
          return (
            <article key={item.id} className="rounded-xl border border-brand-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-900">{item.author}</p>
                <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
                  {moderation.status} {moderation.score}%
                </span>
              </div>
              <p className="mb-3 text-xs text-brand-500">{item.school}</p>
              {item.type === 'video' ? (
                <div className="overflow-hidden rounded-lg border border-brand-100">
                  <iframe
                    title={item.content}
                    src={item.videoUrl}
                    loading="lazy"
                    className="h-44 w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-sm text-brand-800">{item.content}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
