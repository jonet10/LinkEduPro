DO $$
DECLARE
  rec RECORD;
  new_exam_id INTEGER;
BEGIN
  -- Chimie: sujets probables derives des annales disponibles
  FOR rec IN
    SELECT * FROM (VALUES
      ('Chimie', 2018, 'Ethanol', 'Une solution contenant de l ethanol est analysee. Determine sa fonction chimique et une propriete caracteristique.'),
      ('Chimie', 2019, 'Ethanol', 'Identifier la famille chimique de l ethanol puis donner une reaction possible avec un oxydant usuel.'),
      ('Chimie', 2020, 'Ethanol', 'On considere l ethanol en laboratoire: preciser sa formule brute et son groupe fonctionnel.'),
      ('Chimie', 2019, 'Masse molaire', 'Calculer la masse molaire d un compose organique simple puis interpreter le resultat obtenu.'),
      ('Chimie', 2020, 'Masse molaire', 'A partir de la formule d un compose, determiner sa masse molaire et sa quantite de matiere.'),
      ('Chimie', 2020, 'Hydrocarbures', 'Classer un hydrocarbure donne selon sa famille et justifier le type de liaison dominante.'),
      ('Chimie', 2022, 'Hydrocarbures', 'Distinguer alcane, alcene et alcyne a partir de formules semi-developpees.'),
      ('Chimie', 2021, 'Acides et bases', 'Identifier un acide et une base dans une reaction puis ecrire le couple acide/base correspondant.'),
      ('Chimie', 2021, 'Acides et bases', 'Comparer acide acetique et base faible dans un contexte de neutralisation.'),
      ('Chimie', 2015, 'Oxydoreduction', 'Equilibrer une equation d oxydoreduction et identifier oxydant et reducteur.'),
      ('Chimie', 2021, 'Oxydoreduction', 'A partir d une transformation redox, determiner le sens du transfert d electrons.'),
      ('Chimie', 2022, 'Structure atomique', 'Donner la composition d un atome et d un ion puis deduire la charge de l ion.'),
      ('Chimie', 2022, 'Structure atomique', 'Expliquer la difference entre atome, molecule et ion avec un exemple pour chaque cas.'),
      ('Chimie', 2022, 'Liaison chimique', 'Distinguer liaison ionique et liaison covalente a partir d exemples classiques.'),
      ('Chimie', 2022, 'Liaison chimique', 'Determiner le type de liaison present dans une molecule organique simple.'),
      ('Chimie', 2019, 'Fonctions organiques', 'Reconnaitre une fonction alcool, aldehyde ou acide carboxylique dans une formule.'),
      ('Chimie', 2018, 'Fonctions organiques', 'Associer une formule chimique a sa fonction organique principale.')
    ) AS t(subject_name, exam_year, topic_name, question_text)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM "exam_questions" q
      INNER JOIN "exams" e ON e.id = q."exam_id"
      WHERE e."subject" = rec.subject_name
        AND e."level" = CAST('NSIV' AS "AcademicLevel")
        AND q."topic" = rec.topic_name
        AND q."question_text" = rec.question_text
    ) THEN
      INSERT INTO "exams" ("subject", "year", "level")
      VALUES (rec.subject_name, rec.exam_year, CAST('NSIV' AS "AcademicLevel"))
      RETURNING "id" INTO new_exam_id;

      INSERT INTO "exam_questions" ("exam_id", "question_text", "topic")
      VALUES (new_exam_id, rec.question_text, rec.topic_name);
    END IF;
  END LOOP;

  -- Mathematiques: sujets probables NSIV
  FOR rec IN
    SELECT * FROM (VALUES
      ('Mathematiques', 2022, 'Algebre', 'Resoudre une equation du second degre et verifier les solutions obtenues.'),
      ('Mathematiques', 2023, 'Algebre', 'Factoriser une expression polynomiale puis simplifier le resultat.'),
      ('Mathematiques', 2024, 'Fonctions', 'Etudier les variations d une fonction polynomiale a partir de sa derivee.'),
      ('Mathematiques', 2025, 'Fonctions', 'Determiner le domaine de definition et les limites d une fonction rationnelle simple.'),
      ('Mathematiques', 2022, 'Geometrie analytique', 'Calculer la distance entre deux points et l equation d une droite dans le plan.'),
      ('Mathematiques', 2023, 'Geometrie analytique', 'Determiner l equation d un cercle a partir de son centre et de son rayon.'),
      ('Mathematiques', 2024, 'Trigonometrie', 'Resoudre une equation trigonometrique sur un intervalle donne.'),
      ('Mathematiques', 2025, 'Trigonometrie', 'Utiliser les identites trigonometriques pour simplifier une expression.'),
      ('Mathematiques', 2023, 'Probabilites', 'Calculer une probabilite conditionnelle dans un probleme de tirage.'),
      ('Mathematiques', 2024, 'Probabilites', 'Appliquer la formule de Bayes dans une situation simple.'),
      ('Mathematiques', 2022, 'Statistiques', 'Calculer la moyenne, la variance et l ecart-type d une serie statistique.'),
      ('Mathematiques', 2025, 'Statistiques', 'Interpreter un tableau statistique et conclure sur la tendance generale.'),
      ('Mathematiques', 2023, 'Suites numeriques', 'Determiner la nature d une suite numerique et son terme general.'),
      ('Mathematiques', 2024, 'Suites numeriques', 'Etudier la convergence d une suite definie par recurrence.'),
      ('Mathematiques', 2025, 'Nombres complexes', 'Mettre un nombre complexe sous forme algebrique puis calculer son module.'),
      ('Mathematiques', 2024, 'Nombres complexes', 'Resoudre une equation simple dans C et interpreter geometriquement.')
    ) AS t(subject_name, exam_year, topic_name, question_text)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM "exam_questions" q
      INNER JOIN "exams" e ON e.id = q."exam_id"
      WHERE e."subject" = rec.subject_name
        AND e."level" = CAST('NSIV' AS "AcademicLevel")
        AND q."topic" = rec.topic_name
        AND q."question_text" = rec.question_text
    ) THEN
      INSERT INTO "exams" ("subject", "year", "level")
      VALUES (rec.subject_name, rec.exam_year, CAST('NSIV' AS "AcademicLevel"))
      RETURNING "id" INTO new_exam_id;

      INSERT INTO "exam_questions" ("exam_id", "question_text", "topic")
      VALUES (new_exam_id, rec.question_text, rec.topic_name);
    END IF;
  END LOOP;
