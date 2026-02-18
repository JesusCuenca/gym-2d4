# 2D4 Gym TV — Project Context

## 1. Overview

**2D4 Gym TV** is a web app for boutique/CrossFit gyms. Trainers plan classes in advance and project routines, exercises, and timers on the gym's TV screens in real-time.

Two interfaces under the same project:

1. **Admin Panel (`/admin`):** Used by the trainer on mobile/tablet. CRUD for blocks and classes, and a "Live Remote" to control the TV (Play, Pause, Next Block).
2. **TV Display (`/tv/:screenId`):** A read-only "10-foot UI" (designed to be seen from afar). Subscribes to Firestore changes and renders the current state.

## 2. Code Conventions

- **Language:** All code, variable names, Firestore properties, and comments in **English**.
- **Naming:** **camelCase** for all properties and variables. No snake_case.
- **Components:** Vue 3 Composition API with `<script setup>`.
- **Styling:** Tailwind CSS utility-first. No custom CSS unless strictly necessary.

## 3. Tech Stack

- **Frontend:** Vue 3 (Composition API + `<script setup>`), Vite 7.
- **State & Routing:** Pinia, Vue Router 4.
- **Styles:** Tailwind CSS 4, Barlow Condensed font (Google Fonts).
- **Backend:** Firebase (Firestore for real-time database, Auth for admin authentication).
- **Environment:** Firebase credentials via `VITE_FIREBASE_*` env vars in `.env.local` (git-ignored).

## 4. Project Structure

```
src/
├── firebase.js                      # Firebase init (db, auth, serverTimestamp exports)
├── main.js                          # App entry: Pinia, Router, auth init before mount
├── App.vue                          # Root component (RouterView)
├── style.css                        # Tailwind import + custom theme colors/fonts
│
├── models/
│   └── blockTypes.js                # BLOCK_TYPES, TIMED_PRESETS, isTimed(), getBlockLabel(), getRepsSubcase()
│
├── utils/
│   ├── time.js                      # timeStringToSeconds, secondsToTimeString, formatTimer, formatTimerTwoLine
│   └── timeline.js                  # buildTimeline (flat segment array), getTotalDuration
│
├── composables/
│   ├── useTimer.js                  # Timer engine (rAF loop + timeline-based computed values)
│   └── useConnectionStatus.js       # Firestore connection status
│
├── stores/
│   ├── auth.js                      # Firebase Auth: login, logout, initAuth, onAuthStateChanged
│   ├── blockStore.js                # Block CRUD: fetchBlocks, createBlock, updateBlock, deleteBlock
│   ├── classStore.js                # Class CRUD: fetchClasses, createClass, deleteClass, getClassById
│   ├── screenStore.js               # Screen CRUD + subscribeToScreen (real-time for TV)
│   └── sessionStore.js              # Live session: startSession, play, pause, nextBlock, endSession
│
├── layouts/
│   └── AdminLayout.vue              # Admin nav bar + RouterView
│
├── components/
│   ├── ScreenManager.vue            # Add/delete screens (used in Dashboard)
│   └── tv/
│       ├── TvWaitingScreen.vue      # "Waiting..." when no session
│       ├── TvBlockDisplay.vue       # Dispatcher: picks TvTimedLayout or TvRepsLayout via isTimed()
│       ├── TvTimedLayout.vue        # Data-driven timed layout (countdown + exercises/single + rest overlay)
│       ├── TvRepsLayout.vue         # Rep-based layout (3 sub-cases: sameReps, perRound, perExercise)
│       ├── TvTimerCountdown.vue     # Giant countdown digits, two-line format, cyan during rest
│       ├── TvExerciseList.vue       # Exercise list with rep badges (orange squares)
│       ├── TvSingleExercise.vue     # Single colossal exercise (rotate mode)
│       ├── TvInfoPill.vue           # Bottom-right info pill
│       ├── TvRestScreen.vue         # Between-blocks "Get Ready" screen
│       └── TvFinishedScreen.vue     # "CLASS FINISHED" screen
│
└── views/
    ├── LoginView.vue                # Email/password login form
    ├── AdminDashboardView.vue       # Stats, quick actions, screen manager
    ├── AdminBlocksView.vue          # Block list with cards
    ├── AdminBlockCreateView.vue     # Block form with type selection + timed presets
    ├── AdminClassesView.vue         # Class list with "Start Live"
    ├── AdminClassCreateView.vue     # Class builder with inline block editor + presets
    ├── AdminClassLiveView.vue       # Live remote control (Play/Pause/Next/End)
    └── TvDisplayView.vue            # TV: screen subscription → session subscription → render
```

