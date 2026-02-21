ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS commune TEXT;

UPDATE schools
SET commune = COALESCE(commune, city),
    department = COALESCE(department, country)
WHERE commune IS NULL OR department IS NULL;
