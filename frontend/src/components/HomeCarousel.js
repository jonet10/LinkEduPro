"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SLIDES = [
  {
    id: 'haiti-school-1',
    label: 'Ecoles haitiennes',
    title: 'Un reseau academique connecte pour Haiti',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'haiti-students-1',
    label: 'Eleves NS4 (18+)',
    title: 'Des eleves majeurs qui apprennent, publient et progressent',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'haiti-school-2',
    label: 'Opportunites',
    title: 'Des parcours vers des concours nationaux et internationaux',
    image:
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1600&q=80'
  }
];

const CONTEST_CARDS = [
  {
    id: 'contest-physics',
    title: 'Challenge Physique National',
    subtitle: 'Inscriptions ouvertes - simulation chronometree',
    status: 'Actif'
  },
  {
    id: 'contest-math',
    title: 'Sprint Mathematiques NS4',
    subtitle: 'Series progressives avec classement hebdomadaire',
    status: 'Actif'
  },
  {
    id: 'contest-writing',
    title: 'Concours Redaction Academique',
    subtitle: 'Publication d articles avec revue pedagogique',
    status: 'Actif'
  }
];

const INTRO_TEXT =
  "LinkEduPro est une plateforme educative moderne et integree, concue pour connecter eleves, professeurs et ecoles haitiennes dans un reseau academique national et international. Elle offre aux eleves NS4 (18 ans et plus) un espace securise pour apprendre, reviser, publier des contenus academiques et acceder a des opportunites nationales et internationales.";

export default function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, 7000);

    return () => clearInterval(timer);
  }, [total]);

  const nextSlide = () => setIndex((prev) => (prev + 1) % total);
  const prevSlide = () => setIndex((prev) => (prev - 1 + total) % total);

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden" aria-label="Carrousel d accueil">
      <div className="relative min-h-[calc(100vh-74px)] w-full">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-black/70" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-74px)] w-full max-w-6xl flex-col justify-center px-6 py-10">
          <p className="mb-3 inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            {SLIDES[index].label}
          </p>
          <h1 className="max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
            {SLIDES[index].title}
          </h1>
          <p className="mt-5 max-w-4xl text-sm leading-relaxed text-white/90 md:text-lg">
            {INTRO_TEXT}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:brightness-110">
              S inscrire
            </Link>
            <Link href="/login" className="rounded-lg border border-white/60 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
              Se connecter
            </Link>
            <Link href="/subjects" className="rounded-lg border border-white/60 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              Explorer les quiz
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {CONTEST_CARDS.map((card) => (
              <article key={card.id} className="rounded-xl border border-white/30 bg-black/35 p-4 text-white backdrop-blur">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/80">{card.status}</p>
                <h2 className="text-base font-bold">{card.title}</h2>
                <p className="mt-1 text-sm text-white/85">{card.subtitle}</p>
              </article>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/50 bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/55"
          aria-label="Slide precedente"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/50 bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/55"
          aria-label="Slide suivante"
        >
          ›
        </button>

        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2" aria-label="Indicateurs du carrousel">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? 'w-10 bg-white' : 'w-4 bg-white/55 hover:bg-white/75'}`}
              aria-label={`Aller au slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
