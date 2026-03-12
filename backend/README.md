# LinkEduPro Backend (API)

API REST pour LinkEduPro.

## Stack

- Node.js + Express
- Prisma + PostgreSQL
- Auth JWT + validation Joi

## Démarrage (local)

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Déploiement

- Docs: `backend/DEPLOYMENT_PROD.md`
- Variable critique: `DATABASE_URL` (PostgreSQL). Sur Render, utiliser `?sslmode=require`.

## Repos GitHub

- Backend: `jonet10/linkedupro-backend`
- Frontend: `jonet10/LinkEduPro`
- Mono-repo (snapshot): `jonet10/linkedupro` (branche `monorepo-main`)

