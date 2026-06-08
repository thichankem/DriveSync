' DriveSync launcher - chay app khong hien cua so console.
' Lan dau (chua co node_modules / chua build) se tu cai dat va build.
Option Explicit
Dim fso, sh, base, firstRun
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' Thu muc goc = thu muc cha cua \scripts
base = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = base

firstRun = (Not fso.FolderExists(base & "\node_modules")) Or _
           (Not fso.FileExists(base & "\out\main\index.js"))

If firstRun Then
  MsgBox "DriveSync dang cai dat lan dau (co the mat vai phut)." & vbCrLf & _
         "Bam OK roi cho mot chut, ung dung se tu mo.", 64, "DriveSync"
  ' Chay an, cho hoan tat
  sh.Run "cmd /c npm install && npm run geticon && npm run build", 0, True
End If

' Khoi dong ung dung (an console). GUI cua Electron van hien binh thuong.
sh.Run "cmd /c npm run start", 0, False
