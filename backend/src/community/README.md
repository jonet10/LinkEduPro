# Community + Teacher + Super Admin Module

Prefix: `/api/community`

## Features implemented
- Super Admin global dashboard analytics
- Teacher invitation system (unique token link)
- Teacher hierarchy & verification workflow
- Blog global + blog interne (by `schoolId`) with moderation
- Categories, tags, comments, reports
- Reputation points + badges auto-awarded
- Student publication limits (configurable)
- Spam/rate limit comments + content sanitization
- Immutable activity logs

## Auth assumptions
- Uses existing JWT auth (`/api/auth/login`)
- `SUPER_ADMIN` is derived from:
  `role=ADMIN` and `email===SUPER_ADMIN_EMAIL`

## Main endpoints
### Super Admin
- `GET /api/community/admin/super-dashboard`
- `GET /api/community/admin/config`
- `PUT /api/community/admin/config`
- `GET /api/community/admin/teacher-invitations`
- `POST /api/community/admin/teacher-invitations`

### Teacher invitations
- `GET /api/auth/teacher/invite/:token`
- `POST /api/auth/teacher/accept-invite`

### Teacher verification/hierarchy
- `POST /api/community/teachers/verifications` (TEACHER|ADMIN)
- `GET /api/community/teachers/verifications/me` (TEACHER|ADMIN)
- `GET /api/community/teachers/verifications/pending` (SUPER_ADMIN)
- `PATCH /api/community/teachers/verifications/:id/review` (SUPER_ADMIN)
- `PATCH /api/community/teachers/:teacherId/level` (SUPER_ADMIN)

### Blog
- `GET /api/community/blog/posts` (pagination, search, filter)
- `POST /api/community/blog/posts`
- `DELETE /api/community/blog/posts/:postId` (soft delete)
- `PATCH /api/community/blog/posts/:postId/approve` (SUPER_ADMIN)
- `POST /api/community/blog/posts/:postId/like`
- `GET /api/community/blog/posts/:postId/comments`
- `POST /api/community/blog/posts/:postId/comments`
- `PATCH /api/community/blog/comments/:commentId/helpful` (SUPER_ADMIN)
- `POST /api/community/blog/posts/:postId/report`
- `GET /api/community/blog/reports` (SUPER_ADMIN)
- `PATCH /api/community/blog/reports/:reportId/review` (SUPER_ADMIN)

### Taxonomy
- `GET /api/community/blog/categories`
- `POST /api/community/blog/categories` (SUPER_ADMIN)
- `GET /api/community/blog/tags`
- `POST /api/community/blog/tags` (SUPER_ADMIN)

### Public profile
- `GET /api/community/profiles/:userId`

## Reputation rules
- `+5` article publie
- `+10` article approuve
- `+2` commentaire utile
- `+20` article populaire (>= 50 likes)

Levels:
- `0-50`: Nouveau
- `51-200`: Actif
- `201-500`: Contributeur
- `500+`: Leader Educatif

## Security
- Role middlewares (`TEACHER`, `ADMIN`, `SUPER_ADMIN`)
- Student posting limits (`maxPostsPerDay` / `maxPostsPerMonth`)
- Comment rate limit (`commentRatePerMin`)
- Upload validation for diploma docs (PDF/JPG/PNG, max 5MB)
- Soft delete for posts/comments
- Immutable logs in `community_logs`

## OpenAPI
- `GET /api/docs/openapi.json`