## 5. Firestore Data Model

### 5.1 Block Model — 2 Types + Presets

Blocks use **only 2 data types**: `timed` and `reps`. Common workout formats (AMRAP, EMOM, Tabata) are **UI presets** that pre-fill the form — they don't exist as distinct types at the data level.

**Design principle:** The TV is 100% data-driven. It never checks `type` or `preset` to decide layout — it reads `rounds`, `workSeconds`, `restSeconds`, `exerciseMode`, and the pre-computed timeline to render everything.

#### Collection: `blocks`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Block display name (e.g. "AMRAP 15 min") |
| `type` | string | `timed` or `reps` |
| `preset` | string\|null | `amrap`, `emom`, `tabata`, or `null` — only for admin UX, TV ignores this |
| `rounds` | number | Number of rounds (AMRAP = 1) |
| `workSeconds` | number | Work phase duration per round in seconds (timed only) |
| `restSeconds` | number | Rest phase duration per round in seconds (0 = no rest) |
| `exerciseMode` | string | `all` (show full list) or `rotate` (one exercise at a time, cycling) |
| `repsEveryRound` | number\|null | Same reps each round (reps blocks, sub-case: sameReps) |
| `repsPerRound` | array\|null | Different reps per round e.g. `[21, 15, 9]` (reps blocks, sub-case: perRound) |
| `exercises` | array | List of exercises (see below) |
| `createdAt` | Timestamp | Server timestamp |
| `uid` | string | Owner user ID |

**Exercise object within `exercises` array:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Exercise name |
| `repsEveryRound` | number\|null | Reps per round (shown as orange square badge on TV) |
| `notes` | string\|null | Optional notes |

#### Timed Presets

Presets are shortcuts in the admin form. They pre-fill fields with sensible defaults:

| Preset | `rounds` | `workSeconds` | `restSeconds` | `exerciseMode` |
|--------|----------|---------------|----------------|----------------|
| AMRAP | 1 | total time cap | 0 | `all` |
| EMOM | N intervals | interval duration | 0 | `all` |
| Tabata | 8 | 20 | 10 | `rotate` |
| (custom) | user-defined | user-defined | user-defined | user-defined |

#### Block Examples

**AMRAP 12 min** (timed, preset: amrap):
```json
{
  "name": "AMRAP 12",
  "type": "timed",
  "preset": "amrap",
  "rounds": 1,
  "workSeconds": 720,
  "restSeconds": 0,
  "exerciseMode": "all",
  "exercises": [
    { "name": "Thrusters", "repsEveryRound": 15, "notes": null },
    { "name": "Box Jumps", "repsEveryRound": 12, "notes": "24 inch" },
    { "name": "Pull-ups", "repsEveryRound": 9, "notes": null }
  ]
}
```

**EMOM 6 rounds x 60s** (timed, preset: emom):
```json
{
  "name": "EMOM 6",
  "type": "timed",
  "preset": "emom",
  "rounds": 6,
  "workSeconds": 60,
  "restSeconds": 0,
  "exerciseMode": "all",
  "exercises": [
    { "name": "Power Cleans", "repsEveryRound": 5, "notes": "70kg" },
    { "name": "Burpees", "repsEveryRound": 10, "notes": null }
  ]
}
```

**Tabata** (timed, preset: tabata):
```json
{
  "name": "Tabata Core",
  "type": "timed",
  "preset": "tabata",
  "rounds": 8,
  "workSeconds": 20,
  "restSeconds": 10,
  "exerciseMode": "rotate",
  "exercises": [
    { "name": "Sit-ups", "repsEveryRound": null, "notes": null },
    { "name": "Plank Hold", "repsEveryRound": null, "notes": null }
  ]
}
```

