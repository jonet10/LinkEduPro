ALTER TABLE "student_profiles"
  ADD COLUMN IF NOT EXISTS "nsiv_track" TEXT;

CREATE INDEX IF NOT EXISTS "student_profiles_nsiv_track_idx"
  ON "student_profiles"("nsiv_track");

DO $$
DECLARE
  hist_geo_subject_id INTEGER;
  general_subject_id INTEGER;
BEGIN
  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Histoire-Geographie NSIV',
    'Quiz bases sur les documents Hist-Geo (MENFP) et les themes des examens officiels.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Connaissance generale NSIV',
    'Culture generale, reperes historiques et geographiques utiles pour les eleves NSIV.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  SELECT "id" INTO hist_geo_subject_id FROM "Subject" WHERE "name" = 'Histoire-Geographie NSIV' LIMIT 1;
  SELECT "id" INTO general_subject_id FROM "Subject" WHERE "name" = 'Connaissance generale NSIV' LIMIT 1;

  IF hist_geo_subject_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT hist_geo_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Parmi ces themes, lequel apparait explicitement dans les documents Hist-Geo 2022 ?', '["Climatologie","Electromagnetisme","Genetique","Programmation"]', 0, 'Le dossier contient un sujet intitule "Climatologie".', 'Climatologie'),
        ('Le sujet "Dessalines" dans Hist-Geo renvoie principalement a :', '["L histoire d Haiti","La thermodynamique","La trigonometrie","La photosynthese"]', 0, 'Dessalines est une figure majeure de l histoire haitienne.', 'Dessalines'),
        ('Le mot "Geodesie" se rapporte surtout a :', '["La mesure de la Terre","Les reactions chimiques","Les circuits electriques","Le roman classique"]', 0, 'La geodesie concerne la forme et les mesures de la Terre.', 'Geodesie'),
        ('Le theme "Oceanographie" traite prioritairement de :', '["L etude des oceans","L etude des volcans uniquement","Le commerce exterieur","La geometrie analytique"]', 0, 'L oceanographie est la science des oceans.', 'Oceanographie'),
        ('Le mot "Revolution" dans les sujets Hist-Geo 2022 est d abord un theme de :', '["Transformation historique et politique","Transformation chimique","Mouvement circulaire","Calcul matriciel"]', 0, 'En Hist-Geo, la revolution est abordee comme evenement historique.', 'Revolution'),
        ('Le theme "Dahomey" fait reference a :', '["Un ancien royaume d Afrique de l Ouest","Une ile des Caraibes","Un massif alpin","Une comete"]', 0, 'Le Dahomey est l ancien nom du Benin.', 'Dahomey'),
        ('Le theme "Boukman" est associe a :', '["La revolution haitienne","La mecanique celeste","La litterature francaise","La genetique"]', 0, 'Boukman est une figure liee au declenchement de l insurrection de 1791.', 'Boukman'),
        ('Le theme "Boisrond Tonnerre" concerne :', '["L histoire politique haitienne","La tectonique des plaques","La microeconomie","La thermochimie"]', 0, 'Boisrond-Tonnerre est connu dans l histoire de l independance d Haiti.', 'Boisrond Tonnerre'),
        ('Le theme "Sans-Souci" dans ce contexte renvoie surtout a :', '["Un site/lieu historique d Haiti","Une equation du second degre","Un type de cellule","Une monnaie"]', 0, 'Sans-Souci renvoie a un repere historique haitien.', 'Sans-Souci'),
        ('"Sanite Bel-Air" est principalement etudiee comme :', '["Personnage historique de la revolution haitienne","Concept economique","Element chimique","Courant marin"]', 0, 'Sanite Bel-Air est une figure historique haitienne.', 'Sanite Bel-Air'),
        ('Le mot "Continent" appartient d abord au champ :', '["Geographie","Chimie","Algebre","Electronique"]', 0, 'Le continent est une notion geographique majeure.', 'Continent'),
        ('Le theme "Population" dans les sujets Hist-Geo est classe en general dans :', '["Demographie","Mecanique","Optique","Programmation"]', 0, 'Les questions de population relevent de la demographie.', 'Population')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" existing
      WHERE existing."subjectId" = hist_geo_subject_id
        AND existing."prompt" = q.prompt
    );
  END IF;

  IF general_subject_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT general_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Combien y a-t-il de continents sur Terre (modele scolaire le plus courant) ?', '["7","5","6","8"]', 0, 'Le modele scolaire courant retient 7 continents.', 'Connaissance generale'),
        ('La capitale d Haiti est :', '["Port-au-Prince","Cap-Haitien","Les Cayes","Jacmel"]', 0, 'Port-au-Prince est la capitale d Haiti.', 'Connaissance generale'),
        ('Le drapeau haitien est compose principalement des couleurs :', '["Bleu et rouge","Vert et jaune","Noir et blanc","Rouge et vert"]', 0, 'Le drapeau national haitien est bleu et rouge.', 'Connaissance generale'),
        ('Lequel est un ocean ?', '["Atlantique","Sahara","Andes","Niger"]', 0, 'L Atlantique est un ocean.', 'Geographie'),
        ('La date de l independance d Haiti est :', '["1er janvier 1804","18 mai 1803","14 aout 1791","17 octobre 1806"]', 0, 'Haiti declare son independance le 1er janvier 1804.', 'Histoire'),
        ('Jean-Jacques Dessalines est reconnu comme :', '["Un pere fondateur de l independance d Haiti","Un astronome europeen","Un chimiste moderne","Un economiste du XXe siecle"]', 0, 'Dessalines est une figure fondatrice d Haiti.', 'Histoire'),
        ('La geographie etudie entre autres :', '["Les territoires et les societes","Uniquement les equations","Seulement les molecules","Les seules machines"]', 0, 'La geographie relie espace, territoire et societes.', 'Geographie'),
        ('Quel terme renvoie a l etude du climat ?', '["Climatologie","Demographie","Geodesie","Oceanographie"]', 0, 'La climatologie etudie les climats.', 'Climatologie'),
        ('Quel terme renvoie a l etude des populations ?', '["Demographie","Cartographie","Petrographie","Hydrologie"]', 0, 'La demographie etudie la population.', 'Demographie'),
        ('Un "archipel" designe :', '["Un groupe d iles","Un sommet montagneux","Un desert","Une riviere souterraine"]', 0, 'Un archipel est un ensemble d iles.', 'Geographie'),
        ('Lequel est un indicateur de developpement souvent utilise ?', '["IDH","PH","Volt","Newton"]', 0, 'L IDH est un indicateur du developpement humain.', 'Developpement'),
        ('Une "carte politique" sert surtout a montrer :', '["Les frontieres et divisions administratives","Les couches geologiques","Les equations lineaires","Les cycles biologiques"]', 0, 'La carte politique represente frontieres et territoires administratifs.', 'Cartographie')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" existing
      WHERE existing."subjectId" = general_subject_id
        AND existing."prompt" = q.prompt
    );
  END IF;
END $$;
