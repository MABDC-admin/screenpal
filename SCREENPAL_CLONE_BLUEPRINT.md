# ScreenPal Clean-Room Clone Blueprint

This document is based on read-only observation of the installed ScreenPal app on this machine. It is a clean-room product and architecture map for building our own recorder/editor. Do not copy ScreenPal code, proprietary assets, names, jars, serialized formats, or branding.

## Observed Installed Architecture

- Launcher: `C:\Users\DENNIS\AppData\Local\ScreenPal\ScreenPal.exe`
- No-splash tray launcher: `C:\Users\DENNIS\AppData\Local\ScreenPal\NoSplashScreen\ScreenPal.exe tray`
- Java package config: `C:\Users\DENNIS\AppData\Local\ScreenPal\app\ScreenPal.cfg`
- Runtime: bundled Java 19 via Windows `jpackage`
- Active payload folder: `C:\Users\DENNIS\AppData\Local\ScreenPal-v3\v3.20.3`
- App data/logs/cache: `C:\Users\DENNIS\AppData\Local\ScreenPal-v3`
- User project root: `C:\Users\DENNIS\ScreenPal`
- Video projects: `C:\Users\DENNIS\ScreenPal\Video Projects`
- Image projects: `C:\Users\DENNIS\ScreenPal\Image Projects`

## Observed Core Components

- `AppMain-3.1.10.jar`: bootstrapper, update/version loader, command routing, dynamic class loading.
- `ScreencastOMaticEditor-3.20.3-beta1.jar`: main app/editor/project manager.
- `ScreencastOMaticTray-3.20.3-beta1.jar`: tray process, background monitor, app relaunch, local command listener.
- `AppNative-3.20.3-beta1.jar`: native library payload.
- `AppSkin`, `SOMAppSkin`, `RecorderSkin`: UI strings, styling resources, recorder/editor assets.
- FFmpeg native package: AV codec/container/resample/scale libraries, OpenH264, VPX, MP3 LAME.
- CV native package: ONNX runtime and model payload for computer vision features.
- Google API package: Drive/YouTube OAuth and upload libraries.
- Native DLLs: mouse/key/hotkey hooks, MP4 processing, audio/video helpers.

## Runtime Process Model

- User starts `ScreenPal.exe open`.
- Main process checks existing app listener on localhost and starts if no response.
- App loads active version from `ScreenPal-v3\version-x64.txt`.
- Dynamic JAR loader loads editor, skins, native payloads, FFmpeg, CV, Google API, JNA.
- Tray process starts separately with `ScreenPal.exe tray`.
- Tray keeps app warm with an `openNotVisible` style behavior and listens for commands.
- App and tray both expose localhost command servers and temp `.comm` files under:
  `C:\Users\DENNIS\AppData\Local\Temp\ScreenPal`.

## Observed Local Communication

- Local-only listeners bind to `127.0.0.1`.
- Observed command/listener ports include app/tray/browser callback/stock requester roles.
- Temp command files:
  - `ScreenPal_app.comm`
  - `ScreenPal_app.listener.comm.lck`
  - `ScreenPal_tray.comm`
  - `ScreenPal_tray.listener.comm.lck`
- Browser callbacks are used for purchase/login/cloud flows, e.g. callback to `http://127.0.0.1:<port>/gopro-v3`.

## Observed Project Model

Each recording is a directory under `Video Projects`, with:

- `.id`: project identity.
- `Open this video.screenpal`: zero-byte marker/launcher file.
- `data\*.f2`: large raw/proprietary video stream.
- `data\*.m`: audio/media companion data.
- `data\*.jpeg`: thumbnail.
- `data\*.d`: small dimensions/info payload.
- `data\*.vc`: gzip-compressed serialized edit/version chunks.
- `data\*.sel`, `*.sel.vc`: selection/timeline state.
- `*.ostyle.vc`, `*.as.sel.vc`, `*.op.sel.vc`, `*.ss.sel.vc`, `*.cc.sel.vc`, `*.lo.sel.vc`: style, audio settings, options, script, captions, layer-order state.
- `*.publish.s`, `*.encode.s`, `*.pr.s`, `*.pro.s`: publish/export/encode profile state.

For our clone, use a transparent project format instead:

```text
ProjectName/
  project.json
  media/
    capture.webm
    export.mp4
  thumbnails/
    poster.jpg
  edits/
    timeline.json
    undo-log.jsonl
```

## Clean-Room Clone Architecture

Use Electron for a fast Windows desktop MVP:

- Main process:
  - app lifecycle
  - project filesystem API
  - export/copy jobs
  - tray icon later
  - local HTTP callback server later
- Renderer:
  - project library
  - screen recorder controls
  - playback preview
  - simple editor timeline
  - export controls
- Storage:
  - `%USERPROFILE%\ScreenStudio\Video Projects`
  - JSON metadata, WebM source, MP4/WebM export target
- Capture:
  - browser `getDisplayMedia` / Electron capture APIs
  - MediaRecorder for MVP
  - later replace/export through FFmpeg for MP4, trimming, transcode, audio mix
- Native/media:
- Current production build: WebM recording plus bundled FFmpeg MP4 export with trim metadata.
- Next phase: crop, audio gain, captions, overlays, waveform/timeline rendering.

## MVP Feature Targets

- Video project library
- New screen recording
- Start/pause/stop recording
- Save project with metadata and thumbnail placeholder
- Play saved recording
- Basic trim metadata controls
- Export current recording to a chosen file
- Local-only storage
- No payment/cloud dependency

## Later Feature Targets

- System tray quick recorder
- Region/window/fullscreen selection
- Microphone + system audio mixer
- Webcam overlay
- Mouse highlight/click effects
- Timeline trim/split
- Text/image overlays
- Captions
- Background blur/removal
- MP4 export presets
- GIF export
- Screenshot projects
- Local callback HTTP service for deep links
- Auto-updater
