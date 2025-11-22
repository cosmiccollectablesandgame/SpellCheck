# Complete Integration Guide: Missions → BP System

**Three Systems Working Together:**
1. **Cosmic Missions & Attendance** (Omega)
2. **Missions → BP Bridge** (Converter)
3. **Bonus Points System** (BP Pipeline)

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: OMEGA ATTENDANCE SCAN (CosmicMissionSystem.gs)         │
│                                                                 │
│ Input:  Event sheets (11-23-B-2025, etc.)                      │
│ Output: Attendance_Missions (player × mission matrix)          │
│                                                                 │
│ Example Output:                                                 │
│ ┌────────────┬────────────┬──────────┬──────────────────┐      │
│ │ Preferred  │ Attend 10  │ Top 4    │ Commander        │      │
│ │ Name       │ Events     │ Finishes │ Events           │      │
│ ├────────────┼────────────┼──────────┼──────────────────┤      │
│ │ Alice      │ 8          │ 3        │ 5                │      │
│ │ Bob        │ 10         │ 1        │ 7                │      │
│ └────────────┴────────────┴──────────┴──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: MISSIONS → BP BRIDGE (MissionsToBPBridge.gs)           │
│                                                                 │
│ Input:  Attendance_Missions matrix + MissionLog_1/2 defs       │
│ Logic:  For each player:                                       │
│         Attendance_BP = Σ (mission_count × Points_Value)       │
│ Output: Adds "Attendance_BP" column to Attendance_Missions     │
│                                                                 │
│ Example Mission Definitions:                                    │
│ ┌──────────┬────────────────┬─────────────┐                   │
│ │ Mission  │ Mission Name   │ Points_Value│                   │
│ ├──────────┼────────────────┼─────────────┤                   │
│ │ ATTEND10 │ Attend 10 Evt  │ 10          │                   │
│ │ TOP4     │ Top 4 Finishes │ 5           │                   │
│ │ CMD5     │ Commander Evt  │ 3           │                   │
│ └──────────┴────────────────┴─────────────┘                   │
│                                                                 │
│ Example Conversion (Alice):                                     │
│   (8 × 10) + (3 × 5) + (5 × 3) = 80 + 15 + 15 = 110 BP        │
│                                                                 │
│ Updated Output:                                                 │
│ ┌────────────┬───────────┬────────┬──────┬──────────────┐     │
│ │ Preferred  │ Attend 10 │ Top 4  │ CMD5 │ Attendance_BP│     │
│ │ Name       │ Events    │ Finish │      │              │     │
│ ├────────────┼───────────┼────────┼──────┼──────────────┤     │
│ │ Alice      │ 8         │ 3      │ 5    │ 110          │     │
│ │ Bob        │ 10        │ 1      │ 7    │ 126          │     │
│ └────────────┴───────────┴────────┴──────┴──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: BONUS POINTS RECOMPUTE (Your BP System)                │
│                                                                 │
│ Input:  Three Rivers + Redeemed_BP                             │
│   1. Attendance_Missions.Attendance_BP                         │
│   2. Flag_Missions.Flag_BP                                     │
│   3. Dice_Points.Points                                        │
│   4. Manual_BP_Adjustments.Manual_BP                           │
│                                                                 │
│ Logic:                                                          │
│   PreCap_Total_BP = Attendance + Flag + Dice + Manual          │
│   Historical_BP = PreCap_Total_BP (lifetime earned)            │
│   Current_BP_desired = Historical_BP - Redeemed_BP             │
│                                                                 │
│   If Current_BP_desired > 100:                                 │
│     Current_BP = 100                                           │
│     Overflow = Current_BP_desired - 100 → Prestige             │
│   Else:                                                        │
│     Current_BP = Current_BP_desired                            │
│                                                                 │
│ Output: BP_Total + BP_Prestige updated                         │
│                                                                 │
│ Example (Alice):                                                │
│   Attendance_BP: 110                                           │
│   Flag_BP: 0                                                   │
│   Dice_BP: 5                                                   │
│   Manual_BP: 0                                                 │
│   Redeemed_BP: 0                                               │
│   ───────────────                                              │
│   PreCap_Total: 115                                            │
│   Historical_BP: 115                                           │
│   Current_BP_desired: 115 - 0 = 115                            │
│   Current_BP: 100 (capped by DF-080)                           │
│   Overflow: 15 → Prestige +15                                  │
│                                                                 │
│ BP_Total:                                                       │
│ ┌───────┬──────┬──────┬──────┬────────┬──────┬──────────┬─────┐│
│ │Player │Atten │Flag  │Dice  │Manual  │Hist  │Redeemed  │Curr ││
│ │       │_BP   │_BP   │_BP   │_BP     │_BP   │_BP       │_BP  ││
│ ├───────┼──────┼──────┼──────┼────────┼──────┼──────────┼─────┤│
│ │Alice  │110   │0     │5     │0       │115   │0         │100  ││
│ │Bob    │126   │0     │10    │0       │136   │20        │100  ││
│ └───────┴──────┴──────┴──────┴────────┴──────┴──────────┴─────┘│
│                                                                 │
│ BP_Prestige:                                                    │
│ ┌───────────┬─────────────────┬──────────────────────┐         │
│ │ Player    │ Prestige_Points │ Last_Overflow_Date   │         │
│ ├───────────┼─────────────────┼──────────────────────┤         │
│ │ Alice     │ 15              │ 2025-11-22           │         │
│ │ Bob       │ 16              │ 2025-11-22           │         │
│ └───────────┴─────────────────┴──────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Required Sheets Setup

