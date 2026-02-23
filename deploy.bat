@echo off
REM Script de commit et push automatisé pour LinkEduPro (Windows)
REM Usage: deploy.bat "message de commit"

setlocal enabledelayedexpansion

set "COMMIT_MESSAGE=%~1"
if "!COMMIT_MESSAGE!"=="" (
  set "COMMIT_MESSAGE=feat: mise à jour LinkEduPro"
)

cls
echo.
echo 🚀 Démarrage du processus de commit et push...
echo 💬 Message: !COMMIT_MESSAGE!
echo.

REM Ajouter les fichiers
echo 📁 Ajout des fichiers...
git add frontend/src/app/school-management/payments/page.js
echo ✅ Fichiers ajoutés

REM Vérifier les changements
echo.
echo 📊 Changements à commiter:
git diff --cached --stat

REM Demander confirmation
echo.
set /p CONTINUE="Continuer avec le commit ? (y/n) "
if /i not "!CONTINUE!"=="y" (
  echo ❌ Opération annulée.
  exit /b 1
)

REM Commit
echo.
echo 💾 Création du commit...
git commit -m "!COMMIT_MESSAGE!"
if errorlevel 1 (
  echo ❌ Erreur lors du commit
  exit /b 1
)

REM Push
echo.
echo 🌐 Push vers le serveur...
git push origin main
if errorlevel 1 (
  echo ❌ Erreur lors du push
  exit /b 1
)

echo.
echo ✨ Succès ! Le code est maintenant sur GitHub.
pause
