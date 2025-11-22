/**
 * ════════════════════════════════════════════════════════════════════════
 * MISSIONS TO BONUS POINTS BRIDGE
 *
 * Purpose: Convert Omega Attendance mission progress to BP system format
 *
 * Flow:
 * 1. Omega Attendance System → Attendance_Missions (mission progress matrix)
 * 2. THIS BRIDGE → Converts mission counts to BP using Points_Value
 * 3. BP System → Reads Attendance_BP column for BP pipeline
 *
 * Integration Point: Run after runOmegaAttendanceScan() completes
 * ════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════
// BRIDGE CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

var MISSIONS_BP_BRIDGE_CONFIG = {
  // Source: Omega output
  SOURCE_SHEET: 'Attendance_Missions',
  SOURCE_PLAYER_COL: 'PreferredName',

  // Target: BP system input
  TARGET_BP_COLUMN: 'Attendance_BP',

  // Mission definitions
  MISSION_DEF_SHEETS: ['MissionLog_1', 'MissionLog_2'],

  // Logging
  LOG_SHEET: 'Integrity_Log',
  LOG_EVENT_TYPE: 'MISSIONS_TO_BP_CONVERSION'
};

// ════════════════════════════════════════════════════════════════════════
// CORE BRIDGE FUNCTION
// ════════════════════════════════════════════════════════════════════════

/**
 * Convert Omega mission progress to Bonus Points
 *
 * Call this AFTER runOmegaAttendanceScan() completes
 *
 * Workflow:
 * 1. Load mission definitions (Mission_ID → Points_Value)
 * 2. Read Attendance_Missions matrix (player × missions)
 * 3. For each player, compute: sum(mission_count × Points_Value)
 * 4. Write Attendance_BP column
 * 5. Log conversion to Integrity_Log
 */
