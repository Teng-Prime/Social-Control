# Social Earnings Studio 🎬📱🚀

> **Professional AI Video Creation, Phone Control & Social Publishing Desktop App**

Social Earnings Studio is a production-oriented desktop application built for content creators to craft consistent AI characters, generate multi-scene video narratives, manage a high-performance local video library, transfer videos directly to Android devices via ADB, and publish to YouTube, TikTok, and Facebook.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Electron 33 (Context isolation enabled, Node integration disabled) |
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **State Management** | Zustand |
| **Database** | SQLite (`better-sqlite3` in WAL mode with automated migrations) |
| **Video Processing** | FFmpeg (Video probing, thumbnail generation, multi-scene concatenation, audio mixing) |
| **Phone Control** | Android Debug Bridge (ADB) with MediaScanner integration and `scrcpy` mirroring |
| **Secure Storage** | Electron `safeStorage` (OS DPAPI on Windows / Keychain on macOS) |
| **Test Suite** | Vitest with schema integrity, diagnostics, and AI prompt test coverage |

---

## 📁 Directory Structure

```text
Social Earnings Studio/
├── .env.example                  # Environment template
├── .gitignore                    # Ignored artifacts (node_modules, dist, .vault, .db)
├── electron-builder.yml          # NSIS installer & packaging configuration
├── package.json                  # Scripts & dependencies
├── tsconfig.json                 # Renderer TypeScript config
├── tsconfig.electron.json        # Electron Main & Preload TypeScript config
├── vite.config.ts                # Vite frontend bundler configuration
├── vitest.config.ts              # Vitest test runner configuration
├── tailwind.config.js            # Dark slate/charcoal design system
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron lifecycle, window creation, background worker
│   │   ├── security.ts           # CSP headers, external navigation guards, permissions
│   │   ├── logger.ts             # Structured logging with token/secret redaction
│   │   ├── ipc/
│   │   │   └── index.ts          # Validated Electron IPC handlers
│   │   ├── database/
│   │   │   ├── db.ts             # SQLite connection, WAL mode, migrations runner
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial_schema.sql  # 16 normalized tables
│   │   │   └── repositories/     # Data Access Layer
│   │   │       ├── characterRepository.ts
│   │   │       ├── projectRepository.ts
│   │   │       ├── mediaAssetRepository.ts
│   │   │       ├── socialAccountRepository.ts
│   │   │       ├── publishJobRepository.ts
│   │   │       ├── deviceRepository.ts
│   │   │       ├── taskQueueRepository.ts
│   │   │       └── activityLogRepository.ts
│   │   └── services/
│   │       ├── storageService.ts # SocialEarningsStudio/ directory structure manager
│   │       ├── secureStorage.ts  # OS encrypted credential vault
│   │       ├── ffmpegService.ts  # Video probe, thumbnail, scene concatenation
│   │       ├── adbService.ts     # Device detection, ADB push, screencap, scrcpy
│   │       ├── flowService.ts    # Google Flow AI adapter & prompt packaging
│   │       ├── queueService.ts   # Persistent async task queue worker
│   │       └── social/
│   │           └── socialPublisher.ts # YouTube, TikTok, Facebook publishing
│   ├── preload/
│   │   └── index.ts              # contextBridge exposing typed window.api
│   ├── renderer/
│   │   ├── index.html            # Vite HTML shell
│   │   └── src/
│   │       ├── main.tsx          # React DOM entry
│   │       ├── App.tsx           # App root & view switcher
│   │       ├── index.css         # Tailwind & custom scrollbar styles
│   │       ├── stores/           # Zustand state management
│   │       ├── components/
│   │       │   ├── common/       # Button, Card, Badge, Modal, Input, Select, etc.
│   │       │   └── layout/       # Sidebar & Header
│   │       └── views/            # All 13 core views
│   └── shared/
│       └── types.ts              # Strongly typed domain models & IPC contract
└── tests/                        # Vitest automated test suites
```

---

## 🚀 Quickstart & Development

### 1. Prerequisites
- Node.js (v20+ or v22+)
- FFmpeg (added to PATH or configured in Settings)
- Android Platform Tools (`adb`, added to PATH or configured in Settings)

### 2. Install Dependencies
```powershell
npm install
```
*(The `postinstall` script will automatically run `electron-rebuild` to link `better-sqlite3` to Electron's internal ABI).*

### 3. Run Development Mode
```powershell
npm run dev
```
Starts the Vite React dev server with Hot Module Replacement (HMR) and boots Electron automatically.

### 4. Run Test Suite
```powershell
npm test
```
Executes all automated unit and integration tests with Vitest.

### 5. Build for Production
```powershell
npm run build
```
Compiles both the React frontend (`dist/`) and Electron main process (`dist-electron/`).

### 6. Package Desktop Executable / Installer
```powershell
npm run package
```
Generates production NSIS setup installer (`.exe`) inside `release/`.

---

## 📱 Android Phone Setup Guide

Social Earnings Studio connects directly to Android phones and emulators using the Android Debug Bridge:

1. **Enable Developer Options on Phone**:
   - Open **Settings → About phone**.
   - Tap **Build number** 7 times until you see *"You are now a developer!"*.
2. **Enable USB Debugging**:
   - Go to **Settings → System → Developer options**.
   - Toggle on **USB debugging**.
3. **Connect to PC & Authorize**:
   - Connect your phone using a USB cable.
   - When the phone displays **"Allow USB debugging?"** with the computer's RSA key fingerprint, check **"Always allow from this computer"** and tap **Allow**.
4. **Launch Studio**:
   - Navigate to **Phone Control** in the application sidebar and click **Scan for Devices**.
   - Your device model, battery percentage, and storage capacity will appear.
   - Pushed videos are automatically saved to `Movies/SocialEarningsStudio` and indexed with Android's `MediaScanner` so they show up immediately in Google Photos and Gallery apps.

---

## 🔑 Social Accounts & API Setup

- **YouTube**: Authorize via Google Cloud Console with YouTube Data API v3 enabled. Tokens are stored using Electron `safeStorage`.
- **TikTok**: Requires TikTok Developer Account with Content Posting API credentials.
- **Facebook**: Uses Meta for Developers Graph API video endpoints for managed pages and Reels.
- **Google Flow AI**: Supports both direct API endpoints and a user-assisted guided workflow that prepares positive prompts, continuity instructions, and reference photos with 1-click clipboard and import buttons.

---

## 🔒 Security & Privacy

- **Context Isolation**: `contextIsolation: true` and `nodeIntegration: false` enforced.
- **Content Security Policy (CSP)**: Restricts script execution to local bundles.
- **Zero Password Storage**: User passwords and 2FA codes are never collected or stored.
- **Redacted Logs**: Log files automatically mask access tokens, Bearer strings, and API keys.

---

## 📄 License
MIT License. Built for professional AI content creation.
"# Social-Control" 
