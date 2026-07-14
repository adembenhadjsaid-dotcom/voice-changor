# CLAUDE.md — VoiceFun

## Project

Lightweight voice changer web app. Record audio → apply fun effects → download. No backend, no accounts, all client-side.

## Tech Stack

- **Vite** — build tool, dev server
- **React 18** — UI (useState for state management, no external state lib needed)
- **Web Audio API** — all audio processing (AudioContext, BiquadFilterNode, GainNode, DelayNode, WaveShaperNode, ConvolverNode)
- **MediaRecorder API** — browser audio recording
- **WAV encoding** — manual PCM export (no external lib)

No CSS framework. No audio processing library. No state management library.

## Dev Commands

```bash
npm install          # install deps
npm run dev          # start Vite dev server (localhost:5173)
npm run build        # production build to dist/
npm run preview      # preview production build locally
```

## Architecture

```
src/
├── main.jsx              # React entry point
├── App.jsx               # Root component, holds all state
├── App.css               # All styles (single file, ~80 lines)
├── hooks/
│   └── useAudioRecorder.js   # MediaRecorder wrapper, returns { start, stop, audioBlob, isRecording, duration }
├── effects/
│   └── index.js              # All 20 effects as node-chain functions
├── components/
│   ├── RecordButton.jsx      # Big record button with timer
│   ├── EffectGrid.jsx        # Effect selector grid
│   ├── AudioPlayer.jsx       # Playback controls + effect switching
│   └── DownloadButton.jsx    # WAV download
└── utils/
    └── exportWav.js          # AudioBuffer → WAV Blob encoder
```

## Key Patterns

### Effect Definition

Every effect is a function `(ctx, destination) => AudioNode` that configures an AudioContext node chain and returns the last node. Same definition works for real-time preview and OfflineAudioContext export.

```js
// effects/index.js
export const baby = (ctx, dest) => {
  const src = ctx.createBufferSource();
  src.playbackRate.value = 1.6;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;
  src.connect(filter).connect(dest);
  return src;
};
```

### State Machine

App state is 4 values: `idle` → `recording` → `ready` → `playing`. No enum, just a string. `isRecording` boolean covers 2 states.

### Audio Pipeline

1. **Record** → MediaRecorder captures Blob
2. **Decode** → Blob → AudioBuffer via `AudioContext.decodeAudioData()`
3. **Preview** → Real-time AudioContext with effect node chain
4. **Download** → OfflineAudioContext renders effect to buffer → WAV encode → download

## Conventions

- Effects: pure functions, no side effects outside AudioContext
- Components: functional components only, no class components
- Styles: single CSS file, no CSS-in-JS
- No TypeScript (vanilla JS, keep it simple)
- No tests unless explicitly requested (YAGNI for a fun project)
