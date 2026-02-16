"use client";

import { useEffect, useMemo, useState } from 'react';

const SLIDES = [
  {
    id: 'school-1',
    kind: 'Écoles haïtiennes',
    title: 'Lycée partenaire - Port-au-Prince',
    subtitle: 'Des classes connectées qui utilisent LinkEduPro pour les révisions hebdomadaires.',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'contest-1',
    kind: 'Concours actif',
    title: 'Challenge Physique National',
    subtitle: 'Inscriptions ouvertes jusqu au 30 mars - simulation d examen chronométrée.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'testimonial-1',
    kind: 'Témoignage clé',
    title: 'Les résultats montent après 4 semaines',
    subtitle: 'Plusieurs écoles observent une progression moyenne de 18% sur les quiz.',
    image:
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1600&q=80'
  }
];

export default function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, 6000);

    return () => clearInterval(timer);
  }, [total]);

  const current = useMemo(() => SLIDES[index], [index]);

  return (
    <section className="card" aria-label="Carrousel d accueil">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={current.image}
          alt={current.title}
          className="h-72 w-full object-cover"
          loading={index === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <p className="mb-1 inline-block rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">{current.kind}</p>
          <h2 className="text-2xl font-black">{current.title}</h2>
          <p className="mt-1 text-sm text-white/90">{current.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2" aria-label="Indicateurs du carrousel">
        {SLIDES.map((slide, i) => (
          <span
            key={slide.id}
            className={`h-2 w-8 rounded-full ${i === index ? 'bg-brand-700' : 'bg-brand-100'}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}