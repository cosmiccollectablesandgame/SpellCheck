# Quick Start Guide - Cosmic Mission System

## 5-Minute Setup

### Step 1: Copy Code to Apps Script

1. Open your Google Sheet
2. **Extensions** > **Apps Script**
3. Delete the default `Code.gs` content
4. Create these files and copy their contents:
   - `MissionConfig.gs`
   - `MissionHelpers.gs`
   - `AttendanceScanner.gs`
   - `MissionSuffixService.gs`
   - `MissionGateService.gs`
   - `OmegaAttendanceSystem.gs`
   - `MenuIntegration.gs`
5. Add this to create the menus:

```javascript
function onOpen() {
  createMissionMenus();
}
```

6. **Save** and close Apps Script

### Step 2: Create Required Sheets

Create these sheets in your spreadsheet:

1. **PreferredNames**
   - Column A: Player names (one per row)
   - Header: `PreferredName` (optional)

2. **MissionLog_1**
   - Copy headers from template below
   - Add your mission definitions

3. **Event Sheets**
   - Named: `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY`
   - Example: `11-23-2025` or `11-23-B-2025`
   - Required columns: `player`, `final standing`

### Step 3: Initialize System

1. Reload your spreadsheet
2. You should see a new **🎯 Systems** menu
3. Click **🎯 Systems** > **🆕 Initialize MissionLog**
4. Click **🎯 Systems** > **📊 Scan + Update Missions**

Done! 🎉

## MissionLog_1 Template

Copy this to your `MissionLog_1` sheet:

| Mission_ID | Mission_Name | Mission_Type | Criteria | Points_Value | Cap | Active |
|------------|-------------|--------------|----------|--------------|-----|--------|
| ATTEND_10 | Attend 10 Events | attendance | | 10 | 10 | TRUE |
| ATTEND_25 | Attend 25 Events | attendance | | 25 | 25 | TRUE |
| TOP4_UNLIMITED | Finish Top 4 | placement | 4 | 5 | 0 | TRUE |
| TOP8_UNLIMITED | Finish Top 8 | placement | 8 | 3 | 0 | TRUE |
| WIN_EVENT | Win an Event | win | | 10 | 0 | TRUE |
| STREAK_3WEEK | 3-Week Streak | streak | 3 | 15 | 1 | TRUE |
| COMMANDER_FAN | Commander Regular | format | commander | 5 | 20 | TRUE |
| DRAFT_MASTER | Draft Master | format | draft | 5 | 20 | TRUE |

## Common Workflows

### Adding a New Player

1. Add player name to `PreferredNames` (Column A)
2. **🎯 Systems** > **🔄 Sync Players to MissionLog**

### After an Event

1. Create event sheet: `11-23-B-2025`
2. Add player data (columns: `player`, `final standing`)
3. **🎯 Systems** > **📊 Scan + Update Missions**

### Adding a New Mission

1. Add row to `MissionLog_1` or `MissionLog_2`
2. Fill in: Mission_ID, Name, Type, Criteria, Points, Cap, Active
3. **🎯 Systems** > **🔧 Fix Gate I Issues** (adds column to MissionLog)
4. **🎯 Systems** > **📊 Scan + Update Missions**

### Checking System Health

1. **🎯 Systems** > **✅ Check Gate I**
2. If issues found, click **Yes** to auto-fix

## Event Sheet Format

### Standard Format

Sheet name: `11-23-2025` (MM-DD-YYYY)

| player | final standing |
|--------|----------------|
| Alice | 1 |
| Bob | 2 |
| Carol | 3 |

### With Suffix

Sheet name: `11-23-B-2025` (Commander Casual)

| player | final standing |
|--------|----------------|
| Alice | 1 |
| Bob | 2 |
| Carol | 3 |

## Suffix Legend

| Suffix | Format | Auto-Mission |
|--------|--------|--------------|
| B | Commander Casual | ATTEND_CMD_CASUAL |
| C | Commander Transition | ATTEND_CMD_TRANSITION |
| T | Commander cEDH | ATTEND_CMD_CEDH |
| D | Draft | ATTEND_LIMITED_EVENT |
| S | Sealed | ATTEND_LIMITED_EVENT |
| A | Academy | ATTEND_ACADEMY |
| E | Outreach | ATTEND_OUTREACH |

## Output Sheets Explained

### MissionLog
- **Purpose**: Per-player mission counters
- **Updated by**: Suffix missions when players attend events
- **Columns**: `preferred_name_id`, `Total_Points`, + mission columns

### Attendance_Calendar
- **Purpose**: Visual attendance matrix
- **Updated by**: Omega scan
- **Format**: Players × Events with ✓ marks

### Attendance_Missions
- **Purpose**: Mission progress summary
- **Updated by**: Omega scan
- **Format**: Players × Missions with progress counts

### Integrity_Log
- **Purpose**: System audit trail
- **Updated by**: All systems
- **Contains**: Timestamps, events, errors, summaries

## Troubleshooting

### ❌ "Missing required sheets"
→ Create `MissionLog_1` and `MissionLog_2`

### ❌ "No events found"
→ Check event sheet names follow `MM-DD-YYYY` format

### ❌ "Player not found in PreferredNames"
→ Add player to `PreferredNames` sheet, then sync

### ❌ "Mission column not found"
→ Run **🔧 Fix Gate I Issues** to add missing columns

### ❌ Mission progress not updating
→ Check `Active = TRUE` in mission definitions

## Tips & Best Practices

1. **Regular Scans**: Run Omega scan after each event
2. **Health Checks**: Run Gate I check weekly
3. **Name Consistency**: Always use PreferredNames
4. **Backup**: Keep a copy of MissionLog before major changes
5. **Test Missions**: Set `Active = FALSE` while testing

## Next Steps

- Read full [README.md](README.md) for detailed documentation
- Explore mission types (attendance, placement, format, streak, win)
- Customize mission definitions for your community
- Integrate with Prize Engine for auto-awarding

## Need Help?

Check the Integrity_Log sheet for detailed error messages and system activity.
