# Tasks: VoiceFun

**Input**: Design documents from `/implementation-plan.md`

**Prerequisites**: implementation-plan.md (plan + effects reference), claude.md (architecture)

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story. 4 user stories derived from implementation plan phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vite + React scaffold with basic layout

- [X] T001 Scaffold Vite + React project in project root with `npm create vite@latest . -- --template react` and install dependencies
- [X] T002 [P] Create `src/App.css` with CSS reset, centered column layout (max-width 600px), record button styles, effect grid placeholder, and player area
- [X] T003 [P] Create `src/App.jsx` with placeholder layout containing three sections: record area (top), effect grid area (middle), player/download area (bottom, hidden)
- [X] T004 Verify `npm run dev` shows the layout with a record button and empty grid

---

## Phase 2: Foundational (Effects Engine)

**Purpose**: Core audio processing engine shared by US2 and US3

**⚠️ CRITICAL**: US2 (playback) and US3 (download) cannot work until this phase is complete

- [X] T005 Create `src/effects/index.js` with `renderEffect(audioBuffer, effectFn)` helper using OfflineAudioContext, named exports map for all 20 effects, and `getEffectNames()` utility
- [X] T006 Implement pitch-based effects in `src/effects/index.js`: Baby (1.6x + highpass 800Hz), Helium (2.2x + highpass 1000Hz), Chipmunk (1.8x + resonance boost), Deep Voice (0.6x + lowpass 400Hz + bass boost), Monster (0.4x + lowpass 300Hz + waveshaper distortion), Dog (0.5x + tremolo gate 8Hz)
- [X] T007 Implement filter-based effects in `src/effects/index.js`: Radio (bandpass Q=5 freq=1000Hz), Cave (ConvolverNode with synthetic 0.8s decaying noise impulse), Horror Whisper (lowpass 600Hz + gain 0.3 + reverb)
- [X] T008 Implement delay/modulation effects in `src/effects/index.js`: Echo (3-tap delay 0.3s feedback 0.4), Drunk (delay 0.15s + LFO pitch wobble), Crying (LFO pitch mod 3Hz ± 0.3), Duck (fast pitch mod 6Hz ± 0.5), Cat (random pitch jumps every 0.2s)
- [X] T009 Implement distortion/modulation effects in `src/effects/index.js`: Robot (bitcrush via waveshaper + bandpass), Evil Laugh (heavy waveshaper + chorus), Alien (sample-and-hold LFO random pitch), Glitch (buffer slicing with 0.1s chunk repeat + crossfade)
- [X] T010 Implement utility effects in `src/effects/index.js`: Autotune (playbackRate quantized to nearest semitone), Reverse (AudioBuffer.reverse())

**Checkpoint**: All 20 effects callable via `renderEffect(buffer, effects.baby)` → returns modified AudioBuffer

---

## Phase 3: User Story 1 — Record Audio (Priority: P1) 🎯 MVP

**Goal**: User can record their voice and see a timer

**Independent Test**: Click record → speak for 5 seconds → stop → `audioBlob` exists in state (verify via React DevTools or console)

### Implementation for User Story 1

- [X] T011 [P] [US1] Create `src/hooks/useAudioRecorder.js` implementing MediaRecorder wrapper with `start()`, `stop()`, `audioBlob` state, `isRecording` boolean, `duration` timer (100ms interval), using `audio/webm;codecs=opus` MIME type
- [X] T012 [P] [US1] Create `src/components/RecordButton.jsx` with large circular record button, red fill when recording, pulsing animation during recording, click toggles start/stop via hook props, displays MM:SS timer below button
- [X] T013 [US1] Wire `useAudioRecorder` and `RecordButton` into `src/App.jsx`: call `start()` on record click, call `stop()` on stop click, store `audioBlob` in component state, display duration

**Checkpoint**: Click record → speak → stop → audioBlob exists, timer shows elapsed time

---

## Phase 4: User Story 2 — Apply Effects & Preview (Priority: P1) 🎯 MVP

**Goal**: User can select an effect and hear their recording modified in real-time

**Independent Test**: After recording, click any effect → hear modified audio within 1 second. Click different effect → hear that one instead.

### Implementation for User Story 2

- [X] T014 [P] [US2] Create `src/components/EffectGrid.jsx` rendering a 4-column CSS grid of effect buttons, each labeled with effect name and category emoji, highlighting selected effect, disabled state when no recording exists, onClick callback receives effect name
- [X] T015 [P] [US2] Create `src/components/AudioPlayer.jsx` with play/pause button, current effect name label, progress indicator, accepts `audioBuffer` + `effectName` props, plays modified audio via real-time AudioContext with effect node chain
- [X] T016 [US2] Wire effect selection and playback into `src/App.jsx`: on recording complete decode Blob → AudioBuffer via `AudioContext.decodeAudioData()`, on effect click apply effect via `renderEffect()` then play via AudioPlayer, on effect switch stop current playback → apply new effect → play, store `audioBuffer` and `selectedEffect` in state

