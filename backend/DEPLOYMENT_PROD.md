# Deployment Notes (Community + School Management)

## 1. Environment
Add to `backend/.env`:

```env
PORT=5000
FRONTEND_URL=https://linkedupro.com
FRONTEND_URLS=https://www.linkedupro.com,https://app.linkedupro.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/linkedupro?schema=public
JWT_SECRET=CHANGE_ME
JWT_ISSUER=linkedupro-api
JWT_AUDIENCE=linkedupro-clients
JWT_EXPIRES_IN=12h
JWT_EXPIRES_IN_MOBILE=365d
TRUST_PROXY=true
JSON_BODY_LIMIT=100kb
FORM_BODY_LIMIT=50kb
PASSWORD_RESET_SECRET=CHANGE_ME_RESET_SECRET
EMAIL_TOKEN_SECRET=CHANGE_ME_EMAIL_SECRET
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=8
LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP=40
SUPER_ADMIN_EMAIL=infolinkedupro@gmail.com
SCHOOL_SUPER_ADMIN_EMAIL=superadmin@linkedupro.local
SCHOOL_SUPER_ADMIN_PASSWORD=ChangeMe123!
```

## 2. Install & migrate
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm test
npm run start
```

## 3. Frontend
```bash
cd frontend
npm install
npm run build
npm run start
```

Frontend env (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=https://api.linkedupro.com/api
NEXT_PUBLIC_BACKEND_ORIGIN=https://api.linkedupro.com
```

## 4. Files & storage
Required writable dirs:
- `backend/storage/teacher-verifications`
- `backend/storage/school-imports`
- `backend/storage/school-receipts`

For production, replace local storage with S3-compatible bucket.

## 5. Backups
School module backup:
```bash
cd backend
npm run school:backup
```

## 6. API docs
OpenAPI JSON:
- `GET /api/docs/openapi.json`
