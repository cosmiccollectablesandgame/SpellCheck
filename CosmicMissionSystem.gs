/**
 * ════════════════════════════════════════════════════════════════════════
 * COSMIC MISSIONS & ATTENDANCE TRACKING SYSTEM - UNIFIED
 *
 * Integrates three mission/attendance systems:
 * 1. Mission Suffix Service (per-player MissionLog counters)
 * 2. Mission Gate I (MissionLog & Attendance health check)
 * 3. Omega Attendance System (mission definitions & analysis)
 *
 * Version: 1.0.0 - Unified Integration
 * Compatible with: Engine v7.9.6+
 * ════════════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════════════
// GLOBAL CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

/**
 * Canonical mission IDs for suffix-based attendance missions
 * These MUST match the column headers in MissionLog sheet
 */
var MISSION_IDS = {
  ATTEND_CMD_CASUAL: 'ATTEND_CMD_CASUAL',
  ATTEND_CMD_TRANSITION: 'ATTEND_CMD_TRANSITION',
  ATTEND_CMD_CEDH: 'ATTEND_CMD_CEDH',
  ATTEND_LIMITED_EVENT: 'ATTEND_LIMITED_EVENT',
  ATTEND_ACADEMY: 'ATTEND_ACADEMY',
  ATTEND_OUTREACH: 'ATTEND_OUTREACH'
};

/**
 * Attendance tracking configuration
 */
var ATTENDANCE_CONFIG = {
  SHEETS: {
    CALENDAR: 'Attendance_Calendar',
    MISSIONS: 'Attendance_Missions',
    MISSION_LOG_1: 'MissionLog_1',
    MISSION_LOG_2: 'MissionLog_2',
    PREFERRED_NAMES: 'PreferredNames',
    INTEGRITY_LOG: 'Integrity_Log',
    MISSION_LOG: 'MissionLog'
  },

  // Event sheet name pattern: MM-DD-YYYY or MM-DD-[SUFFIX]-YYYY
  EVENT_PATTERN: /^(\d{2})-(\d{2})(?:-([A-Z]))?\-(\d{4})$/,

  // Format suffix legend
  FORMAT_LEGEND: {
    'C': 'Commander',
    'D': 'Draft',
    'S': 'Sealed',
    'P': 'Prerelease',
    'M': 'Modern',
    'L': 'Legacy',
    'V': 'Vintage',
    'N': 'Night Event',
    'B': 'Brawl',
    'T': 'Two-Headed Giant',
    'A': 'Academy',
    'E': 'Outreach'
  },

  // Column headers expected in event sheets
  EXPECTED_HEADERS: {
    PLAYER: 'player',
    STANDING: 'final standing'
  },

  // Performance settings
  BATCH_SIZE: 1000,
  MAX_WEEKS_FOR_STREAK: 52
};

// ════════════════════════════════════════════════════════════════════════
// CORE HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Get all mission IDs
 * @return {Array<string>} Array of mission IDs
 */
function getAllMissionIds_() {
  return Object.values(MISSION_IDS);
}

/**
 * Coerce value to number with fallback
 * @param {*} value - Value to coerce
 * @param {number} fallback - Fallback value
 * @return {number} Coerced number
 */
function coerceNumber(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  var num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Extract suffix from event ID (sheet name)
 * @param {string} eventId - Event sheet name (e.g., "11-23-B-2025")
 * @return {string} Suffix or empty string
 */
function getSuffixFromEventId_(eventId) {
  if (!eventId) return '';
  var match = eventId.match(ATTENDANCE_CONFIG.EVENT_PATTERN);
  return match && match[3] ? match[3] : '';
}

/**
 * Get metadata for a given suffix
 * @param {string} suffix - Event suffix
 * @return {Object|null} Suffix metadata
 */
function getSuffixMeta_(suffix) {
  if (!suffix) return null;

  var format = ATTENDANCE_CONFIG.FORMAT_LEGEND[suffix];
  if (!format) return null;

  // Determine if format requires kit prompt (limited formats)
  var requiresKitPrompt = ['Draft', 'Sealed', 'Prerelease'].indexOf(format) !== -1;

  return {
    suffix: suffix,
    format: format,
    requiresKitPrompt: requiresKitPrompt
  };
}

/**
 * Log action to Integrity_Log
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
function logIntegrityAction(event, details) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);

    if (!logSheet) {
      logSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);
      logSheet.appendRow([
        'timestamp', 'user', 'event', 'target', 'details',
        'engine_version', 'seed', 'checksum', 'df_tags', 'rl_band'
      ]);
    }

    var timestamp = new Date().toISOString();
    var user = Session.getActiveUser().getEmail();
    var engineVersion = typeof ENGINE_VERSION !== 'undefined' ? ENGINE_VERSION : '7.9.6';

    logSheet.appendRow([
      timestamp,
      user,
      event,
      details.target || 'System',
      details.details || JSON.stringify(details),
      engineVersion,
      '',
      '',
      details.df_tags || '',
      details.rl_band || ''
    ]);
  } catch (e) {
    Logger.log('Failed to log integrity action: ' + e.toString());
  }
}

// ════════════════════════════════════════════════════════════════════════
// PREFERRED NAMES MANAGEMENT
// ════════════════════════════════════════════════════════════════════════

/**
 * Load PreferredNames for canonical name resolution
 * @param {Spreadsheet} ss - Spreadsheet object
 * @return {Set<string>} Set of preferred names
 */
function loadPreferredNames(ss) {
  var sheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.PREFERRED_NAMES);
  if (!sheet) {
    Logger.log('Warning: PreferredNames sheet not found. Name resolution may be inconsistent.');
    return new Set();
  }

  try {
    var data = sheet.getDataRange().getValues();
    var names = new Set();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        names.add(String(data[i][0]).trim());
      }
    }

    Logger.log('Loaded ' + names.size + ' preferred names');
    return names;
  } catch (error) {
    Logger.log('Error loading PreferredNames: ' + error.toString());
    return new Set();
  }
}

/**
 * Resolve canonical name (fuzzy matching if needed)
 * @param {string} name - Raw name to resolve
 * @param {Set<string>} preferredNames - Set of canonical names
 * @return {string|null} Canonical name or null
 */
