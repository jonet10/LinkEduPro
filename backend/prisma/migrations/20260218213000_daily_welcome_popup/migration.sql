ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "last_welcome_popup_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "used_welcome_message_ids" JSONB;

CREATE TABLE IF NOT EXISTS "welcome_messages" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "category" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "welcome_messages_text_key" ON "welcome_messages"("text");

INSERT INTO "welcome_messages" ("text", "category") VALUES
('Chaque effort d''aujourd''hui construit ta victoire de demain.', 'motivation'),
('Reste constant: la discipline bat toujours la motivation passagere.', 'motivation'),
('Un petit progres quotidien devient un grand resultat annuel.', 'motivation'),
('Ta concentration est ton super pouvoir du jour.', 'focus'),
('Chaque question resolue augmente ta confiance.', 'etude'),
('Avance exercice par exercice, tu es sur la bonne voie.', 'etude'),
('Ton avenir te remercie pour le travail que tu fais maintenant.', 'vision'),
('La regularite est plus forte que la perfection.', 'motivation'),
('Lis, comprends, applique: c''est la formule gagnante.', 'methodologie'),
('Tu n''as pas besoin d''etre parfait, juste d''etre present aujourd''hui.', 'motivation'),
('Ton niveau monte chaque fois que tu refuses d''abandonner.', 'motivation'),
('Apprends lentement si necessaire, mais n''arrete jamais.', 'motivation'),
('Ton objectif NS4 devient reel avec tes actions quotidiennes.', 'objectif'),
('Reussir c''est repeter les bonnes habitudes.', 'habitudes'),
('Une heure bien utilisee vaut plus qu''une journee distraite.', 'focus'),
('Continue: la constance transforme les etudiants en champions.', 'motivation'),
('Ta progression est plus importante que la comparaison.', 'mindset'),
('Tu es capable de comprendre plus que tu ne le crois.', 'confiance'),
('Le courage aujourd''hui, c''est ouvrir ton cahier et commencer.', 'courage'),
('Chaque revision renforce ta memoire a long terme.', 'etude'),
('Ton reve merite ta meilleure energie.', 'vision'),
('Les grands resultats naissent des petites actions repetees.', 'motivation'),
('Mieux vaut avancer imparfaitement que rester immobile.', 'motivation'),
('Travaille en silence, laisse tes notes parler.', 'performance'),
('Tu progresses meme quand c''est difficile.', 'resilience'),
('Organise ton temps, protege ton objectif.', 'organisation'),
('Le succes aime les etudiants prepares.', 'preparation'),
('Aujourd''hui est une nouvelle chance d''etre meilleur qu''hier.', 'motivation'),
('Chaque page lue est un pas vers ta reussite.', 'etude'),
('Rappelle-toi: tu peux, et tu vas y arriver.', 'confiance')
ON CONFLICT DO NOTHING;
