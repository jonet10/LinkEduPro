DO $$
DECLARE
  annales_subject_id INTEGER;
BEGIN
  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Physique - Annales MENFP (Entrainement)',
    'Quiz d entrainement base sur les questions de cours et enonces des examens passes (MENFP).',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  SELECT "id" INTO annales_subject_id
  FROM "Subject"
  WHERE "name" = 'Physique - Annales MENFP (Entrainement)'
  LIMIT 1;

  IF annales_subject_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
  SELECT annales_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM (
    VALUES
      ('Dans la region centrale d une bobine longue, les lignes de champ sont en general :', '["Rectilignes et paralleles","Circulaires","Toujours nulles","Spiralees"]', 0, 'Question de cours recurrente dans les annales MENFP.', 'Bobine'),
      ('La f.e.m. d auto-induction apparait lors de la variation de :', '["Flux magnetique","Temperature uniquement","Masse du conducteur","Pression atmospherique"]', 0, 'Reference aux enonces type 2021-2022.', 'Induction'),
      ('Les armatures d un condensateur portent des charges :', '["Egales en valeur et opposees en signe","Egales et de meme signe","Toujours nulles","Aleatoires"]', 0, 'Question de base vue dans plusieurs examens passes.', 'Condensateur'),
      ('Un condensateur en regime continu etabli :', '["Bloque le courant","Amplifie le courant","Inverse la tension","Produit de l energie"]', 0, 'Question de cours frequente.', 'Condensateur'),
      ('La reactance inductive d une bobine ideale est :', '["XL = omega L","XL = 1/(omega L)","XL = R/L","XL = L/R"]', 0, 'Formule standard des annales.', 'AC'),
      ('La capacite d un condensateur est definie par :', '["C = Q/U","C = U/Q","C = R/I","C = U*I"]', 0, 'Definition fondamentale utilisee en examen.', 'Condensateur'),
      ('La force electromagnetique de Laplace est maximale si le conducteur est :', '["Perpendiculaire a B","Parallele a B","Sans courant","Toujours en mouvement uniforme"]', 0, 'Cas usuel demande dans les epreuves.', 'Magnetisme'),
      ('La relation entre periode et frequence d un signal sinusoidal est :', '["T = 1/f","T = f","T = 2f","T = f/2"]', 0, 'Rappel de cours typique.', 'AC'),
      ('La pulsation d un courant alternatif vaut :', '["omega = 2*pi*f","omega = f/(2*pi)","omega = 1/f","omega = f^2"]', 0, 'Recurrent dans les parties "question de cours".', 'AC'),
      ('Un mouvement est dit periodique lorsqu il :', '["Se reproduit identique a intervalles de temps egaux","Est accelere en permanence","Se deplace en ligne droite","A une vitesse constante uniquement"]', 0, 'Enonce de cours present dans les annales 2016.', 'Mecanique'),
      ('Une onde mecanique transporte :', '["De l energie","De la matiere sur grande distance","Seulement des electrons","Seulement de la chaleur"]', 0, 'Formulation classique des examens MENFP.', 'Ondes'),
      ('Dans un champ de pesanteur ideal, un corps en chute libre a une acceleration :', '["Egale a g vers le bas","Nulle","Vers le haut","Dependant de sa masse"]', 0, 'Question recurrente de mecanique.', 'Mecanique'),
      ('Le flux magnetique a travers une surface S est :', '["Phi = B*S*cos(alpha)","Phi = B/S","Phi = S/B","Phi = B + S"]', 0, 'Question de cours d induction magnetique.', 'Induction'),
      ('Dans un circuit RLC serie, la resonance se produit quand :', '["XL = XC","R = 0","XL = 0","XC = 0"]', 0, 'Frequent dans les annales de physique terminale.', 'RLC'),
      ('La valeur efficace d une tension sinusoidale de valeur maximale Um est :', '["Ueff = Um/sqrt(2)","Ueff = Um","Ueff = 2Um","Ueff = Um^2"]', 0, 'Question de cours standard.', 'AC')
  ) AS q(prompt, options, correct_option, explanation, source_topic)
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Question" existing
    WHERE existing."subjectId" = annales_subject_id
      AND existing."prompt" = q.prompt
  );
END $$;