function resolveCanonicalName(name, preferredNames) {
  if (!name) return null;

  // Direct match
  if (preferredNames.has(name)) return name;

  // Case-insensitive match
  var lowerName = name.toLowerCase();
  var namesArray = Array.from(preferredNames);
  for (var i = 0; i < namesArray.length; i++) {
    if (namesArray[i].toLowerCase() === lowerName) {
      return namesArray[i];
    }
  }

  // If PreferredNames is empty, accept all names
  if (preferredNames.size === 0) {
    return name;
  }

  // If not found, return as-is
  Logger.log('Warning: Player name "' + name + '" not found in PreferredNames');
  return name;
}

// ════════════════════════════════════════════════════════════════════════
// ATTENDANCE SCANNING - CORE FUNCTION USED BY BOTH GATE I AND OMEGA
// ════════════════════════════════════════════════════════════════════════

/**
 * Scan attendance records for a date range
 * This is the shared function used by both Gate I and batch mission processing
 *
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @return {Array<Object>} Array of attendance records
 *   Each record: { playerId: string, eventId: string, rank: number|null, date: Date }
 */
function scanAttendanceForRange_(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var records = [];

  // Load PreferredNames for canonical resolution
  var preferredNames = loadPreferredNames(ss);

  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    var match = sheetName.match(ATTENDANCE_CONFIG.EVENT_PATTERN);

    if (match) {
      try {
        // Parse event date
        var month = parseInt(match[1]);
        var day = parseInt(match[2]);
        var year = parseInt(match[4]);

        var eventDate = new Date(year, month - 1, day);

        // Validate date is within range
        if (isNaN(eventDate.getTime()) ||
            eventDate.getMonth() !== month - 1 ||
            eventDate.getDate() !== day) {
          return; // Skip invalid dates
        }

        // Check if event is within the specified date range
        if (eventDate < startDate || eventDate > endDate) {
          return; // Skip events outside range
        }

        // Extract player data from this event sheet
        var data = sheet.getDataRange().getValues();
        if (data.length <= 1) return; // No data rows

        // Find player and standing columns
        var headers = data[0].map(function(h) {
          return String(h).toLowerCase().trim();
        });

        var playerCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.PLAYER);
        var standingCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.STANDING);

        if (playerCol === -1) {
          Logger.log('Warning: No "Player" column in ' + sheetName);
          return;
        }

        // Extract player records
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var rawPlayerName = String(row[playerCol]).trim();

          if (!rawPlayerName) continue;

          var playerName = resolveCanonicalName(rawPlayerName, preferredNames);

          if (playerName) {
            var rank = null;
            if (standingCol !== -1 && row[standingCol]) {
              var standing = parseInt(row[standingCol]);
              if (!isNaN(standing) && standing > 0) {
                rank = standing;
              }
            }

            records.push({
              playerId: playerName,
              eventId: sheetName,
              rank: rank,
              date: eventDate
            });
          }
        }
      } catch (e) {
        Logger.log('Error processing event sheet ' + sheetName + ': ' + e.toString());
      }
    }
  });

  // Sort records chronologically
  records.sort(function(a, b) {
    return a.date - b.date;
  });

  Logger.log('Scanned ' + records.length + ' attendance records between ' +
             startDate.toDateString() + ' and ' + endDate.toDateString());

  return records;
}

// ════════════════════════════════════════════════════════════════════════
// MISSIONLOG SHEET MANAGEMENT
// ════════════════════════════════════════════════════════════════════════

/**
 * Ensure MissionLog has correct schema
 * @param {Sheet} sheet - MissionLog sheet
 */
function ensureMissionLogSchema_(sheet) {
  if (!sheet) return;

  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();

  // If sheet is empty, create headers
  if (lastRow === 0) {
    var headers = ['preferred_name_id', 'Total_Points'].concat(getAllMissionIds_());
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }

  // Check if headers exist and add missing ones
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headerSet = {};
  for (var i = 0; i < headerRow.length; i++) {
    headerSet[String(headerRow[i]).trim()] = true;
  }

  var requiredHeaders = ['preferred_name_id', 'Total_Points'].concat(getAllMissionIds_());
  var missingHeaders = [];

  for (var j = 0; j < requiredHeaders.length; j++) {
    if (!headerSet[requiredHeaders[j]]) {
      missingHeaders.push(requiredHeaders[j]);
    }
  }

  if (missingHeaders.length > 0) {
    // Add missing headers to the end
    var newColStart = lastCol + 1;
    for (var k = 0; k < missingHeaders.length; k++) {
      sheet.getRange(1, newColStart + k).setValue(missingHeaders[k]);
    }
  }

  // Ensure frozen rows
  if (sheet.getFrozenRows() === 0) {
    sheet.setFrozenRows(1);
  }
}

/**
 * Create MissionLog sheet from scratch with proper schema
 * @return {Sheet} Created sheet
 */
function createMissionLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Remove existing MissionLog if present
  var existing = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
  if (existing) {
    ss.deleteSheet(existing);
  }

  // Create new sheet
  var sheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);

  // Add headers
  var headers = ['preferred_name_id', 'Total_Points'].concat(getAllMissionIds_());

  sheet.appendRow(headers);
  sheet.setFrozenRows(1);

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A86E8');
  headerRange.setFontColor('#FFFFFF');

  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log('MissionLog sheet created with canonical schema');

  return sheet;
}

/**
 * Ensure a player has a MissionLog row
 * Creates row if missing
 *
 * @param {string} playerId - Player ID
 * @return {boolean} True if row exists or was created
 */
