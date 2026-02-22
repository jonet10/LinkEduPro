DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RemedialSessionStatus') THEN
    CREATE TYPE "RemedialSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RemedialPaymentStatus') THEN
    CREATE TYPE "RemedialPaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RemedialTransactionStatus') THEN
    CREATE TYPE "RemedialTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RemedialPaymentMethod') THEN
    CREATE TYPE "RemedialPaymentMethod" AS ENUM ('MONCASH', 'NATCASH', 'CARD', 'BANK_TRANSFER', 'CASH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RemedialAudienceScope') THEN
    CREATE TYPE "RemedialAudienceScope" AS ENUM ('GLOBAL', 'TEACHERS', 'TEACHER', 'SCHOOL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS remedial_sessions (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  level "AcademicLevel" NOT NULL,
  subject VARCHAR(120) NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL,
  meeting_link TEXT NOT NULL,
  start_time TIMESTAMP(3) NOT NULL,
  duration INTEGER NOT NULL,
  status "RemedialSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  invitation_scope "RemedialAudienceScope" NOT NULL DEFAULT 'GLOBAL',
  target_school VARCHAR(160),
  target_teacher_id INTEGER,
  invitation_message TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT remedial_sessions_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES "Student"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT remedial_sessions_target_teacher_id_fkey
    FOREIGN KEY (target_teacher_id) REFERENCES "Student"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS remedial_enrollments (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  payment_status "RemedialPaymentStatus" NOT NULL DEFAULT 'PENDING',
  access_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT remedial_enrollments_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES remedial_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT remedial_enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES "Student"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT remedial_enrollments_session_id_student_id_key UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  platform_commission DECIMAL(10, 2) NOT NULL,
  teacher_amount DECIMAL(10, 2) NOT NULL,
  status "RemedialTransactionStatus" NOT NULL DEFAULT 'SUCCESS',
  payment_method "RemedialPaymentMethod" NOT NULL DEFAULT 'MONCASH',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "Student"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT transactions_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES remedial_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS remedial_sessions_teacher_id_created_at_idx
  ON remedial_sessions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remedial_sessions_level_status_start_time_idx
  ON remedial_sessions(level, status, start_time);
CREATE INDEX IF NOT EXISTS remedial_sessions_subject_idx
  ON remedial_sessions(subject);
CREATE INDEX IF NOT EXISTS remedial_sessions_scope_school_idx
  ON remedial_sessions(invitation_scope, target_school);
CREATE INDEX IF NOT EXISTS remedial_sessions_target_teacher_id_idx
  ON remedial_sessions(target_teacher_id);

CREATE INDEX IF NOT EXISTS remedial_enrollments_student_id_created_at_idx
  ON remedial_enrollments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remedial_enrollments_session_id_payment_status_idx
  ON remedial_enrollments(session_id, payment_status);

CREATE INDEX IF NOT EXISTS remedial_transactions_session_id_created_at_idx
  ON transactions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remedial_transactions_user_id_created_at_idx
  ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remedial_transactions_status_idx
  ON transactions(status);
