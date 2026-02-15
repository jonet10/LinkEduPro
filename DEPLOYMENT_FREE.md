# Deploiement Gratuit - LinkEduPro

## 1) Preparer GitHub

Depuis la racine du projet:

```bash
git init
git add .
git commit -m "LinkEduPro ready for deploy"
git branch -M main
git remote add origin <URL_GITHUB_REPO>
git push -u origin main
```

## 2) Creer la base PostgreSQL (Neon free)

1. Cree un projet sur https://console.neon.tech
2. Copie la connection string PostgreSQL
3. Elle servira de `DATABASE_URL` sur Render

## 3) Deploy Backend (Render)

1. Render > New > Web Service > connecte ton repo GitHub
2. Root Directory: `backend`
3. Build Command:

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

4. Start Command:

```bash
npm start
```

5. Variables d'environnement Render:

- `DATABASE_URL` = URL Neon
- `JWT_SECRET` = cle secrete longue
- `JWT_EXPIRES_IN` = `7d`
- `FRONTEND_URL` = `https://placeholder.vercel.app` (tu mettras la vraie URL apres)

6. Deploy et note l'URL backend: `https://xxx.onrender.com`

## 4) Seed de donnees (Render)

Apres le premier deploy backend:

- Render > ton service > Shell
- Execute:

```bash
npm run prisma:seed
```

## 5) Deploy Frontend (Vercel)

1. Vercel > Add New Project > importe le meme repo
2. Root Directory: `frontend`
3. Env var:

- `NEXT_PUBLIC_API_URL` = `https://xxx.onrender.com/api`

4. Deploy et note l'URL frontend: `https://yyy.vercel.app`

## 6) Corriger CORS backend

Sur Render, mets:

- `FRONTEND_URL` = `https://yyy.vercel.app`

Puis redeploie le backend.

## 7) Verifications

- Backend health: `https://xxx.onrender.com/api/health`
- Frontend health (Next route): `https://yyy.vercel.app/api/health`
- Test complet: inscription > login > matieres > quiz > progres

## Notes

- Render free peut etre lent au premier appel (cold start).
- Les migrations Prisma sont deja versionnees dans `backend/prisma/migrations`.
