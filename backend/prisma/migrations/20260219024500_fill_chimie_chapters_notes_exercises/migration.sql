-- Ensure chapter order is strictly derived from M1..M8 marker in title
UPDATE "study_plans"
SET "chapter_order" = CAST(SUBSTRING("title" FROM 'M([0-9]+)') AS INTEGER)
WHERE "subject" = 'Chimie'
  AND "title" ~ 'M[1-8]';

-- Fill chapter notes and exercises for Chimie NSIV (Terminale)
UPDATE "study_plans"
SET
  "notes" = CASE
    WHEN "chapter_order" = 1 THEN
      'Objectifs:\n- Definir la chimie organique moderne.\n- Expliquer la theorie de la force vitale et la synthese de Wohler (1828).\n- Identifier les exceptions carbonees et l''importance des composes organiques.\n\nContenu:\n- Historique et evolution de la chimie organique.\n- Difference organique/inorganique.\n- Caracteristiques des composes organiques: structure covalente, combustibilite, isomerie, faible solubilite dans l''eau.\n- Origine du carbone: photosynthese, syntheses biochimiques, ressources fossiles.'
    WHEN "chapter_order" = 2 THEN
      'Objectifs:\n- Realiser l''analyse elementaire qualitative (C, H, O).\n- Comprendre l''analyse quantitative et les pourcentages massiques.\n- Determiner une formule brute a partir des donnees experimentales.\n\nContenu:\n- Detection du carbone par pyrolyse/combustion et test a l''eau de chaux.\n- Detection de l''hydrogene par formation de vapeur d''eau.\n- Presence de l''oxygene par difference de masse.\n- Calcul de %C, %H, %O et interpretation.'
    WHEN "chapter_order" = 3 THEN
      'Objectifs:\n- Distinguer les types de liaisons et representations en organique.\n- Analyser la valence du carbone et l''electronegativite.\n- Reconnaitre les chaines lineaires, ramifiees et cycliques.\n\nContenu:\n- Liaison covalente/ionique/polaire.\n- Formules brute, developpee, semi-developpee, topologique.\n- Notion d''isomerie de constitution.\n- Exercices de construction et lecture de structures.'
    WHEN "chapter_order" = 4 THEN
      'Objectifs:\n- Classer les hydrocarbures (alcane, alcene, alcyne, aromatique).\n- Utiliser les formules generales.\n- Nommer correctement les composes simples.\n\nContenu:\n- Series homologues et nomenclature de base.\n- Saturation/insaturation.\n- Identification de la chaine principale et substituants.\n- Pratique de nommage et ecriture des formules.'
    WHEN "chapter_order" = 5 THEN
      'Objectifs:\n- Maitriser les reactions fondamentales des hydrocarbures.\n- Ecrire et equilibrer des equations de transformation.\n- Expliquer les applications: methane, ethylene, acetylene, benzene.\n\nContenu:\n- Combustion complete/incomplete.\n- Substitution, addition, hydrogenation, isomerisation, polymerisation.\n- Principes de reactivite du benzene.\n- Applications industrielles et exemples de bilans reactionnels.'
    WHEN "chapter_order" = 6 THEN
      'Objectifs:\n- Identifier les fonctions oxygenees usuelles.\n- Passer d''une fonction a une autre (oxydation/reduction).\n- Interpreter des sequences reactionnelles courantes.\n\nContenu:\n- Alcools, aldehydes, cetones, acides carboxyliques, esters.\n- Proprietes essentielles et reconnaissance des fonctions.\n- Esterification, hydrolyse, oxydation des alcools.\n- Applications de synthese organique.'
    WHEN "chapter_order" = 7 THEN
      'Objectifs:\n- Comprendre l''autoprotolyse de l''eau et le pH.\n- Relier [H3O+] et [OH-] aux milieux acide/neutre/basique.\n- Resoudre des problemes de concentration et dilution.\n\nContenu:\n- Equilibre de l''eau et produit ionique.\n- Echelle de pH et interpretation.\n- Concentration molaire/normalite.\n- Calculs d''applications sur solutions.'
    WHEN "chapter_order" = 8 THEN
      'Objectifs:\n- Etablir un tableau d''avancement.\n- Determiner les nombres d''oxydation et equilibrer les redox.\n- Introduire les bases de l''electrochimie et applications minerales.\n\nContenu:\n- Avancement, reactif limitant et rendement.\n- Oxydation/reduction, couples redox, bilans electroniques.\n- Piles et principes electrochimiques elementaires.\n- Applications en chimie des minerais.'
    ELSE "notes"
  END,
  "exercises" = CASE
    WHEN "chapter_order" = 1 THEN
      '1) Definis la chimie organique moderne en 4 lignes.\n2) Explique pourquoi l''experience de Wohler est une rupture historique.\n3) Classe: CO2, CH4, CaCO3, C2H5OH (organique/inorganique).\n4) Cite 5 domaines d''application des composes organiques.'
    WHEN "chapter_order" = 2 THEN
      '1) Decris le test du carbone par eau de chaux.\n2) Calcule %O si %C=52,2 et %H=13,0.\n3) A partir de %C=40,0; %H=6,7; %O=53,3, propose une formule brute simple.\n4) Distingue analyse qualitative et quantitative avec un exemple.'
    WHEN "chapter_order" = 3 THEN
      '1) Identifie le type de liaison dominante dans CH3OH, NaCl, H2O.\n2) Ecris la formule semi-developpee de 2-methylbutane.\n3) Donne deux isomeres de C4H10.\n4) Repere la chaine principale et les substituants de CH3-CH(CH3)-CH2-CH3.'
    WHEN "chapter_order" = 4 THEN
      '1) Classe: C5H12, C4H8, C3H4, C6H6.\n2) Donne la formule generale des alcanes, alcenes et alcynes.\n3) Nomme: CH3-CH2-CH3 ; CH2=CH-CH3 ; CH≡C-CH3.\n4) Ecris la formule semi-developpee de 2-methylpentane.'
    WHEN "chapter_order" = 5 THEN
      '1) Ecris la combustion complete du methane.\n2) Ecris l''addition de Br2 sur l''ethene.\n3) Donne un exemple de polymerisation d''un alcene.\n4) Ecris une nitration simplifiee du benzene et son produit principal.'
    WHEN "chapter_order" = 6 THEN
      '1) Indique la fonction chimique de CH3CH2OH, CH3CHO, CH3COCH3, CH3COOH.\n2) Ecris l''oxydation d''un alcool primaire en aldehyde puis acide.\n3) Ecris une esterification (acide + alcool).\n4) Compare aldehyde et cetone en termes de structure.'
    WHEN "chapter_order" = 7 THEN
      '1) Que vaut [H3O+] dans une solution neutre a 25 degres C?\n2) Calcule le pH si [H3O+] = 1,0x10^-3 mol/L.\n3) Determine si une solution est acide ou basique pour pH=9,5.\n4) Exercice de dilution: preparer 250 mL de solution 0,10 M a partir de 1,0 M.'
    WHEN "chapter_order" = 8 THEN
      '1) Dresse un tableau d''avancement pour A + B -> C.\n2) Determine les nombres d''oxydation dans KMnO4, H2SO4, NH3.\n3) Equilibre une reaction redox simple en milieu acide.\n4) Identifie anode/cathode dans une pile Zn/Cu.'
    ELSE "exercises"
  END
WHERE "subject" = 'Chimie'
  AND "level" = CAST('Terminale' AS "EducationLevel")
  AND "chapter_order" BETWEEN 1 AND 8;
