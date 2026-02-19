DO $$
DECLARE
  rec RECORD;
  new_exam_id INTEGER;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Fhysique_Philo_2022_Philo-C-D.pdf', 2022, 'Revision generale'),
      ('physique-2020-SVT-regression-.pdf', 2020, 'Regression lineaire'),
      ('physique-2021-Bac-Permanent-.pdf', 2021, 'Revision generale'),
      ('Physique-2021-svt-SMP-Armaturo.pdf', 2021, 'Armature de condensateur'),
      ('Physique-2025.pdf', 2025, 'Revision generale'),
      ('Physique-modele-examen (1).pdf', 2022, 'Modele d examen'),
      ('Physique-NS4-mecanique-decembre-2025.pdf', 2025, 'Mecanique'),
      ('Physique-NS4-SMP-SVT-Entropie.pdf', 2022, 'Entropie'),
      ('Physique-SMP-SVT-Vitesse.pdf', 2022, 'Vitesse'),
      ('Physique_2015_SVT-SMP_Photon.pdf', 2015, 'Photon'),
      ('Physique_2016_SVT-SMP_Phytophage.pdf', 2016, 'Phytophage'),
      ('Physique_2016_SVT-SMP_Phytotron.pdf', 2016, 'Phytotron'),
      ('Physique_2018_SVT-SMP_Dipole.pdf', 2018, 'Dipole electrique'),
      ('Physique_2019_SES_Cinetique.pdf', 2019, 'Cinetique'),
      ('Physique_2019_SES_Impedance.pdf', 2019, 'Impedance'),
      ('Physique_2019_SVT-SMP_Aimantation.pdf', 2019, 'Aimantation'),
      ('Physique_2019_SVT-SMP_Condensateur-1.pdf', 2019, 'Condensateur'),
      ('Physique_2019_SVT-SMP_Induction-1.pdf', 2019, 'Induction electromagnetique'),
      ('Physique_2019_SVT-SMP_Transformateur.pdf', 2019, 'Transformateur'),
      ('Physique_2020_SVT-SMP_Regression-Bacc-Copy.pdf', 2020, 'Regression lineaire'),
      ('Physique_2020_SVT-SMP_Tangente.pdf', 2020, 'Methode de la tangente'),
      ('Physique_2021_SES_Bobine-Bacc-Copy.pdf', 2021, 'Bobine'),
      ('Physique_2021_SVT-SMP_Armature-Bacc.pdf', 2021, 'Armature de condensateur'),
      ('Physique_2021_SVT-SMP_Barlow.pdf', 2021, 'Roue de Barlow'),
      ('Physique_2022_SES_Big-bang.pdf', 2022, 'Big Bang'),
      ('Physique_2022_SES_Cosmique.pdf', 2022, 'Rayonnement cosmique'),
      ('Physique_2022_SES_Electromagnetisme.pdf', 2022, 'Electromagnetisme'),
      ('Physique_2022_SES_Englert.pdf', 2022, 'Englert'),
      ('Physique_2022_SES_Etoile.pdf', 2022, 'Etoiles'),
      ('Physique_2022_SES_Gravite.pdf', 2022, 'Gravite'),
      ('Physique_2022_SES_Kajita.pdf', 2022, 'Kajita'),
      ('Physique_2022_SES_Marconi.pdf', 2022, 'Marconi et ondes'),
      ('Physique_2022_SES_Oncle.pdf', 2022, 'Effet Oncle'),
      ('Physique_2022_SES_Perl.pdf', 2022, 'Perl'),
      ('Physique_2022_SES_Picard.pdf', 2022, 'Picard'),
      ('Physique_2022_SMP-SVT-Curien.pdf', 2022, 'Curien'),
      ('Physique_2022_SMP-SVT-Heiseiberg.pdf', 2022, 'Heisenberg'),
      ('Physique_2022_SMP-SVT-Schrodinger-1.pdf', 2022, 'Schrodinger'),
      ('Physique_2022_SMP-SVT_Becquerel.pdf', 2022, 'Becquerel'),
      ('Physique_2022_SMP-SVT_Charpak-1.pdf', 2022, 'Charpak'),
      ('Physique_2022_SMP-SVT_Laroche.pdf', 2022, 'Revision generale'),
      ('Physique_2022_SMP-SVT_Wineland-1.pdf', 2022, 'Wineland'),
      ('Physique_2022_SMP-SVT_Wineland_b-1.pdf', 2022, 'Wineland'),
      ('Physique_2022_SVT-SMP_GPS.pdf', 2022, 'GPS et relativite'),
      ('Physique_2022_SVT-SMP_Lumiere.pdf', 2022, 'Lumiere'),
      ('Physique_2022_SVT-SMP_Plasma.pdf', 2022, 'Plasma'),
      ('Physique_2022_SVT-SMP_Polymeres.pdf', 2022, 'Polymeres'),
      ('Physique_2022_SVT-SMP_Quanta.pdf', 2022, 'Quanta'),
      ('Physique_2022_SVT-SMP_Vitesse.pdf', 2022, 'Vitesse'),
      ('Physiques-NS4-2014-2016-2018.pdf', 2014, 'Revision generale')
    ) AS t(source_file, exam_year, topic)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM "exam_questions" q
      WHERE q."question_text" = rec.source_file
        AND q."topic" = rec.topic
    ) THEN
      INSERT INTO "exams" ("subject", "year", "level")
      VALUES ('Physique', rec.exam_year, CAST('NSIV' AS "AcademicLevel"))
      RETURNING "id" INTO new_exam_id;

      INSERT INTO "exam_questions" ("exam_id", "question_text", "topic")
      VALUES (new_exam_id, rec.source_file, rec.topic);
    END IF;
  END LOOP;
END $$;
