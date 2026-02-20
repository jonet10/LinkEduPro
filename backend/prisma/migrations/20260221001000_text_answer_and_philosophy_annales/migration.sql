ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "answerType" TEXT NOT NULL DEFAULT 'MCQ',
  ADD COLUMN IF NOT EXISTS "correctText" TEXT;

ALTER TABLE "QuizAnswer"
  ADD COLUMN IF NOT EXISTS "selectedText" TEXT;

DO $$
DECLARE
  philo_subject_id INTEGER;
BEGIN
  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Philosophie - Annales MENFP (Entrainement)',
    'Quiz d entrainement philosophie bases sur les annales (themes: ethique, epistemologie, logique, culture, auteurs classiques).',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  SELECT "id" INTO philo_subject_id
  FROM "Subject"
  WHERE "name" = 'Philosophie - Annales MENFP (Entrainement)'
  LIMIT 1;

  IF philo_subject_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "answerType", "correctText", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
  SELECT philo_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.answer_type, q.correct_text, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM (
    VALUES
      ('En philosophie, l epistemologie est l etude de :', '["La connaissance","La nature uniquement","Le droit positif","La geologie"]', 0, 'MCQ', NULL, 'Theme present dans les annales 2022.', 'Epistemologie'),
      ('Le theme "Ethique" traite principalement de :', '["L action morale","La tectonique des plaques","La classification animale","La mecanique quantique"]', 0, 'MCQ', NULL, 'Theme explicite des documents 2022.', 'Ethique'),
      ('La logique vise surtout a etudier :', '["Les regles du raisonnement valide","Les emotions","Les nutriments","Les fleuves"]', 0, 'MCQ', NULL, 'Theme "Logique" visible dans les annales.', 'Logique'),
      ('Le theme "Culture" en philosophie renvoie a :', '["L ensemble des productions symboliques et sociales","La vitesse de la lumiere","La pression atmosferique","Le metabolisme"]', 0, 'MCQ', NULL, 'Theme central des sujets.', 'Culture'),
      ('Descartes est celebre notamment pour :', '["Le doute methodique","La dialectique materialiste","Le contrat social","La separation des pouvoirs"]', 0, 'MCQ', NULL, 'Theme auteur recurrent.', 'Descartes'),
      ('Rousseau est associe principalement a :', '["La philosophie politique et l idee de contrat social","La geologie structurale","La genetique moleculaire","La relativite generale"]', 0, 'MCQ', NULL, 'Theme auteur observe dans les fichiers.', 'Rousseau'),
      ('Marx analyse surtout :', '["Les rapports sociaux et economiques","Les planets geantes","La composition des cellules","Le calcul integral"]', 0, 'MCQ', NULL, 'Theme auteur des annales 2022.', 'Marx'),
      ('Montesquieu est connu pour :', '["La separation des pouvoirs","Le cogito","Le nihilisme","L utilitarisme"]', 0, 'MCQ', NULL, 'Theme auteur present dans les documents.', 'Montesquieu'),
      ('Voltaire est une figure majeure des :', '["Lumieres","Stoiciens","Sophistes","Scolastiques medievaux"]', 0, 'MCQ', NULL, 'Reference classique.', 'Voltaire'),
      ('Socrate est surtout associe a :', '["La maieutique","Le materialisme historique","Le positivisme logique","Le determinisme biologique"]', 0, 'MCQ', NULL, 'Theme auteur dans dossiers LLA-SES.', 'Socrate'),
      ('Platon est l auteur de la theorie des :', '["Idees","Monades","Affects","Categories formelles du droit"]', 0, 'MCQ', NULL, 'Theme auteur.', 'Platon'),
      ('Spinoza defend une vision de Dieu et de la nature comme :', '["Une seule substance","Deux realites totalement separees","Aucune realite connaissable","Un simple mythe linguistique"]', 0, 'MCQ', NULL, 'Theme auteur.', 'Spinoza'),
      ('Hobbes relie l Etat a :', '["La securite face a l etat de nature","La suppression de toute loi","Le refus du pacte social","La disparition de la souverainete"]', 0, 'MCQ', NULL, 'Theme auteur.', 'Hobbes'),
      ('Arendt est connue pour ses analyses sur :', '["Le totalitarisme et la condition humaine","La thermodynamique","La biochimie des enzymes","Les nombres complexes"]', 0, 'MCQ', NULL, 'Theme auteur present.', 'Arendt'),
      ('En un mot, complete: "Je pense, donc je suis" = Cogito de _____', '[]', 0, 'TEXT', 'Descartes', 'Reponse courte attendue.', 'Descartes'),
      ('En un mot, la doctrine de Marx centree sur les classes sociales: _____', '[]', 0, 'TEXT', 'Marxisme', 'Reponse courte attendue.', 'Marx'),
      ('En un mot, la methode de Socrate fondee sur le questionnement: _____', '[]', 0, 'TEXT', 'Maieutique', 'Reponse courte attendue.', 'Socrate'),
      ('En un mot, le mouvement intellectuel de Voltaire au XVIIIe siecle: _____', '[]', 0, 'TEXT', 'Lumieres', 'Reponse courte attendue.', 'Voltaire'),
      ('En un mot, branche philosophique qui etudie la connaissance: _____', '[]', 0, 'TEXT', 'Epistemologie', 'Reponse courte attendue.', 'Epistemologie'),
      ('En un mot, branche qui etudie les regles du raisonnement: _____', '[]', 0, 'TEXT', 'Logique', 'Reponse courte attendue.', 'Logique')
  ) AS q(prompt, options, correct_option, answer_type, correct_text, explanation, source_topic)
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Question" e
    WHERE e."subjectId" = philo_subject_id
      AND e."prompt" = q.prompt
  );
END $$;