### Sheet 1: MissionLog_1 (Mission Definitions)

**Purpose:** Define missions and their BP values

```
| Mission_ID | Mission_Name        | Mission_Type | Criteria | Points_Value | Cap | Active |
|------------|---------------------|--------------|----------|--------------|-----|--------|
| ATTEND_10  | Attend 10 Events    | attendance   |          | 10           | 0   | TRUE   |
| TOP4_MTG   | Finish Top 4        | placement    | 4        | 5            | 0   | TRUE   |
| CMD_5      | 5 Commander Events  | format       | C        | 3            | 0   | TRUE   |
| STREAK_3   | 3 Week Streak       | streak       | 3        | 15           | 1   | TRUE   |
```

**Key Columns:**
- `Points_Value` - How many BP awarded per mission completion
- `Cap` - 0 = unlimited, >0 = max completions counted
- `Active` - TRUE to include in calculations

### Sheet 2: PreferredNames (Canonical Player Names)

```
| Column A       |
|----------------|
| Alice Thompson |
| Bob Martinez   |
| Carol Chen     |
```

### Sheet 3: Attendance_Missions (Created by Omega, Updated by Bridge)

```
| PreferredName  | Attend 10 Events | Finish Top 4 | 5 Commander | Attendance_BP |
|----------------|------------------|--------------|-------------|---------------|
| Alice Thompson | 8                | 3            | 5           | 110           |
| Bob Martinez   | 10               | 1            | 7           | 126           |
```

**Note:** `Attendance_BP` column is **added by the Bridge**

### Sheet 4: Flag_Missions (Manual Staff Flags)

```
| Player         | Flag_BP |
|----------------|---------|
| Alice Thompson | 0       |
| Bob Martinez   | 5       |
```

### Sheet 5: Dice_Points (Operational Dice UI)

```
| Player         | Points | Add_Point_Checkbox |
|----------------|--------|--------------------|
| Alice Thompson | 5      | FALSE              |
| Bob Martinez   | 10     | FALSE              |
```

### Sheet 6: Manual_BP_Adjustments (Admin Corrections)

```
| Player         | Manual_BP |
|----------------|-----------|
| Alice Thompson | 0         |
| Bob Martinez   | 0         |
```

### Sheet 7: Redeemed_BP (Tracking Spent BP)

```
| Player         | Redeemed_BP_Total |
|----------------|-------------------|
| Alice Thompson | 0                 |
| Bob Martinez   | 20                |
```

### Sheet 8: BP_Total (Canonical BP Lake - Created by BP System)