**Checkpoint**: Record → click "Baby" → hear high-pitched audio. Click "Monster" → hear low distorted audio. Switch is instant.

---

## Phase 5: User Story 3 — Download Audio (Priority: P2)

**Goal**: User can download the modified audio as a WAV file

**Independent Test**: After applying an effect, click download → .wav file saves → open in any audio player → hear modified audio

### Implementation for User Story 3

- [X] T017 [P] [US3] Create `src/utils/exportWav.js` implementing `encodeWav(audioBuffer)` that interleaves L/R channels into PCM16 data, writes standard 44-byte WAV header (RIFF/WAVE/fmt/data chunks), returns Blob with `audio/wav` MIME type
- [X] T018 [P] [US3] Create `src/components/DownloadButton.jsx` with download icon button, disabled when no effect has been applied, onClick triggers WAV encoding of current effect output then downloads via temporary `<a>` element with `URL.createObjectURL`
- [X] T019 [US3] Wire download into `src/App.jsx`: pass current audioBuffer + selectedEffect to DownloadButton, on download click render effect via `renderEffect()` then encode via `encodeWav()` then trigger browser download with filename `{effect-name}-voice.wav`

**Checkpoint**: Record → apply "Robot" effect → download → open file → hear robot-ified audio

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Responsive layout, error handling, UX improvements

- [X] T020 [P] Add responsive CSS to `src/App.css`: 2-column effect grid on viewports under 600px, touch-friendly button sizes (min 44px), proper spacing
- [X] T021 Add error handling to `src/App.jsx`: detect `navigator.mediaDevices` availability, show friendly message if microphone not supported, catch `NotAllowedError` for permission denial, display error state in RecordButton area
- [X] T022 Add header to `src/App.jsx` with app title "VoiceFun" and one-line description "Record your voice, apply effects, have fun"
- [X] T023 Add keyboard shortcuts to `src/App.jsx`: Space bar toggles recording, number keys 1–9 and 0 select effects by grid position, Escape stops playback

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS US2 and US3
- **US1 (Phase 3)**: Depends on Setup only — can run parallel with Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (effects engine) AND US1 (needs audioBuffer to apply effects to)
- **US3 (Phase 5)**: Depends on Phase 2 (effects engine) AND US1 (needs audioBuffer)
- **Polish (Phase 6)**: Depends on all user stories being functional

### User Story Dependencies

- **US1 (Record Audio)**: Independent after Setup — no story dependencies
- **US2 (Apply Effects)**: Depends on US1 (needs recorded audioBuffer) + Phase 2 (effects engine)
- **US3 (Download)**: Depends on US1 (needs recorded audioBuffer) + Phase 2 (effects engine)
- **US4 (Polish)**: Depends on US1 + US2 + US3 being complete

### Within Each User Story

- [P] tasks (different files) can launch simultaneously
- Hook/component creation before App.jsx wiring
- App.jsx integration always last in its phase

### Parallel Opportunities

```
# Phase 1: T002 + T003 (different files, no deps)
# Phase 3: T011 + T012 (different files, no deps)
# Phase 4: T014 + T015 (different files, no deps)
# Phase 5: T017 + T018 (different files, no deps)
# Phase 6: T020 alone (different file), then T021-T023 sequential (same file)
```

---

## Parallel Example: User Story 1

```bash
# Launch both creation tasks together (different files, no dependencies):
Task T011: "Create src/hooks/useAudioRecorder.js with MediaRecorder wrapper"
Task T012: "Create src/components/RecordButton.jsx with record button + timer"

# Then wire both into App.jsx:
Task T013: "Wire useAudioRecorder and RecordButton into src/App.jsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Effects Engine (T005–T010)
3. Complete Phase 3: US1 Record Audio (T011–T013)
4. Complete Phase 4: US2 Apply Effects (T014–T016)
5. **STOP AND VALIDATE**: Record → apply effect → hear it
6. This is the MVP — deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → scaffold ready
2. US1 → can record audio (no effects yet)
3. US2 → can record + apply effects + preview (MVP!)
4. US3 → can record + effects + download
5. US4 → polished, responsive, error-handling

---

## Notes

- All effects are pure functions in a single file (~250 lines) — no external audio libs
- WAV encoder is ~50 lines of manual PCM byte writing — no export library
- No CSS framework — ~80 lines total in App.css
- Effects render via OfflineAudioContext in <500ms — no loading states needed
- Chrome-first (MediaRecorder `audio/webm;codecs=opus` is Chrome-native)
