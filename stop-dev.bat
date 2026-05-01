@echo off
title Party Games - Stop
echo Arret des fenetres SERVER et CLIENT...
taskkill /FI "WINDOWTITLE eq PartyGames-SERVER*" /T /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq PartyGames-CLIENT*" /T /F > nul 2>&1
echo Termine.
timeout /t 2 /nobreak > nul
exit /b 0
