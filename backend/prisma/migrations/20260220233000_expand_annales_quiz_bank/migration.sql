DO $$
DECLARE
  physique_id INTEGER;
  chimie_id INTEGER;
  svt_id INTEGER;
  histgeo_id INTEGER;
BEGIN
  SELECT "id" INTO physique_id FROM "Subject" WHERE "name" = 'Physique - Annales MENFP (Entrainement)' LIMIT 1;
  SELECT "id" INTO chimie_id FROM "Subject" WHERE "name" = 'Chimie - Annales MENFP (Entrainement)' LIMIT 1;
  SELECT "id" INTO svt_id FROM "Subject" WHERE "name" = 'SVT - Annales MENFP (Entrainement)' LIMIT 1;
  SELECT "id" INTO histgeo_id FROM "Subject" WHERE "name" = 'Histoire-Geographie - Annales MENFP (Entrainement)' LIMIT 1;

  IF physique_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT physique_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Dans un circuit resistif pur en alternatif, la tension et le courant sont :', '["En phase","En opposition de phase","Toujours en quadrature","Sans relation fixe"]', 0, 'Question de cours tres frequente.', 'AC'),
        ('Dans une inductance pure, la tension est :', '["En avance de phase sur le courant","En retard de phase","En phase","Toujours nulle"]', 0, 'Question classique sur bobine ideale.', 'AC'),
        ('Dans un condensateur ideal, le courant est :', '["En avance de phase sur la tension","En retard de phase","En phase","Toujours nul"]', 0, 'Question recurrente des annales.', 'AC'),
        ('La capacite equivalente de deux condensateurs en parallele est :', '["La somme des capacites","L inverse de la somme","Toujours inferieure a la plus petite","Egale a zero"]', 0, 'Regle de montage fondamentale.', 'Condensateur'),
        ('La capacite equivalente de deux condensateurs en serie est :', '["Inferieure a la plus petite","Egale a la somme","Superieure a la plus grande","Toujours egale a 1 F"]', 0, 'Regle de montage serie.', 'Condensateur'),
        ('La force de Laplace sur un conducteur parcouru par un courant dans B est proportionnelle a :', '["B, I, L et sin(theta)","B uniquement","I uniquement","L uniquement"]', 0, 'Formule F = BIL sin(theta).', 'Magnetisme'),
        ('Un champ magnetique uniforme possede des lignes de champ :', '["Paralleles et equidistantes","Concourantes","Toujours circulaires","Toujours aleatoires"]', 0, 'Definition du champ uniforme.', 'Magnetisme'),
        ('En chute libre ideale, l energie mecanique d un systeme :', '["Se conserve","Disparait","Augmente toujours","Devient nulle"]', 0, 'Hors frottements: conservation.', 'Mecanique'),
        ('Au sommet d un lancer vertical vers le haut, la vitesse est :', '["Nulle instantanement","Maximale","Toujours egale a g","Toujours negative"]', 0, 'Resultat classique de cinematique.', 'Mecanique'),
        ('La quantite de mouvement d un corps est donnee par :', '["p = m*v","p = m/g","p = v/m","p = m+v"]', 0, 'Definition de base.', 'Mecanique'),
        ('Le travail d une force est nul si la force est :', '["Perpendiculaire au deplacement","Parallele au deplacement","Dans le meme sens","Toujours opposee"]', 0, 'W = F*d*cos(theta).', 'Mecanique'),
        ('Un phenomene de resonance dans un RLC serie correspond a :', '["Impedance minimale et courant maximal","Impedance maximale","Courant nul","Frequence nulle"]', 0, 'Condition de resonance serie.', 'RLC')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" e WHERE e."subjectId" = physique_id AND e."prompt" = q.prompt
    );
  END IF;

  IF chimie_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT chimie_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Un ion est un atome ou groupe d atomes qui :', '["A gagne ou perdu des electrons","A perdu son noyau","Est toujours neutre","Ne peut pas reagir"]', 0, 'Definition de base.', 'Ions'),
        ('La formule de l ion chlorure est :', '["Cl-","Cl+","Cl2-","Cl2+"]', 0, 'Ion monoatomique courant.', 'Ions'),
        ('Le reactif limitant dans une reaction est celui qui :', '["Est totalement consomme en premier","Reste en exces","Ne reagit pas","Accelere la reaction"]', 0, 'Concept central des bilans.', 'Stoichiometrie'),
        ('Une mole contient environ :', '["6,02 x 10^23 entites","6,02 x 10^3 entites","6,02 x 10^12 entites","6,02 x 10^30 entites"]', 0, 'Constante d Avogadro.', 'Quantite de matiere'),
        ('La concentration molaire C est egale a :', '["n/V","m/V","V/n","M/V"]', 0, 'Definition de la concentration molaire.', 'Solutions'),
        ('Une neutralisation acide-base produit generalement :', '["Un sel et de l eau","Un metal pur","Un gaz noble","Un hydrocarbure"]', 0, 'Schema reactionnel classique.', 'Acido-basique'),
        ('Le pH d une solution basique est :', '["Superieur a 7","Inferieur a 7","Toujours egal a 7","Toujours egal a 14"]', 0, 'Echelle de pH.', 'Acido-basique'),
        ('Une reaction endothermique :', '["Absorbe de l energie","Libere de l energie","N implique pas d energie","Detruit la masse"]', 0, 'Definition thermique.', 'Thermochimie'),
        ('Un hydrocarbure est un compose contenant :', '["Carbone et hydrogene","Oxygene uniquement","Azote uniquement","Sodium et chlore"]', 0, 'Definition organique de base.', 'Chimie organique'),
        ('Le groupe fonctionnel des alcools est :', '["-OH","-COOH","-CHO","-NH2"]', 0, 'Reconnaissance des fonctions.', 'Chimie organique'),
        ('Une oxydation d un alcool primaire peut conduire a :', '["Un aldehyde","Un ester directement","Un alcane","Un amide"]', 0, 'Transformation organique classique.', 'Chimie organique'),
        ('La conservation de la charge en equation ionique signifie :', '["Somme des charges identique des deux cotes","Charge disparait","Charge creee spontanement","Charge double toujours"]', 0, 'Regle d equilibrage.', 'Equilibrage')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" e WHERE e."subjectId" = chimie_id AND e."prompt" = q.prompt
    );
  END IF;

  IF svt_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT svt_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('La mitose produit en general :', '["Deux cellules filles genetiquement identiques","Quatre gametes","Une seule cellule","Des cellules toujours haploides"]', 0, 'Cycle cellulaire standard.', 'Cytologie'),
        ('La meiose conduit a :', '["Une reduction du nombre de chromosomes","Une duplication illimitee","Aucune variation","Une absence de division"]', 0, 'Production des gametes.', 'Genetique'),
        ('Le chromosome est principalement constitue de :', '["ADN et proteins","Lipides et glucides","Calcium et fer","Eau uniquement"]', 0, 'Structure nucleaire.', 'Genetique'),
        ('Un allele recessif s exprime au phenotype lorsqu il est :', '["A l etat homozygote","Toujours dominant","Toujours heterozygote","Lie uniquement au sexe"]', 0, 'Regle mendelienne.', 'Genetique'),
        ('Le systeme nerveux central comprend :', '["Encéphale et moelle epiniere","Nerfs uniquement","Muscles uniquement","Glandes endocrines uniquement"]', 0, 'Organisation nerveuse.', 'Neurosciences'),
        ('L hormone ocytocine est surtout associee a :', '["Contractions uterines et reflexe d ejection du lait","Digestion des lipides","Vision nocturne","Conduction nerveuse"]', 0, 'Theme observe dans annales SVT 2021.', 'Endocrinologie'),
        ('La prolactine intervient principalement dans :', '["La production lactee","La coagulation du sang","La croissance osseuse uniquement","L immunite anti-virale directe"]', 0, 'Question hormonale recurrente.', 'Endocrinologie'),
        ('Un seisme est cause principalement par :', '["La rupture brutale de roches le long d une faille","La photosynthese","La mitose","La respiration cellulaire"]', 0, 'Theme SES-SMP 2022.', 'Geologie'),
        ('Le terme "gisement" en geologie designe :', '["Une concentration exploitable d une ressource","Un type de cellule","Une hormone","Un tissu epitheial"]', 0, 'Theme 2018/2019 dans vos fichiers.', 'Geologie'),
        ('Les vitamines sont essentielles car elles :', '["Participent au bon fonctionnement metabolique","Sont la seule source d energie","Remplacent l eau","Sont des organes"]', 0, 'Theme vitamines 2022.', 'Nutrition'),
        ('En immunologie, un antigenes est :', '["Une substance reconnue comme etrangere","Un type de neurone","Un os long","Une enzyme digestive seulement"]', 0, 'Lie aux themes anticorps.', 'Immunologie'),
        ('La biodiversite peut etre preservee par :', '["La conservation des habitats","La destruction des ecosystèmes","La surexploitation","La pollution non controlee"]', 0, 'Theme conservation 2022.', 'Ecologie')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" e WHERE e."subjectId" = svt_id AND e."prompt" = q.prompt
    );
  END IF;

  IF histgeo_id IS NOT NULL THEN
    INSERT INTO "Question" ("subjectId", "prompt", "options", "correctOption", "explanation", "isPremium", "frequencyScore", "sourceTopic", "createdAt", "updatedAt")
    SELECT histgeo_id, q.prompt, q.options::jsonb, q.correct_option, q.explanation, FALSE, 0, q.source_topic, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      VALUES
        ('Une latitude mesure :', '["La distance angulaire par rapport a l equateur","La distance a Greenwich","La hauteur d une montagne","La profondeur d un ocean"]', 0, 'Notion geographique de base.', 'Geographie'),
        ('La longitude se compte a partir de :', '["Le meridien de Greenwich","L equateur","Le tropique du Cancer","Le cercle polaire"]', 0, 'Reference cartographique standard.', 'Geographie'),
        ('La cartographie est la science :', '["Des cartes","Des molecules","Des ondes","Des genomes"]', 0, 'Definition classique.', 'Cartographie'),
        ('La revolution haitienne debute en :', '["1791","1789","1804","1815"]', 0, 'Repere historique fondamental.', 'Histoire d Haiti'),
        ('L independance d Haiti est proclamee en :', '["1804","1791","1825","1789"]', 0, 'Date majeure du programme.', 'Histoire d Haiti'),
        ('Un Etat souverain se caracterise notamment par :', '["Un territoire, une population et un pouvoir","Une monnaie unique seulement","Une langue unique obligatoire","Une religion unique"]', 0, 'Notion de science politique et geographie.', 'Geopolitique'),
        ('La demographie etudie les variations de :', '["Population","Temperature","Vitesse des plaques","Potentiel electrique"]', 0, 'Definition demographique.', 'Demographie'),
        ('L urbanisation correspond a :', '["La croissance de la population urbaine","La baisse des villes","La disparition des routes","La fin des activites economiques"]', 0, 'Theme recurrent de geographie humaine.', 'Geographie humaine'),
        ('Une migration est dite interne lorsqu elle se fait :', '["A l interieur d un meme pays","Entre deux continents uniquement","Du rural au rural seulement","Sans deplacement geographique"]', 0, 'Classification des migrations.', 'Population'),
        ('Le developpement durable vise a concilier :', '["Economie, social et environnement","Uniquement economie","Uniquement environnement","Uniquement industrie"]', 0, 'Cadre classique des programmes.', 'Developpement'),
        ('Le climat d une region depend entre autres de :', '["Latitude, relief et circulation atmospherique","Couleur des sols seulement","Forme des batiments","Nombre de routes"]', 0, 'Question de climatologie.', 'Climatologie'),
        ('Une ressource non renouvelable est une ressource :', '["Qui se reconstitue tres lentement a l echelle humaine","Qui revient chaque annee automatiquement","Infinie","Qui n a aucune utilite economique"]', 0, 'Notion environnement/developpement.', 'Ressources')
    ) AS q(prompt, options, correct_option, explanation, source_topic)
    WHERE NOT EXISTS (
      SELECT 1 FROM "Question" e WHERE e."subjectId" = histgeo_id AND e."prompt" = q.prompt
    );
  END IF;
END $$;
