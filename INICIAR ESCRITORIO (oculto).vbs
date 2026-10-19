' ===========================================================
'  Liga o escritorio SEM JANELA.
'
'  Faz o mesmo que o INICIAR ESCRITORIO.cmd (inclusive religar se
'  cair), mas escondido. O que apareceria na janela vai para
'  data\logs\escritorio.log.
'
'  - Se o escritorio ja estiver no ar, nao faz nada.
'  - Para parar: PARAR ESCRITORIO.cmd
'  - Para ligar junto com o Windows: scripts\inicio-automatico.ps1
' ===========================================================
Option Explicit
Dim fso, sh, pasta, logs, log, q, http, noAr

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
q = Chr(34)

' ja esta no ar? (um escritorio so)
noAr = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.setTimeouts 2000, 2000, 2000, 2000
http.Open "GET", "http://localhost:4321/config.js", False
http.Send
If Err.Number = 0 Then
  If http.Status = 200 Then noAr = True
End If
Err.Clear
On Error GoTo 0
If noAr Then WScript.Quit 0

' log: pasta data\logs, e guarda so o ultimo arquivo grande como .old
logs = pasta & "\data\logs"
If Not fso.FolderExists(pasta & "\data") Then fso.CreateFolder pasta & "\data"
If Not fso.FolderExists(logs) Then fso.CreateFolder logs
log = logs & "\escritorio.log"
If fso.FileExists(log) Then
  If fso.GetFile(log).Size > 5 * 1024 * 1024 Then
    If fso.FileExists(log & ".old") Then fso.DeleteFile log & ".old", True
    fso.MoveFile log, log & ".old"
  End If
End If

sh.CurrentDirectory = pasta
' 0 = sem janela; False = nao espera
sh.Run "cmd /c " & q & q & pasta & "\INICIAR ESCRITORIO.cmd" & q & " >> " & q & log & q & " 2>&1" & q, 0, False