function ensureMissionLogRow_(playerId) {
  if (!playerId) return false;

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);

    if (!missionSheet) {
      Logger.log('MissionLog sheet not found');
      return false;
    }

    // Check if player already has a row
    var lastCol = missionSheet.getLastColumn();
    var headers = missionSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var playerIdCol = -1;

    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === 'preferred_name_id') {
        playerIdCol = i;
        break;
      }
    }

    if (playerIdCol === -1) {
      Logger.log('preferred_name_id column not found');
      return false;
    }

    var lastRow = missionSheet.getLastRow();
    if (lastRow > 1) {
      var playerIds = missionSheet.getRange(2, playerIdCol + 1, lastRow - 1, 1).getValues();

      for (var j = 0; j < playerIds.length; j++) {
        if (String(playerIds[j][0]).trim() === playerId) {
          return true; // Row already exists
        }
      }
    }

    // Create new row for player
    var newRow = [];
    for (var k = 0; k < lastCol; k++) {
      newRow.push(0);
    }
    newRow[playerIdCol] = playerId;

    // Initialize Total_Points to 0
    var totalPointsCol = -1;
    for (var m = 0; m < headers.length; m++) {
      if (headers[m] === 'Total_Points') {
        totalPointsCol = m;
        break;
      }
    }

    if (totalPointsCol !== -1) {
      newRow[totalPointsCol] = 0;
    }

    missionSheet.appendRow(newRow);
    Logger.log('Created MissionLog row for ' + playerId);
    return true;

  } catch (e) {
    Logger.log('Failed to ensure MissionLog row for ' + playerId + ': ' + e.toString());
    return false;
  }
}

/**
 * Sync all PreferredNames players to MissionLog
 * Ensures every player has a MissionLog row
 *
 * @return {Object} Sync stats {existing, created, errors}
 */
function syncAllPlayersToMissionLog_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var prefSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.PREFERRED_NAMES);
  var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);

  if (!prefSheet || !missionSheet) {
    Logger.log('PreferredNames or MissionLog sheet missing');
    return { existing: 0, created: 0, errors: 1 };
  }

  // Get all player IDs from PreferredNames (column A)
  var prefLastRow = prefSheet.getLastRow();
  if (prefLastRow <= 1) {
    return { existing: 0, created: 0, errors: 0 };
  }

  var prefIds = prefSheet.getRange(2, 1, prefLastRow - 1, 1).getValues();

  var existingCount = 0;
  var createdCount = 0;
  var errorCount = 0;

  for (var i = 0; i < prefIds.length; i++) {
    var playerId = String(prefIds[i][0]).trim();
    if (!playerId) continue;

    try {
      // Check if row already exists before creating
      var ss2 = SpreadsheetApp.getActiveSpreadsheet();
      var missionSheet2 = ss2.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
      var lastCol = missionSheet2.getLastColumn();
      var headers = missionSheet2.getRange(1, 1, 1, lastCol).getValues()[0];
      var playerIdCol = -1;

      for (var j = 0; j < headers.length; j++) {
        if (headers[j] === 'preferred_name_id') {
          playerIdCol = j;
          break;
        }
      }

      var lastRow = missionSheet2.getLastRow();
      var alreadyExists = false;

      if (lastRow > 1) {
        var playerIds = missionSheet2.getRange(2, playerIdCol + 1, lastRow - 1, 1).getValues();
        for (var k = 0; k < playerIds.length; k++) {
          if (String(playerIds[k][0]).trim() === playerId) {
            alreadyExists = true;
            existingCount++;
            break;
          }
        }
      }

      if (!alreadyExists) {
        ensureMissionLogRow_(playerId);
        createdCount++;
      }
    } catch (e) {
      Logger.log('Failed to sync ' + playerId + ': ' + e.toString());
      errorCount++;
    }
  }

  return {
    existing: existingCount,
    created: createdCount,
    errors: errorCount
  };
}

/**
 * Initialize MissionLog with all PreferredNames players
 * @return {number} Number of players added
 */
function initializeMissionLog_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var prefSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.PREFERRED_NAMES);

  if (!prefSheet) {
    throw new Error('PreferredNames sheet not found');
  }

  // Ensure MissionLog exists
  var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
  if (!missionSheet) {
    missionSheet = createMissionLogSheet_();
  }

  // Sync all players
  var syncStats = syncAllPlayersToMissionLog_();

  logIntegrityAction('INIT_MISSIONLOG', {
    details: 'Initialized MissionLog: ' + syncStats.created + ' created, ' + syncStats.existing + ' existing',
    status: 'SUCCESS'
  });

  return syncStats.created;
}

// ════════════════════════════════════════════════════════════════════════
// MISSION SUFFIX SERVICE - EVALUATION & AWARDING
// ════════════════════════════════════════════════════════════════════════

/**
 * Evaluate mission triggers for a given player/event based on suffix.
 * Called during MissionLog sync / after Prize Engine commit.
 *
 * @param {string} playerId - canonical PreferredNames ID
 * @param {string} eventId - sheet/tab name (e.g. "11-23-B-2025")
 * @param {number|null} rank - final rank (1 = first, etc.) or null
 */
function evaluateSuffixMissions_(playerId, eventId, rank) {
  if (!playerId || !eventId) {
    Logger.log('evaluateSuffixMissions_: missing playerId or eventId');
    return;
  }

  var suffix = getSuffixFromEventId_(eventId);
  var meta = getSuffixMeta_(suffix);

  // If no suffix or invalid suffix, still log but don't award missions
  if (!meta) {
    Logger.log('No suffix meta for event ' + eventId + ', skipping mission evaluation');
    return;
  }

  // Commander bracketed missions
  if (suffix === 'B') {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_CMD_CASUAL, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }

  if (suffix === 'C') {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_CMD_TRANSITION, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }

  if (suffix === 'T') {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_CMD_CEDH, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }

  // Limited formats: Draft, Proxy/Cube Draft, Prerelease, Sealed
  if (meta.requiresKitPrompt) {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_LIMITED_EVENT, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }

  // Academy / Outreach
  if (suffix === 'A') {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_ACADEMY, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }

  if (suffix === 'E') {
    awardMissionProgress_(playerId, MISSION_IDS.ATTEND_OUTREACH, {
      eventId: eventId,
      rank: rank,
      suffix: suffix
    });
  }
}

/**
 * Award mission progress to a player.
 *
 * @param {string} playerId - Player ID
 * @param {string} missionId - Mission ID (column header)
 * @param {Object} context - Mission context {eventId, rank, suffix}
 */
