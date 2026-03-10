j# Scripts de Déploiement LinkEduPro

Automátatisez vos commits et pushes git.

## Usage

### Option 1: Script Node.js (Linux/Mac/Windows)
```bash
# Via npm (depuis backend/)
cd backend
npm run deploy

# Ou directement
node scripts/deploy.js
```

### Option 2: Script Shell (Linux/Mac)
```bash
chmod +x deploy.sh
./deploy.sh "message de commit"
```

### Option 3: Script Batch (Windows)
```cmd
deploy.bat "message de commit"
```

## Fonctionnalités

✅ Ajoute les fichiers de la config par défaut
✅ Permet d'ajouter des fichiers supplémentaires
✅ Affiche les changements avant commit
✅ Demande confirmation avant push
✅ Gère les erreurs gracieusement
✅ Supported sur Windows, Linux, Mac

## Configuration

Editez `backend/scripts/deploy.js` pour modifier les fichiers par défaut:

```javascript
const defaultFiles = [
  'frontend/src/app/school-management/payments/page.js',
  // Ajoutez vos fichiers ici
];
```

## Exemple complet

```bash
$ npm run deploy

🚀 Démarrage du processus de commit et push...

💬 Message de commit: feat: ajouter gestion paiements scolaires
📁 Fichiers par défaut:
  - frontend/src/app/school-management/payments/page.js

📝 Fichiers supplémentaires: frontend/src/app/school-management/dashboard/page.js

📊 Changements à commiter:
 frontend/src/app/school-management/payments/page.js    | 300 +++++++++
 frontend/src/app/school-management/dashboard/page.js   | 50 +-
 2 files changed, 350 insertions(+)

✅ Continuer avec le commit ? (y/n): y

💾 Création du commit...
[main abc1234] feat: ajouter gestion paiements scolaires
 2 files changed, 350 insertions(+)

🌐 Push vers le serveur...
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.

✨ Succès ! Le code est maintenant sur GitHub.
```
