DO $$
DECLARE
  chimie_subject_id INTEGER;
  histgeo_subject_id INTEGER;
BEGIN
  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Chimie - Annales MENFP (Entrainement)',
    'Quiz d entrainement de chimie construits a partir des enonces et questions de cours des examens passes.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  INSERT INTO "Subject" ("name", "description", "createdAt", "updatedAt")
  VALUES (
    'Histoire-Geographie - Annales MENFP (Entrainement)',
    'Quiz d entrainement Hist-Géo bases sur les themes visibles dans les examens passes.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("name") DO UPDATE
  SET "description" = EXCLUDED."description",
      "updatedAt" = CURRENT_TIMESTAMP;

  SELECT "id" INTO chimie_subject_id
  FROM "Subject"
  WHERE "name" = 'Chimie - Annales MENFP (Entrainement)'
  LIMIT 1;

  SELECT "id" INTO histgeo_subject_id
  FROM "Subject"
  WHERE "name" = 'Histoire-Geographie - Annales MENFP (Entrainement)'
  LIMIT 1;

  IF chimie_subject_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT chimie_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('La matiere est constituee de :', '["Particules (atomes, molecules, ions)","Uniquement de vide","Uniquement de rayons X","Ondes mecaniques seulement"]', 0, 'Base de cours de chimie generale.', 'Structure de la matiere'),
        ('Un atome neutre possede :', '["Autant de protons que d electrons","Plus d electrons que de protons","Aucun neutron","Uniquement des protons"]', 0, 'Definition fondamentale.', 'Atome'),
        ('Le pH d une solution acide est en general :', '["Inferieur a 7","Egal a 7","Superieur a 7","Toujours egal a 14"]', 0, 'Rappel standard acido-basique.', 'Acido-basique'),
        ('Une reaction d oxydation correspond a :', '["Une perte d electrons","Un gain d electrons","Une neutralisation uniquement","Une dissolution seulement"]', 0, 'Regle redox classique.', 'Oxydoreduction'),
        ('La verrerie utilisee pour mesurer un volume avec precision est :', '["La pipette jaugee","Le becher","Le tube a essai","La coupelle"]', 0, 'Question de cours frequente en laboratoire.', 'Verrerie'),
        ('La loi de conservation de la masse en reaction chimique signifie que :', '["La masse totale des reactifs = masse totale des produits","La masse augmente toujours","La masse diminue toujours","La masse depend du contenant"]', 0, 'Principe de Lavoisier.', 'Lois ponderales'),
        ('Un catalyseur :', '["Accelere la reaction sans etre consomme globalement","Bloque toujours la reaction","Change les produits finaux","Augmente la masse des reactifs"]', 0, 'Question recurrente dans les annales.', 'Cinétique chimique'),
        ('La formule de l eau est :', '["H2O","HO2","H2","O2H2"]', 0, 'Rappel de base.', 'Formules chimiques'),
        ('Dans le tableau periodique, une periode correspond a :', '["Une ligne horizontale","Une colonne verticale","Un bloc uniquement","Un isotope"]', 0, 'Organisation periodique.', 'Classification periodique'),
        ('Le gaz responsable principal de l effet de serre anthropique est :', '["CO2","O2","N2","He"]', 0, 'Connaissance transversale chimie-environnement.', 'Environnement'),
        ('Une solution tampon sert a :', '["Limiter les variations de pH","Rendre une solution solide","Augmenter toujours l acidite","Supprimer tous les ions"]', 0, 'Point de cours souvent evalua.', 'Acido-basique'),
        ('La mole est :', '["Une unite de quantite de matiere","Une unite de pression","Une unite d energie","Une unite de vitesse"]', 0, 'Definition fondamentale.', 'Quantite de matiere')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Question" existing
      WHERE existing."subjectId" = chimie_subject_id
        AND existing."prompt" = q.prompt
    );
  END IF;

  IF histgeo_subject_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT histgeo_subject_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Dans les en-tetes des annales Hist-Géo, MENFP signifie :', '["Ministere de l Education Nationale et de la Formation Professionnelle","Maison des Etudes Nationales de Physique","Mouvement Educatif National Francophone","Ministere des Energies Nouvelles et des Finances Publiques"]', 0, 'Reprise de l entete officiel des epreuves.', 'Entete officiel'),
        ('Le theme "Dessalines" dans les annales renvoie surtout a :', '["L histoire d Haiti","La geologie marine","La logique mathematique","La biochimie"]', 0, 'Theme historique present dans le dossier.', 'Histoire d Haiti'),
        ('Le theme "Climatologie" appartient principalement a :', '["La geographie physique","La chimie organique","La mecanique","La sociologie politique uniquement"]', 0, 'Theme geographique explicite des annales 2022.', 'Geographie'),
        ('Le mot "Geodesie" designe surtout :', '["La mesure et la forme de la Terre","La vitesse des reactions","Une doctrine litteraire","Un courant economique"]', 0, 'Notion geographique classique.', 'Geodesie'),
        ('Le theme "Dahomey" concerne :', '["Un ancien royaume d Afrique de l Ouest","Une ile du Pacifique","Une chaine de montagnes d Haiti","Un compose chimique"]', 0, 'Reference historique regionale.', 'Histoire'),
        ('La notion de "continent" releve de :', '["La geographie","La chimie","La physique nucleaire","La geometrique analytique"]', 0, 'Question de base en geographie.', 'Geographie'),
        ('Le theme "Boukman" est associe a :', '["La revolution haitienne","La guerre froide europeenne","L industrialisation du Japon","La mecanique des fluides"]', 0, 'Figure historique liee a 1791.', 'Histoire d Haiti'),
        ('Le theme "Boisrond Tonnerre" est etudie principalement en :', '["Histoire nationale haitienne","Astronomie","Geometrie","Botanique"]', 0, 'Theme biographique des annales.', 'Histoire d Haiti'),
        ('Le theme "Oceanographie" est rattache a :', '["L etude des oceans","L etude des seuls volcans","La comptabilite nationale","La theorie des ensembles"]', 0, 'Notion geographique presente dans les fichiers.', 'Geographie'),
        ('Une carte politique represente en priorite :', '["Les frontieres et divisions administratives","Les minerals du sous-sol","Les molecules de l air","Les courants electriques"]', 0, 'Question de cours classique.', 'Cartographie'),
        ('La demographie etudie principalement :', '["Les populations","Les forces magnetiques","Les acides et bases","Les figures de style"]', 0, 'Notion de base hist-geo.', 'Demographie'),
        ('Le "developpement" dans les sujets Hist-Géo est souvent lie a :', '["Des indicateurs economiques et sociaux","La masse volumique des metaux","Le calcul integral","La classification des proteins"]', 0, 'Theme recurrent observe dans les annales.', 'Developpement')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Question" existing
      WHERE existing."subjectId" = histgeo_subject_id
        AND existing."prompt" = q.prompt
    );
  END IF;
END $$;