function awardMissionProgress_(playerId, missionId, context) {
  if (!playerId || !missionId) {
    Logger.log('awardMissionProgress_: missing playerId or missionId');
    return;
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);

    if (!missionSheet) {
      Logger.log('MissionLog sheet not found');
      return;
    }

    // Ensure player has a row
    ensureMissionLogRow_(playerId);

    // Get headers
    var lastCol = missionSheet.getLastColumn();
    var headers = missionSheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Find column indices
    var playerIdCol = -1;
    var totalPointsCol = -1;
    var missionCol = -1;

    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === 'preferred_name_id') playerIdCol = i;
      if (headers[i] === 'Total_Points') totalPointsCol = i;
      if (headers[i] === missionId) missionCol = i;
    }

    if (playerIdCol === -1) {
      Logger.log('preferred_name_id column not found in MissionLog');
      return;
    }

    if (missionCol === -1) {
      Logger.log('Mission column ' + missionId + ' not found in MissionLog, skipping');
      return;
    }

    // Find player row
    var lastRow = missionSheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('MissionLog has no data rows');
      return;
    }

    var playerIdData = missionSheet.getRange(2, playerIdCol + 1, lastRow - 1, 1).getValues();
    var playerRow = -1;

    for (var j = 0; j < playerIdData.length; j++) {
      if (String(playerIdData[j][0]).trim() === playerId) {
        playerRow = j + 2; // +2 because we start from row 2
        break;
      }
    }

    if (playerRow === -1) {
      Logger.log('Player ' + playerId + ' not found in MissionLog after ensure');
      return;
    }

    // Get current mission progress
    var currentValue = missionSheet.getRange(playerRow, missionCol + 1).getValue();
    var currentProgress = coerceNumber(currentValue, 0);

    // Increment mission progress
    var newProgress = currentProgress + 1;
    missionSheet.getRange(playerRow, missionCol + 1).setValue(newProgress);

    // Update Total_Points if column exists
    if (totalPointsCol !== -1) {
      var currentPoints = coerceNumber(
        missionSheet.getRange(playerRow, totalPointsCol + 1).getValue(),
        0
      );
      // Award 1 point per mission completion (customize here for mission-specific points)
      var newPoints = currentPoints + 1;
      missionSheet.getRange(playerRow, totalPointsCol + 1).setValue(newPoints);
    }

    // Log the award
    Logger.log(
      'Awarded ' + missionId + ' to ' + playerId + ': ' + currentProgress + ' -> ' + newProgress +
      ' (event: ' + (context.eventId || 'unknown') + ')'
    );

  } catch (e) {
    Logger.log('Failed to award mission ' + missionId + ' to ' + playerId + ': ' + e.toString());
  }
}

/**
 * Batch process attendance-based missions over a date range.
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @return {Object} Processing stats
 */
function runAttendanceMissionsForRange_(startDate, endDate) {
  var records = scanAttendanceForRange_(startDate, endDate);

  var processedCount = 0;
  var errorCount = 0;

  for (var i = 0; i < records.length; i++) {
    try {
      evaluateSuffixMissions_(records[i].playerId, records[i].eventId, records[i].rank);
      processedCount++;
    } catch (e) {
      Logger.log('Error evaluating missions for ' + records[i].playerId +
                 ' at ' + records[i].eventId + ': ' + e.toString());
      errorCount++;
    }
  }

  return {
    totalRecords: records.length,
    processed: processedCount,
    errors: errorCount
  };
}

// ════════════════════════════════════════════════════════════════════════
// GATE I - MISSIONLOG & ATTENDANCE HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════

/**
 * Gate I - MissionLog & Attendance Sync
 *
 * Verifies:
 *  - MissionLog sheet exists and has required columns
 *  - PreferredNames sheet exists
 *  - Every PreferredNames player has a MissionLog row
 *  - Attendance scan for the last 7 days can run without throwing
 *  - No recent attendance players are missing MissionLog rows
 *
 * @return {Object} { gate, name, pass, details, autoFixApplied }
 */
