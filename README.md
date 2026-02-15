# LinkEduPro - L'education connectee

Plateforme SaaS educative (module eleve) avec:
- Backend: Express + Prisma + PostgreSQL + JWT + Joi
- Frontend: Next.js (App Router) + React + Tailwind CSS

## Structure

- `backend/`: API REST + base de donnees
- `frontend/`: application web Next.js

## Prerequis

- Node.js 18+
- PostgreSQL 14+

## Installation

1. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health backend: `http://localhost:5000/api/health`
- Health next api route: `http://localhost:3000/api/health`

## API REST principales (backend)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/subjects`
- `GET /api/quiz/subject/:subjectId?limit=10`
- `POST /api/quiz/submit`
- `GET /api/results/progress`

Toutes les routes sauf auth necessitent `Authorization: Bearer <token>`.

## Notes

- Le seed ajoute 3 matieres (`Mathematiques`, `Sciences`, `Francais`) avec questions.
- Le quiz est chronometre cote frontend (5 minutes par defaut).
- Le dashboard affiche moyenne globale, stats par matiere et dernieres tentatives.
