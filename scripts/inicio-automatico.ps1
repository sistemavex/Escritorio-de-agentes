# Liga (ou desliga) o escritorio junto com o Windows: um atalho na pasta Inicializar
# que roda "INICIAR ESCRITORIO (oculto).vbs" quando voce entra na sua conta.
#   Ligar:    powershell -ExecutionPolicy Bypass -File scripts\inicio-automatico.ps1
#   Desligar: powershell -ExecutionPolicy Bypass -File scripts\inicio-automatico.ps1 -Desligar
param([switch]$Desligar)

$pasta  = Split-Path -Parent $PSScriptRoot
$vbs    = Join-Path $pasta 'INICIAR ESCRITORIO (oculto).vbs'
$atalho = Join-Path ([Environment]::GetFolderPath('Startup')) 'Escritorio VEX.lnk'

if ($Desligar) {
  if (Test-Path $atalho) { Remove-Item $atalho -Force; Write-Host 'Inicio automatico desligado.' }
  else { Write-Host 'O inicio automatico ja estava desligado.' }
  return
}

$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($atalho)
$lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$lnk.Arguments = '"' + $vbs + '"'
$lnk.WorkingDirectory = $pasta
$lnk.Description = 'Liga o Escritorio de Agentes VEX sem janela'
$lnk.Save()
Write-Host "Inicio automatico ligado: $atalho"
