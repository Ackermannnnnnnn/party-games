@echo off
setlocal
title Party Games - Deploy Prod
chcp 65001 > nul

cd /d "%~dp0"

echo.
echo ============================================
echo   DEPLOY PROD : Push GitHub + Update VPS
echo ============================================
echo.

REM ───── 1. Push GitHub ─────
echo [1/2] Commit et push sur GitHub...
git add .

REM Demande un message de commit
set /p MSG="Message de commit (Entree = auto): "
if "%MSG%"=="" set MSG=Update %date% %time%

git commit -m "%MSG%"
if errorlevel 1 (
  echo Rien a commit, on passe au deploy.
)

git push
if errorlevel 1 (
  echo.
  echo [ERREUR] Le push GitHub a echoue. Stop.
  pause
  exit /b 1
)

echo.
echo [2/2] Deploiement sur le VPS...
"C:\Program Files\Git\bin\bash.exe" -c "ssh -i ~/.ssh/hetzner -o StrictHostKeyChecking=no root@178.105.56.248 'cd /var/www/party-games && ./deploy/update.sh'"

if errorlevel 1 (
  echo.
  echo [ERREUR] Le deploy VPS a echoue. Voir les messages au-dessus.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  DEPLOIEMENT OK !
echo  https://partygrid.click
echo ============================================
echo.
timeout /t 5 /nobreak > nul
exit /b 0
