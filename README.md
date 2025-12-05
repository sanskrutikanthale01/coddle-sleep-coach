# Coddle Sleep Coach

A React Native (Expo) app that learns baby sleep patterns using EWMA (Exponentially Weighted Moving Average) and generates personalized sleep schedules with proactive notifications and coach tips.

## Features

- **Sleep Logging**: Start/stop timer or add manual sleep sessions with quality ratings
- **Pattern Learning**: EWMA algorithm learns wake windows and nap lengths from history
- **Smart Schedule**: Generates today/tomorrow schedule with confidence bands
- **Local Notifications**: Proactive reminders for naps, bedtime, and wind-down
- **Coach Panel**: Contextual tips detecting anomalies (short naps, overtired, bedtime shifts)
- **Timeline Visualization**: Daily timeline view with trend charts
- **What-If Analysis**: Adjust wake windows to see schedule impact

## Setup Instructions

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio and emulator or physical device
- For iOS: Xcode and simulator (macOS only)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Expo Go vs Development Build

**Expo Go** (Quick Testing):
- Install Expo Go app on your device
- Scan QR code from `npm start`
- Note: Local notifications require a development build

**Development Build** (Full Features):
- Build APK: `eas build --platform android --profile development`
- Install APK on device or emulator
- All features including notifications work

## Architecture Overview

### Learning Pipeline

1. **Session Collection**: Sleep sessions stored in AsyncStorage
2. **Pattern Extraction**: 
   - Wake windows extracted from gaps between sessions
   - Naps identified (daytime, <4 hours duration)
3. **EWMA Learning**: Exponentially weighted moving average smooths patterns
4. **Baseline Integration**: Age-based baselines combined with learned patterns
5. **Confidence Calculation**: Based on recency, consistency, and session count

### Schedule Generator

1. **Learned Values**: Gets wake window and nap length from learner
2. **Last Wake Time**: Finds most recent session end time
3. **Nap Generation**: Schedules naps based on wake windows
4. **Bedtime Calculation**: Determines bedtime within 6 PM - 9 PM range
5. **Wind-Down Blocks**: Creates 30-minute wind-down before sleep
6. **Confidence Decay**: Reduces confidence for blocks further in future

### Notification Scheduler

1. **Block Analysis**: Processes schedule blocks for today/tomorrow
2. **Notification Creation**: Creates local notifications for each block
3. **History Tracking**: Logs scheduled, sent, and canceled notifications
4. **Automatic Cleanup**: Cancels past notifications

### Coach Engine

Rule-based system detecting:
- **Short Nap Streaks**: 3+ consecutive naps <30 minutes
- **Overtired Warnings**: Wake windows >120% of target
- **Bedtime Shifts**: Bedtime moved >30 minutes from previous
- **Split Nights**: Night sleep interrupted by >60 minute gap

## Algorithm Documentation

### EWMA (Exponentially Weighted Moving Average)

**Formula**: `EWMA = α × newValue + (1 - α) × previousEWMA`

**Alpha (α)**: `0.3`
- Rationale: 30% weight to new observations, 70% to historical average
- Balances responsiveness to new patterns with stability from history
- Prevents over-reaction to single outliers

**Recency Weighting**: 
- Exponential decay: `weight = e^(-daysAgo / 10)`
- Sessions from today have weight ~1.0
- Sessions from 10 days ago have weight ~0.37
- Sessions older than 30 days are excluded

### Age Baseline Table

Source: Pediatric sleep research and sleep training guidelines

| Age Range | Wake Window (min) | Nap Length (min) | Typical Naps |
|-----------|-------------------|------------------|--------------|
| 0-3 months | 45-60 | 30-120 | 4-5 |
| 4-6 months | 90-120 | 60-120 | 3-4 |
| 7-9 months | 120-150 | 60-120 | 2-3 |
| 10-12 months | 150-180 | 60-120 | 2 |
| 13-18 months | 180-240 | 60-120 | 1-2 |
| 19+ months | 240-300 | 60-120 | 1 |

Baselines used when:
- Insufficient session data (<3 sessions)
- No wake windows/naps extracted
- Low confidence (<0.2)

### Confidence Calculation

Three factors combined:
- **Recency** (40% weight): Average recency weight of sessions
- **Consistency** (30% weight): Inverse of coefficient of variation
- **Session Count** (30% weight): Ratio of sessions to minimum threshold

Confidence range: 0.1 (very low) to 1.0 (high)

## Coach Rules & Thresholds

| Rule | Threshold | Severity |
|------|-----------|----------|
| Short Nap Streak | 3+ consecutive naps <30 min | High |
| Overtired Warning | Wake window >120% of target | Medium |
| Bedtime Shift | Bedtime moved >30 min | Medium |
| Split Night | Night sleep gap >60 min | High |

Tips sorted by severity (high → medium → low) and filtered to last 7 days.

## State Management

Uses **Zustand** for reactive state:

- `sleepSessionsStore`: Sleep session CRUD operations
- `learnerStore`: Learner state and baby profile
- `scheduleStore`: Generated schedule blocks
- `notificationStore`: Notification history

Stores automatically sync with AsyncStorage on changes.

## Storage

**AsyncStorage** with schema versioning:
- Current version: 1
- Automatic migration on schema changes
- Corruption detection with user-friendly reset dialog

**Storage Keys**:
- `sleepSessions_v1`: All sleep sessions
- `learnerState_v1`: EWMA state and confidence
- `notificationHistory_v1`: Notification log

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Coverage**:
- Learner service (EWMA/baseline): >80%
- Schedule generator: >80%
- DST boundary handling: >90%

## Building APK

### Using EAS Build (Recommended)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build APK: `eas build --platform android --profile production`

### Using Expo Build (Legacy)

1. Install: `npm install -g expo-cli`
2. Build: `expo build:android -t apk`

APK will be available in Expo dashboard or downloaded automatically.

## Known Trade-offs

1. **AsyncStorage Limitations**: 
   - Not suitable for very large datasets (>10MB)
   - Consider SQLite for production scale

2. **EWMA Alpha Fixed**: 
   - Currently 0.3 for all babies
   - Could be personalized based on pattern variability

3. **Baseline Table Static**: 
   - Based on general research
   - Could be updated with user feedback

4. **Notification Timing**: 
   - Local notifications only
   - No server-side scheduling for reliability

5. **DST Handling**: 
   - Uses dayjs with timezone support
   - Tested for common timezones, edge cases may exist

## Future Improvements

- [ ] SQLite migration for better performance
- [ ] Adaptive EWMA alpha based on variance
- [ ] Machine learning for pattern detection
- [ ] Cloud sync for multi-device support
- [ ] Advanced analytics and insights
- [ ] Customizable coach rules
- [ ] Export/import data functionality
- [ ] Dark mode support
- [ ] Accessibility improvements
- [ ] Performance optimization for 500+ sessions

## License

Private project for assessment purposes.

