# Cosmic Event Manager - Unified Mission & Attendance System

## Overview

This is a comprehensive, integrated mission and attendance tracking system for the Cosmic Event Manager (Engine v7.9.6+). It combines three previously separate systems into a unified, working codebase:

1. **Mission Suffix Service** - Per-player mission counters (updates `MissionLog`)
2. **Mission Gate Service (Gate I)** - Health checks and auto-fix for MissionLog integrity
3. **Omega Attendance System** - Comprehensive attendance tracking and mission computation

## Architecture

### Two-Layer Design

#### Layer 1: Per-Player Mission Counters (MissionLog)
- **Sheet**: `MissionLog`
- **Purpose**: Track individual player progress on suffix-based missions
- **Columns**: `preferred_name_id`, `Total_Points`, and one column per mission ID
- **Updated by**: Mission Suffix Service when players attend events

#### Layer 2: Mission Analysis & Computation (Omega System)
- **Source of Truth**: `MissionLog_1` and `MissionLog_2` (mission definitions)
- **Output Sheets**: `Attendance_Calendar` and `Attendance_Missions`
- **Purpose**: Compute comprehensive mission progress from event data
- **Updated by**: Omega Attendance System (full scan)

### Shared Components

All three systems share:
- **Attendance scanning logic** (`scanAttendanceForRange_`)
- **Name resolution** (canonical names from `PreferredNames`)
- **Helper utilities** (logging, date functions, number coercion)

## File Structure

```
MissionConfig.gs              - Constants, mission IDs, attendance config
MissionHelpers.gs             - Shared utilities (names, dates, logging)
AttendanceScanner.gs          - Attendance scanning (shared by all systems)
MissionSuffixService.gs       - Suffix-based mission awarding (Layer 1)
MissionGateService.gs         - Gate I health checks and auto-fix
OmegaAttendanceSystem.gs      - Full mission computation (Layer 2)
MenuIntegration.gs            - UI menus and user-facing functions
```

## Required Sheets

### Input Sheets (Required)
- **PreferredNames** - Canonical player names (Column A)
- **MissionLog_1** - Mission definitions (see schema below)
- **MissionLog_2** - Additional mission definitions
- **Event Sheets** - Named `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY`
  - Must have columns: `player`, `final standing`

### Output Sheets (Auto-Created)
- **MissionLog** - Per-player mission counters
- **Attendance_Calendar** - Player × event attendance matrix
- **Attendance_Missions** - Player × mission progress summary
- **Integrity_Log** - System logs and audit trail

## Mission Definition Schema

`MissionLog_1` and `MissionLog_2` should have these columns:

| Column | Name | Type | Description | Example |
|--------|------|------|-------------|---------|
| A | Mission_ID | Text | Unique identifier | `ATTEND_10` |
| B | Mission_Name | Text | Display name | `Attend 10 Events` |
| C | Mission_Type | Text | Mission category | `attendance`, `placement`, `format`, `streak`, `win` |
| D | Criteria | Text | Type-specific rules | `10` (for attendance), `4` (for Top 4) |
| E | Points_Value | Number | Points awarded | `10` |
| F | Cap | Number | Max progress (0 = unlimited) | `10` or `0` |
| G | Active | Boolean | Is mission active? | `TRUE` or `FALSE` |

### Mission Types

1. **attendance** - Count total events attended
   - Criteria: Not used (counts all)

2. **placement** - Count placements in range
   - Criteria: `4` (Top 4), `8` (Top 8), `2-3` (2nd or 3rd only)

3. **format** - Count events of specific format
   - Criteria: Format name or suffix (`Commander`, `C`, `Draft`, `D`)

4. **streak** - Track consecutive weeks
   - Criteria: Number of weeks required (`3` for 3-week streak)

5. **win** - Count 1st place finishes
   - Criteria: Not used (always 1st only)

## Suffix-Based Missions

Event suffixes automatically trigger these missions:

| Suffix | Format | Mission ID |
|--------|--------|------------|
| B | Commander Casual | `ATTEND_CMD_CASUAL` |
| C | Commander Transition | `ATTEND_CMD_TRANSITION` |
| T | Commander cEDH | `ATTEND_CMD_CEDH` |
| D, P, R, S | Limited Formats | `ATTEND_LIMITED_EVENT` |
| A | Academy | `ATTEND_ACADEMY` |
| E | Outreach | `ATTEND_OUTREACH` |

## Installation

### 1. Copy All .gs Files

Copy all the `.gs` files from this repository into your Google Apps Script project:

1. Open your Google Sheet
2. Extensions > Apps Script
3. Create new script files for each .gs file
4. Copy/paste the contents

### 2. Create Required Sheets

Create these sheets if they don't exist:

- `PreferredNames` (with player names in Column A)
- `MissionLog_1` (with mission definitions)
- `MissionLog_2` (optional, for additional missions)

### 3. Add Menu Integration

If you have an existing `onOpen()` function, add this:

```javascript
function onOpen() {
  // Your existing code...

  // Add mission system menus
  createMissionMenus();
}
```

Or if you don't have one, create it:

```javascript
function onOpen() {
  createMissionMenus();
}
```

### 4. Initialize MissionLog

