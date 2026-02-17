## Coddle Sleep Coach

Coddle Sleep Coach is a React Native (Expo) application that learns a baby’s sleep patterns using an **Exponentially Weighted Moving Average (EWMA)** model to generate **personalized sleep schedules**, **proactive notifications**, and **coach-style insights** for parents.

Designed as a production‑minded assessment project, it demonstrates **data‑driven UX**, **clean architecture**, and **careful handling of real‑world edge cases** (confidence scoring, DST handling, storage, etc.).
This project was built to demonstrate **data‑driven mobile UX**, **algorithm‑based personalization**, and **production‑oriented React Native architecture**.

---

## Why This Project Matters

- **Real problem, real users**: Parents struggle with fragmented baby sleep patterns and guesswork around wake windows and naps.
- **Data‑driven assistant**: The app continuously learns from actual sleep sessions and combines them with pediatric sleep baselines.
- **Actionable guidance, not just charts**: Parents get clear schedules, reminders, and coach tips that adapt as usage grows.

---

## Core Features

- **Sleep Logging**
  - Start/stop timer for live tracking or add manual sleep sessions
  - Optional quality ratings to enrich the learning signal

- **Pattern Learning (EWMA)**
  - Learns wake windows and nap lengths from historical sessions
  - Uses EWMA with recency weighting to balance stability and responsiveness

- **Smart Daily Schedule**
  - Generates **today** and **tomorrow** schedules with confidence bands
  - Includes naps, bedtime, and wind‑down blocks within a reasonable evening window

- **Local Notifications**
  - Proactive reminders for upcoming naps, bedtime, and wind‑down periods
  - Automatic cleanup and history tracking for scheduled, sent, and canceled notifications

- **Coach Panel**
  - Detects anomalies like short nap streaks, overtired windows, bedtime shifts, and split nights
  - Surfaces prioritized tips (by severity) based on the last 7 days of data

- **Timeline & What‑If Tools**
  - Daily timeline visualizations and trend views
  - “What‑If” analysis to see how adjusting wake windows impacts the schedule

---

## Tech Stack & Highlights

- **Framework**: React Native with Expo
- **State Management**: Zustand, synchronized with AsyncStorage
- **Storage**: Versioned AsyncStorage with basic migration and corruption handling
- **Scheduling & Time Handling**: dayjs with timezone support
- **Testing**: Unit and coverage‑focused tests for learner, schedule generator, and DST edge cases

This structure is chosen to be **simple to reason about** for reviewers, while still demonstrating **scalability paths** (e.g., future SQLite migration, cloud sync, and ML upgrades).

---

## Getting Started

### Prerequisites

- Node.js **20.x or later**
- `npm` or `yarn`
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio + emulator or a physical device
- For iOS (macOS only): Xcode + simulator

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Expo Go vs Development Build

**Expo Go (Quick Testing)**  
- Install the Expo Go app on your device  
- Run `npm start` and scan the QR code  
- Note: Local notifications are limited in Expo Go; use a dev build for full behavior

**Development Build (Full Feature Set)**  
- Build Android dev APK:
  ```bash
  eas build --platform android --profile development
  ```
- Install the resulting APK on a device or emulator  
- All features, including notifications, work as designed

---

## Architecture Overview

### Learning Pipeline

1. **Session Collection**
   - Sleep sessions are stored in AsyncStorage.
2. **Pattern Extraction**
   - Wake windows are derived from gaps between sessions.
   - Naps are identified as daytime sleep sessions below a 4‑hour duration.
3. **EWMA Learning**
   - Exponentially Weighted Moving Average smooths wake windows and nap lengths.
4. **Baseline Integration**
   - Age‑based baseline tables are combined with learned patterns.
5. **Confidence Calculation**
   - Confidence scores reflect recency, consistency, and session volume.

### Schedule Generator

1. **Inputs**
   - Uses learned wake windows and nap lengths.
   - Reads the most recent wake time from the latest session end.
2. **Nap Generation**
   - Schedules naps throughout the day using learned wake windows.
3. **Bedtime Calculation**
   - Enforces a bedtime within a configurable window (6 PM – 9 PM).
4. **Wind‑Down Blocks**
   - Adds 30‑minute wind‑down blocks before major sleep periods.
5. **Confidence Decay**
   - Confidence decreases for blocks further into the future.

### Notification Scheduler

1. Analyzes today/tomorrow schedule blocks.
2. Creates corresponding local notifications for each relevant block.
3. Maintains a history of scheduled, sent, and canceled notifications.
4. Automatically cancels outdated notifications.

### Coach Engine

Rule‑based system detecting key patterns:

- **Short Nap Streaks**: 3+ consecutive naps < 30 minutes  
- **Overtired Windows**: Wake windows > 120% of target  
- **Bedtime Shifts**: Bedtime moved > 30 minutes from previous day  
- **Split Nights**: Night sleep interrupted by a gap > 60 minutes  

