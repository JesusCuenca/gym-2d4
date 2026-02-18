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
│   └── blockTypes.js                # BLOCK_TYPES, BLOCK_FAMILY constants, getFamilyForType()
│
├── utils/
│   └── time.js                      # timeStringToSeconds, secondsToTimeString, formatTimer
│
├── composables/
│   └── useTimer.js                  # Timer engine (requestAnimationFrame, reads startTimestamp)
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
│       ├── TvBlockDisplay.vue       # Dispatcher: picks Family A or B layout
│       ├── TvFamilyALayout.vue      # Time-based: 30% countdown + 70% exercises
│       ├── TvFamilyBLayout.vue      # Rep-based: 30% round info + 70% exercise list
│       ├── TvTimerCountdown.vue     # Giant countdown digits (shows "TIME!" at 0)
│       ├── TvTimerCountup.vue       # Stopwatch counting up
│       ├── TvExerciseList.vue       # Exercise list with shape convention
│       ├── TvSingleExercise.vue     # Single colossal exercise (EMOM)
│       ├── TvInfoPill.vue           # Bottom-right info pill
│       ├── TvRestScreen.vue         # Between-blocks "Get Ready" screen
│       └── TvFinishedScreen.vue     # "CLASS FINISHED" screen
│
└── views/
    ├── LoginView.vue                # Email/password login form
    ├── AdminDashboardView.vue       # Stats, quick actions, screen manager
    ├── AdminBlocksView.vue          # Block list with cards
    ├── AdminBlockCreateView.vue     # Block form (create + edit mode)
    ├── AdminClassesView.vue         # Class list with "Start Live"
    ├── AdminClassCreateView.vue     # Class builder (select + order blocks)
    ├── AdminClassLiveView.vue       # Live remote control (Play/Pause/Next/End)
    └── TvDisplayView.vue            # TV: screen subscription → session subscription → render