**Custom timed** (timed, no preset):
```json
{
  "name": "Intervals 4x3",
  "type": "timed",
  "preset": null,
  "rounds": 4,
  "workSeconds": 180,
  "restSeconds": 60,
  "exerciseMode": "rotate",
  "exercises": [
    { "name": "Row", "repsEveryRound": null, "notes": "Max cal" },
    { "name": "Assault Bike", "repsEveryRound": null, "notes": "Max cal" },
    { "name": "Ski Erg", "repsEveryRound": null, "notes": "Max cal" }
  ]
}
```

**Reps — same reps every round:**
```json
{
  "name": "5 Rounds",
  "type": "reps",
  "preset": null,
  "rounds": 5,
  "repsEveryRound": 10,
  "exercises": [
    { "name": "Deadlifts", "repsEveryRound": null, "notes": "100kg" },
    { "name": "Box Jumps", "repsEveryRound": null, "notes": "24 inch" }
  ]
}
```

**Reps — different reps per round (e.g. "21-15-9"):**
```json
{
  "name": "Fran",
  "type": "reps",
  "preset": null,
  "rounds": 3,
  "repsPerRound": [21, 15, 9],
  "exercises": [
    { "name": "Thrusters", "repsEveryRound": null, "notes": "42.5kg" },
    { "name": "Pull-ups", "repsEveryRound": null, "notes": null }
  ]
}
```

**Reps — per exercise (each exercise has its own reps):**
```json
{
  "name": "Accessory",
  "type": "reps",
  "preset": null,
  "rounds": 3,
  "exercises": [
    { "name": "DB Rows", "repsEveryRound": 12, "notes": "Each arm" },
    { "name": "Plank Hold", "repsEveryRound": null, "notes": "45s" }
  ]
}
```

#### Reps Sub-cases

The `getRepsSubcase(block)` helper determines which of 3 layout variations to use:

| Sub-case | Condition | TV Left (30%) |
|----------|-----------|---------------|
| `sameReps` | `block.repsEveryRound` is set | Big orange square with rep count |
| `perRound` | `block.repsPerRound` has entries | Series breakdown (21-15-9) |
| `perExercise` | Neither of the above | Empty — reps shown per exercise in the list |

### 5.2 Collection: `screens`

Each physical TV in the gym is a `screen`. The URL `/tv/:screenId` subscribes to this document.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name (e.g. "Sala 1", "Box Principal") |
| `activeSessionId` | string\|null | ID of the session currently displayed on this screen |
| `createdAt` | Timestamp | Server timestamp |
| `uid` | string | Owner user ID |

### 5.3 Collection: `classes`

A class is an ordered sequence of blocks. Block data is **denormalized** (copied) into the class at creation time so the TV never needs N+1 queries and editing a block later doesn't change existing classes.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Class name (e.g. "Monday WOD") |
| `description` | string\|null | Optional description |
| `blocks` | array | Ordered block snapshots (see below) |
| `createdAt` | Timestamp | Server timestamp |
| `uid` | string | Owner user ID |

**Block reference within `blocks` array:**

| Field | Type | Description |
|-------|------|-------------|
| `blockId` | string | Reference to original block document |
| `blockData` | object | Full denormalized copy of the block (same fields as `blocks` collection) |
| `order` | number | Position in the class (0-based) |

### 5.4 Collection: `sessions`

A live session is the real-time state of a class being projected. This is the **single source of truth** that the TV reads.

| Field | Type | Description |
|-------|------|-------------|
| `classId` | string | Reference to the class |
| `className` | string | Denormalized class name |
| `blocks` | array | Full denormalized class blocks |
| `currentBlockIndex` | number | Which block is active (0-based index) |
| `clockState` | string | `stopped` \| `running` \| `paused` \| `finished` |
| `startTimestamp` | Timestamp\|null | Server time when Play was pressed (null when not running) |
| `accumulatedTime` | number | Seconds elapsed before the current Play (for pause/resume) |
| `sessionState` | string | `active` \| `finished` |
| `screenId` | string | Which screen this session is assigned to |
| `uid` | string | Owner user ID |
| `createdAt` | Timestamp | Server timestamp |

## 6. TV Design Rules (10-foot UI)

The TV interface must be extremely clean. Athletes are moving and sweating — no distractions.

