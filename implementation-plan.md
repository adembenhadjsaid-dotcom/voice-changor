# Implementation Plan — VoiceFun

## Summary

6-phase build of a client-side voice changer. Record audio → apply Web Audio API effects → preview → download as WAV. Zero backend.

## Phase 1: Project Scaffold

**Goal:** Vite + React running with basic layout.

```bash
npm create vite@latest . -- --template react
```

**Files:**
- `package.json` — vite + react deps
- `vite.config.js` — default
- `index.html` — single page root
- `src/main.jsx` — React DOM mount
- `src/App.jsx` — root component, placeholder layout
- `src/App.css` — reset + grid layout + record button styling

**Layout:**
- Centered column, max-width 600px
- Big red record button (top)
- Effect grid (middle, 4 columns)
- Audio player + download (bottom, hidden until recording exists)

**Done when:** `npm run dev` shows the layout with a record button and empty effect grid.

---

## Phase 2: Audio Recording

**Goal:** Record audio via MediaRecorder, store as Blob.

**New file:** `src/hooks/useAudioRecorder.js`

```js
// Returns: { start, stop, audioBlob, isRecording, duration }
// Uses MediaRecorder with audio/webm;codecs=opus
// On stop: creates Blob from recorded chunks
// Duration: interval timer updated every 100ms
```

**Update:** `App.jsx` — wire RecordButton to the hook, show duration during recording.

**Done when:** Click record → speak → stop → audioBlob exists (verify in console).

---

## Phase 3: Effects Engine

**Goal:** All 20 effects defined as Web Audio API node-chain functions.

**New file:** `src/effects/index.js`

Each effect is `(audioBuffer, ctx) => Promise<AudioBuffer>` using OfflineAudioContext for rendering to a new buffer (needed for both preview and download).

**Effects grouped by implementation pattern:**

### Pitch-based (6 effects) — `playbackRate` on BufferSource

| Effect | Pitch | Extra |
|--------|-------|-------|
| Baby | 1.6x | highpass 800Hz |
| Helium | 2.2x | highpass 1000Hz |
| Chipmunk | 1.8x | slight resonance boost |
| Deep Voice | 0.6x | lowpass 400Hz + bass boost |
| Monster | 0.4x | lowpass 300Hz + waveshaper distortion |
| Dog | 0.5x | tremolo gate 8Hz |

### Filter-based (3 effects) — BiquadFilterNode

| Effect | Filter | Params |
|--------|--------|--------|
| Radio | bandpass | Q=5, freq=1000Hz |
| Cave | convolver | synthetic impulse (decaying noise 0.8s) |
| Horror Whisper | lowpass 600Hz | gain=0.3 + reverb |

### Delay/modulation-based (5 effects) — DelayNode + oscillation

| Effect | Technique |
|--------|-----------|
| Echo | delay 0.3s, feedback 0.4, 3 taps |
| Drunk | delay 0.15s + pitch wobble via LFO on playbackRate |
| Crying | pitch mod via LFO on playbackRate (3Hz ± 0.3) |
| Duck | fast pitch mod 6Hz ± 0.5 |
| Cat | random pitch jumps every 0.2s |

### Distortion/modulation (4 effects) — WaveShaperNode + custom

| Effect | Technique |
|--------|-----------|
| Robot | bitcrush (downsample via custom waveshaper) + bandpass |
| Evil Laugh | heavy waveshaper + chorus (short delay modulated) |
| Alien | random modulation via sample-and-hold LFO on pitch |
| Glitch | buffer slicing — repeat 0.1s chunks randomly |

### Utility (2 effects)

| Effect | Technique |
|--------|-----------|
| Autotune | hard pitch snap to nearest semitone (quantize playbackRate) |
| Reverse | `AudioBuffer.reverse()` |

**Implementation approach:**
- All effects share a helper: `renderEffect(audioBuffer, effectFn, outputLength?)` that creates an OfflineAudioContext, calls `effectFn(ctx)`, renders, returns new AudioBuffer.
- Each effect function returns `{ source, nodes }` or modifies the context directly.
- One file, ~250 lines total for all 20 effects.

