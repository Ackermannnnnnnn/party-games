@echo off
REM Lance UNIQUEMENT le serveur, dans cette fenetre, pour debug.
REM Utilise ce script si start-dev.bat ferme une fenetre trop vite.
title Party Games - SERVER (debug)
chcp 65001 > nul
cd /d "%~dp0server"
echo Lancement du serveur dans cette fenetre...
echo Si erreur, elle apparaitra ci-dessous.
echo Tape Ctrl+C pour arreter.
echo ----------------------------------------
echo.
call npm run dev
echo.
echo ----------------------------------------
echo Le serveur s'est arrete. Lis les messages au-dessus.
pause
