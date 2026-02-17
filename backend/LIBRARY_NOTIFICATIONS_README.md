# Library Workflow + Notifications

## Library permissions
- `ADMIN` (super admin module eleves):
  - submit PDF books
  - review `APPROVED/REJECTED`
  - soft delete any book
- `TEACHER`:
  - submit PDF books (status `PENDING`)
  - soft delete own books
- `STUDENT`:
  - read approved books only

## Endpoints
- `GET /api/library/books` (auth)
- `POST /api/library/books` (auth, roles: ADMIN|TEACHER, multipart `file` + fields `title,subject,level,description`)
- `PATCH /api/library/books/:id/review` (auth, role: ADMIN, body `{ "status": "APPROVED"|"REJECTED" }`)
- `DELETE /api/library/books/:id` (auth, roles: ADMIN|TEACHER)

## Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Events generated:
- Blog post created -> admins notified (`BLOG_POST_CREATED`)
- Teacher/admin submits book -> admins notified when review needed (`BOOK_REVIEW_REQUIRED`)
- Admin approves book -> students/teachers notified (`BOOK_PUBLISHED`)
- Uploader notified of review decision (`BOOK_REVIEW_RESULT`)
