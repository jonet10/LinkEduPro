WITH plan_data AS (
  SELECT * FROM (VALUES
    ('M1','Magnetisme et champ magnetique','Aimants, types et proprietes, loi de Coulomb magnetique, champ magnetique, vecteur induction B, champ terrestre et flux a travers une surface.'),
    ('M2','Electromagnetisme et champs crees par le courant','Experience d''Oersted, champ d''un fil rectiligne, d''une spire, d''un solenoide et d''une bobine torique, resistance d''une bobine et flux dans un enroulement.'),
    ('M3','Materiaux magnetiques et electro-aimants','Aimantation du fer et de l''acier, classification des materiaux magnetiques, intensite d''aimantation, temperature de Curie, permeabilite, electro-aimants et applications.'),
    ('M4','Action d''un champ magnetique sur un courant','Force electromagnetique (loi de Laplace), direction/sens (regle des trois doigts), applications, calcul et travail des forces electromagnetiques.'),
    ('M5','Action mutuelle des courants et galvanometre','Interaction de deux courants paralleles, cas meme sens/sens contraire, galvanometre a cadre mobile, couple electromagnetique, sensibilite et methode de Poggendorff.'),
    ('M6','Induction electromagnetique','Courant induit avec ou sans deplacement, roue de Faraday, sens du courant induit, force electromotrice d''induction, loi fondamentale de l''induction et applications.'),
    ('M7','Auto-induction et self-inductance','Inductance propre, influence du noyau de fer, fem auto-induite moyenne et instantanee, definition du Henry, constante de temps et energie electromagnetique.'),
    ('M8','Fem alternative et alternateurs','Production d''une fem alternative sinusoidale, relation e=Emax sin wt, role de N/B/S/w, alternateurs, relation frequence-vitesse et usages pratiques.'),
    ('M9','Condensateurs et champ electrique','Role du condensateur, charge/decharge, capacite, types, tension de claquage, energie stockee, champ entre armatures et groupements serie/parallele.'),
    ('M10','Courant alternatif sinusoidal','Definition du courant alternatif, alternance, periode, frequence, pulsation, valeurs instantanee/moyenne/efficace et interpretation des graphes sinusoides.'),
    ('M11','Circuits alternatifs en serie et dephasage','Appareils en AC, notion de dephasage et decalage horaire, diagramme de Fresnel, impedance, loi d''Ohm en alternatif, reactances inductive/capacitive et resonance serie.'),
    ('M12','Circuits alternatifs en parallele','Courants derives, lois de montage en parallele, loi des tensions, resonance en parallele, circuit bouchon, caracteristiques et applications pratiques.'),
    ('M13','Transformateurs','Principe, types de transformateurs, rapport de transformation, fonctionnement a vide/en charge, rendement et applications de transport/distribution de l''energie.')
  ) AS t(code, title, description)
)
INSERT INTO "study_plans" ("level", "subject", "title", "description", "created_by_id")
SELECT
  CAST('Terminale' AS "EducationLevel"),
  'Physique',
  CONCAT('Physique NSIV - ', code, ' - ', title),
  description,
  NULL
FROM plan_data p
WHERE NOT EXISTS (
  SELECT 1
  FROM "study_plans" sp
  WHERE sp."level" = CAST('Terminale' AS "EducationLevel")
    AND sp."subject" = 'Physique'
    AND sp."title" = CONCAT('Physique NSIV - ', p.code, ' - ', p.title)
);

UPDATE "study_plans"
SET "chapter_order" = CAST(SUBSTRING("title" FROM 'M([0-9]+)') AS INTEGER)
WHERE "subject" = 'Physique'
  AND "title" ~ 'M([0-9]|1[0-3])';

