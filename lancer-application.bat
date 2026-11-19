@echo off
title Pattern Trading Sportif — Bet360 (PC & Android)
color 0B
echo ================================================================
echo   DEMARRAGE DE L'APPLICATION PATTERN TRADING (BET360)
echo   Accessible sur PC et Telephone Android en simultane :
echo.
echo   - Sur ce PC :             http://localhost:5173/
echo   - Sur Telephone Android : http://192.168.1.68:5173/
echo ================================================================
echo.

set "PATH=C:\Users\admin\nodejs;%PATH%"

echo [1/2] Ouverture de votre navigateur sur ce PC...
start "" http://localhost:5173/

echo [2/2] Serveur actif pour PC et Telephone...
call npm run dev -- --host 0.0.0.0 --port 5173

pause
