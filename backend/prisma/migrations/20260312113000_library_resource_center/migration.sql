-- Library Resource Center: resources, informatics dictionary, favorites, search index.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LibraryResourceFileType') THEN
    CREATE TYPE "LibraryResourceFileType" AS ENUM ('pdf', 'docx', 'ppt', 'video', 'audio', 'image', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DictionaryTermType') THEN
    CREATE TYPE "DictionaryTermType" AS ENUM ('Terme', 'Sigle', 'Abreviation', 'Concept');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SearchIndexType') THEN
    CREATE TYPE "SearchIndexType" AS ENUM ('livre', 'article', 'document', 'dictionnaire', 'examen');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FavoriteType') THEN
    CREATE TYPE "FavoriteType" AS ENUM ('ressource', 'livre', 'document', 'dictionnaire', 'examen');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "bibliotheque_ressources" (
  "id" SERIAL NOT NULL,
  "titre" TEXT NOT NULL,
  "description" TEXT,
  "categorie" TEXT NOT NULL,
  "type_fichier" "LibraryResourceFileType" NOT NULL,
  "auteur" TEXT,
  "date_publication" TIMESTAMP(3),
  "fichier_url" TEXT NOT NULL,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bibliotheque_ressources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dictionnaire_informatique" (
  "id" SERIAL NOT NULL,
  "terme" TEXT NOT NULL,
  "type" "DictionaryTermType" NOT NULL,
  "definition" TEXT NOT NULL,
  "exemple" TEXT,
  "lettre_index" TEXT NOT NULL,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dictionnaire_informatique_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "search_index" (
  "id" SERIAL NOT NULL,
  "titre" TEXT NOT NULL,
  "type" "SearchIndexType" NOT NULL,
  "categorie" TEXT,
  "reference_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_index_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "favoris" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "ressource_id" INTEGER,
  "type" "FavoriteType" NOT NULL,
  "reference_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LibraryResource_categorie_created_at_idx" ON "bibliotheque_ressources"("categorie", "created_at");
CREATE INDEX IF NOT EXISTS "LibraryResource_type_fichier_created_at_idx" ON "bibliotheque_ressources"("type_fichier", "created_at");
CREATE INDEX IF NOT EXISTS "InformaticsDictionaryTerm_lettre_terme_idx" ON "dictionnaire_informatique"("lettre_index", "terme");
CREATE INDEX IF NOT EXISTS "InformaticsDictionaryTerm_terme_idx" ON "dictionnaire_informatique"("terme");
CREATE INDEX IF NOT EXISTS "SearchIndex_type_created_at_idx" ON "search_index"("type", "created_at");
CREATE INDEX IF NOT EXISTS "SearchIndex_titre_idx" ON "search_index"("titre");
CREATE INDEX IF NOT EXISTS "Favorite_user_created_at_idx" ON "favoris"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "Favorite_type_created_at_idx" ON "favoris"("type", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_user_type_reference_key" ON "favoris"("user_id", "type", "reference_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibraryResource_createdBy_fkey') THEN
    ALTER TABLE "bibliotheque_ressources"
      ADD CONSTRAINT "LibraryResource_createdBy_fkey" FOREIGN KEY ("created_by")
      REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InformaticsDictionaryTerm_createdBy_fkey') THEN
    ALTER TABLE "dictionnaire_informatique"
      ADD CONSTRAINT "InformaticsDictionaryTerm_createdBy_fkey" FOREIGN KEY ("created_by")
      REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favoris_user_id_fkey') THEN
    ALTER TABLE "favoris"
      ADD CONSTRAINT "favoris_user_id_fkey" FOREIGN KEY ("user_id")
      REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favoris_ressource_id_fkey') THEN
    ALTER TABLE "favoris"
      ADD CONSTRAINT "favoris_ressource_id_fkey" FOREIGN KEY ("ressource_id")
      REFERENCES "bibliotheque_ressources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