UPDATE "study_plans"
SET
  "notes" = CASE
    WHEN "chapter_order" = 1 THEN 'Objectifs:\n- Identifier les types et formes d''aimants.\n- Expliquer la loi de Coulomb magnetique.\n- Caracteriser le champ magnetique et le vecteur B.\n\nContenu:\n- Magnetisme, poles, region active/neutre.\n- Propriete des aimants et inseparabilite des poles.\n- Champ uniforme, spectre magnetique, flux.\n- Champ magnetique terrestre et applications simples.'
    WHEN "chapter_order" = 2 THEN 'Objectifs:\n- Relier courant electrique et champ magnetique.\n- Calculer B pour fil, spire, solenoide et tore.\n- Exploiter les resultats de l''experience d''Oersted.\n\nContenu:\n- Electromagnetisme de base.\n- Champs crees par conducteurs parcourus par courant.\n- Influence du nombre de spires et de la geometrie.\n- Flux a travers une bobine et resistance d''un enroulement.'
    WHEN "chapter_order" = 3 THEN 'Objectifs:\n- Distinguer aimantation du fer et de l''acier.\n- Classer les materiaux magnetiques.\n- Comprendre permeabilite et temperature de Curie.\n\nContenu:\n- Aimantation temporaire/permanente.\n- Intensite d''aimantation et permeabilite.\n- Electro-aimants: construction et usages.\n- Applications industrielles et scolaires.'
    WHEN "chapter_order" = 4 THEN 'Objectifs:\n- Appliquer la loi de Laplace.\n- Determiner direction et sens de la force electromagnetique.\n- Evaluer le travail des forces electromagnetiques.\n\nContenu:\n- Interaction champ B / conducteur parcouru par I.\n- Regle des trois doigts (main droite).\n- Calcul vectoriel simplifie de F.\n- Applications: moteurs, actionneurs, montages didactiques.'
    WHEN "chapter_order" = 5 THEN 'Objectifs:\n- Expliquer l''attraction/repulsion entre courants paralleles.\n- Calculer les forces mutuelles.\n- Decrire le fonctionnement du galvanometre.\n\nContenu:\n- Courants paralleles de meme sens et sens contraires.\n- Couple electromagnetique et couple de torsion.\n- Galvanometre a cadre mobile et a champ radial.\n- Sensibilite et methode de mesure de deviation.'
    WHEN "chapter_order" = 6 THEN 'Objectifs:\n- Definir le courant induit et l''induction electromagnetique.\n- Utiliser la loi de Faraday.\n- Prevoir le sens du courant induit.\n\nContenu:\n- Variation du flux et apparition de fem induite.\n- Roue de Faraday et experiences de base.\n- Formules de fem d''induction et interpretation.\n- Exercices d''application en circuits simples.'
    WHEN "chapter_order" = 7 THEN 'Objectifs:\n- Comprendre auto-induction et self-inductance.\n- Calculer L d''une bobine avec/sans noyau.\n- Utiliser la constante de temps dans un circuit RL.\n\nContenu:\n- Fem auto-induite moyenne et instantanee.\n- Definition du Henry et unites.\n- Energie magnetique stockee dans une bobine.\n- Analyse qualitative des regimes transitoires.'
    WHEN "chapter_order" = 8 THEN 'Objectifs:\n- Expliquer la generation d''une fem alternative.\n- Utiliser e=Emax sin wt et Emax=NBSw.\n- Relier frequence electrique et vitesse mecanique.\n\nContenu:\n- Cadre tournant dans un champ uniforme.\n- Alternateurs et structure fonctionnelle.\n- Parametres N, B, S, w et impact sur la tension.\n- Applications en production electrique.'
    WHEN "chapter_order" = 9 THEN 'Objectifs:\n- Decrire charge/decharge d''un condensateur.\n- Calculer capacite et energie.\n- Etudier le comportement en continu et alternatif.\n\nContenu:\n- Champ electrique entre armatures.\n- Types de condensateurs et tension limite.\n- Groupements serie/parallele.\n- Applications de filtrage et stockage temporaire.'
    WHEN "chapter_order" = 10 THEN 'Objectifs:\n- Caracteriser mathematiquement un courant alternatif.\n- Distinguer valeurs instantanee, moyenne et efficace.\n- Lire/interpreter des courbes sinusoidales.\n\nContenu:\n- Periode, frequence, pulsation et alternance.\n- Grandeurs I(t), U(t) et conventions usuelles.\n- Calculs pratiques sur signaux AC.\n- Applications domestiques et industrielles.'
    WHEN "chapter_order" = 11 THEN 'Objectifs:\n- Introduire le dephasage dans les circuits AC serie.\n- Construire un diagramme de Fresnel.\n- Calculer l''impedance et appliquer la loi d''Ohm en AC.\n\nContenu:\n- Reactance inductive et capacitive.\n- Circuits R, L, C et RLC serie.\n- Resonance serie et consequences.\n- Interpretation physique des dephasages.'
    WHEN "chapter_order" = 12 THEN 'Objectifs:\n- Analyser les montages AC en parallele.\n- Appliquer lois de tensions et courants derives.\n- Expliquer resonance parallele et circuit bouchon.\n\nContenu:\n- Conducteurs en derivation.\n- Proprietes et principes du montage parallele.\n- Caracteristiques du circuit bouchon.\n- Cas d''usage et limites pratiques.'
    WHEN "chapter_order" = 13 THEN 'Objectifs:\n- Expliquer le principe du transformateur.\n- Calculer rapport de transformation et rendement.\n- Distinguer fonctionnement a vide et en charge.\n\nContenu:\n- Enroulements primaire/secondaire et isolation.\n- Types de transformateurs (elevateur/abaisseur).\n- Pertes et rendement global.\n- Applications reseau et alimentation des appareils.'
    ELSE "notes"
  END,
  "exercises" = CASE
    WHEN "chapter_order" = 1 THEN '1) Definir magnetisme, aimant et champ magnetique.\n2) Expliquer pourquoi les poles d''un aimant sont inseparables.\n3) Enoncer la loi de Coulomb magnetique.\n4) Citer 3 proprietes d''un champ magnetique uniforme.'
    WHEN "chapter_order" = 2 THEN '1) Decrire l''experience d''Oersted et sa conclusion.\n2) Comparer le champ d''un fil rectiligne et d''une spire.\n3) Donner la relation de B dans un solenoide long.\n4) Expliquer l''influence du nombre de spires sur le flux.'
    WHEN "chapter_order" = 3 THEN '1) Distinguer materiau diamagnetique, paramagnetique et ferromagnetique.\n2) Expliquer la temperature de Curie.\n3) Donner deux applications d''un electro-aimant.\n4) Comparer aimantation du fer et de l''acier.'
    WHEN "chapter_order" = 4 THEN '1) Enoncer la loi de Laplace.\n2) Determiner le sens de la force avec la regle des trois doigts.\n3) Calculer F pour un conducteur de longueur L dans B avec courant I.\n4) Citer 2 applications technologiques de la force electromagnetique.'
    WHEN "chapter_order" = 5 THEN '1) Que se passe-t-il pour deux courants paralleles de meme sens ?\n2) Que se passe-t-il pour deux courants de sens contraires ?\n3) Definir le role d''un galvanometre a cadre mobile.\n4) Expliquer la notion de sensibilite d''un galvanometre.'
    WHEN "chapter_order" = 6 THEN '1) Definir induction electromagnetique et courant induit.\n2) Enoncer la loi de Faraday.\n3) Indiquer le sens du courant induit lors d''une augmentation du flux.\n4) Donner un exemple pratique de production de courant induit.'
    WHEN "chapter_order" = 7 THEN '1) Definir self-inductance.\n2) Donner l''expression de la fem auto-induite.\n3) Definir le Henry.\n4) Expliquer l''effet d''un noyau ferromagnetique sur l''inductance.'
    WHEN "chapter_order" = 8 THEN '1) Justifier l''origine sinusoidale d''une fem alternative.\n2) Donner la signification physique de Emax=NBSw.\n3) Relier frequence et vitesse de rotation d''un alternateur.\n4) Citer 2 usages des alternateurs.'
    WHEN "chapter_order" = 9 THEN '1) Definir capacite electrique et son unite.\n2) Expliquer charge et decharge d''un condensateur.\n3) Calculer la capacite equivalente de deux condensateurs en serie.\n4) Donner l''energie stockee dans un condensateur.'
    WHEN "chapter_order" = 10 THEN '1) Definir periode, frequence et pulsation.\n2) Distinguer valeur moyenne et valeur efficace.\n3) Tracer qualitativement un courant sinusoidal.\n4) Donner une application du courant alternatif.'
    WHEN "chapter_order" = 11 THEN '1) Definir dephasage.\n2) Construire un diagramme de Fresnel simple (R-L).\n3) Donner l''expression de l''impedance d''un circuit RLC serie.\n4) Expliquer la resonance serie.'
    WHEN "chapter_order" = 12 THEN '1) Donner les regles d''un montage en parallele.\n2) Expliquer la resonance parallele.\n3) Definir circuit bouchon et son interet.\n4) Donner une application d''un circuit en derivation.'
    WHEN "chapter_order" = 13 THEN '1) Definir transformateur elevateur et abaisseur.\n2) Donner le rapport de transformation ideal.\n3) Expliquer fonctionnement a vide vs en charge.\n4) Calculer un rendement simple de transformateur.'
    ELSE "exercises"
  END
WHERE "subject" = 'Physique'
  AND "level" = CAST('Terminale' AS "EducationLevel")
  AND "chapter_order" BETWEEN 1 AND 13;