1. Reload the spreadsheet
2. Go to **🎯 Systems** > **🆕 Initialize MissionLog**
3. This creates the MissionLog sheet and syncs all players

## Usage

### Menu: 🎯 Systems

#### 📊 Scan + Update Missions
**What it does:**
- Scans all event sheets (MM-DD-YYYY format)
- Builds Attendance_Calendar (player × event matrix)
- Computes mission progress from MissionLog_1/2
- Updates Attendance_Missions

**When to use:** After adding new event sheets or updating mission definitions

#### ✅ Check Gate I (MissionLog Health)
**What it does:**
- Verifies MissionLog schema
- Checks player alignment (PreferredNames ↔ MissionLog)
- Tests attendance scan for last 7 days
- Validates recent attendees have MissionLog rows

**When to use:** To diagnose issues or verify system health

#### 🔧 Fix Gate I Issues
**What it does:**
- Creates MissionLog if missing
- Adds missing columns
- Syncs all PreferredNames players to MissionLog

**When to use:** When Gate I health check fails

#### 🆕 Initialize MissionLog
**What it does:**
- Creates MissionLog from scratch
- Sets up proper schema
- Syncs all players from PreferredNames

**When to use:** First-time setup or full reset

#### 🔄 Sync Players to MissionLog
**What it does:**
- Ensures every PreferredNames player has a MissionLog row
- Does NOT overwrite existing data

**When to use:** After adding new players to PreferredNames

## Programmatic Usage

### Award Missions Manually

```javascript
// Award a specific mission to a player
awardMissionProgress_('PlayerName', 'ATTEND_CMD_CASUAL', {
  eventId: '11-23-B-2025',
  rank: 3,
  suffix: 'B'
});
```

### Evaluate Suffix Missions for an Event

```javascript
// After an event, evaluate all missions for a player
evaluateSuffixMissions_('PlayerName', '11-23-B-2025', 3);
```

### Batch Process Date Range

```javascript
// Process all attendance missions for a date range
var stats = runAttendanceMissionsForRange_(
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

Logger.log('Processed: ' + stats.processed);
```

### Check System Health

```javascript
// Run Gate I health check
var result = checkGateI_MissionLog_();

if (result.pass) {
  Logger.log('✅ System healthy');
} else {
  Logger.log('❌ Issues found:');
  result.details.forEach(function(detail) {
    Logger.log('  - ' + detail);
  });
}
```

## Integration Points

### Prize Engine Integration

Call `evaluateSuffixMissions_` after awarding prizes:

```javascript
function awardPrizes(eventId) {
  // Your prize awarding logic...

  // Award missions for each player
  players.forEach(function(player) {
    evaluateSuffixMissions_(player.name, eventId, player.rank);
  });
}
```

### Event Creation Workflow

After creating a new event sheet:

```javascript
function afterEventCreated(eventSheetName) {
  // Your event setup logic...

  // Run full Omega scan to update attendance
  runOmegaAttendanceScan();
}
```

## Troubleshooting

### Issue: Players missing from MissionLog

**Solution:** Run **🔄 Sync Players to MissionLog**

### Issue: Mission columns missing

**Solution:** Run **🔧 Fix Gate I Issues**

### Issue: Omega scan shows no events

**Check:**
- Event sheet names follow `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY` format
- Event sheets have `player` and `final standing` columns

### Issue: Mission progress not computing

**Check:**
- `MissionLog_1` and `MissionLog_2` exist
- Mission definitions have correct `Mission_Type`
- Missions are marked `Active = TRUE`

## Performance Notes

- **Batch operations**: All sheet writes use batch operations (100x faster)
- **Memory-optimized**: Uses Sets and Maps for efficient lookups
- **Incremental updates**: Gate I checks last 7 days only
- **Lazy loading**: Only loads data when needed

## Future Enhancements

### Planned Features

1. **Mission Reward Customization**
   - Use `Points_Value` from mission definitions
   - Support variable rewards based on `Reward_Qty`

2. **Advanced Mission Types**
   - `placement_tier`: Different rewards for different placements
   - `achievement`: One-time unlockable achievements
   - `season`: Time-limited seasonal missions

3. **Mission Dependencies**
   - Missions that unlock after completing prerequisites
   - Multi-stage mission chains

4. **Auto-Award Integration**
   - Automatically call suffix missions from Prize Engine
   - Real-time mission updates during events

### Extension Points

To add new mission types, extend `computeMissionProgress` in `OmegaAttendanceSystem.gs`:

```javascript
// In computeMissionProgress()
if (missionType === 'your_custom_type') {
  computeYourCustomMission(mission, eventData, progress);
}

// Implement your custom logic
function computeYourCustomMission(mission, eventData, progress) {
  // Your logic here...
}
```

## Version History

### v1.0.0 (2025-11-22)
- Initial integrated release
- Unified Mission Suffix Service, Gate I, and Omega Attendance
- Shared attendance scanning (`scanAttendanceForRange_`)
- Batch operation optimization
- Comprehensive error handling
- Menu integration

## License

Part of the Cosmic Event Manager system.
Compatible with Engine v7.9.6+, Manual v3.9.6

## Support

For issues or questions:
1. Check Gate I health status
2. Review Integrity_Log for errors
3. Verify required sheets exist
4. Ensure event sheets follow naming conventions
