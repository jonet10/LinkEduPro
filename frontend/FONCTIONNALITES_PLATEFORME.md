# Fonctionnalités de LinkEduPro (par module et par rôle)

LinkEduPro est une plateforme éducative numérique conçue pour connecter les élèves, les enseignants et les institutions autour de ressources pédagogiques, d’outils d’apprentissage et de collaboration.

Ce document décrit les principales fonctionnalités de la plateforme **LinkEduPro / EduPro** selon les rôles utilisateurs : **Élève**, **Professeur**, **Admin / Super Admin**.

## Modules (menu principal)

La navigation principale inclut :
- Accueil
- Classe Numérique
- Rattrapage
- Quiz
- Examens passés
- Bibliothèque
- EduCollect
- Forum
- Support / Faire un Don

> Remarque : la plateforme peut aussi proposer des pages transversales (ex: recherche, profil, messagerie) selon les permissions.

---

## 1) Accueil

### Élève
- Vue d’ensemble : accès rapide aux modules, reprise d’apprentissage.
- Accès aux contenus suggérés et aux raccourcis (quiz, classe numérique, examens, bibliothèque).

### Professeur
- Accès rapide aux outils de contenu (classe numérique, rattrapage, examens passés, forum).
- Vue de l’activité (selon l’implémentation et le compte).

### Admin / Super Admin
- Accès aux modules administratifs (dashboard, supervision et contrôle).
- Accès aux statistiques globales si activées.

---

## 2) Classe Numérique

### Élève
- Consulter les vidéos/cours (lecture intégrée).
- Apprentissage par contenus organisés (selon la matière et le niveau).
- Accès aux ressources associées si disponibles.

### Professeur
- Ajouter des contenus vidéo (cours, explications).
- Modifier / supprimer des vidéos publiées (si autorisé).

### Admin / Super Admin
- Modération et gestion globale des contenus.
- Contrôle des contenus signalés/à valider (si activé).

---

## 3) Rattrapage

### Élève
- Voir les sessions actives.
- S’inscrire / payer selon le modèle (MonCash/NatCash si configuré).
- Recevoir des notifications/annonces liées aux sessions.

### Professeur
- Créer des sessions de rattrapage (globale, par école, ou ciblée).
- Suivre les inscriptions et la participation.

### Admin / Super Admin
- Supervision des sessions, paiements, et conformité.
- Capacité de désactiver/archiver des sessions si nécessaire.

---

## 4) Quiz

### Élève
- Faire des quiz d’entraînement.
- Suivre sa progression (scores, tentatives, amélioration).
- Accéder aux corrections et explications (selon les contenus).

### Professeur
- Créer / publier des quiz par niveau, matière, chapitre.
- Consulter les performances et cibler les points faibles.

### Admin / Super Admin
- Contrôler la qualité, modérer, et gérer la disponibilité globale.

---

## 5) Examens passés

### Élève
- Consulter les examens en PDF organisés par **année** puis par **matière**.
- Ouvrir les PDF directement (mobile) ou via un lecteur dédié (desktop).

### Professeur
- Ajouter des PDF d’examens passés avec :
  - Classe / niveau
  - Matière
  - Titre / Thème (optionnel)
  - **Année**
  - Fichier PDF
- Les PDF ajoutés doivent apparaître dans la liste publique/élève.

### Admin / Super Admin
- Même capacité d’ajout/gestion que le professeur, avec supervision globale.

---

## 6) Bibliothèque (Centre de ressources)

La Bibliothèque est conçue comme un **centre de ressources** structuré.

### Catégories internes
- Livres
- Articles et publications
- Supports pédagogiques
- Dictionnaires spécialisés
  - Dictionnaire Informatique
- Examens et travaux
- Ressources multimédia
- Archives

### Élève
- Parcourir les ressources par catégorie.
- Rechercher dans la Bibliothèque (recherche globale interne).
- Consulter le **Dictionnaire Informatique** :
  - Recherche de termes
  - Navigation A–Z
  - Suggestions/autocomplétion
- Sauvegarder des ressources/termes en **favoris**.
- Voir des recommandations “Voir aussi” (ressources/termes liés).

### Professeur
- Ajouter des ressources (PDF/DOCX/PPT/vidéo/audio/image selon configuration).
- Mettre à jour des ressources existantes (si autorisé).
- Contribuer au dictionnaire (si autorisé).

### Admin / Super Admin
- Gestion complète : création, édition, suppression, modération.
- Re-indexation de recherche (si activée) et contrôle qualité.

---

## 7) EduCollect

### Élève
- Découvrir des projets et participer si ouvert.
- Faire un don à un projet (selon options disponibles).

### Professeur
- Créer/porter des projets (selon la politique de la plateforme).
- Suivre les contributions.

### Admin / Super Admin
- Supervision des projets, validations et règles de visibilité.

---

## 8) Forum

### Élève
- Lire et participer aux discussions.
- Publier dans le forum (selon permissions).

### Professeur
- Publier des ressources/annonces au public.
- Répondre, guider, modérer ses discussions.

### Admin / Super Admin
- Modération globale des publications, suppression/validation.
- Gestion des limites et des abus (anti-spam, signalements).

---

## 9) Support / Faire un Don

### Tous utilisateurs (invité/élève/professeur)
- Accéder à un espace “Soutenir la plateforme”.
- Effectuer un don (ex: MonCash si configuré).
- Partager le lien de LinkEduPro via un bouton **Partager** (Web Share API / copie du lien).

### Admin / Super Admin
- Accès au dashboard de suivi des dons (si activé).

---

## Fonctionnalités transversales (hors menu)

### Comptes & Profil
- Inscription / connexion.
- Profil utilisateur (informations, préférences).

### Messagerie / Annonces (si activé)
- Envoi et réception de messages/annonces.
- Possibilité de joindre des fichiers selon configuration.

### Recherche (si activé)
- Recherche globale sur plusieurs contenus (Bibliothèque, classe numérique, examens, quiz…).

### Mobile / PWA (si activé)
- Possibilité d’installation en “application” depuis le navigateur (PWA).
- Bouton “Retour” simplifié sur mobile (icône) selon l’interface.

---

## Évolutions prévues (scalabilité)
- Ajout d’autres dictionnaires spécialisés (Maths, Physique, SVT…).
- Extension du centre de ressources (nouveaux types, nouveaux filtres).
- Recommandations plus intelligentes (par niveau, historique, matières).
