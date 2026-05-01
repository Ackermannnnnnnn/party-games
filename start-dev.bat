@echo off
title Party Games

cd /d "%~dp0"

echo.
echo === Party Games launcher ===
echo Dossier : %CD%
echo.

if not exist "server\package.json" (
  echo [ERREUR] Pas de server\package.json ici. Mauvais dossier ?
  echo Contenu du dossier :
  dir /b
  echo.
  pause
  exit /b 1
)
if not exist "client\package.json" (
  echo [ERREUR] Pas de client\package.json ici.
  pause
  exit /b 1
)

if not exist "server\node_modules" (
  echo Installation deps server...
  pushd server
  call npm install
  popd
)

if not exist "client\node_modules" (
  echo Installation deps client...
  pushd client
  call npm install
  popd
)

if not exist "server\.env" (
  if exist "server\.env.example" copy /Y "server\.env.example" "server\.env" > nul
)

echo.
echo Lancement du SERVEUR...
start "PartyGames-SERVER" /D "%~dp0server" cmd /k npm run dev

timeout /t 3 /nobreak > nul

echo Lancement du CLIENT...
start "PartyGames-CLIENT" /D "%~dp0client" cmd /k npm run dev

timeout /t 6 /nobreak > nul

start "" "http://localhost:5173"

echo.
echo Termine. Cette fenetre se ferme dans 3s.
timeout /t 3 /nobreak > nul
exit /b 0
