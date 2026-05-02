@echo off
title Party Games VPS - SSH
echo Connexion au VPS...
"C:\Program Files\Git\bin\bash.exe" -i -c "ssh -i ~/.ssh/hetzner root@178.105.56.248; exec bash"
