ALTER TABLE nsiv_catchup_sessions
  ADD COLUMN IF NOT EXISTS invitation_scope TEXT NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN IF NOT EXISTS target_school TEXT,
  ADD COLUMN IF NOT EXISTS invitation_message TEXT,
  ADD COLUMN IF NOT EXISTS target_teacher INTEGER;

ALTER TABLE nsiv_catchup_sessions
  DROP CONSTRAINT IF EXISTS nsiv_catchup_sessions_target_teacher_fkey;

ALTER TABLE nsiv_catchup_sessions
  ADD CONSTRAINT nsiv_catchup_sessions_target_teacher_fkey
  FOREIGN KEY (target_teacher) REFERENCES "Student"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_invitation_scope_idx
  ON nsiv_catchup_sessions(invitation_scope);

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_target_school_idx
  ON nsiv_catchup_sessions(target_school);

CREATE INDEX IF NOT EXISTS nsiv_catchup_sessions_target_teacher_idx
  ON nsiv_catchup_sessions(target_teacher);