```

## 5. Firestore Data Model

### 5.1 Collection: `blocks`

A block is the smallest unit of training. Every block belongs to one of **two families** that determine the TV layout.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Block display name (e.g. "AMRAP 15 min") |
| `type` | string | One of: `amrap`, `emom`, `tabata`, `forTime`, `strength`, `customTime`, `customReps` |
| `family` | string | `timeBased` or `repBased` — computed from `type` at creation, stored for TV convenience |
| `timeCapSeconds` | number\|null | Total duration in seconds (Family A only) |
| `rounds` | number\|null | Number of rounds (EMOM, Tabata, Strength) |
| `intervalSeconds` | number\|null | Interval duration in seconds (EMOM only) |
| `repScheme` | string\|null | Rep scheme string e.g. "21-15-9" (Family B only) |
| `exercises` | array | List of exercises (see below) |
| `createdAt` | Timestamp | Server timestamp |
| `uid` | string | Owner user ID |

**Exercise object within `exercises` array:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Exercise name |
| `reps` | number\|null | Number of reps (shown as orange square on TV) |
| `timeSeconds` | number\|null | Duration in seconds (shown as orange circle on TV) |
| `weight` | string\|null | Free text e.g. "60kg", "60% RM" |
| `notes` | string\|null | Optional notes |

#### Block Type Examples

**AMRAP** (Family A — timeBased): "As Many Rounds As Possible" within a time cap.
```json
{
  "name": "AMRAP 15",
  "type": "amrap",
  "family": "timeBased",
  "timeCapSeconds": 900,
  "rounds": null,
  "intervalSeconds": null,
  "repScheme": null,
  "exercises": [
    { "name": "Thrusters", "reps": 15, "timeSeconds": null, "weight": "40kg", "notes": null },
    { "name": "Box Jumps", "reps": 12, "timeSeconds": null, "weight": null, "notes": "24 inch" },
    { "name": "Chest-to-bar Pull-ups", "reps": 9, "timeSeconds": null, "weight": null, "notes": null }
  ]
}
```

**EMOM** (Family A — timeBased): "Every Minute On the Minute". Each interval shows one exercise colossal on TV, rotating automatically.
```json
{
  "name": "EMOM 20",
  "type": "emom",
  "family": "timeBased",
  "timeCapSeconds": 1200,
  "rounds": 20,
  "intervalSeconds": 60,
  "repScheme": null,
  "exercises": [
    { "name": "Power Cleans", "reps": 5, "timeSeconds": null, "weight": "70kg", "notes": null },
    { "name": "Burpees", "reps": 10, "timeSeconds": null, "weight": null, "notes": null }
  ]
}
```

**Tabata** (Family A — timeBased): Fixed 20s work / 10s rest intervals.
```json
{
  "name": "Tabata Core",
  "type": "tabata",
  "family": "timeBased",
  "timeCapSeconds": 240,
  "rounds": 8,
  "intervalSeconds": 30,
  "repScheme": null,
  "exercises": [
    { "name": "Sit-ups", "reps": null, "timeSeconds": 20, "weight": null, "notes": "20s on / 10s off" }
  ]
}
```

**For Time** (Family B — repBased): Complete all reps as fast as possible. Clock counts up.
```json
{
  "name": "Fran",
  "type": "forTime",
  "family": "repBased",
  "timeCapSeconds": null,
  "rounds": null,
  "intervalSeconds": null,
  "repScheme": "21-15-9",
  "exercises": [
    { "name": "Thrusters", "reps": 21, "timeSeconds": null, "weight": "42.5kg", "notes": null },
    { "name": "Pull-ups", "reps": 21, "timeSeconds": null, "weight": null, "notes": null }
  ]
}
```

**Strength** (Family B — repBased): Lifting sets at the athlete's own pace.
```json
{
  "name": "Back Squat 5x5",
  "type": "strength",
  "family": "repBased",
  "timeCapSeconds": null,
  "rounds": 5,
  "intervalSeconds": null,
  "repScheme": null,
  "exercises": [
    { "name": "Back Squat", "reps": 5, "timeSeconds": null, "weight": "80% RM", "notes": "Rest 2-3 min between sets" }
  ]
}
```

**Custom (Time)** (Family A — timeBased): Freeform time-based block.
```json
{
  "name": "Mobility Flow",
  "type": "customTime",
  "family": "timeBased",
  "timeCapSeconds": 600,
  "rounds": null,
  "intervalSeconds": null,
  "repScheme": null,
  "exercises": [
    { "name": "Hip Opener", "reps": null, "timeSeconds": 60, "weight": null, "notes": "Each side" },
    { "name": "Shoulder Pass-throughs", "reps": null, "timeSeconds": 60, "weight": "PVC pipe", "notes": null }
  ]
}
```

**Custom (Reps)** (Family B — repBased): Freeform rep-based block.
```json
{
  "name": "Accessory Work",
  "type": "customReps",
  "family": "repBased",
  "timeCapSeconds": null,
  "rounds": 3,
  "intervalSeconds": null,
  "repScheme": null,
  "exercises": [
    { "name": "DB Rows", "reps": 12, "timeSeconds": null, "weight": "20kg", "notes": "Each arm" },
    { "name": "Plank Hold", "reps": null, "timeSeconds": 45, "weight": null, "notes": null }
  ]
}
```

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
| `currentRound` | number\|null | Current round for EMOM/interval types |
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

- **Shape Psychology (strict):**
  - **Reps:** Always inside an orange rounded square (`bg-gymOrange rounded-xl`).
  - **Time/Seconds:** Always inside a hollow orange circle (`border-4 border-gymOrange rounded-full`).

## 7. TV Layout: The 30/70 Rule

All workout types use a split layout: **30% Left (Controller) / 70% Right (Action)**. A "Pill" in the bottom-right shows extra info.

### Family A: Time-Based (Clock controls)

The time cap defines the block. Clock counts **down**.

- **Left (30%):** Giant countdown timer (`MM:SS`) + block title/round.
- **Right (70%):**
  - AMRAP: Full exercise list.
  - EMOM/Interval: Single colossal exercise, auto-rotating per interval.
- **Pill:** "Next" exercise name.

### Family B: Rep-Based (Athlete controls)

Reps define the block. Athlete goes at own pace. Clock counts **up** (stopwatch).

- **Left (30%):** Round instructions (e.g. "5 ROUNDS" or "21-15-9").
- **Right (70%):** Full exercise list with orange rep squares.
- **Pill:** Elapsed time stopwatch.

## 8. Timer Engine (Firebase Sync)

**CRITICAL RULE:** Never store "time remaining" in Firestore. This would saturate the database and cause desync.

- **Play:** Admin writes `startTimestamp = serverTimestamp()` + `clockState = 'running'` to the session document.
- **TV reads** `startTimestamp` once from the Firestore snapshot, then uses `requestAnimationFrame` locally: `elapsed = (Date.now() - startTimestamp) + accumulatedTime`.
- **Pause:** Admin calculates elapsed time, adds it to `accumulatedTime`, sets `startTimestamp = null`.
- **Implementation:** `src/composables/useTimer.js` — watches `clockState`, starts/stops the rAF loop accordingly.

## 9. Multi-Screen Architecture

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
