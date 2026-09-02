@echo off
title Sistema de Compras y Presupuesto - Depto. Ciencias Agropecuarias (FICA)
echo ==============================================================================
echo   DEPARTAMENTO DE CIENCIAS AGROPECUARIAS - FICA / UNSL
echo   Sistema de Gestion de Pedidos de Compras y Control Presupuestario
echo ==============================================================================
echo.
echo Iniciando el servidor y la aplicacion web...
echo Acceso local: http://localhost:5000
echo.

start http://localhost:5000
node server/index.js
pause
