ALTER TABLE "library_books"
ADD COLUMN IF NOT EXISTS "author" TEXT;

CREATE INDEX IF NOT EXISTS "LibraryBook_author_idx"
ON "library_books"("author");