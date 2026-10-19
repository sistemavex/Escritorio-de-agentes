# Para o escritorio de verdade: o laco que o religa (INICIAR ESCRITORIO.cmd, com ou sem janela),
# o servidor na porta 4321 e os paineis dos agentes (4401 e 4411 a 4419).
$parou = @()

# 1. o laco primeiro, senao ele sobe o servidor de novo em 3 segundos
Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" |
  Where-Object { $_.CommandLine -like '*INICIAR ESCRITORIO.cmd*' } |
  ForEach-Object { & taskkill.exe /PID $_.ProcessId /T /F | Out-Null; $parou += "laco $($_.ProcessId)" }

# 2. quem estiver escutando nas portas do escritorio e dos agentes
$portas = @(4321, 4401) + (4411..4419)
foreach ($p in $portas) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -eq 'node') { Stop-Process -Id $_ -Force; $parou += "porta $p" }
    }
}

if ($parou.Count) { Write-Host "Escritorio parado ($($parou -join ', '))." }
else { Write-Host 'O escritorio ja estava parado.' }
