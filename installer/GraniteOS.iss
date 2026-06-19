; GraniteOS.iss — Inno Setup script
; Builds a Windows installer that creates shortcuts launching GraniteOS
; in Microsoft Edge app-mode (no Electron / Tauri runtime to bundle).
;
; One-command build (from the repo root):
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\GraniteOS.iss
;
; Output:  installer\dist\GraniteOS-Setup.exe

#define AppName      "GraniteOS"
#define AppVersion   "1.0"
#define AppPublisher "GraniteOS"
#define AppURL       "https://graniteos.vercel.app"
; Edge app-mode command — two common install paths handled via Check functions
#define EdgeExe32    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
#define EdgeExe64    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
#define EdgeArgs     "--app=https://graniteos.vercel.app --window-size=1280,800"

[Setup]
AppId={{A7C3F2B1-9E4D-4A8F-B6C2-3D1E5F7A9B0C}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
; No files to install (the app is fully online), so we only need the
; Start-Menu / Desktop shortcuts. Output a small stub exe.
OutputDir=dist
OutputBaseFilename=GraniteOS-Setup
SetupIconFile=..\public\favicon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; Allow install without admin rights if user doesn't have them
PrivilegesRequiredOverridesAllowed=commandline dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Icons]
; Desktop shortcut
Name: "{autodesktop}\{#AppName}";  \
  Filename: "{code:GetEdgePath}";  \
  Parameters: "{#EdgeArgs}";       \
  IconFilename: "{app}\GraniteOS.ico"; \
  Comment: "Open GraniteOS — granite & marble business software"

; Start Menu shortcut
Name: "{autoprograms}\{#AppName}\{#AppName}"; \
  Filename: "{code:GetEdgePath}";              \
  Parameters: "{#EdgeArgs}";                   \
  IconFilename: "{app}\GraniteOS.ico";         \
  Comment: "Open GraniteOS — granite & marble business software"

; Start Menu — uninstall
Name: "{autoprograms}\{#AppName}\Uninstall {#AppName}"; \
  Filename: "{uninstallexe}"

[Files]
; Copy the icon so shortcuts can reference it from the install dir
Source: "..\public\favicon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Run]
; Offer to launch GraniteOS after installation
Filename: "{code:GetEdgePath}"; \
  Parameters: "{#EdgeArgs}";    \
  Description: "Launch {#AppName} now";  \
  Flags: nowait postinstall skipifsilent shellexec

[Code]
{ -----------------------------------------------------------------------
  GetEdgePath — returns the path to msedge.exe.
  Checks Program Files (x86) first, then Program Files.
  If neither is found, falls back to the registry App Paths key.
  ----------------------------------------------------------------------- }

function GetEdgePath(Param: String): String;
var
  RegPath: String;
  EdgePath: String;
begin
  EdgePath := '{#EdgeExe32}';
  if FileExists(EdgePath) then
  begin
    Result := EdgePath;
    Exit;
  end;

  EdgePath := '{#EdgeExe64}';
  if FileExists(EdgePath) then
  begin
    Result := EdgePath;
    Exit;
  end;

  { Fallback: read from the App Paths registry key that Edge registers }
  RegPath := 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe';
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, RegPath, '', EdgePath) then
  begin
    Result := EdgePath;
    Exit;
  end;
  if RegQueryStringValue(HKEY_CURRENT_USER, RegPath, '', EdgePath) then
  begin
    Result := EdgePath;
    Exit;
  end;

  { Last resort — rely on PATH }
  Result := 'msedge.exe';
end;

function InitializeSetup(): Boolean;
begin
  { Warn the user if Edge cannot be found at all, but still allow install. }
  if (GetEdgePath('') = 'msedge.exe') and
     not FileExists('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') and
     not FileExists('C:\Program Files\Microsoft\Edge\Application\msedge.exe') then
  begin
    MsgBox('Microsoft Edge was not found on this computer.' + #13#10 +
           'GraniteOS requires Edge to run.  Please install Edge from ' +
           'https://microsoft.com/edge and then launch GraniteOS.',
           mbInformation, MB_OK);
  end;
  Result := True;
end;
