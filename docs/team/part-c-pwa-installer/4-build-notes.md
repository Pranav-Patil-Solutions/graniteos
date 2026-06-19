# Part C — PWA + Windows Installer: Build Notes

## What I built

### PWA half (changes to the Next.js app)

| File | What it does |
|------|-------------|
| `scripts/generate-icons.mjs` | New script. Uses the `pngjs` library (already in node_modules) to generate 192×192 and 512×512 dark-background gold-"G" PNG icons, plus a `favicon.ico` with a 32×32 embedded PNG. Run once to regenerate icons: `node scripts/generate-icons.mjs`. |
| `public/icon-192.png` | 192×192 branded icon. Dark background (#0b0e11), gold "G" letter (#c8a24b). Used by Android Chrome PWA install and as the iOS apple-touch-icon. |
| `public/icon-512.png` | 512×512 branded icon. Same design, larger for high-res splash screens. |
| `public/favicon.ico` | 32×32 branded favicon in .ico format. Also used as the Windows installer shortcut icon. |
| `public/manifest.json` | Updated. Added `icons` array (192 + 512), corrected `background_color` and `theme_color` to `#0b0e11` (the dark-glass background from `globals.css`), `start_url` set to `/`. |
| `public/sw.js` | New minimal service worker. Chrome requires a registered SW for the install prompt to fire. This one does nothing except pass every network request straight through — no caching, no offline mode. It registers itself automatically from `InstallBanner.tsx`. |
| `src/app/layout.tsx` | Updated metadata. Points `manifest` at `/manifest.json`, adds `appleWebApp` (capable/title/statusBarStyle) for iOS "Add to Home Screen", and sets apple-touch-icon to `icon-192.png`. These are the iOS PWA meta tags in Next.js 15 format. |
| `src/components/layout/InstallBanner.tsx` | New client component. Mobile-only (`lg:hidden`). On Android/Chrome: listens for `beforeinstallprompt`, shows a one-tap "Install" button. On iOS Safari: shows a plain "Tap Share → Add to Home Screen" hint. Dismiss-forever in `localStorage` key `gos_install_hint_v1`. Registers the service worker on first load. Styled with the existing dark-glass Card tokens (`bg-graphite-800`, `border-white/10`, `backdrop-blur-md`). |
| `src/components/layout/AppShell.tsx` | Updated. Imports and mounts `<InstallBanner />` just before the main content area — visible on all authenticated pages. |

### Installer half (new folder `installer/`)

| File | What it does |
|------|-------------|
| `installer/GraniteOS.iss` | Inno Setup 6 script. Builds a Windows installer that creates Desktop + Start Menu shortcuts pointing to `msedge.exe --app=https://graniteos.vercel.app --window-size=1280,800`. Robustly finds Edge: checks `Program Files (x86)`, then `Program Files`, then the registry `App Paths` key, then falls back to PATH. Warns (but does not block) if Edge is not found. The only file installed is the icon; no runtime is bundled. |
| `installer/README.md` | One-command build instructions, prerequisites, offline behaviour note. |
| `installer/dist/GraniteOS-Setup.exe` | **Built and verified.** 2.0 MB installer. Path: `D:\vyaparwerk\graniteos\installer\dist\GraniteOS-Setup.exe`. |
| `.gitignore` | Added `installer/dist/` so the compiled exe is never committed. |

### Pre-existing TypeScript bug fix (opportunistic — not Part C scope)

`next build` was failing with "Property 'error' does not exist on type '{ ok: true }'" across 17+ component files. This was a pre-existing bug where TypeScript 5.9 strict mode requires explicit narrowing on discriminated union return types from server actions.

Fixed by:
- Changing `if (res.error)` → `if ("error" in res)` for proper union narrowing
- Changing `setError(res.error)` → `setError(res.error ?? '')` so TypeScript accepts `string | undefined`
- Careful NOT to change files where `ok` is a shared property on all union members (`whatsapp.ts`, `stock-alert.ts`) — those correctly use `if (r.ok)` and were reverted after an accidental over-broad replacement.

---

## How to try it

**PWA install (phone):**
1. Deploy to Vercel (or run `npx next dev` locally with ngrok for HTTPS on mobile).
2. Open `https://graniteos.vercel.app` in Chrome on Android.
3. The install banner appears at the bottom of the screen after you navigate into the app.
4. Tap "Install" → Chrome shows the native install dialog.
5. On iOS Safari, tap the share icon and choose "Add to Home Screen".

**Windows installer:**
1. Run `D:\vyaparwerk\graniteos\installer\dist\GraniteOS-Setup.exe` on any Windows machine with Edge installed.
2. Follow the wizard (one screen — just click Next/Install).
3. A Desktop shortcut "GraniteOS" is created.
4. Tick "Launch GraniteOS now" at the end.
5. Edge opens in app-mode at `https://graniteos.vercel.app` at 1280×800, no browser chrome.

**Rebuild the installer** (after any changes to the .iss script):
```
"C:\Users\Pranav\AppData\Local\Programs\Inno Setup 6\ISCC.exe" installer\GraniteOS.iss
```

**Regenerate icons** (if brand colors change):
```
node scripts/generate-icons.mjs
```

---

## Acceptance criteria status

| Criterion | Status |
|-----------|--------|
| `public/manifest.json` — name "GraniteOS", standalone, start_url "/", dark-glass colors | Done. `background_color`/`theme_color` = `#0b0e11`, `start_url` = `/`, `display` = `standalone`. |
| Icons 192 and 512 generated without heavy deps | Done. Used `pngjs` (already in node_modules). Dark bg, gold "G". |
| Manifest + iOS meta tags wired into root layout | Done. `appleWebApp` metadata + apple icon in `layout.tsx`. |
| Install hint banner, mobile-only, `beforeinstallprompt` + iOS fallback | Done. `InstallBanner.tsx`. Android one-tap install, iOS text hint. |
| Dismiss-forever in localStorage `gos_install_hint_v1` | Done. |
| Banner mounted in AppShell | Done. |
| Service worker registered (Chrome installability) | Done. Minimal passthrough `sw.js`, registered by InstallBanner on mount. |
| `GraniteOS.iss` — AppName GraniteOS, `{autopf}\GraniteOS`, Desktop + Start Menu shortcuts | Done. |
| Edge app-mode target `--app=https://graniteos.vercel.app --window-size=1280,800` | Done. |
| Robust Edge path resolution (both PF locations + registry fallback) | Done. Three-level check in `GetEdgePath()` Code function. |
| Custom icon (favicon.ico) | Done. Generated 32×32 branded .ico from the same G design. |
| Run-after-install option | Done. `[Run]` section with `postinstall skipifsilent` flags. |
| `installer\dist\` added to .gitignore | Done. |
| `installer/README.md` with one-command build | Done. |
| **exe actually built** | Done. `installer\dist\GraniteOS-Setup.exe` — 2,033,553 bytes (≈2.0 MB). |
| `npx vitest run` stays at 126 passing | Done. 126/126 pass. |
| `npx next build` clean | Done. Build compiles and type-checks successfully. |

---

## Anything I couldn't do

- **No Inno Setup signing**: the exe is unsigned. Windows Defender / SmartScreen will show an "Unknown publisher" warning the first time on a fresh machine. For a customer handoff, Pranav should sign it with a code-signing certificate. The ISS script is set up for signing — just add `SignTool=...` to `[Setup]` when a cert is available.
- **No `favicon.ico` in the app root previously**: the original repo had no favicon.ico. The generated one is a minimal 32×32 PNG-in-ICO; browser support is fine on modern browsers, but if you want multi-size (16/32/48) for older IE/explorer compatibility, run the generator with additional sizes and combine them using a dedicated ico tool.
- **Service worker is passthrough only**: No offline page, no caching. Chrome's "installability" requirement is met (SW registered + manifest present). Offline behaviour is Edge's built-in error page, which is acceptable per the spec.
