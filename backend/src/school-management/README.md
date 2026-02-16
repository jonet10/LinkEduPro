# School Management System Module

Module API prefix: `/api/school-management`

This module is isolated from the public students/quiz module:
- It uses dedicated `School*` Prisma models/tables only.
- It has dedicated authentication (`SchoolAdmin`) and RBAC.
- Every request is scoped by `schoolId` for non-super-admin users.

## Roles
- `SUPER_ADMIN`: global access, can create schools.
- `SCHOOL_ADMIN`: full management on own school.
- `SCHOOL_ACCOUNTANT`: can create/list payments on own school.
- `SCHOOL_TEACHER`: reserved for future usage.

## Auth
1. `POST /api/school-management/login`
2. `POST /api/school-management/change-password`

Token payload includes `scope: school-management` and is rejected by the quiz/public auth.

## Main endpoints
- Schools
`POST /api/school-management/schools` (SUPER_ADMIN)
`GET /api/school-management/schools` (SUPER_ADMIN)

- Academic years
`POST /api/school-management/schools/:schoolId/academic-years`
`GET /api/school-management/schools/:schoolId/academic-years`

- Classes
`POST /api/school-management/classes`
`GET /api/school-management/classes/schools/:schoolId`

- Students
`GET /api/school-management/students/schools/:schoolId`
`POST /api/school-management/students/schools/:schoolId/import` (`multipart/form-data`, field `file`)
`GET /api/school-management/students/schools/:schoolId/import-history`

Expected import columns: `nom`, `prenom`, `sexe` (or english aliases).
Class and academic year are provided in body: `classId`, `academicYearId`.

- Payments
`POST /api/school-management/payments/types`
`GET /api/school-management/payments/types/schools/:schoolId`
`POST /api/school-management/payments`
`GET /api/school-management/payments/schools/:schoolId`
`DELETE /api/school-management/payments/schools/:schoolId/:paymentId` (soft delete)
`GET /api/school-management/payments/schools/:schoolId/:paymentId/receipt`

- Dashboards
`GET /api/school-management/dashboard/schools/:schoolId`
`GET /api/school-management/dashboard/super-admin`

## Security
- Middleware role check: `school-rbac.js`
- Scope isolation by `schoolId`: `school-scope.js`
- Immutable audit logs: `SchoolLog` table via `createSchoolLog()` create-only calls.
- Forced password rotation: users with `mustChangePassword=true` can only use `change-password`.

## Backup
Automated backup script for school tables:
`npm run school:backup`

Requirement: `pg_dump` available in PATH and `DATABASE_URL` configured.

## Setup
1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate deploy` (or `npx prisma migrate dev`)
4. Set env vars for first super admin:
`SCHOOL_SUPER_ADMIN_EMAIL`
`SCHOOL_SUPER_ADMIN_PASSWORD`

The first super admin account is auto-created on login if missing.
