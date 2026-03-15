# LinkEduPro – L’éducation connectée

Plateforme SaaS éducative (module élève) qui rassemble les contenus pédagogiques et la supervision des classes numériques.

## Repositories (important)

Ce dossier peut être utilisé comme mono-repo (backend + frontend). En production, les contenus sont maintenus dans deux dépôts distincts :

- Frontend (Next.js / App Router) : `jonet10/LinkEduPro`
- Backend (Express + Prisma) : `jonet10/linkedupro-backend`
- Snapshot mono-repo : `jonet10/linkedupro` (branche `monorepo-main`)

## Structure

- `backend/` : API REST, Prisma, authentification, gestion des contenus.
- `frontend/` : Application web Next.js, composants UI, pages, gestion de la classe numérique.

## Prérequis

- Node.js 18+
- PostgreSQL 14+

## Installation

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run prisma:seed
   npm run dev
   ```

2. **Frontend**

   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

## Build

```bash
cd frontend
npm run build
npm start
```

## URLs locales

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:5000`
- Health API (backend) : `http://localhost:5000/api/health`
- Health API (Next) : `http://localhost:3000/api/health`

## API REST principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/subjects`
- `GET /api/quiz/subject/:subjectId?limit=10`
- `POST /api/quiz/submit`
- `GET /api/results/progress`

Toutes les routes (sauf `/auth`) nécessitent l’en-tête `Authorization: Bearer <token>`.

## Notes

- Le seed crée trois matières (`Mathematiques`, `Sciences`, `Francais`) avec_questions prédéfinies.
- Les quiz sont chronométrés côté frontend (5 minutes par défaut).
- Le dashboard affiche la moyenne globale, les stats par matière et les dernières tentatives.

## PWA (installation)

- Manifest : `frontend/public/manifest.webmanifest`
- Service Worker : `frontend/public/sw.js`

## Ressources supplémentaires

- `frontend/public/apk/linkedupro.apk` : APK Android prebuilt.
- `scripts/publish-apk.js` : script pour publier les APK.