function checkGateI_MissionLog_() {
  var result = {
    gate: 'I',
    name: 'MissionLog & Attendance',
    pass: true,
    details: [],
    autoFixApplied: false
  };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
    var prefSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.PREFERRED_NAMES);

    // Check sheet existence
    if (!missionSheet) {
      result.pass = false;
      result.details.push('MissionLog sheet is missing');
      return result;
    }

    if (!prefSheet) {
      result.pass = false;
      result.details.push('PreferredNames sheet is missing');
      return result;
    }

    // Schema sanity check (headers)
    var lastCol = missionSheet.getLastColumn();
    if (lastCol === 0) {
      result.pass = false;
      result.details.push('MissionLog has no columns');
      return result;
    }

    var headerRow = missionSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerSet = {};
    for (var i = 0; i < headerRow.length; i++) {
      headerSet[String(headerRow[i]).trim()] = true;
    }

    // Required primary columns
    var requiredPrimaryCols = ['preferred_name_id', 'Total_Points'];

    for (var j = 0; j < requiredPrimaryCols.length; j++) {
      if (!headerSet[requiredPrimaryCols[j]]) {
        result.pass = false;
        result.details.push('MissionLog missing required column: ' + requiredPrimaryCols[j]);
      }
    }

    // Required mission columns
    var requiredMissionCols = getAllMissionIds_();

    for (var k = 0; k < requiredMissionCols.length; k++) {
      if (!headerSet[requiredMissionCols[k]]) {
        result.pass = false;
        result.details.push('MissionLog missing mission column: ' + requiredMissionCols[k]);
      }
    }

    // Short-circuit if headers are badly broken
    if (!result.pass) {
      return result;
    }

    // Row alignment: PreferredNames vs MissionLog
    var prefLastRow = prefSheet.getLastRow();
    var missionLastRow = missionSheet.getLastRow();

    if (prefLastRow > 1) {
      var prefValues = prefSheet.getRange(2, 1, prefLastRow - 1, 1).getValues();
      var prefIds = {};
      for (var m = 0; m < prefValues.length; m++) {
        var id = String(prefValues[m][0]).trim();
        if (id) prefIds[id] = true;
      }

      var missionValues = missionLastRow > 1
        ? missionSheet.getRange(2, 1, missionLastRow - 1, 1).getValues()
        : [];

      var missionIds = {};
      for (var n = 0; n < missionValues.length; n++) {
        var mid = String(missionValues[n][0]).trim();
        if (mid) missionIds[mid] = true;
      }

      var missingInMission = [];
      for (var prefId in prefIds) {
        if (!missionIds[prefId]) {
          missingInMission.push(prefId);
        }
      }

      if (missingInMission.length > 0) {
        result.pass = false;
        var displayCount = Math.min(10, missingInMission.length);
        var sampleIds = missingInMission.slice(0, displayCount).join(', ');
        var moreText = missingInMission.length > displayCount
          ? ' (and ' + (missingInMission.length - displayCount) + ' more)'
          : '';

        result.details.push(
          missingInMission.length + ' player(s) missing MissionLog rows: ' + sampleIds + moreText
        );
      }
    }

    // Smoke test: attendance scan for last 7 days
    var today = new Date();
    var startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    var records;
    try {
      records = scanAttendanceForRange_(startDate, today);
    } catch (e) {
      result.pass = false;
      result.details.push('Attendance scan failed: ' + e.message);
      return result;
    }

    // Consistency: everyone seen in attendance has a MissionLog row
    if (records && records.length > 0) {
      var missionLastRow2 = missionSheet.getLastRow();
      var missionValues2 = missionLastRow2 > 1
        ? missionSheet.getRange(2, 1, missionLastRow2 - 1, 1).getValues()
        : [];

      var missionIds2 = {};
      for (var p = 0; p < missionValues2.length; p++) {
        var mid2 = String(missionValues2[p][0]).trim();
        if (mid2) missionIds2[mid2] = true;
      }

      var attendanceOnlyIds = {};
      for (var q = 0; q < records.length; q++) {
        if (records[q].playerId) {
          attendanceOnlyIds[records[q].playerId] = true;
        }
      }

      var attendanceMissingMission = [];
      for (var attId in attendanceOnlyIds) {
        if (!missionIds2[attId]) {
          attendanceMissingMission.push(attId);
        }
      }

      if (attendanceMissingMission.length > 0) {
        result.pass = false;
        var displayCount2 = Math.min(10, attendanceMissingMission.length);
        var sampleIds2 = attendanceMissingMission.slice(0, displayCount2).join(', ');
        var moreText2 = attendanceMissingMission.length > displayCount2
          ? ' (and ' + (attendanceMissingMission.length - displayCount2) + ' more)'
          : '';

        result.details.push(
          attendanceMissingMission.length + ' recent attendee(s) without MissionLog rows: ' +
          sampleIds2 + moreText2
        );
      }
    }

    // Final status
    if (result.pass) {
      result.details.push(
        'MissionLog schema, player coverage, and attendance scan all healthy'
      );
    }

  } catch (err) {
    result.pass = false;
    result.details.push('Gate I error: ' + err.message);
    Logger.log('Gate I threw an error: ' + err.toString());
  }

  return result;
}

/**
 * Fixes Gate I issues by:
 *  - Creating MissionLog sheet if missing
 *  - Adding required columns
 *  - Syncing PreferredNames players to MissionLog
 *
 * @return {string} Fix message
 */
function fixGateI_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // Ensure MissionLog sheet exists
    var missionSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
    if (!missionSheet) {
      missionSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.MISSION_LOG);
    }

    // Ensure schema is correct
    ensureMissionLogSchema_(missionSheet);

    // Sync all PreferredNames players to MissionLog
    var syncStats = syncAllPlayersToMissionLog_();

    return 'MissionLog repaired: ' + syncStats.created + ' rows created, ' +
           syncStats.existing + ' existing';

  } catch (e) {
    Logger.log('Failed to fix Gate I: ' + e.toString());
    return 'Fix failed: ' + e.message;
  }
}

// ════════════════════════════════════════════════════════════════════════
// OMEGA ATTENDANCE SYSTEM - FULL MISSION TRACKING
// ════════════════════════════════════════════════════════════════════════

/**
 * Omega Attendance Scan - Complete mission tracking system
 *
 * Menu Trigger: 🎯 Systems > Scan + Update Missions
 */
