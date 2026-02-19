CREATE TABLE IF NOT EXISTS probable_exercise_likes (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT probable_exercise_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "Student"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT probable_exercise_likes_unique UNIQUE (subject, topic, user_id)
);

CREATE INDEX IF NOT EXISTS probable_exercise_likes_subject_topic_idx
  ON probable_exercise_likes(subject, topic);

CREATE INDEX IF NOT EXISTS probable_exercise_likes_user_id_idx
  ON probable_exercise_likes(user_id);

CREATE TABLE IF NOT EXISTS probable_exercise_comments (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT probable_exercise_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "Student"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS probable_exercise_comments_subject_topic_idx
  ON probable_exercise_comments(subject, topic);

CREATE INDEX IF NOT EXISTS probable_exercise_comments_user_id_idx
  ON probable_exercise_comments(user_id);

CREATE INDEX IF NOT EXISTS probable_exercise_comments_created_at_idx
  ON probable_exercise_comments(created_at DESC);
