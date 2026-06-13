# GraniteOS Windows Installer

This folder contains the Inno Setup script that builds `GraniteOS-Setup.exe`.
The installer creates Desktop and Start Menu shortcuts that open GraniteOS
in Microsoft Edge app-mode (a full-screen browser window without browser chrome).
No runtime or offline bundle is shipped — the app lives at https://graniteos.vercel.app.

## Prerequisites

- [Inno Setup 6](https://jrsoftware.org/isinfo.php) installed on a Windows machine.
  Quick install via winget:
  ```
  winget install --id JRSoftware.InnoSetup -e --silent --accept-package-agreements --accept-source-agreements
  ```

## One-command build

Run from the **repo root**:

```
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\GraniteOS.iss
```

Output: `installer\dist\GraniteOS-Setup.exe`

## What the installer does

1. Copies `public\favicon.ico` into `%ProgramFiles%\GraniteOS\GraniteOS.ico`
   (used as the shortcut icon).
2. Creates a **Desktop shortcut** and a **Start Menu shortcut** pointing to:
   ```
   msedge.exe --app=https://graniteos.vercel.app --window-size=1280,800
   ```
3. Offers to launch GraniteOS immediately after install.
4. Includes a standard uninstaller.

## Offline / no-internet behaviour

Edge app-mode shows its own "No internet" error page when the device is
offline.  This is expected and acceptable — GraniteOS is an online-only SaaS.

## Notes

- The `.iss` script resolves `msedge.exe` robustly: checks both
  `Program Files (x86)` and `Program Files`, then falls back to the
  registry `App Paths` key that Edge registers on install.
- The installer warns (but does not block) if Edge is not found.
- `installer/dist/` is git-ignored — never commit the built exe.
