#!/bin/bash

# Script de commit et push automatisé pour LinkEduPro
# Usage: ./deploy.sh "message de commit"

set -e  # Exit si une commande échoue

COMMIT_MESSAGE="${1:-'feat: mise à jour LinkEduPro'}"

echo "🚀 Démarrage du processus de commit et push..."
echo "💬 Message: $COMMIT_MESSAGE"
echo ""

# Ajouter les fichiers
echo "📁 Ajout des fichiers..."
git add frontend/src/app/school-management/payments/page.js
echo "✅ Fichiers ajoutés"

# Vérifier les changements
echo ""
echo "📊 Changements à commiter:"
git diff --cached --stat

# Demander confirmation
echo ""
read -p "Continuer avec le commit ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Opération annulée."
  exit 1
fi

# Commit
echo ""
echo "💾 Création du commit..."
git commit -m "$COMMIT_MESSAGE"

# Push
echo ""
echo "🌐 Push vers le serveur..."
git push origin main

echo ""
echo "✨ Succès ! Le code est maintenant sur GitHub."
