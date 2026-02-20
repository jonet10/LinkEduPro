CREATE TABLE IF NOT EXISTS quiz_attempt_likes (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quiz_attempt_likes_attempt_id_fkey
    FOREIGN KEY (attempt_id) REFERENCES "QuizAttempt"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT quiz_attempt_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "Student"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT quiz_attempt_likes_unique UNIQUE (attempt_id, user_id)
);

CREATE INDEX IF NOT EXISTS quiz_attempt_likes_attempt_id_created_at_idx
  ON quiz_attempt_likes(attempt_id, created_at);

CREATE INDEX IF NOT EXISTS quiz_attempt_likes_user_id_created_at_idx
  ON quiz_attempt_likes(user_id, created_at);
