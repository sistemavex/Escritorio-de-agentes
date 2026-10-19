@echo off
rem Para o escritorio (o que roda escondido ou na janela preta) e os paineis dos agentes.
rem Para ligar de novo: INICIAR ESCRITORIO (oculto).vbs, ou reinicie o Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\parar-escritorio.ps1"
timeout /t 4 >nul
