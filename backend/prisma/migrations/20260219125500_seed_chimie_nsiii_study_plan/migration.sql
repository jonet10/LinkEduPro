WITH plan_data AS (
  SELECT * FROM (VALUES
    ('M1','Rappel valence et nomenclature des composes','Valence/electrovalence, elements mono-di-tri-tetravalents, elements polyvalents, regle d''echange des valences et ecriture correcte des formules chimiques.'),
    ('M2','Unites et facteurs de conversion','Prefixes (kilo a peta), conversions de volume, masse, temperature, pression et rappels de constantes utiles pour les calculs en chimie.'),
    ('M3','Masse atomique, numero atomique et symboles','Lecture du tableau des elements usuels, interpretation de Z et A, usage des symboles internationaux et exploitation des donnees atomiques.'),
    ('M4','Matiere, solutions et concentrations','Etats de la matiere, melanges, dissolution, concentration molaire/normalite, dilution, electroneutralite et applications de calcul.'),
    ('M5','Fonctions chimiques minerales et acido-basique','Fonctions acide/base, theories d''Arrhenius-Bronsted-Lewis, pH, couples acido-basiques, amphoterie et reactions de neutralisation.'),
    ('M6','Etude des metaux, alliages, minerais et metallurgie','Proprietes chimiques des metaux, oxydation/reduction, extraction metallurgique, minerais, grillage, reduction et bilans de rendement.'),
    ('M7','Introduction a la chimie organique et fonctions','Historique (force vitale, Wohler), definition moderne, caracteristiques des composes organiques, groupements fonctionnels et isomerie.'),
    ('M8','Composes organiques oxygenes et azotes','Fonctions oxygenes et azotees (alcools, aldehydes, cetones, acides, esters, amines, amides), nomenclature de base et transformations usuelles.')
  ) AS t(code, title, description)
)
INSERT INTO "study_plans" ("level", "subject", "title", "description", "created_by_id")
SELECT
  CAST('NS3' AS "EducationLevel"),
  'Chimie',
  CONCAT('Chimie NSIII - ', code, ' - ', title),
  description,
  NULL
FROM plan_data p
WHERE NOT EXISTS (
  SELECT 1
  FROM "study_plans" sp
  WHERE sp."level" = CAST('NS3' AS "EducationLevel")
    AND sp."subject" = 'Chimie'
    AND sp."title" = CONCAT('Chimie NSIII - ', p.code, ' - ', p.title)
);

UPDATE "study_plans"
SET "chapter_order" = CAST(SUBSTRING("title" FROM 'M([0-9]+)') AS INTEGER)
WHERE "subject" = 'Chimie'
  AND "level" = CAST('NS3' AS "EducationLevel")
  AND "title" ~ 'M[1-8]';