- **Core Colors:**
  - Background: Black (`bg-gymBlack` / `#0A0A0A`) to avoid glare.
  - Primary/Action: Vivid orange (`text-gymOrange` / `#FB6537`).
  - Rest/Recovery: Cyan (`text-gymRest` / `#06B6D4`).

- **Typography:** Giant, condensed, uppercase, extra bold (`font-condensed font-black uppercase tracking-tighter`).

- **Shape Psychology:**
  - **Reps:** Always inside an orange rounded square (`bg-gymOrange rounded-xl`).

- **Timer Two-Line Format:** If total seconds >= 100 → minutes on first line, `:SS` on second. If < 100 → only `:SS`. During rest phases, timer color switches to cyan.

## 7. TV Layout: The 30/70 Rule

All workout types use a split layout: **30% Left (Controller) / 70% Right (Action)**. A "Pill" in the bottom-right shows extra info.

### Timed Blocks (`type === 'timed'`)

The TV is 100% data-driven via the timeline (pre-computed segment array). No type/preset checks.

- **Left (30%):** Giant countdown timer (phase seconds left) + block name + round info.
  - 1 round: shows total time.
  - Multiple rounds: shows "RONDA X / Y".
  - During rest: timer turns cyan.
- **Right (70%):**
  - `exerciseMode: 'all'`: Full exercise list. During rest: "DESCANSO" overlay.
  - `exerciseMode: 'rotate'`: Single colossal exercise, auto-cycling. During rest: replaces exercise with "DESCANSO".
- **Pill:** Next exercise name (rotate mode only).

### Reps Blocks (`type === 'reps'`)

Athlete-paced. No countdown — clock counts **up** (stopwatch in pill).

- **Left (30%):** Depends on sub-case (see `getRepsSubcase()`):
  - `sameReps`: Big orange square with rep count + "cada ronda".
  - `perRound`: Series breakdown (e.g. "21-15-9").
  - `perExercise`: Empty.
- **Right (70%):** Full exercise list with orange rep badges.
- **Pill:** Elapsed time stopwatch.

## 8. Timeline Engine

The timeline is a **pre-computed flat array of segments** built once per block by `buildTimeline()` in `src/utils/timeline.js`. This eliminates complex modular arithmetic at 60fps.

Each segment: `{ startAt, duration, phase: 'work'|'rest', round, exerciseIndex }`.

- `exerciseIndex: null` → show all exercises (`exerciseMode: 'all'`).
- `exerciseIndex: N` → show exercise at index N (`exerciseMode: 'rotate'`).

**`useTimer.js`** uses `requestAnimationFrame` to compute `displaySeconds`, then does a simple `findLast()` on the timeline to derive: `phaseSecondsLeft`, `isResting`, `currentRound`, `totalRounds`, `currentExerciseIndex`, `nextExerciseName`, `isBlockFinished`.

## 9. Timer Engine (Firebase Sync)

**CRITICAL RULE:** Never store "time remaining" in Firestore. This would saturate the database and cause desync.

- **Play:** Admin writes `startTimestamp = serverTimestamp()` + `clockState = 'running'` to the session document.
- **TV reads** `startTimestamp` once from the Firestore snapshot, then uses `requestAnimationFrame` locally: `elapsed = (Date.now() - startTimestamp) + accumulatedTime`.
- **Pause:** Admin calculates elapsed time, adds it to `accumulatedTime`, sets `startTimestamp = null`.
- **Implementation:** `src/composables/useTimer.js` — watches `clockState`, starts/stops the rAF loop accordingly. Timeline-based computed values derive all display state from `displaySeconds`.

## 10. Multi-Screen Architecture

A gym can have multiple TVs in different rooms. Each TV is a `screen` document in Firestore.

**Subscription chain for `/tv/:screenId`:**
1. Subscribe to `screens/:screenId` document.
2. Read `activeSessionId` from the screen.
3. Subscribe to `sessions/:activeSessionId` for real-time updates.
4. If `activeSessionId` changes (new session assigned), seamlessly switch.

**Starting a live session:**
1. Admin selects a class and clicks "Start Live".
2. Admin chooses which screen to project on.
3. Session document created in Firestore.
4. Screen's `activeSessionId` updated to point to the new session.
5. TV detects the change and starts rendering.
