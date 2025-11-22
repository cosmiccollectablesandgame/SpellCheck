# Cosmic Missions & Attendance Tracking System - Unified

**Version:** 1.0.0 - Unified Integration
**Compatible with:** Engine v7.9.6+
**File:** `CosmicMissionSystem.gs`

---

## Overview

This unified system integrates three previously separate mission/attendance tracking systems into a single, cohesive codebase:

1. **Mission Suffix Service** - Per-player mission counters (MissionLog)
2. **Mission Gate I** - Health check for MissionLog & Attendance sync
3. **Omega Attendance System** - Full mission tracking with definitions (MissionLog_1/2)

---

## Architecture

### Two-Layer System

#### Layer 1: MissionLog (Per-Player Counters)
- **Sheet:** `MissionLog`
- **Columns:**
  - `preferred_name_id` - Canonical player identifier
  - `Total_Points` - Aggregate mission points
  - Mission ID columns (e.g., `ATTEND_CMD_CASUAL`, `ATTEND_CMD_TRANSITION`, etc.)
- **Purpose:** Track individual player progress on suffix-based missions
- **Updated by:** `awardMissionProgress_()` function

#### Layer 2: Omega Attendance (Analysis & Definitions)
- **Definition Sheets:** `MissionLog_1`, `MissionLog_2`
  - `Mission_ID` - Unique identifier
  - `Mission_Name` - Display name
  - `Mission_Type` - (attendance, placement, format, streak, win)
  - `Criteria` - Type-specific rules (JSON or text)
  - `Points_Value` - Points awarded per completion
  - `Cap` - Maximum count (0 = unlimited)
  - `Active` - TRUE/FALSE toggle
- **Output Sheets:**
  - `Attendance_Calendar` - Player × Event attendance matrix
  - `Attendance_Missions` - Player × Mission progress summary
- **Purpose:** Compute and analyze mission progress across all events

---

## Required Sheets

### Must Exist (Will Error if Missing)
- `MissionLog_1` - Primary mission definitions
- `MissionLog_2` - Secondary mission definitions
- `PreferredNames` - Canonical player names (column A)

### Auto-Created if Missing
- `MissionLog` - Per-player mission counters
- `Attendance_Calendar` - Event attendance matrix
- `Attendance_Missions` - Mission progress summary
- `Integrity_Log` - System logging

---

## Core Functions

### 1. Attendance Scanning

#### `scanAttendanceForRange_(startDate, endDate)`
**Shared by Gate I and Omega Attendance**

Scans all event sheets matching the pattern `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY` within the specified date range.

**Returns:**
```javascript
[
  {
    playerId: 'CanonicalPlayerName',
    eventId: '11-23-B-2025',
    rank: 1,  // or null
    date: Date object
  },
  ...
]
```

**Event Suffix Legend:**
- `B` - Brawl (Commander Casual)
- `C` - Commander (Transition)
- `T` - Two-Headed Giant (cEDH)
- `D` - Draft
- `S` - Sealed
- `P` - Prerelease
- `A` - Academy
- `E` - Outreach/Engagement
- `M` - Modern
- `L` - Legacy
- `V` - Vintage
- `N` - Night Event

---

### 2. Mission Suffix Service

#### `evaluateSuffixMissions_(playerId, eventId, rank)`
Evaluates suffix-based mission triggers for a player at a specific event.

**Mission Mappings:**
- Suffix `B` → `ATTEND_CMD_CASUAL`
- Suffix `C` → `ATTEND_CMD_TRANSITION`
- Suffix `T` → `ATTEND_CMD_CEDH`
- Suffix `D`, `S`, `P` (limited) → `ATTEND_LIMITED_EVENT`
- Suffix `A` → `ATTEND_ACADEMY`
- Suffix `E` → `ATTEND_OUTREACH`

#### `awardMissionProgress_(playerId, missionId, context)`
Awards mission progress to a player by incrementing the mission column in `MissionLog`.

