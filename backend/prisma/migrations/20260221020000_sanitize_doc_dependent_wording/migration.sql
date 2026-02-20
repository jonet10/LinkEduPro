-- Nettoyage global des formulations dependantes des documents sources
-- afin que les questions soient autonomes pour tous les eleves.

UPDATE "Subject"
SET "description" = 'Quiz d entrainement Hist-Géo centres sur les notions officielles du programme NSIV.'
WHERE "name" = 'Histoire-Geographie NSIV'
  AND "description" ILIKE '%documents Hist-Geo%';

UPDATE "Question"
SET "prompt" = 'La climatologie est principalement une branche de :'
WHERE "prompt" = 'Parmi ces themes, lequel apparait explicitement dans les documents Hist-Geo 2022 ?';

UPDATE "Question"
SET "prompt" = 'Le mot "Revolution" renvoie d abord a un theme de :'
WHERE "prompt" = 'Le mot "Revolution" dans les sujets Hist-Geo 2022 est d abord un theme de :';

UPDATE "Question"
SET "prompt" = 'Le theme "Population" est classe en general dans :'
WHERE "prompt" = 'Le theme "Population" dans les sujets Hist-Geo est classe en general dans :';

UPDATE "Question"
SET "prompt" = 'Le theme "Dessalines" renvoie surtout a :'
WHERE "prompt" = 'Le theme "Dessalines" dans les annales renvoie surtout a :';

UPDATE "Question"
SET "prompt" = 'Le "developpement" en Hist-Géo est souvent lie a :'
WHERE "prompt" = 'Le "developpement" dans les sujets Hist-Géo est souvent lie a :';

-- Explications reformulees sans dependance aux dossiers/fichiers.
UPDATE "Question"
SET "explanation" = 'La climatologie etudie les climats et leurs variations.'
WHERE "explanation" = 'Le dossier contient un sujet intitule "Climatologie".';

UPDATE "Question"
SET "explanation" = 'Theme important de l histoire d Haiti.'
WHERE "explanation" = 'Theme historique present dans le dossier.';

UPDATE "Question"
SET "explanation" = 'Notion geographique fondamentale.'
WHERE "explanation" = 'Notion geographique presente dans les fichiers.';

UPDATE "Question"
SET "explanation" = 'Theme recurrent des programmes d histoire-geographie.'
WHERE "explanation" = 'Theme recurrent observe dans les annales.';

UPDATE "Question"
SET "explanation" = 'Theme central de philosophie morale.'
WHERE "explanation" = 'Theme explicite des documents 2022.';

UPDATE "Question"
SET "explanation" = 'Question liee a un auteur classique de philosophie politique.'
WHERE "explanation" = 'Theme auteur observe dans les fichiers.';

UPDATE "Question"
SET "explanation" = 'Question liee a un auteur majeur du programme de philosophie.'
WHERE "explanation" = 'Theme auteur present dans les documents.';

UPDATE "Question"
SET "explanation" = 'Question classique sur un auteur de la philosophie antique.'
WHERE "explanation" = 'Theme auteur dans dossiers LLA-SES.';

UPDATE "Question"
SET "explanation" = 'Theme geologique recurrent au niveau NSIV.'
WHERE "explanation" = 'Theme 2018/2019 dans vos fichiers.';

UPDATE "Question"
SET "explanation" = 'Theme central du programme SVT.'
WHERE "explanation" = 'Theme explicite dans les fichiers d examens passes.';

UPDATE "Question"
SET "explanation" = 'Question de base en immunologie.'
WHERE "explanation" = 'Reference au theme Anticorps observe dans les fichiers.';

UPDATE "Question"
SET "explanation" = 'Notion de metabolisme frequente en SVT.'
WHERE "explanation" = 'Theme Glucogene present dans les sujets SVT 2022.';

UPDATE "Question"
SET "explanation" = 'Theme important de biologie evolutive.'
WHERE "explanation" = 'Theme explicite dans les fichiers SVT.';

UPDATE "Question"
SET "explanation" = 'Theme geologique important du programme.'
WHERE "explanation" = 'Theme SES-SMP 2022 observe dans les documents.';

UPDATE "Question"
SET "explanation" = 'Notion de morphologie biologique.'
WHERE "explanation" = 'Theme Morphologie present dans les documents SVT.';