Tips are sorted by severity (high → medium → low) and limited to the last 7 days.

---

## Algorithm Details

### EWMA (Exponentially Weighted Moving Average)

**Formula**:  
`EWMA = α × newValue + (1 - α) × previousEWMA`

- **Alpha (α)**: `0.3`
  - 30% weight to new observations, 70% to historical average
  - Keeps the model responsive to real changes without overreacting to outliers

**Recency Weighting**:

- `weight = e^(-daysAgo / 10)`
- Sessions from today have weight ≈ 1.0  
- Sessions from 10 days ago have weight ≈ 0.37  
- Sessions older than 30 days are excluded

### Age Baseline Table

Based on pediatric sleep research and common sleep training guidelines.

| Age Range     | Wake Window (min) | Nap Length (min) | Typical Naps |
|---------------|-------------------|------------------|--------------|
| 0–3 months    | 45–60             | 30–120           | 4–5          |
| 4–6 months    | 90–120            | 60–120           | 3–4          |
| 7–9 months    | 120–150           | 60–120           | 2–3          |
| 10–12 months  | 150–180           | 60–120           | 2            |
| 13–18 months  | 180–240           | 60–120           | 1–2          |
| 19+ months    | 240–300           | 60–120           | 1            |

Baselines are used when:

- There are fewer than 3 recorded sessions.
- No valid wake windows or naps can be extracted.
- Overall confidence falls below 0.2.

### Confidence Calculation

Three main components:

- **Recency** (40%): Average recency weight of contributing sessions.
- **Consistency** (30%): Inverse of the coefficient of variation for the metric.
- **Session Count** (30%): Ratio of actual sessions to a minimum threshold.

Final confidence values range from **0.1 (very low)** to **1.0 (high)**.

---

## State Management

The app uses **Zustand** for predictable, minimal‑boilerplate state management:

- `sleepSessionsStore`: Sleep session CRUD operations
- `learnerStore`: Learner state and baby profile
- `scheduleStore`: Generated schedule blocks
- `notificationStore`: Notification history

All stores automatically sync with AsyncStorage on changes.

---

## Storage

**AsyncStorage** with schema versioning:

- Current schema version: **1**
- Automatic migration support for future schema changes
- Corruption detection with a user‑friendly reset option

**Storage Keys**

- `sleepSessions_v1`: All sleep sessions
- `learnerState_v1`: EWMA state and confidence metrics
- `notificationHistory_v1`: Notification log

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Coverage Focus**

- Learner service (EWMA / baseline integration): > 80%
- Schedule generator: > 80%
- Daylight Saving Time (DST) boundary handling: > 90%

---

## Building an APK

### EAS Build (Recommended)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Login:
   ```bash
   eas login
   ```
3. Configure:
   ```bash
   eas build:configure
   ```
4. Build:
   ```bash
   eas build --platform android --profile production
   ```

### Expo Build (Legacy)

1. Install:
   ```bash
   npm install -g expo-cli
   ```
2. Build:
   ```bash
   expo build:android -t apk
   ```

The APK will be available in the Expo dashboard or as a direct download.

---

## Engineering Challenges Solved

- Handling inconsistent sleep data and missing sessions
- Designing a learner that adapts to new data without overfitting
- Managing local notifications reliably on device
- Ensuring stable scheduling across Daylight Saving Time (DST) transitions

---

## Known Trade‑Offs

1. **AsyncStorage Limitations**
   - Not ideal for very large datasets (> 10 MB)
   - Production‑scale usage would benefit from SQLite or a similar database

2. **Fixed EWMA Alpha**
   - Currently set to 0.3 for all users
   - Could be adapted per baby based on variability and stability of patterns

3. **Static Baseline Table**
   - Based on general pediatric research
   - Could be refined over time using aggregated user feedback (or personalized baselines)

4. **Notification Timing**
   - Uses local notifications only
   - No server‑side scheduling, so reliability depends on device state

5. **DST Handling**
   - Uses dayjs with timezone support and has targeted tests
   - Exotic or less common time‑zone transitions may still expose edge cases

---

## Future Improvements

- [ ] Migrate from AsyncStorage to SQLite for performance and scalability
- [ ] Adaptive EWMA alpha based on observed variance
- [ ] Machine learning models for pattern detection and anomaly classification
- [ ] Cloud sync and multi‑device support
- [ ] Advanced analytics and insights (sleep debt, trend analytics, etc.)
- [ ] Customizable coach rules and user‑tunable thresholds
- [ ] Import/export and backup capabilities
- [ ] Dark mode and broader theming
- [ ] Accessibility improvements (contrast, font scaling, screen reader support)
- [ ] Performance optimization for 500+ sessions

---

## License

Personal project focused on learning‑driven, data‑centric mobile UX patterns.

