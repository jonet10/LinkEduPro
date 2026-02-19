CREATE TABLE IF NOT EXISTS nsiv_catchup_sessions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  meet_url TEXT NOT NULL,
  starts_at TIMESTAMP(3) NOT NULL,
  ends_at TIMESTAMP(3) NOT NULL,
  level "AcademicLevel" NOT NULL DEFAULT CAST('NSIV' AS "AcademicLevel"),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT nsiv_catchup_sessions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES "Student"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_level_idx
  ON nsiv_catchup_sessions(level);

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_starts_at_idx
  ON nsiv_catchup_sessions(starts_at);

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_created_by_idx
  ON nsiv_catchup_sessions(created_by);
