DO $$
DECLARE
  svt_subject_id INTEGER;
BEGIN
  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'SVT - Annales MENFP (Entrainement)',
    'Quiz d entrainement SVT construits a partir des themes visibles dans les examens passes (MENFP).',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  SELECT "id" INTO svt_subject_id
  FROM "Subject"
  WHERE "name" = 'SVT - Annales MENFP (Entrainement)'
  LIMIT 1;

  IF svt_subject_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
  SELECT svt_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM (
    VALUES
      ('Le theme "Genetique" en SVT traite principalement de :', '["L heredite et les genes","La dynamique des fluides","Les reactions redox uniquement","Les frontieres politiques"]', 0, 'Theme explicite dans les fichiers d examens passes.', 'Genetique'),
      ('Un gene est une portion de :', '["ADN","Lipide","Glucide","Mineral"]', 0, 'Definition fondamentale SVT.', 'Genetique'),
      ('Le theme "Virologie" etudie :', '["Les virus et leurs interactions avec l hote","Uniquement les bacteries","Les roches metamorphiques","Les fonctions trigonometriques"]', 0, 'Theme present dans les annales SVT 2022.', 'Virologie'),
      ('Un anticorps est produit principalement par :', '["Le systeme immunitaire","Le systeme digestif","Le systeme osseux","La chlorophylle"]', 0, 'Reference au theme Anticorps observe dans les fichiers.', 'Immunologie'),
      ('Le cytoplasme se trouve :', '["A l interieur de la cellule","A l exterieur de l organisme","Uniquement dans les roches","Dans l atmosphere"]', 0, 'Theme Cytoplasme/Cytologie recurrent.', 'Cytologie'),
      ('Le theme "Histologie" concerne :', '["L etude des tissus biologiques","L etude des planetes","L etude des courants marins","L etude des matrices"]', 0, 'Theme present en 2002 et 2022.', 'Histologie'),
      ('Le neurone est une cellule specialisee de :', '["Le systeme nerveux","Le systeme osseux","Le systeme digestif","Le systeme geologique"]', 0, 'Theme Neurone/Neurosciences present dans les annales.', 'Neurosciences'),
      ('Le pancreas est un organe lie notamment a :', '["La regulation metabolique (insuline, glucagon)","La photosynthese","La tectonique des plaques","La respiration branchiale"]', 0, 'Theme Pancreas observe dans les examens passes.', 'Physiologie'),
      ('Le glucogene est principalement une forme de :', '["Stockage du glucose","Proteine contractile","Acide nucleique","Pigment chlorophyllien"]', 0, 'Theme Glucogene present dans les sujets SVT 2022.', 'Metabolisme'),
      ('Le theme "Paleontologie" etudie :', '["Les fossiles et la vie passee","Les circuits electriques","La comptabilite publique","Les lois de Newton uniquement"]', 0, 'Theme explicite dans les fichiers SVT.', 'Paleontologie'),
      ('Le theme "Seisme" est lie principalement a :', '["La dynamique de la lithosphere","La replication de l ADN","La synthese proteique uniquement","La reproduction asexuee"]', 0, 'Theme SES-SMP 2022 observe dans les documents.', 'Geologie'),
      ('Le theme "Risques" en SVT renvoie souvent a :', '["Risques naturels et environnementaux","Risques bancaires uniquement","Risques de programmation","Risques litteraires"]', 0, 'Theme present dans SVT_2022_SES_SMP_Risques.', 'Risques'),
      ('Le theme "Elevage" en SVT touche surtout a :', '["La production animale et la gestion sanitaire","La geodesie","La mecanique quantique","La cartographie politique"]', 0, 'Theme explicite dans les annales SVT 2022.', 'Elevage'),
      ('Le theme "Morphologie" s interesse principalement a :', '["La forme et la structure des organismes","La vitesse des reactions chimiques","La repartition des continents","La valeur efficace du courant"]', 0, 'Theme Morphologie present dans les documents SVT.', 'Morphologie'),
      ('Le theme "Vitamines" est rattache a :', '["La nutrition et le metabolisme","La tectonique des plaques","La balistique","La fiscalite"]', 0, 'Theme SVT classique present dans les annales.', 'Nutrition')
  ) AS q(prompt, options, correct_option, explanation, source_topic)
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Question" existing
    WHERE existing."subjectId" = svt_subject_id
      AND existing."prompt" = q.prompt
  );
END $$;