```
| Player | Attendance_BP | Flag_BP | Dice_BP | Manual_BP | PreCap_Total | Historical | Redeemed | Current_BP | Last_Updated |
|--------|---------------|---------|---------|-----------|--------------|------------|----------|------------|--------------|
| Alice  | 110           | 0       | 5       | 0         | 115          | 115        | 0        | 100        | 2025-11-22   |
| Bob    | 126           | 5       | 10      | 0         | 141          | 141        | 20       | 100        | 2025-11-22   |
```

### Sheet 9: BP_Prestige (Overflow Tracking)

```
| Player | Prestige_Points | Lifetime_Overflow | Last_Overflow_Date |
|--------|-----------------|-------------------|--------------------|
| Alice  | 15              | 15                | 2025-11-22         |
| Bob    | 21              | 21                | 2025-11-22         |
```

### Sheet 10: Integrity_Log (Audit Trail)

All operations log here with timestamps, operators, before/after states.

---

## 🚀 Quick Start Guide

### First-Time Setup

1. **Create Required Sheets:**
   ```javascript
   // Run once to create all sheets with headers
   // (You may need to create a setup function or do this manually)
   ```

2. **Add Mission Definitions:**
   - Open `MissionLog_1`
   - Add your missions with `Points_Value` filled
   - Set `Active = TRUE` for missions to include

3. **Populate PreferredNames:**
   - Add canonical player names to column A

4. **Run Complete Pipeline:**
   - Menu: `🌉 Missions → BP Bridge > Run Complete Pipeline`
   - This runs all three steps automatically

### Regular Operations

**After Events (Weekly/Bi-weekly):**

```
Option A - Automated (Recommended):
  Menu → 🌉 Missions → BP Bridge → Run Complete Pipeline

Option B - Manual:
  1. Menu → 🎯 Systems → Scan + Update Missions (Omega)
  2. Menu → 🌉 Missions → BP Bridge → Convert Missions to BP
  3. Menu → Bonus Points (BP) → Recompute All Bonus Points
```

**When Players Redeem BP:**

```javascript
// Called from your redemption dialog
redeemBonusPoints(playerName, amount, { note: "Redeemed for prize X" });

// Then recompute to update Current_BP
recomputeAllBonusPoints();
```

**Manual BP Awards:**

```javascript
// Called from your award dialog
awardBonusPoints(playerName, amount, 'MANUAL', { note: "Special event bonus" });
```

---

## 🔧 Menu Integration

Add to your `Code.gs` `onOpen()` function:

```javascript
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // Existing menus...

  // Add Missions → BP Bridge menu
  addMissionsBPBridgeMenu();

  // Add Bonus Points menu
  addBonusPointsMenu();
}
```

**Resulting Menus:**

```
🎯 Systems
  ├─ Scan + Update Missions (Omega)
  ├─ Check Gate I (MissionLog)
  ├─ Fix Gate I Issues
  └─ Initialize MissionLog

🌉 Missions → BP Bridge
  ├─ Convert Missions to BP
  ├─ Run Complete Pipeline (⭐ Use this!)
  └─ Validate Mission BP Mapping

Bonus Points (BP)
  ├─ Recompute All Bonus Points
  ├─ Migrate Legacy Prize-Wall-Points
  └─ View Ship Gate I Report
```

---

## ✅ Validation Checklist

After running the pipeline, verify:

- [ ] `Attendance_Missions` has `Attendance_BP` column
- [ ] `Attendance_BP` values match: Σ(mission_count × Points_Value)
- [ ] `BP_Total.Current_BP` ≤ 100 for all players
- [ ] Players with >100 BP have `BP_Prestige` entries
- [ ] `Integrity_Log` has `MISSIONS_TO_BP_CONVERSION` entries
- [ ] Run `View Ship Gate I Report` - should PASS

**Validation Command:**

```
Menu → 🌉 Missions → BP Bridge → Validate Mission BP Mapping
```

This shows:
- ✓ Missions with Points_Value defined
- ✗ Missions missing from MissionLog_1/2
- Total potential BP per cycle

---

## 🐛 Troubleshooting

### Issue: "Attendance_BP column is 0 for all players"

