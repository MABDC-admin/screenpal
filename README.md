# Screen Studio

Production Windows desktop screen recorder/editor built as a clean-room ScreenPal-style application.

## Run From Source

```powershell
npm install
npm start
```

## Build Windows Release

```powershell
npm run dist
```

Release artifacts are written to `release/`:

- `Screen Studio Setup 0.9.4.exe` - installer
- `Screen Studio 0.9.4.exe` - portable executable
- `win-unpacked/Screen Studio.exe` - unpacked app folder

## Optional MinIO Default Config

Runtime MinIO settings are stored locally at `%USERPROFILE%\ScreenStudio\minio-config.json`.

To bundle a default server for an internal build, copy `src/assets/default-minio-config.example.json` to `src/assets/default-minio-config.json` and fill in private credentials locally before building. The real default config file is intentionally ignored by git.

## Current Production Features

- Single-instance Electron desktop app
- Windows tray integration with open/new-recording/quit commands
- App menu with project-folder and app lifecycle actions
- Local-only project storage under `%USERPROFILE%\ScreenStudio\Video Projects`
- Secure renderer isolation with explicit IPC surface
- Ultra HD FFmpeg screen recording through Desktop Duplication with GPU encoder fallback
- Electron system loopback audio muxed into MP4
- Crash-safe recording autosave through `capture-working.mkv` recovery/finalization
- 8K PNG screenshot projects for full screen and custom region capture
- Project library with rename, external open, upload, export, and delete-to-Recycle-Bin
- Fixed-size playback preview with timeline controls
- Trim metadata with undo-log persistence
- MP4 export through bundled FFmpeg with progress events
- MinIO upload support with popup progress status
- Installer and portable Windows builds through `electron-builder`
- App log under `%USERPROFILE%\ScreenStudio\Logs`

## Remaining Production Work

- Real frame-accurate timeline editing beyond start/end trim
- Microphone/system-audio device mixer UI
- Webcam overlay and cursor/click effects
- Code signing certificate for trusted Windows distribution
- Auto-update channel
