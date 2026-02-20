-- Evite les questions qui exigent un acces direct aux documents d annales.
-- Les reformulations ci-dessous restent auto-suffisantes pour l eleve.

UPDATE "Question"
SET
  "prompt" = 'La climatologie est principalement une branche de :',
  "explanation" = 'La climatologie etudie les climats et leurs variations.'
WHERE "prompt" = 'Parmi ces themes, lequel apparait explicitement dans les documents Hist-Geo 2022 ?';

UPDATE "Question"
SET
  "prompt" = 'Le mot "Revolution" renvoie d abord a un theme de :',
  "explanation" = 'En histoire, la revolution est une transformation politique et sociale majeure.'
WHERE "prompt" = 'Le mot "Revolution" dans les sujets Hist-Geo 2022 est d abord un theme de :';