**Parameters:**
- `playerId` - Canonical player name from `PreferredNames`
- `missionId` - Column header in `MissionLog` (e.g., `ATTEND_CMD_CASUAL`)
- `context` - `{ eventId, rank, suffix }`

**Behavior:**
- Ensures player has a `MissionLog` row
- Increments mission column by 1
- Increments `Total_Points` by 1
- Logs award to console

**Future Enhancement:** Replace flat `+1` with mission-specific `Reward_Qty` from definitions.

#### `runAttendanceMissionsForRange_(startDate, endDate)`
Batch processes all attendance records in a date range and awards suffix missions.

**Returns:**
```javascript
{
  totalRecords: 150,
  processed: 148,
  errors: 2
}
```

---

### 3. Gate I - Health Check

#### `checkGateI_MissionLog_()`
Runs comprehensive health check on MissionLog and Attendance systems.

**Validates:**
1. `MissionLog` sheet exists
2. `PreferredNames` sheet exists
3. Required columns present (`preferred_name_id`, `Total_Points`, all mission IDs)
4. Every `PreferredNames` player has a `MissionLog` row
5. Attendance scan for last 7 days runs successfully
6. All recent attendees have `MissionLog` rows

**Returns:**
```javascript
{
  gate: 'I',
  name: 'MissionLog & Attendance',
  pass: true,  // or false
  details: [
    'MissionLog schema, player coverage, and attendance scan all healthy'
  ],
  autoFixApplied: false
}
```

#### `fixGateI_()`
Auto-repairs Gate I issues:
- Creates `MissionLog` sheet if missing
- Adds missing columns to `MissionLog`
- Syncs all `PreferredNames` players to `MissionLog`

**Returns:** `"MissionLog repaired: 5 rows created, 42 existing"`

---

### 4. Omega Attendance System

#### `runOmegaAttendanceScan()`
**Menu Trigger:** `🎯 Systems > Scan + Update Missions`

**Full Workflow:**
1. Validates required sheets (`MissionLog_1`, `MissionLog_2`)
2. Loads mission definitions from both sheets
3. Scans all event sheets matching `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY`
4. Builds `Attendance_Calendar` (player × event matrix)
5. Computes mission progress for all players based on definitions
6. Updates `Attendance_Missions` with computed values
7. Logs summary to `Integrity_Log`

**Mission Types Supported:**

##### Attendance
**Criteria:** (none or empty)
**Example:** "Attend 10 events"
**Computation:** Counts total events attended, applies cap if set

##### Placement
**Criteria:** `"4"` (Top 4), `"8"` (Top 8), `"2-3"` (2nd or 3rd place range)
**Example:** "Finish Top 4 three times"
**Computation:** Counts placements within specified range

##### Win
**Criteria:** (none)
**Example:** "Win 5 events"
**Computation:** Counts 1st place finishes only

##### Format
**Criteria:** Format name or suffix (e.g., `"Commander"`, `"C"`, `"Draft"`, `"D"`)
**Example:** "Attend 5 Commander events"
**Computation:** Counts attendance at events matching format

##### Streak
**Criteria:** Number of consecutive weeks (e.g., `"3"`)
**Example:** "Attend 3 consecutive weeks"
**Computation:** Finds longest streak of consecutive ISO week attendance

---

## MissionLog Sheet Management

### `ensureMissionLogSchema_(sheet)`
Ensures `MissionLog` has correct columns:
- Adds `preferred_name_id` and `Total_Points` if missing
- Appends all mission ID columns from `getAllMissionIds_()`
- Sets frozen header row

### `createMissionLogSheet_()`
Creates `MissionLog` from scratch with canonical schema and formatting.

### `ensureMissionLogRow_(playerId)`
Ensures a specific player has a row in `MissionLog`, creates if missing.

### `syncAllPlayersToMissionLog_()`
Syncs all players from `PreferredNames` to `MissionLog`.

**Returns:**
```javascript
{
  existing: 42,  // Players already in MissionLog
  created: 5,    // New rows created
  errors: 0
}
```