**Done when:** Can call any effect on a recorded AudioBuffer and get a modified AudioBuffer back.

---

## Phase 4: Playback + Effect Switching

**Goal:** Play the modified audio, switch effects instantly.

**New file:** `src/components/AudioPlayer.jsx`
- Play/pause button
- Current effect label
- Visual feedback (playing state)

**Update:** `src/components/EffectGrid.jsx`
- Grid of effect buttons (4 cols)
- Click selects effect, triggers re-render of modified audio
- Visual indicator for selected effect
- Disabled state during recording

**Update:** `App.jsx`
- On recording complete: decode Blob → AudioBuffer, store in state
- On effect select: apply effect to stored AudioBuffer → play via AudioPlayer
- Allow quick switching: stop current playback, apply new effect, play

**Flow:**
1. User finishes recording → `audioBuffer` stored
2. User clicks effect → `applyEffect(audioBuffer, effectName)` → play
3. User clicks different effect → stop → apply → play
4. All in-memory, no loading (effects render in <500ms)

**Done when:** Record → click effect → hear modified audio. Click another effect → hear that one instead.

---

## Phase 5: Download

**Goal:** Export modified audio as WAV file.

**New file:** `src/utils/exportWav.js`

```js
// encodeWav(audioBuffer) → Blob
// Interleaves L/R channels, writes WAV header + PCM data
// Returns Blob for download
```

**New file:** `src/components/DownloadButton.jsx`
- Disabled until an effect has been applied
- On click: render current effect to WAV blob → trigger download via `<a>` click

**Update:** `App.jsx` — wire download button.

**Done when:** Apply effect → download → open .wav → hear modified audio.

---

## Phase 6: Polish

**Goal:** Responsive layout, timer display, edge cases.

**Tasks:**
- Timer display during recording (MM:SS format)
- Responsive grid (2 cols on mobile)
- Disable download during playback
- Handle no-microphone case (show error message)
- Handle permission denied
- Add title + brief description to header
- Keyboard shortcut: Space to record, 1-9 to select effects

**Done when:** Works on Chrome desktop + mobile. No crashes on permission denial.

---

## Effects Reference (20 total)

| # | Category | Effect Name | Key Technique |
|---|----------|-------------|---------------|
| 1 | Core | Baby | 1.6x pitch + highpass |
| 2 | Core | Monster | 0.4x pitch + distortion |
| 3 | Core | Robot | Bitcrush + bandpass |
| 4 | Core | Helium | 2.2x pitch |
| 5 | Core | Deep Voice | 0.6x pitch + bass boost |
| 6 | Core | Echo | 3-tap delay |
| 7 | Core | Cave | Convolution reverb |
| 8 | Core | Radio | Bandpass filter |
| 9 | Funny | Drunk | Delay + pitch wobble |
| 10 | Funny | Crying | Pitch modulation 3Hz |
| 11 | Funny | Evil Laugh | Heavy distortion + chorus |
| 12 | Funny | Chipmunk | 1.8x pitch |
| 13 | Animal | Cat | Random pitch jumps |
| 14 | Animal | Dog | Low pitch + tremolo gate |
| 15 | Animal | Duck | Fast pitch modulation |
| 16 | Animal | Alien | Random modulation |
| 17 | Creative | Horror Whisper | Lowpass + reverb + low gain |
| 18 | Creative | Autotune | Pitch quantization |
| 19 | Creative | Glitch | Buffer slicing |
| 20 | Creative | Reverse | Buffer reverse |

## Risks

- **WAV export complexity** — PCM interleaving is ~50 lines of manual byte writing. Not hard, just fiddly. Use a known-working WAV header format.
- **ConvolverNode reverb** — need to generate synthetic impulse response (decaying white noise). ~10 lines.
- **Glitch effect** — buffer slicing needs care to avoid clicks at splice points. Crossfade at boundaries.
- **Mobile Safari** — MediaRecorder support spotty. Chrome-first, note in README.

## Success Criteria

- [ ] Record → apply effect → hear it in < 5 seconds
- [ ] All 20 effects work and sound distinct
- [ ] Download produces playable WAV
- [ ] No external audio libraries
- [ ] Works on Chrome (desktop + mobile)