function runOmegaAttendanceScan() {
  var startTime = new Date();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  try {
    ui.alert('Starting Omega Attendance Scan...',
             'This will scan all event sheets and update mission progress.',
             ui.ButtonSet.OK);

    // Validate environment
    validateRequiredSheets(ss);

    // Load mission definitions
    var missionDefs = loadMissionDefinitions(ss);
    if (Object.keys(missionDefs).length === 0) {
      throw new Error('No mission definitions found in MissionLog_1 or MissionLog_2');
    }

    // Scan all event sheets
    var eventData = scanAllEventSheets(ss);
    if (eventData.events.length === 0) {
      ui.alert('No Events Found',
               'No valid event sheets were found. Event sheets must follow the format MM-DD-YYYY or MM-DD-[SUFFIX]-YYYY',
               ui.ButtonSet.OK);
      return;
    }

    // Build attendance calendar
    buildAttendanceCalendar(ss, eventData);

    // Compute mission progress
    var missionProgress = computeMissionProgress(eventData, missionDefs);

    // Update Attendance_Missions
    updateAttendanceMissions(ss, missionProgress, missionDefs);

    // Log to Integrity_Log
    var duration = (new Date() - startTime) / 1000;
    logAttendanceScan(ss, {
      eventsScanned: eventData.events.length,
      playersTracked: eventData.players.size,
      missionsComputed: Object.keys(missionDefs).length,
      duration: duration,
      dateRange: {
        earliest: eventData.events[0] ? eventData.events[0].date.toISOString().split('T')[0] : 'N/A',
        latest: eventData.events[eventData.events.length - 1] ?
                eventData.events[eventData.events.length - 1].date.toISOString().split('T')[0] : 'N/A'
      }
    });

    // Success message
    var earliestDate = eventData.events[0] ? eventData.events[0].date.toLocaleDateString() : 'N/A';
    var latestDate = eventData.events[eventData.events.length - 1] ?
                     eventData.events[eventData.events.length - 1].date.toLocaleDateString() : 'N/A';

    ui.alert('Attendance Scan Complete!',
             'Events Scanned: ' + eventData.events.length + '\n' +
             'Players Tracked: ' + eventData.players.size + '\n' +
             'Missions Computed: ' + Object.keys(missionDefs).length + '\n' +
             'Duration: ' + duration.toFixed(2) + 's\n\n' +
             'Date Range: ' + earliestDate + ' to ' + latestDate,
             ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('ERROR in runOmegaAttendanceScan: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    ui.alert('Error in Attendance Scan',
             error.toString() + '\n\nCheck execution logs for details.',
             ui.ButtonSet.OK);

    try {
      logAttendanceError(ss, error);
    } catch (logError) {
      Logger.log('Failed to log error: ' + logError.toString());
    }
  }
}

/**
 * Validate that required sheets exist and create them if missing
 */
function validateRequiredSheets(ss) {
  var requiredSheets = [
    ATTENDANCE_CONFIG.SHEETS.MISSION_LOG_1,
    ATTENDANCE_CONFIG.SHEETS.MISSION_LOG_2
  ];

  var missingSheets = [];

  for (var i = 0; i < requiredSheets.length; i++) {
    if (!ss.getSheetByName(requiredSheets[i])) {
      missingSheets.push(requiredSheets[i]);
    }
  }

  if (missingSheets.length > 0) {
    throw new Error('Missing required sheets: ' + missingSheets.join(', ') +
                   '\n\nPlease create these sheets with mission definitions before running the scan.');
  }

  // Create output sheets if they don't exist
  var outputSheets = [
    ATTENDANCE_CONFIG.SHEETS.CALENDAR,
    ATTENDANCE_CONFIG.SHEETS.MISSIONS,
    ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG
  ];

  for (var j = 0; j < outputSheets.length; j++) {
    if (!ss.getSheetByName(outputSheets[j])) {
      Logger.log('Creating missing output sheet: ' + outputSheets[j]);
      ss.insertSheet(outputSheets[j]);
    }
  }
}

/**
 * Load mission definitions from MissionLog_1 and MissionLog_2
 */
function loadMissionDefinitions(ss) {
  var missions = {};

  var logSheets = [
    ATTENDANCE_CONFIG.SHEETS.MISSION_LOG_1,
    ATTENDANCE_CONFIG.SHEETS.MISSION_LOG_2
  ];

  for (var i = 0; i < logSheets.length; i++) {
    var sheet = ss.getSheetByName(logSheets[i]);
    if (!sheet) continue;

    try {
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;

      for (var j = 1; j < data.length; j++) {
        var row = data[j];

        if (!row[0]) continue;

        var missionId = String(row[0]).trim();

        // Skip if marked inactive
        if (row[6] === false || String(row[6]).toLowerCase() === 'false') {
          Logger.log('Skipping inactive mission: ' + missionId);
          continue;
        }

        missions[missionId] = {
          id: missionId,
          name: row[1] ? String(row[1]).trim() : missionId,
          type: row[2] ? String(row[2]).trim() : 'attendance',
          criteria: row[3] ? String(row[3]).trim() : '',
          pointsValue: parseFloat(row[4]) || 1,
          cap: parseInt(row[5]) || 0,
          source: logSheets[i]
        };
      }
    } catch (error) {
      Logger.log('Error loading missions from ' + logSheets[i] + ': ' + error.toString());
    }
  }

  Logger.log('Loaded ' + Object.keys(missions).length + ' mission definitions');
  return missions;
}

/**
 * Scan all event sheets and extract attendance + placement data
 */
function scanAllEventSheets(ss) {
  var sheets = ss.getSheets();
  var events = [];
  var players = new Set();
  var playerEventHistory = new Map();

  var preferredNames = loadPreferredNames(ss);

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();
    var match = sheetName.match(ATTENDANCE_CONFIG.EVENT_PATTERN);

    if (match) {
      try {
        var month = parseInt(match[1]);
        var day = parseInt(match[2]);
        var suffix = match[3] || '';
        var year = parseInt(match[4]);

        var eventDate = new Date(year, month - 1, day);
        if (isNaN(eventDate.getTime()) ||
            eventDate.getMonth() !== month - 1 ||
            eventDate.getDate() !== day) {
          Logger.log('Warning: Invalid date in sheet name ' + sheetName);
          continue;
        }

        var format = ATTENDANCE_CONFIG.FORMAT_LEGEND[suffix] || 'Standard';

        var eventData = extractEventData(sheet, preferredNames);

        if (eventData.players.length > 0) {
          var event = {
            sheetName: sheetName,
            date: eventDate,
            format: format,
            suffix: suffix,
            players: eventData.players,
            placements: eventData.placements,
            top4: eventData.top4,
            top8: eventData.top8
          };

          events.push(event);

          for (var j = 0; j < eventData.players.length; j++) {
            var playerName = eventData.players[j];
            players.add(playerName);

            if (!playerEventHistory.has(playerName)) {
              playerEventHistory.set(playerName, []);
            }

            playerEventHistory.get(playerName).push({
              event: event,
              standing: eventData.placements[playerName] || null
            });
          }
        }
      } catch (error) {
        Logger.log('Error processing event sheet ' + sheetName + ': ' + error.toString());
      }
    }
  }

  // Sort events chronologically
  events.sort(function(a, b) {
    return a.date - b.date;
  });

  // Sort each player's event history chronologically
  var historyKeys = Array.from(playerEventHistory.keys());
  for (var k = 0; k < historyKeys.length; k++) {
    var history = playerEventHistory.get(historyKeys[k]);
    history.sort(function(a, b) {
      return a.event.date - b.event.date;
    });
  }

  Logger.log('Scanned ' + events.length + ' events, found ' + players.size + ' unique players');
  return {
    events: events,
    players: players,
    playerEventHistory: playerEventHistory
  };
}

/**
 * Extract attendance and placement data from a single event sheet
 */
