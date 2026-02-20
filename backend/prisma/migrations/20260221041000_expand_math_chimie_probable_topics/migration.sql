DO $$
DECLARE
  rec RECORD;
  new_exam_id INTEGER;
BEGIN
  -- Renforcement Chimie (annales NSIV)
  FOR rec IN
    SELECT * FROM (VALUES
      ('Chimie', 2019, 'Ethanol', 'Donner la formule brute de l ethanol et preciser sa famille chimique.'),
      ('Chimie', 2020, 'Ethanol', 'Expliquer la difference entre ethanol et ether dans une nomenclature simple.'),
      ('Chimie', 2019, 'Fonctions organiques', 'Identifier la fonction organique dominante dans une formule donnee.'),
      ('Chimie', 2018, 'Fonctions organiques', 'Distinguer alcool, aldehyde et cetone a partir de groupes caracteristiques.'),
      ('Chimie', 2019, 'Masse molaire', 'Calculer la masse molaire d une molecule organique a partir des masses atomiques.'),
      ('Chimie', 2020, 'Masse molaire', 'Determiner la quantite de matiere connaissant masse et masse molaire.'),
      ('Chimie', 2020, 'Hydrocarbures', 'Classer un hydrocarbure en alcane, alcene ou alcyne.'),
      ('Chimie', 2022, 'Hydrocarbures', 'Ecrire la formule generale d un alcane et d un alcene.'),
      ('Chimie', 2021, 'Acides et bases', 'Identifier acide, base et sel dans une equation de neutralisation.'),
      ('Chimie', 2021, 'Acides et bases', 'Prevoir le pH approximatif d une solution acide et d une solution basique.'),
      ('Chimie', 2021, 'Oxydoreduction', 'Identifier l espece oxydee et l espece reduite dans une reaction redox.'),
      ('Chimie', 2021, 'Oxydoreduction', 'Equilibrer une demi-equation d oxydoreduction en milieu acide.'),
      ('Chimie', 2022, 'Structure atomique', 'Determiner le nombre de protons, neutrons et electrons d un atome.'),
      ('Chimie', 2022, 'Structure atomique', 'Comparer un atome neutre et son cation correspondant.'),
      ('Chimie', 2022, 'Liaison chimique', 'Differencier liaison covalente polaire et non polaire.'),
      ('Chimie', 2022, 'Liaison chimique', 'Expliquer la formation d une liaison ionique entre metal et non-metal.'),
      ('Chimie', 2019, 'Solutions et concentration', 'Calculer la concentration molaire d une solution preparee.'),
      ('Chimie', 2020, 'Solutions et concentration', 'Determiner le volume de solvant requis pour une dilution.'),
      ('Chimie', 2019, 'Monoxyde et oxydes', 'Donner les risques lies au monoxyde de carbone et une mesure preventive.'),
      ('Chimie', 2020, 'Monoxyde et oxydes', 'Distinguer monoxyde et dioxyde dans des formules chimiques simples.'),
      ('Chimie', 2019, 'Chimie organique appliquee', 'Relier amidon, glucose et lipides dans une approche biochimique de base.'),
      ('Chimie', 2021, 'Chimie organique appliquee', 'Identifier une reaction simple de transformation organique en laboratoire.'),
      ('Chimie', 2022, 'Isomerie', 'Reconnaitre deux isomeres ayant la meme formule brute.'),
      ('Chimie', 2020, 'Isomerie', 'Donner un exemple d isomerie de chaine pour un hydrocarbure simple.')
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

  -- Renforcement Mathematiques (sujets probables NSIV)
  FOR rec IN
    SELECT * FROM (VALUES
      ('Mathematiques', 2022, 'Algebre', 'Resoudre un systeme de deux equations lineaires a deux inconnues.'),
      ('Mathematiques', 2023, 'Algebre', 'Etudier le signe d un trinome du second degre.'),
      ('Mathematiques', 2024, 'Fonctions', 'Determiner les extremums d une fonction polynomiale sur un intervalle.'),
      ('Mathematiques', 2025, 'Fonctions', 'Tracer le tableau de variation d une fonction rationnelle simple.'),
      ('Mathematiques', 2023, 'Derivation', 'Calculer la derivee d un produit et d un quotient de fonctions.'),
      ('Mathematiques', 2024, 'Derivation', 'Utiliser la derivee pour determiner les intervalles de croissance.'),
      ('Mathematiques', 2022, 'Geometrie analytique', 'Trouver l equation d une droite passant par deux points.'),
      ('Mathematiques', 2024, 'Geometrie analytique', 'Calculer la pente d une droite et interpreter geometriquement.'),
      ('Mathematiques', 2023, 'Trigonometrie', 'Resoudre une equation trigonometrie simple sur [0, 2pi].'),
      ('Mathematiques', 2025, 'Trigonometrie', 'Appliquer les formules d addition des angles.'),
      ('Mathematiques', 2023, 'Probabilites', 'Calculer une probabilite d union avec la formule generale.'),
      ('Mathematiques', 2024, 'Probabilites', 'Construire un arbre de probabilite pour un tirage successif.'),
      ('Mathematiques', 2022, 'Statistiques', 'Determiner la mediane et le mode d une serie de donnees.'),
      ('Mathematiques', 2025, 'Statistiques', 'Interpreter un histogramme et conclure sur la dispersion.'),
      ('Mathematiques', 2023, 'Suites numeriques', 'Determiner si une suite est arithmetique ou geometrique.'),
      ('Mathematiques', 2024, 'Suites numeriques', 'Calculer la somme des n premiers termes d une suite geometrique.'),
      ('Mathematiques', 2025, 'Nombres complexes', 'Effectuer l addition et la multiplication de nombres complexes.'),
      ('Mathematiques', 2024, 'Nombres complexes', 'Utiliser la forme trigonometrie d un nombre complexe.'),
      ('Mathematiques', 2022, 'Logarithmes', 'Resoudre une equation impliquant des logarithmes.'),
      ('Mathematiques', 2023, 'Logarithmes', 'Simplifier une expression avec des proprietes logarithmiques.'),
      ('Mathematiques', 2024, 'Exponentielle', 'Resoudre une equation exponentielle elementaire.'),
      ('Mathematiques', 2025, 'Exponentielle', 'Etudier la variation d une fonction exponentielle composee.'),
      ('Mathematiques', 2023, 'Geometrie dans l espace', 'Calculer l angle entre deux vecteurs de l espace.'),
      ('Mathematiques', 2025, 'Geometrie dans l espace', 'Determiner l equation parametrique d une droite de l espace.')
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

INSERT INTO probable_exercise_sources (subject, topic, file_name) VALUES
  ('Chimie', 'Fonctions organiques', 'Chimie_2018_SES_Aldéhyde.pdf'),
  ('Chimie', 'Fonctions organiques', 'Chimie_2019_SES_Alcool.pdf'),
  ('Chimie', 'Fonctions organiques', 'Chimie_2019_SVT-SMP_Propène.pdf'),
  ('Chimie', 'Masse molaire', 'Chimie_2019_SES_Molaire.pdf'),
  ('Chimie', 'Masse molaire', 'Chimie_2020_SES_Molaire.pdf'),
  ('Chimie', 'Hydrocarbures', 'Chimie_2020_SES_Hydrocarbure.pdf'),
  ('Chimie', 'Hydrocarbures', 'Chimie_2020_SES_Carbure.pdf'),
  ('Chimie', 'Acides et bases', 'Chimie_2021_SVT-SMP_Acide.pdf'),
  ('Chimie', 'Acides et bases', 'Chimie_2021_SVT-SMP_Acétique.pdf'),
  ('Chimie', 'Oxydoreduction', 'Chimie_2021_SES-LLA_Redox.pdf'),
  ('Chimie', 'Solutions et concentration', 'Chimie_2019_SVT-SMP_Substance.pdf'),
  ('Chimie', 'Solutions et concentration', 'Chimie_2020_SVT-SMP_Sodium.pdf'),
  ('Chimie', 'Monoxyde et oxydes', 'Chimie_2019_SES_Monoxyde.pdf'),
  ('Chimie', 'Monoxyde et oxydes', 'Chimie_020_LLA_Dioxyde.pdf'),
  ('Chimie', 'Chimie organique appliquee', 'Chimie_2019_LLA_Glucose.pdf'),
  ('Chimie', 'Chimie organique appliquee', 'Chimie_2019_LLA_Lipide.pdf'),
  ('Chimie', 'Isomerie', 'Chimie_2020_LLA_Isomère.pdf'),
  ('Chimie', 'Liaison chimique', 'Chimie_2022_SMP-SVT_Barbier.pdf'),
  ('Chimie', 'Liaison chimique', 'Chimie_2022_SMP-SVT_Barton.pdf'),
  ('Chimie', 'Structure atomique', 'Chimie_2022_SMP-SVT_Aston.pdf'),
  ('Chimie', 'Structure atomique', 'Chimie_2022_SMP-SVT_Altman.pdf')
ON CONFLICT DO NOTHING;