**Cause:** Mission names in `Attendance_Missions` don't match `Mission_Name` in MissionLog_1/2

**Fix:**
1. Run `Validate Mission BP Mapping`
2. Check which missions show as "✗ WITHOUT BP Mapping"
3. Either:
   - Update `Mission_Name` in MissionLog_1/2 to match column headers, OR
   - Update column headers in Attendance_Missions to match Mission_Name

**Example:**
```
Attendance_Missions header: "Attend 10 Events"
MissionLog_1.Mission_Name: "Attend 10 Events" ← Must match exactly!
```

### Issue: "Current_BP shows >100"

**Cause:** Ship Gate I validation failed, overflow logic not applied

**Fix:**
1. Run `Recompute All Bonus Points` again
2. Check `View Ship Gate I Report` for specific errors
3. Verify `BP_Prestige` sheet exists and has correct columns

### Issue: "Mission progress not showing"

**Cause:** Event sheets not matching pattern or Omega scan failed

**Fix:**
1. Verify event sheet names: `MM-DD-YYYY` or `MM-DD-[SUFFIX]-YYYY`
2. Check event sheets have `Player` and `Final Standing` columns
3. Re-run `Scan + Update Missions`

### Issue: "Player not found errors"

**Cause:** Player name not in `PreferredNames`

**Fix:**
1. Add player to `PreferredNames` column A
2. Run `Initialize MissionLog` (creates MissionLog rows)
3. Re-run pipeline

---

## 📊 Example Scenario

**Scenario:** Monthly mission processing for 50 players

**Starting State:**
- 20 events this month (various formats: Commander, Draft, Sealed)
- Players attended 1-15 events each
- Mission definitions award 1-15 BP per mission type

**Process:**

```bash
1. Menu → Run Complete Pipeline
   ↓
2. Omega scans 20 event sheets
   → Builds Attendance_Calendar
   → Computes mission progress for all mission types
   → Updates Attendance_Missions

3. Bridge reads mission progress
   → Multiplies counts by Points_Value
   → Writes Attendance_BP totals

4. BP System aggregates rivers
   → Attendance_BP: varies by player
   → Flag_BP: 0 (no staff flags this month)
   → Dice_BP: varies by dice rolls
   → Manual_BP: 0 (no manual adjustments)
   → Computes totals
   → Applies 100 BP cap
   → Overflows to Prestige

5. Results logged to Integrity_Log
```

**Output:**
- `Attendance_Calendar`: 50 rows × 20 event columns
- `Attendance_Missions`: 50 rows × 15 mission columns + Attendance_BP
- `BP_Total`: 50 rows with Current_BP capped at 100
- `BP_Prestige`: ~20 rows (players who exceeded 100)

**Time:** ~30-60 seconds for 50 players × 20 events

---

## 🔐 Decision Flags Referenced

- **DF-080:** Current_BP capped at 0-100
- **DF-081:** Overflow above 100 → Prestige
- **DF-260:** BP pipeline integrity tagging

---

## 📝 Key Differences from Legacy System

| Legacy "Prize-Wall-Points" | New "Bonus Points" |
|----------------------------|-------------------|
| Single sheet with balances | Three-river pipeline |
| No mission integration | Mission-driven awards |
| No cap enforcement | 100 BP cap with Prestige |
| No audit trail | Full Integrity_Log |
| Manual tracking | Automated computation |

**Migration:** Run `Migrate Legacy Prize-Wall-Points` from BP menu (one-time)

---

## 🎯 Best Practices

1. **Run pipeline after each event cycle** (weekly/bi-weekly)
2. **Validate mission BP mapping** when adding new missions
3. **Check Ship Gate I** before major operations
4. **Review Integrity_Log** for audit trail
5. **Backup spreadsheet** before first-time migration
6. **Test with 2-3 players** before processing all players

---

## 🔗 File Reference

- `CosmicMissionSystem.gs` - Omega Attendance & Gate I
- `MissionsToBPBridge.gs` - Missions → BP converter
- `[Your BP System File]` - BP pipeline (recompute, award, redeem)

---

**End of Integration Guide**