### `initializeMissionLog_()`
Full initialization: creates `MissionLog`, syncs all players, logs to `Integrity_Log`.

---

## Helper Functions

### Name Resolution
- `loadPreferredNames(ss)` - Loads canonical names from `PreferredNames` sheet
- `resolveCanonicalName(name, preferredNames)` - Resolves raw name to canonical (case-insensitive)

### Event Parsing
- `getSuffixFromEventId_(eventId)` - Extracts suffix from event sheet name
- `getSuffixMeta_(suffix)` - Returns metadata for suffix (format, requiresKitPrompt)

### Utilities
- `coerceNumber(value, fallback)` - Safe number conversion with fallback
- `logIntegrityAction(event, details)` - Logs actions to `Integrity_Log`

### Date/Time
- `getWeekNumber(date)` - Returns ISO week number
- `getWeeksInYear(year)` - Returns number of ISO weeks in year

---

## Integration Points

### How the Systems Work Together

1. **Event Creation:**
   - Event sheets created with suffix (e.g., `11-23-B-2025`)
   - Prize Engine runs and commits results
   - (Optional) Call `evaluateSuffixMissions_()` to award per-player missions

2. **Periodic Batch:**
   - Run `runAttendanceMissionsForRange_(startDate, endDate)` to backfill suffix missions
   - Or integrate into nightly/weekly job

3. **Omega Analysis:**
   - Run `runOmegaAttendanceScan()` manually or on schedule
   - Generates comprehensive attendance and mission reports
   - Uses mission definitions from `MissionLog_1` and `MissionLog_2`

4. **Health Monitoring:**
   - Run `checkGateI_MissionLog_()` before critical operations
   - Auto-fix with `fixGateI_()` if issues detected
   - Ensures data integrity across all systems

---

## Common Workflows

### Setup New Environment

```javascript
// 1. Ensure PreferredNames exists with player list in column A

// 2. Create MissionLog_1 and MissionLog_2 with mission definitions
// Headers: Mission_ID | Mission_Name | Mission_Type | Criteria | Points_Value | Cap | Active

// 3. Initialize MissionLog
initializeMissionLog_();

// 4. Run first Omega scan
runOmegaAttendanceScan();

// 5. Verify with Gate I
var gateResult = checkGateI_MissionLog_();
Logger.log(gateResult);
```

### Award Missions for Recent Events

```javascript
// Award suffix missions for the last 30 days
var today = new Date();
var startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

var stats = runAttendanceMissionsForRange_(startDate, today);
Logger.log('Awarded missions: ' + stats.processed + ' records processed');
```

### Update Mission Progress Reports

```javascript
// Full Omega scan (updates Attendance_Calendar and Attendance_Missions)
runOmegaAttendanceScan();
```

### Health Check & Auto-Repair

```javascript
// Check system health
var result = checkGateI_MissionLog_();

if (!result.pass) {
  Logger.log('Gate I failed: ' + result.details.join(', '));

  // Auto-repair
  var fixMessage = fixGateI_();
  Logger.log(fixMessage);

  // Re-check
  result = checkGateI_MissionLog_();
  Logger.log('After fix: ' + (result.pass ? 'PASS' : 'FAIL'));
}
```

---

## Menu Integration

Add to your `onOpen()` function in `Code.gs`:

```javascript
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('🎯 Systems')
    .addItem('  Scan + Update Missions', 'runOmegaAttendanceScan')
    .addSeparator()
    .addItem('  Check Gate I (MissionLog)', 'menuCheckGateI_')
    .addItem('  Fix Gate I Issues', 'menuFixGateI_')
    .addSeparator()
    .addItem('  Initialize MissionLog', 'initializeMissionLog_')
    .addToUi();
}

function menuCheckGateI_() {
  var result = checkGateI_MissionLog_();
  var ui = SpreadsheetApp.getUi();

  var status = result.pass ? '✅ PASS' : '❌ FAIL';
  var message = 'Gate I: ' + result.name + '\n\n' +
                'Status: ' + status + '\n\n' +
                result.details.join('\n');

  ui.alert('Gate I Health Check', message, ui.ButtonSet.OK);
}

function menuFixGateI_() {
  var fixMessage = fixGateI_();
  var ui = SpreadsheetApp.getUi();
  ui.alert('Gate I Auto-Fix', fixMessage, ui.ButtonSet.OK);
}
```