function convertMissionsToBonusPoints() {
  var startTime = new Date();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  try {
    Logger.log('Starting Missions to BP conversion...');

    // Get Attendance_Missions sheet
    var missionsSheet = ss.getSheetByName(MISSIONS_BP_BRIDGE_CONFIG.SOURCE_SHEET);
    if (!missionsSheet) {
      throw new Error('Attendance_Missions sheet not found. Run Omega Attendance Scan first.');
    }

    var lastRow = missionsSheet.getLastRow();
    var lastCol = missionsSheet.getLastColumn();

    if (lastRow <= 1) {
      ui.alert('No Data', 'Attendance_Missions sheet is empty. Run Omega scan first.', ui.ButtonSet.OK);
      return;
    }

    // Load mission definitions (Mission_ID → Points_Value)
    var missionDefs = loadMissionDefinitionsForBP_(ss);
    if (Object.keys(missionDefs).length === 0) {
      throw new Error('No mission definitions found in MissionLog_1 or MissionLog_2');
    }

    // Get headers from Attendance_Missions
    var headers = missionsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerMap = {};
    for (var i = 0; i < headers.length; i++) {
      headerMap[String(headers[i]).trim()] = i;
    }

    // Find or create Attendance_BP column
    var bpColIndex = headerMap[MISSIONS_BP_BRIDGE_CONFIG.TARGET_BP_COLUMN];
    if (bpColIndex === undefined) {
      // Add Attendance_BP column to the right of existing columns
      bpColIndex = lastCol;
      missionsSheet.getRange(1, lastCol + 1).setValue(MISSIONS_BP_BRIDGE_CONFIG.TARGET_BP_COLUMN);
      missionsSheet.getRange(1, lastCol + 1)
        .setFontWeight('bold')
        .setBackground('#4a86e8')
        .setFontColor('#ffffff');
      lastCol++;
      Logger.log('Added Attendance_BP column at index ' + bpColIndex);
    }

    // Find player column
    var playerColIndex = headerMap[MISSIONS_BP_BRIDGE_CONFIG.SOURCE_PLAYER_COL];
    if (playerColIndex === undefined) {
      throw new Error('PreferredName column not found in Attendance_Missions');
    }

    // Get all data
    var data = missionsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // Build mission name → Points_Value map
    var missionPoints = {};
    for (var missionId in missionDefs) {
      var missionName = missionDefs[missionId].name;
      var pointsValue = missionDefs[missionId].pointsValue;
      missionPoints[missionName] = pointsValue;

      // Also map by ID in case mission names aren't used
      missionPoints[missionId] = pointsValue;
    }

    // Process each player
    var bpValues = [];
    var conversionStats = {
      playersProcessed: 0,
      totalBPAwarded: 0,
      missionTypesFound: 0,
      errors: 0
    };

    for (var rowIdx = 0; rowIdx < data.length; rowIdx++) {
      var player = String(data[rowIdx][playerColIndex]).trim();
      if (!player) {
        bpValues.push([0]);
        continue;
      }

      var totalBP = 0;

      // Iterate through each mission column
      for (var colIdx = 0; colIdx < headers.length; colIdx++) {
        var missionName = String(headers[colIdx]).trim();

        // Skip non-mission columns
        if (missionName === MISSIONS_BP_BRIDGE_CONFIG.SOURCE_PLAYER_COL ||
            missionName === MISSIONS_BP_BRIDGE_CONFIG.TARGET_BP_COLUMN ||
            missionName === '') {
          continue;
        }

        // Get mission count for this player
        var missionCount = Number(data[rowIdx][colIdx]) || 0;

        // Get points value for this mission
        var pointsValue = missionPoints[missionName];

        if (pointsValue !== undefined && missionCount > 0) {
          var bpFromMission = missionCount * pointsValue;
          totalBP += bpFromMission;

          Logger.log('Player: ' + player + ', Mission: ' + missionName +
                    ', Count: ' + missionCount + ', Points: ' + pointsValue +
                    ', BP: ' + bpFromMission);
        }
      }

      bpValues.push([totalBP]);
      conversionStats.playersProcessed++;
      conversionStats.totalBPAwarded += totalBP;

      Logger.log('Player ' + player + ' total Attendance_BP: ' + totalBP);
    }

    // Write Attendance_BP values (batch operation)
    if (bpValues.length > 0) {
      missionsSheet.getRange(2, bpColIndex + 1, bpValues.length, 1).setValues(bpValues);
    }

    // Count unique mission types found
    var missionTypesSet = {};
    for (var h = 0; h < headers.length; h++) {
      var headerName = String(headers[h]).trim();
      if (missionPoints[headerName] !== undefined) {
        missionTypesSet[headerName] = true;
      }
    }
    conversionStats.missionTypesFound = Object.keys(missionTypesSet).length;

    var duration = (new Date() - startTime) / 1000;

    // Log to Integrity_Log
    logMissionsBPConversion_(ss, conversionStats, duration);

    // Show results
    ui.alert(
      'Missions → BP Conversion Complete',
      'Successfully converted mission progress to Bonus Points!\n\n' +
      'Players Processed: ' + conversionStats.playersProcessed + '\n' +
      'Total Attendance_BP Awarded: ' + conversionStats.totalBPAwarded + '\n' +
      'Mission Types Found: ' + conversionStats.missionTypesFound + '\n' +
      'Duration: ' + duration.toFixed(2) + 's\n\n' +
      'Next: Run "Recompute All Bonus Points" from BP menu',
      ui.ButtonSet.OK
    );

    Logger.log('Missions to BP conversion completed: ' + JSON.stringify(conversionStats));

  } catch (error) {
    Logger.log('ERROR in convertMissionsToBonusPoints: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);

    ui.alert(
      'Conversion Error',
      'Failed to convert missions to BP:\n\n' + error.toString() +
      '\n\nCheck execution logs for details.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Load mission definitions for BP conversion
 * Returns: { Mission_ID: { name, pointsValue, type, ... }, ... }
 */
function loadMissionDefinitionsForBP_(ss) {
  var missions = {};

  var logSheets = MISSIONS_BP_BRIDGE_CONFIG.MISSION_DEF_SHEETS;

  for (var i = 0; i < logSheets.length; i++) {
    var sheet = ss.getSheetByName(logSheets[i]);
    if (!sheet) continue;

    try {
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;

      // Expected columns: Mission_ID | Mission_Name | Mission_Type | Criteria | Points_Value | Cap | Active
      for (var j = 1; j < data.length; j++) {
        var row = data[j];

        if (!row[0]) continue; // Skip empty rows

        var missionId = String(row[0]).trim();
        var missionName = row[1] ? String(row[1]).trim() : missionId;
        var pointsValue = parseFloat(row[4]) || 1; // Default 1 BP if not specified
        var active = row[6] !== false && String(row[6]).toLowerCase() !== 'false';

        if (!active) {
          Logger.log('Skipping inactive mission: ' + missionId);
          continue;
        }

        missions[missionId] = {
          id: missionId,
          name: missionName,
          type: row[2] ? String(row[2]).trim() : 'attendance',
          criteria: row[3] ? String(row[3]).trim() : '',
          pointsValue: pointsValue,
          cap: parseInt(row[5]) || 0,
          source: logSheets[i]
        };
      }
    } catch (error) {
      Logger.log('Error loading missions from ' + logSheets[i] + ': ' + error.toString());
    }
  }

  Logger.log('Loaded ' + Object.keys(missions).length + ' mission definitions for BP conversion');
  return missions;
}

/**
 * Log conversion to Integrity_Log
 */
function logMissionsBPConversion_(ss, stats, duration) {
  try {
    var logSheet = ss.getSheetByName(MISSIONS_BP_BRIDGE_CONFIG.LOG_SHEET);
    if (!logSheet) {
      Logger.log('Integrity_Log not found, skipping log');
      return;
    }

    var timestamp = new Date();
    var user = Session.getActiveUser().getEmail();
    var engineVersion = typeof ENGINE_VERSION !== 'undefined' ? ENGINE_VERSION : '7.9.6';

    // Find or get last row
    var lastRow = logSheet.getLastRow();

    var logEntry = [
      timestamp,
      user,
      MISSIONS_BP_BRIDGE_CONFIG.LOG_EVENT_TYPE,
      'Attendance_Missions',
      'Converted ' + stats.playersProcessed + ' players, ' + stats.totalBPAwarded + ' total BP, ' +
      stats.missionTypesFound + ' mission types, ' + duration.toFixed(2) + 's',
      engineVersion,
      '', // seed
      '', // checksum
      'MISSIONS_BP_BRIDGE', // df_tags
      '' // rl_band
    ];

    logSheet.getRange(lastRow + 1, 1, 1, logEntry.length).setValues([logEntry]);
    Logger.log('Logged conversion to Integrity_Log');

  } catch (error) {
    Logger.log('Failed to log conversion: ' + error.toString());
  }
}

// ════════════════════════════════════════════════════════════════════════
// AUTOMATED PIPELINE INTEGRATION
// ════════════════════════════════════════════════════════════════════════

/**
 * Complete Attendance → Missions → BP pipeline
 *
 * Runs the full pipeline:
 * 1. Omega Attendance Scan (events → missions)
 * 2. Missions to BP Conversion (missions → BP)
 * 3. BP Recompute (BP rivers → totals with cap/overflow)
 *
 * Call this from menu for one-click mission processing
 */
function runCompleteMissionsBPPipeline() {
  var ui = SpreadsheetApp.getUi();

  var response = ui.alert(
    'Run Complete Missions → BP Pipeline',
    'This will execute:\n\n' +
    '1. Omega Attendance Scan (scan events → compute missions)\n' +
    '2. Convert Missions to BP (mission progress → Attendance_BP)\n' +
    '3. Recompute All Bonus Points (aggregate BP rivers → totals)\n\n' +
    'This may take a few minutes for large datasets.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Pipeline cancelled.');
    return;
  }

  try {
    // Step 1: Omega Attendance Scan
    Logger.log('Pipeline Step 1: Running Omega Attendance Scan...');
    runOmegaAttendanceScan();

    // Step 2: Missions to BP Conversion
    Logger.log('Pipeline Step 2: Converting Missions to BP...');
    Utilities.sleep(1000); // Brief pause to let sheet updates settle
    convertMissionsToBonusPoints();

    // Step 3: BP Recompute (if function exists)
    Logger.log('Pipeline Step 3: Recomputing Bonus Points...');
    Utilities.sleep(1000);

    if (typeof recomputeAllBonusPoints === 'function') {
      recomputeAllBonusPoints();
    } else {
      ui.alert(
        'Manual Step Required',
        'Mission → BP conversion complete!\n\n' +
        'Please run "Recompute All Bonus Points" from the BP menu to complete the pipeline.',
        ui.ButtonSet.OK
      );
    }

  } catch (error) {
    Logger.log('ERROR in pipeline: ' + error.toString());
    ui.alert(
      'Pipeline Error',
      'The pipeline encountered an error:\n\n' + error.toString() +
      '\n\nCheck execution logs for details.',
      ui.ButtonSet.OK
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// VALIDATION: Check Mission → BP Mapping
// ════════════════════════════════════════════════════════════════════════

/**
 * Validates that all missions in Attendance_Missions have BP mappings
 *
 * Reports:
 * - Missions with Points_Value defined
 * - Missions missing from MissionLog_1/2
 * - Total potential BP if all missions maxed
 */
function validateMissionBPMapping() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  try {
    var missionsSheet = ss.getSheetByName(MISSIONS_BP_BRIDGE_CONFIG.SOURCE_SHEET);
    if (!missionsSheet) {
      ui.alert('Error', 'Attendance_Missions sheet not found.', ui.ButtonSet.OK);
      return;
    }

    var lastCol = missionsSheet.getLastColumn();
    if (lastCol === 0) {
      ui.alert('Error', 'Attendance_Missions sheet is empty.', ui.ButtonSet.OK);
      return;
    }

    var headers = missionsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var missionDefs = loadMissionDefinitionsForBP_(ss);

    var mapped = [];
    var unmapped = [];
    var totalPotentialBP = 0;

    for (var i = 0; i < headers.length; i++) {
      var missionName = String(headers[i]).trim();

      // Skip system columns
      if (missionName === MISSIONS_BP_BRIDGE_CONFIG.SOURCE_PLAYER_COL ||
          missionName === MISSIONS_BP_BRIDGE_CONFIG.TARGET_BP_COLUMN ||
          missionName === '') {
        continue;
      }

      // Check if mission has a BP mapping
      var hasMappingByName = false;
      var pointsValue = 0;

      for (var missionId in missionDefs) {
        if (missionDefs[missionId].name === missionName || missionId === missionName) {
          hasMappingByName = true;
          pointsValue = missionDefs[missionId].pointsValue;
          totalPotentialBP += pointsValue;
          mapped.push(missionName + ' → ' + pointsValue + ' BP');
          break;
        }
      }

      if (!hasMappingByName) {
        unmapped.push(missionName);
      }
    }

    // Build report
    var report = 'Mission → BP Mapping Validation\n\n';
    report += 'Missions with BP Mapping (' + mapped.length + '):\n';
    mapped.forEach(function(m) {
      report += '  ✓ ' + m + '\n';
    });

    if (unmapped.length > 0) {
      report += '\nMissions WITHOUT BP Mapping (' + unmapped.length + '):\n';
      unmapped.forEach(function(m) {
        report += '  ✗ ' + m + ' (will contribute 0 BP)\n';
      });
    }

    report += '\nTotal Definitions in MissionLog_1/2: ' + Object.keys(missionDefs).length;
    report += '\nTotal Mission Columns: ' + (mapped.length + unmapped.length);
    report += '\nMax BP per completion cycle: ' + totalPotentialBP;

    if (unmapped.length > 0) {
      report += '\n\n⚠️ WARNING: ' + unmapped.length + ' mission(s) have no Points_Value defined!';
    }

    ui.alert('Mission BP Validation', report, ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('ERROR in validateMissionBPMapping: ' + error.toString());
    ui.alert('Validation Error', error.toString(), ui.ButtonSet.OK);
  }
}

// ════════════════════════════════════════════════════════════════════════
// MENU INTEGRATION
// ════════════════════════════════════════════════════════════════════════

/**
 * Add Missions → BP bridge menu items
 * Call from your onOpen() function
 */
function addMissionsBPBridgeMenu() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('🌉 Missions → BP Bridge')
    .addItem('Convert Missions to BP', 'convertMissionsToBonusPoints')
    .addSeparator()
    .addItem('Run Complete Pipeline', 'runCompleteMissionsBPPipeline')
    .addSeparator()
    .addItem('Validate Mission BP Mapping', 'validateMissionBPMapping')
    .addToUi();
}

// ════════════════════════════════════════════════════════════════════════
// INTEGRATION INSTRUCTIONS
// ════════════════════════════════════════════════════════════════════════

/*
HOW TO USE THIS BRIDGE:

1. SETUP (One-Time):
   - Ensure MissionLog_1 and MissionLog_2 have Points_Value column filled
   - Each mission should have: Mission_ID, Mission_Name, Mission_Type, Criteria, Points_Value, Cap, Active
   - Example: ATTEND_10 | Attend 10 Events | attendance | | 10 | 0 | TRUE

2. AUTOMATED PIPELINE (Recommended):
   - Menu: 🌉 Missions → BP Bridge > Run Complete Pipeline
   - This runs: Omega Scan → Missions to BP → BP Recompute
   - One-click solution!

3. MANUAL PIPELINE:
   - Step 1: Run Omega Attendance Scan (🎯 Systems > Scan + Update Missions)
   - Step 2: Convert Missions to BP (🌉 Missions → BP Bridge > Convert Missions to BP)
   - Step 3: Recompute BP (Bonus Points (BP) > Recompute All Bonus Points)

4. VALIDATION:
   - Menu: 🌉 Missions → BP Bridge > Validate Mission BP Mapping
   - Shows which missions have Points_Value defined
   - Warns about unmapped missions (will contribute 0 BP)

5. RESULT:
   - Attendance_Missions gets new column: Attendance_BP
   - This column is then read by recomputeAllBonusPoints()
   - BP flows: Mission Progress → Attendance_BP → BP_Total → Current_BP (capped at 100)

6. TROUBLESHOOTING:
   - "Mission X has no BP mapping" → Add Mission_ID to MissionLog_1/2 with Points_Value
   - "0 BP awarded" → Check that Points_Value column is filled in mission definitions
   - "Attendance_BP doesn't update" → Run Convert Missions to BP, then Recompute BP

END OF INTEGRATION INSTRUCTIONS
*/
