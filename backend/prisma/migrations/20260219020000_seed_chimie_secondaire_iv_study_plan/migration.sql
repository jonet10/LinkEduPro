WITH plan_data AS (
  SELECT * FROM (VALUES
    ('M1','Introduction a la chimie organique','Historique de la chimie organique, theorie de la force vitale, apport de Wohler, definition moderne de la chimie organique, importance des composes carbones et usages quotidiens.'),
    ('M2','Analyse elementaire qualitative et quantitative','Mise en evidence du carbone et de l''hydrogene, detection indirecte de l''oxygene, principes de l''analyse quantitative, pourcentages massiques et determination de la formule brute.'),
    ('M3','Structure, liaisons et chaines carbonees','Valence, electronegativite, liaisons ionique/covalente, representations moleculaires, chaines lineaires/ramifiees/cycliques, notion d''isomerie.'),
    ('M4','Hydrocarbures et nomenclature','Classification des alcanes, alcenes, alcynes et aromatiques, formules generales, regles de nomenclature, ecriture de formules semi-developpees et brutes.'),
    ('M5','Reactivite des hydrocarbures','Combustion, substitution, addition, hydrogenation, isomerisation et polymerisation avec applications sur methane, ethylene, acetylene et benzene.'),
    ('M6','Fonctions organiques oxygenees','Alcools, aldehydes, cetones, acides carboxyliques et esters: identification, proprietes essentielles et transformations entre fonctions (oxydation/reduction/esterification).'),
    ('M7','Eau, acido-basique et solutions','Autoprotolyse de l''eau, pH, relation [H3O+]/[OH-], neutralite, concentration molaire/normalite, dilutions et applications de calcul.'),
    ('M8','Avancement, oxydoreduction et electrochimie','Tableau d''avancement, nombre d''oxydation, equilibrage redox, couples oxydant/reducteur, bases de l''electrochimie et applications sur minerais.')
  ) AS t(code, title, description)
)
INSERT INTO "study_plans" ("level", "subject", "title", "description", "created_by_id")
SELECT
  CAST('Terminale' AS "EducationLevel"),
  'Chimie',
  CONCAT('Chimie NSIV - ', code, ' - ', title),
  description,
  NULL
FROM plan_data p
WHERE NOT EXISTS (
  SELECT 1
  FROM "study_plans" sp
  WHERE sp."level" = CAST('Terminale' AS "EducationLevel")
    AND sp."subject" = 'Chimie'
    AND sp."title" = CONCAT('Chimie NSIV - ', p.code, ' - ', p.title)
);