---

## Performance Optimizations

1. **Batch Sheet Writes:**
   - `buildAttendanceCalendar()` and `updateAttendanceMissions()` use batch `setValues()`
   - 100x faster than `appendRow()` loops

2. **Memory-Efficient Data Structures:**
   - Uses `Set` and `Map` for player tracking and event history
   - Minimizes redundant sheet reads

3. **Smart Caching:**
   - `PreferredNames` loaded once per operation
   - Mission definitions loaded once and reused

4. **Frozen Headers:**
   - All output sheets use frozen rows/columns for navigation

---

## Error Handling

- **Gate I:** Returns structured result object, never throws
- **Omega Scan:** Catches individual event/mission errors, continues processing
- **Suffix Service:** Logs warnings for missing data, skips invalid entries
- **All Systems:** Log to `Integrity_Log` for audit trail

---

## Logging

All major operations log to `Integrity_Log`:

```
timestamp | user | event | target | details | engine_version | seed | checksum | df_tags | rl_band
```

**Event Types:**
- `ATTENDANCE_SCAN` - Omega scan completed
- `ATTENDANCE_SCAN_ERROR` - Omega scan failed
- `INIT_MISSIONLOG` - MissionLog initialized
- (Add custom events via `logIntegrityAction()`)

---

## Future Enhancements

### Short-Term
1. Replace flat `+1` awarding with mission-specific `Reward_Qty`
2. Add mission cooldowns (once per event, once per day)
3. Mission prerequisites (unlock chains)

### Medium-Term
1. Historical mission snapshots (time-series tracking)
2. Mission leaderboards
3. Player mission dashboards

### Long-Term
1. Dynamic mission generation
2. Seasonal mission resets
3. Mission achievement badges

---

## Troubleshooting

### "MissionLog sheet not found"
**Solution:** Run `initializeMissionLog_()` or `fixGateI_()`

### "Missing required sheets: MissionLog_1, MissionLog_2"
**Solution:** Create these sheets with mission definitions before running Omega scan

### "Player not found in PreferredNames"
**Solution:** Add player to `PreferredNames` sheet column A, run `syncAllPlayersToMissionLog_()`

### Gate I fails with missing rows
**Solution:** Run `fixGateI_()` to auto-repair

### Omega scan shows 0 events
**Solution:** Ensure event sheets match `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY` format

### Streak missions showing 0
**Solution:** Verify events are in consecutive ISO weeks (use date calculator)

---

## Code Organization

**File:** `CosmicMissionSystem.gs`

**Sections:**
1. Global Configuration (MISSION_IDS, ATTENDANCE_CONFIG)
2. Core Helper Functions
3. PreferredNames Management
4. Attendance Scanning (shared by Gate I and Omega)
5. MissionLog Sheet Management
6. Mission Suffix Service (evaluation & awarding)
7. Gate I (health check & auto-fix)
8. Omega Attendance System (full mission tracking)

**Total Lines:** ~1800
**Functions:** 35
**No Duplicate Globals:** All systems share configuration and helpers

---

## Version History

### 1.0.0 - Unified Integration (Current)
- Merged three separate systems into single codebase
- Implemented shared `scanAttendanceForRange_()` function
- Unified name resolution across all systems
- Added comprehensive error handling
- Fixed streak calculation for ISO weeks
- Optimized batch operations for performance
- Added full documentation

---

## Support

For issues, feature requests, or questions:
1. Check `Integrity_Log` for error details
2. Run `checkGateI_MissionLog_()` for diagnostics
3. Review function documentation in code comments
4. Consult this README for workflows and architecture

---

**End of Documentation**