function extractEventData(sheet, preferredNames) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { players: [], placements: {}, top4: [], top8: [] };
  }

  var headers = data[0].map(function(h) {
    return String(h).toLowerCase().trim();
  });

  var playerCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.PLAYER);
  var standingCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.STANDING);

  if (playerCol === -1) {
    Logger.log('Warning: No "Player" column in ' + sheet.getName());
    return { players: [], placements: {}, top4: [], top8: [] };
  }

  var players = [];
  var placements = {};
  var top4 = [];
  var top8 = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rawPlayerName = String(row[playerCol]).trim();

    if (!rawPlayerName) continue;

    var playerName = resolveCanonicalName(rawPlayerName, preferredNames);

    if (playerName) {
      players.push(playerName);

      if (standingCol !== -1 && row[standingCol]) {
        var standing = parseInt(row[standingCol]);
        if (!isNaN(standing) && standing > 0) {
          placements[playerName] = standing;

          if (standing <= 4) {
            top4.push(playerName);
          }
          if (standing <= 8) {
            top8.push(playerName);
          }
        }
      }
    }
  }

  return {
    players: players,
    placements: placements,
    top4: top4,
    top8: top8
  };
}

/**
 * Build Attendance_Calendar sheet using batch operations
 */
function buildAttendanceCalendar(ss, eventData) {
  var calendarSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.CALENDAR);

  if (!calendarSheet) {
    calendarSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.CALENDAR);
  }

  calendarSheet.clear();

  var headers = ['PreferredName', 'Total_Events_Attended'];
  for (var i = 0; i < eventData.events.length; i++) {
    headers.push(eventData.events[i].sheetName);
  }

  var rows = [headers];
  var playerList = Array.from(eventData.players).sort();

  for (var j = 0; j < playerList.length; j++) {
    var player = playerList[j];
    var row = [player];
    var totalAttended = 0;

    for (var k = 0; k < eventData.events.length; k++) {
      var event = eventData.events[k];
      if (event.players.indexOf(player) !== -1) {
        row.push('✓');
        totalAttended++;
      } else {
        row.push('');
      }
    }

    row.splice(1, 0, totalAttended);
    rows.push(row);
  }

  if (rows.length > 0) {
    calendarSheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  }

  calendarSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#e0e0e0')
    .setHorizontalAlignment('center');

  if (playerList.length > 0) {
    calendarSheet.getRange(2, 2, playerList.length, 1)
      .setNumberFormat('0')
      .setHorizontalAlignment('center');
  }

  calendarSheet.setFrozenRows(1);
  calendarSheet.setFrozenColumns(2);

  Logger.log('Built Attendance_Calendar with ' + playerList.length + ' players and ' +
             eventData.events.length + ' events');
}

/**
 * Compute mission progress for all players
 */
function computeMissionProgress(eventData, missionDefs) {
  var progress = {};

  var playersArray = Array.from(eventData.players);
  for (var i = 0; i < playersArray.length; i++) {
    progress[playersArray[i]] = {};
  }

  var missionIds = Object.keys(missionDefs);
  for (var j = 0; j < missionIds.length; j++) {
    var missionId = missionIds[j];
    var mission = missionDefs[missionId];

    try {
      var missionType = mission.type.toLowerCase();

      if (missionType === 'attendance') {
        computeAttendanceMission(mission, eventData, progress);
      } else if (missionType === 'placement') {
        computePlacementMission(mission, eventData, progress);
      } else if (missionType === 'format') {
        computeFormatMission(mission, eventData, progress);
      } else if (missionType === 'streak') {
        computeStreakMission(mission, eventData, progress);
      } else if (missionType === 'win' || missionType === '1st') {
        computeWinMission(mission, eventData, progress);
      } else {
        Logger.log('Unknown mission type: ' + mission.type + ' for ' + missionId);
      }
    } catch (error) {
      Logger.log('Error computing mission ' + missionId + ': ' + error.toString());
      var players = Array.from(eventData.players);
      for (var k = 0; k < players.length; k++) {
        progress[players[k]][missionId] = 0;
      }
    }
  }

  return progress;
}

/**
 * Compute attendance-based missions
 */
function computeAttendanceMission(mission, eventData, progress) {
  var playersArray = Array.from(eventData.players);

  for (var i = 0; i < playersArray.length; i++) {
    var player = playersArray[i];
    var count = 0;

    for (var j = 0; j < eventData.events.length; j++) {
      if (eventData.events[j].players.indexOf(player) !== -1) {
        count++;
      }
    }

    if (mission.cap > 0) {
      count = Math.min(count, mission.cap);
    }

    progress[player][mission.id] = count;
  }
}

/**
 * Compute placement-based missions
 */
function computePlacementMission(mission, eventData, progress) {
  var minPlace = 1;
  var maxPlace = 4;

  if (mission.criteria) {
    var criteria = String(mission.criteria).trim();

    if (criteria.indexOf('-') !== -1) {
      var parts = criteria.split('-');
      minPlace = parseInt(parts[0]) || 1;
      maxPlace = parseInt(parts[1]) || 4;
    } else {
      maxPlace = parseInt(criteria) || 4;
      minPlace = 1;
    }
  }

  var playersArray = Array.from(eventData.players);

  for (var i = 0; i < playersArray.length; i++) {
    var player = playersArray[i];
    var count = 0;

    for (var j = 0; j < eventData.events.length; j++) {
      var standing = eventData.events[j].placements[player];
      if (standing && standing >= minPlace && standing <= maxPlace) {
        count++;
      }
    }

    if (mission.cap > 0) {
      count = Math.min(count, mission.cap);
    }

    progress[player][mission.id] = count;
  }
}

/**
 * Compute win-based missions
 */
function computeWinMission(mission, eventData, progress) {
  var playersArray = Array.from(eventData.players);

  for (var i = 0; i < playersArray.length; i++) {
    var player = playersArray[i];
    var count = 0;

    for (var j = 0; j < eventData.events.length; j++) {
      if (eventData.events[j].placements[player] === 1) {
        count++;
      }
    }

    if (mission.cap > 0) {
      count = Math.min(count, mission.cap);
    }

    progress[player][mission.id] = count;
  }
}

/**
 * Compute format-specific missions
 */
function computeFormatMission(mission, eventData, progress) {
  var targetCriteria = String(mission.criteria).toLowerCase().trim();

  var playersArray = Array.from(eventData.players);

  for (var i = 0; i < playersArray.length; i++) {
    var player = playersArray[i];
    var count = 0;

    for (var j = 0; j < eventData.events.length; j++) {
      var event = eventData.events[j];
      var matchesFormat = event.format.toLowerCase().indexOf(targetCriteria) !== -1 ||
                         event.suffix.toLowerCase() === targetCriteria;

      if (matchesFormat && event.players.indexOf(player) !== -1) {
        count++;
      }
    }

    if (mission.cap > 0) {
      count = Math.min(count, mission.cap);
    }

    progress[player][mission.id] = count;
  }
}