END $$;

-- Liaison des sujets de chimie avec les PDFs d annales disponibles
INSERT INTO probable_exercise_sources (subject, topic, file_name) VALUES
  ('Chimie', 'Ethanol', 'Chimie_2018_SVT-SMP_Ethanol.pdf'),
  ('Chimie', 'Ethanol', 'Chimie_2019_SVT-SMP_Ethanol.pdf'),
  ('Chimie', 'Ethanol', 'Chimie_2020_SVT-SMP_Éthanol-NS.pdf'),
  ('Chimie', 'Masse molaire', 'Chimie_2019_SES_Molaire.pdf'),
  ('Chimie', 'Masse molaire', 'Chimie_2020_SES_Molaire.pdf'),
  ('Chimie', 'Hydrocarbures', 'Chimie_2020_SES_Hydrocarbure.pdf'),
  ('Chimie', 'Hydrocarbures', 'Chimie_2020_SES_Carbure.pdf'),
  ('Chimie', 'Acides et bases', 'Chimie_2021_SVT-SMP_Acide.pdf'),
  ('Chimie', 'Acides et bases', 'Chimie_2021_SVT-SMP_Acétique.pdf'),
  ('Chimie', 'Oxydoreduction', 'Chimie_2021_SES-LLA_Redox.pdf'),
  ('Chimie', 'Structure atomique', 'Chimie_2022_SMP-SVT_Aston.pdf'),
  ('Chimie', 'Structure atomique', 'Chimie_2022_SMP-SVT_Altman.pdf'),
  ('Chimie', 'Liaison chimique', 'Chimie_2022_SMP-SVT_Bain.pdf'),
  ('Chimie', 'Liaison chimique', 'Chimie_2022_SMP-SVT_Barbier.pdf'),
  ('Chimie', 'Fonctions organiques', 'Chimie_2018_LLA_Organique.pdf'),
  ('Chimie', 'Fonctions organiques', 'Chimie_2022_SMP-SVT_Darcet.pdf')
ON CONFLICT DO NOTHING;
