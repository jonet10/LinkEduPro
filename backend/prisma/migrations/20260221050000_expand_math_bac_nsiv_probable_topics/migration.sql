DO $$
DECLARE
  rec RECORD;
  new_exam_id INTEGER;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Mathematiques', 2022, 'Algebre avancee', 'Resoudre une inequation rationnelle et representer l ensemble solution.'),
      ('Mathematiques', 2023, 'Algebre avancee', 'Determiner les conditions d existence d une fraction algebrique.'),
      ('Mathematiques', 2024, 'Algebre avancee', 'Resoudre un systeme lineaire par la methode du determinant.'),
      ('Mathematiques', 2025, 'Algebre avancee', 'Etudier le rang d un systeme et conclure sur le nombre de solutions.'),

      ('Mathematiques', 2022, 'Polynomes', 'Verifier si un nombre est racine d un polynome puis factoriser.'),
      ('Mathematiques', 2023, 'Polynomes', 'Utiliser la division euclidienne pour decomposer un polynome.'),
      ('Mathematiques', 2024, 'Polynomes', 'Determiner les racines reelles d un polynome de degre 3 simple.'),
      ('Mathematiques', 2025, 'Polynomes', 'Etudier le signe d un polynome sur R a partir de sa factorisation.'),

      ('Mathematiques', 2022, 'Analyse fonctionnelle', 'Determiner les limites d une fonction en un point et a l infini.'),
      ('Mathematiques', 2023, 'Analyse fonctionnelle', 'Etudier la continuite d une fonction definie par morceaux.'),
      ('Mathematiques', 2024, 'Analyse fonctionnelle', 'Determiner les asymptotes d une fonction rationnelle.'),
      ('Mathematiques', 2025, 'Analyse fonctionnelle', 'Construire le tableau de variation a partir de la derivee premiere.'),

      ('Mathematiques', 2022, 'Derivees et tangentes', 'Ecrire l equation de la tangente a une courbe en un point donne.'),
      ('Mathematiques', 2023, 'Derivees et tangentes', 'Utiliser la derivee seconde pour etudier la convexite.'),
      ('Mathematiques', 2024, 'Derivees et tangentes', 'Determiner les points d inflexion d une fonction polynomiale.'),
      ('Mathematiques', 2025, 'Derivees et tangentes', 'Etudier les extremums locaux par le changement de signe de f prime.'),

      ('Mathematiques', 2022, 'Integrales', 'Calculer une integrale definie simple par primitives.'),
      ('Mathematiques', 2023, 'Integrales', 'Interpreter graphiquement une integrale comme aire algebrique.'),
      ('Mathematiques', 2024, 'Integrales', 'Utiliser l integration par parties sur un exemple elementaire.'),
      ('Mathematiques', 2025, 'Integrales', 'Resoudre un probleme de calcul d aire entre deux courbes.'),

      ('Mathematiques', 2022, 'Probabilites conditionnelles', 'Calculer P(A|B) et verifier la formule de Bayes.'),
      ('Mathematiques', 2023, 'Probabilites conditionnelles', 'Construire un arbre pondere puis deduire une probabilite composee.'),
      ('Mathematiques', 2024, 'Probabilites conditionnelles', 'Determiner si deux evenements sont independants.'),
      ('Mathematiques', 2025, 'Probabilites conditionnelles', 'Calculer une probabilite totale a partir de cas disjoints.'),

      ('Mathematiques', 2022, 'Statistiques inferentielles', 'Calculer moyenne, variance et ecart-type d une serie groupee.'),
      ('Mathematiques', 2023, 'Statistiques inferentielles', 'Lire une boite a moustaches et interpreter la dispersion.'),
      ('Mathematiques', 2024, 'Statistiques inferentielles', 'Determiner un coefficient de correlation sur un nuage de points.'),
      ('Mathematiques', 2025, 'Statistiques inferentielles', 'Etablir une droite de regression lineaire simple.'),

      ('Mathematiques', 2022, 'Suites et recurrence', 'Demontrer par recurrence une propriete sur une suite.'),
      ('Mathematiques', 2023, 'Suites et recurrence', 'Etudier la monotonie d une suite definie par recurrence.'),
      ('Mathematiques', 2024, 'Suites et recurrence', 'Determiner la limite d une suite geometrique et d une suite arithmetique.'),
      ('Mathematiques', 2025, 'Suites et recurrence', 'Calculer la somme partielle d une suite arithmetico-geometrique simple.'),

      ('Mathematiques', 2022, 'Geometrie vectorielle', 'Calculer le produit scalaire et en deduire un angle.'),
      ('Mathematiques', 2023, 'Geometrie vectorielle', 'Verifier l alignement de trois points avec des vecteurs.'),
      ('Mathematiques', 2024, 'Geometrie vectorielle', 'Determiner l equation cartesienne d une droite dans le plan.'),
      ('Mathematiques', 2025, 'Geometrie vectorielle', 'Etudier la perpendicularite de deux droites via leurs vecteurs directeurs.'),

      ('Mathematiques', 2022, 'Trigonometrie avancee', 'Resoudre sin(x)=a et cos(x)=b sur un intervalle donne.'),
      ('Mathematiques', 2023, 'Trigonometrie avancee', 'Transformer une somme trigonometrie en produit.'),
      ('Mathematiques', 2024, 'Trigonometrie avancee', 'Utiliser la formule de Moivre pour calculer une puissance.'),
      ('Mathematiques', 2025, 'Trigonometrie avancee', 'Determiner les solutions d une equation du type a sin(x)+b cos(x)=c.'),

      ('Mathematiques', 2022, 'Complexes avancees', 'Passer de la forme algebrique a la forme exponentielle.'),
      ('Mathematiques', 2023, 'Complexes avancees', 'Calculer l argument principal d un nombre complexe non nul.'),
      ('Mathematiques', 2024, 'Complexes avancees', 'Resoudre z^2 + az + b = 0 dans C.'),
      ('Mathematiques', 2025, 'Complexes avancees', 'Interpreter geometriquement la multiplication de nombres complexes.')
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