/**
 * Compute streak-based missions
 */
function computeStreakMission(mission, eventData, progress) {
  var requiredWeeks = parseInt(mission.criteria) || 3;

  var playersArray = Array.from(eventData.players);

  for (var i = 0; i < playersArray.length; i++) {
    var player = playersArray[i];
    var history = eventData.playerEventHistory.get(player);

    if (!history || history.length === 0) {
      progress[player][mission.id] = 0;
      continue;
    }

    var maxStreak = 0;
    var currentStreak = 1;
    var lastWeekNumber = getWeekNumber(history[0].event.date);
    var lastYear = history[0].event.date.getFullYear();

    for (var j = 1; j < history.length; j++) {
      var eventDate = history[j].event.date;
      var currentWeekNumber = getWeekNumber(eventDate);
      var currentYear = eventDate.getFullYear();

      var isConsecutive = false;

      if (currentYear === lastYear) {
        isConsecutive = (currentWeekNumber === lastWeekNumber + 1);
      } else if (currentYear === lastYear + 1) {
        var weeksInLastYear = getWeeksInYear(lastYear);
        isConsecutive = (lastWeekNumber === weeksInLastYear && currentWeekNumber === 1);
      }

      if (isConsecutive) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (currentWeekNumber !== lastWeekNumber || currentYear !== lastYear) {
        currentStreak = 1;
      }

      lastWeekNumber = currentWeekNumber;
      lastYear = currentYear;
    }

    var value = maxStreak >= requiredWeeks ? maxStreak : 0;

    if (mission.cap > 0) {
      value = Math.min(value, mission.cap);
    }

    progress[player][mission.id] = value;
  }
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get number of ISO weeks in a year
 */
function getWeeksInYear(year) {
  var d = new Date(Date.UTC(year, 11, 31));
  var weekNum = getWeekNumber(d);
  return weekNum === 1 ? 52 : weekNum;
}

/**
 * Update Attendance_Missions sheet with computed progress
 */
function updateAttendanceMissions(ss, missionProgress, missionDefs) {
  var missionsSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.MISSIONS);

  if (!missionsSheet) {
    missionsSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.MISSIONS);
  }

  missionsSheet.clear();

  var playerList = Object.keys(missionProgress);
  if (playerList.length === 0) {
    Logger.log('No players to update in Attendance_Missions');
    return;
  }

  var missionIds = Object.keys(missionProgress[playerList[0]] || {}).sort();

  var headers = ['PreferredName'];
  for (var i = 0; i < missionIds.length; i++) {
    var missionName = missionDefs[missionIds[i]] ? missionDefs[missionIds[i]].name : missionIds[i];
    headers.push(missionName);
  }

  var rows = [headers];
  playerList.sort();

  for (var j = 0; j < playerList.length; j++) {
    var player = playerList[j];
    var row = [player];

    for (var k = 0; k < missionIds.length; k++) {
      row.push(missionProgress[player][missionIds[k]] || 0);
    }

    rows.push(row);
  }

  if (rows.length > 0) {
    missionsSheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  }

  missionsSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4a86e8')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  if (playerList.length > 0 && missionIds.length > 0) {
    missionsSheet.getRange(2, 2, playerList.length, missionIds.length)
      .setNumberFormat('0')
      .setHorizontalAlignment('center');
  }

  missionsSheet.setFrozenRows(1);
  missionsSheet.setFrozenColumns(1);

  for (var m = 1; m <= headers.length; m++) {
    missionsSheet.autoResizeColumn(m);
  }

  Logger.log('Updated Attendance_Missions for ' + playerList.length + ' players with ' +
             missionIds.length + ' missions');
}

/**
 * Log attendance scan summary to Integrity_Log
 */
function logAttendanceScan(ss, summary) {
  var logSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);

  if (!logSheet) {
    logSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);
    logSheet.appendRow([
      'timestamp', 'user', 'event', 'target', 'details',
      'engine_version', 'seed', 'checksum', 'df_tags', 'rl_band'
    ]);
  }

  var timestamp = new Date().toISOString();
  var user = Session.getActiveUser().getEmail();
  var engineVersion = typeof ENGINE_VERSION !== 'undefined' ? ENGINE_VERSION : '7.9.6';

  logSheet.appendRow([
    timestamp,
    user,
    'ATTENDANCE_SCAN',
    'System',
    JSON.stringify(summary),
    engineVersion,
    '',
    '',
    'ATTENDANCE',
    ''
  ]);

  Logger.log('Logged attendance scan: ' + JSON.stringify(summary));
}

/**
 * Log error to Integrity_Log
 */
function logAttendanceError(ss, error) {
  var logSheet = ss.getSheetByName(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);

  if (!logSheet) {
    logSheet = ss.insertSheet(ATTENDANCE_CONFIG.SHEETS.INTEGRITY_LOG);
    logSheet.appendRow([
      'timestamp', 'user', 'event', 'target', 'details',
      'engine_version', 'seed', 'checksum', 'df_tags', 'rl_band'
    ]);
  }

  var timestamp = new Date().toISOString();
  var user = Session.getActiveUser().getEmail();
  var engineVersion = typeof ENGINE_VERSION !== 'undefined' ? ENGINE_VERSION : '7.9.6';

  logSheet.appendRow([
    timestamp,
    user,
    'ATTENDANCE_SCAN_ERROR',
    'System',
    error.toString() + '\n\nStack: ' + (error.stack || 'N/A'),
    engineVersion,
    '',
    '',
    'ERROR',
    ''
  ]);
}

/**
 * Wrapper function for menu integration
 */
function scanAndUpdateMissions() {
  runOmegaAttendanceScan();
}

// ════════════════════════════════════════════════════════════════════════
// END OF UNIFIED COSMIC MISSIONS & ATTENDANCE SYSTEM
// ════════════════════════════════════════════════════════════════════════