UPDATE "study_plans"
SET
  "notes" = CASE
    WHEN "chapter_order" = 1 THEN 'Objectifs:\n- Maitriser valence et electrovalence.\n- Classer les elements par valence.\n- Ecrire les formules avec la regle d''echange des valences.\n\nContenu:\n- Valence dans les liaisons covalentes et ioniques.\n- Elements polyvalents (Fe, Cu, Pb...).\n- Nomenclature simple des composes binaires.\n- Verification de formules correctes/incorrectes.'
    WHEN "chapter_order" = 2 THEN 'Objectifs:\n- Utiliser correctement les unites en chimie.\n- Effectuer des conversions de masse, volume, temperature.\n- Manipuler les facteurs multiplicatifs et puissances de 10.\n\nContenu:\n- Prefixes SI et tableaux de conversion.\n- Relations litre/dm3/cm3 et tonne/kg/g.\n- Conversion degre C, degre F, K.\n- Introduction aux constantes et formules de calcul.'
    WHEN "chapter_order" = 3 THEN 'Objectifs:\n- Lire les informations atomiques de base.\n- Relier symbole, masse atomique et numero atomique.\n- Exploiter les donnees atomiques dans les exercices.\n\nContenu:\n- Tableau des elements usuels.\n- Signification physique de Z et A.\n- Symboles internationaux et conventions d''ecriture.\n- Application aux calculs de masse molaire.'
    WHEN "chapter_order" = 4 THEN 'Objectifs:\n- Definir matiere, melange, solution et solute.\n- Calculer concentration molaire, normalite et concentration massique.\n- Resoudre des exercices de dilution et electroneutralite.\n\nContenu:\n- Etats de la matiere et proprietes.\n- Dissolution et concentrations ioniques.\n- Facteur de dilution et preparation de solutions.\n- Bilan de charges dans les solutions electrolytiques.'
    WHEN "chapter_order" = 5 THEN 'Objectifs:\n- Distinguer acides et bases selon plusieurs theories.\n- Utiliser le pH et les couples acido-basiques.\n- Ecrire des reactions de neutralisation et transfert de proton.\n\nContenu:\n- Arrhenius, Bronsted-Lowry, Lewis.\n- Ions H3O+ / OH- et echelle pH.\n- Couples conjugues et amphoterie de l''eau.\n- Exercices de classement et d''equilibrage acido-basique.'
    WHEN "chapter_order" = 6 THEN 'Objectifs:\n- Expliquer les reactions des metaux avec l''air, l''eau et les acides.\n- Introduire alliages, minerais et procedes metallurgiques.\n- Resoudre des problemes de rendement et bilans matiere.\n\nContenu:\n- Oxydation des metaux et passivation.\n- Minerais, gangue, grillage, reduction.\n- Aluminothermie et extraction des metaux.\n- Applications numeriques en metallurgie.'
    WHEN "chapter_order" = 7 THEN 'Objectifs:\n- Situer la naissance de la chimie organique moderne.\n- Definir compose organique et exceptions carbonees.\n- Reconnaitre les grands groupements fonctionnels et isomerie.\n\nContenu:\n- Force vitale et synthese de Wohler.\n- Caracteristiques des composes organiques.\n- Domaines d''application (medicaments, plastiques, carburants).\n- Introduction aux fonctions et a la nomenclature.'
    WHEN "chapter_order" = 8 THEN 'Objectifs:\n- Identifier les fonctions oxygenes et azotees courantes.\n- Nommer les composes simples associes.\n- Relier fonction chimique et reactivite de base.\n\nContenu:\n- Alcools, aldehydes, cetones, acides, esters.\n- Amines, amides et notions de base azotee.\n- Ecriture de structures simples.\n- Exercices de reconnaissance et de transformation elementaire.'
    ELSE "notes"
  END,
  "exercises" = CASE
    WHEN "chapter_order" = 1 THEN '1) Donner la valence de H, O, N, Ca, Al.\n2) Ecrire les formules de: chlorure de calcium, oxyde de fer(III), sulfure de cuivre(II).\n3) Corriger les formules fausses proposees en classe.\n4) Expliquer la difference valence/electrovalence.'
    WHEN "chapter_order" = 2 THEN '1) Convertir: 2,5 L en cm3; 750 mL en L; 1,2 tonne en kg.\n2) Convertir 25 degre C en K et degre F.\n3) Utiliser les prefixes pour ecrire 0,003 kg en g et mg.\n4) Resoudre un exercice combine masse-volume-concentration.'
    WHEN "chapter_order" = 3 THEN '1) Donner Z et A pour 5 elements usuels.\n2) Calculer la masse molaire de H2SO4, Na2CO3, Ca(OH)2.\n3) Associer nom/symbole de 10 elements.\n4) Expliquer l''interet des symboles internationaux.'
    WHEN "chapter_order" = 4 THEN '1) Calculer C d''une solution de NaCl (m, V donnes).\n2) Trouver le facteur de dilution entre C1 et C2.\n3) Ecrire une equation d''electroneutralite a partir d''ions donnes.\n4) Determiner [cation] ou [anion] manquant dans une solution.'
    WHEN "chapter_order" = 5 THEN '1) Identifier acide/base dans 5 reactions donnees.\n2) Donner les couples conjugues de HCl, NH4+, H2CO3, HSO4-.\n3) Determiner la nature acide/neutre/basique selon le pH.\n4) Ecrire une reaction de neutralisation et nommer le sel forme.'
    WHEN "chapter_order" = 6 THEN '1) Equilibrer des reactions d''oxydation de metaux.\n2) Distinguer oxydation rapide et lente selon les cas.\n3) Calculer une masse de minerai pour obtenir une masse de metal pur.\n4) Resoudre un bilan de rendement metallurgique.'
    WHEN "chapter_order" = 7 THEN '1) Resumer l''apport de Wohler dans l''histoire de la chimie organique.\n2) Classer des composes en organique/inorganique (avec exceptions).\n3) Citer 5 caracteristiques des composes organiques.\n4) Donner des exemples d''applications de la chimie organique.'
    WHEN "chapter_order" = 8 THEN '1) Identifier la fonction de 10 molecules simples.\n2) Nommer 5 composes oxygenes et 5 azotes simples.\n3) Donner un exemple de transformation alcool -> aldehyde -> acide.\n4) Distinguer amine et amide par la structure.'
    ELSE "exercises"
  END
WHERE "subject" = 'Chimie'
  AND "level" = CAST('NS3' AS "EducationLevel")
  AND "chapter_order" BETWEEN 1 AND 8;
