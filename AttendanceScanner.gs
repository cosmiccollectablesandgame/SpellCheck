/**
 * ════════════════════════════════════════════════════════════════════════
 * COSMIC MISSION & ATTENDANCE SYSTEM - ATTENDANCE SCANNER
 *
 * Shared attendance scanning logic used by:
 * - Mission Gate Service (Gate I health checks)
 * - Omega Attendance System (full mission computation)
 * - Mission Suffix Service (batch mission evaluation)
 *
 * Compatible with: Engine v7.9.6+
 * Version: 1.0.0
 * ════════════════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════════════
// SHARED ATTENDANCE SCANNING
// ══════════════════════════════════════════════════════════════════════

/**
 * Scan attendance for a date range
 * Used by Gate I for health checks and by suffix mission batch processing
 *
 * Returns an array of attendance records:
 * [
 *   {
 *     playerId: '<preferred_name_id or canonical name>',
 *     eventId: '<sheetName>',
 *     rank: <number or null>,
 *     date: <Date>,
 *     suffix: '<suffix or empty string>',
 *     format: '<format name>'
 *   },
 *   ...
 * ]
 *
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @return {Array<Object>} Array of attendance records
 */
function scanAttendanceForRange_(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var records = [];

  // Load PreferredNames for canonical name resolution
  var preferredNames = loadPreferredNames(ss);

  // Scan each sheet
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();
    var match = sheetName.match(ATTENDANCE_CONFIG.EVENT_PATTERN);

    if (match) {
      try {
        // Valid event sheet format
        var month = parseInt(match[1], 10);
        var day = parseInt(match[2], 10);
        var suffix = match[3] || '';
        var year = parseInt(match[4], 10);

        // Validate date
        var eventDate = new Date(year, month - 1, day);
        if (isNaN(eventDate.getTime()) ||
            eventDate.getMonth() !== month - 1 ||
            eventDate.getDate() !== day) {
          Logger.log('Warning: Invalid date in sheet name ' + sheetName);
          continue;
        }

        // Check if date is in range
        if (eventDate < startDate || eventDate > endDate) {
          continue;
        }

        var format = ATTENDANCE_CONFIG.FORMAT_LEGEND[suffix] || 'Standard';

        // Extract attendance and placements from this event
        var eventRecords = extractEventRecords_(sheet, sheetName, eventDate, suffix, format, preferredNames);
        records = records.concat(eventRecords);

      } catch (error) {
        Logger.log('Error processing event sheet ' + sheetName + ': ' + error.toString());
      }
    }
  }

  // Sort records chronologically
  records.sort(function(a, b) {
    return a.date - b.date;
  });

  Logger.log('scanAttendanceForRange_: Found ' + records.length + ' attendance records between ' +
             startDate.toLocaleDateString() + ' and ' + endDate.toLocaleDateString());

  return records;
}

/**
 * Extract attendance records from a single event sheet
 * @param {Sheet} sheet - Event sheet
 * @param {string} sheetName - Sheet name
 * @param {Date} eventDate - Event date
 * @param {string} suffix - Event suffix
 * @param {string} format - Event format name
 * @param {Set} preferredNames - Set of canonical player names
 * @return {Array<Object>} Array of attendance records
 * @private
 */
function extractEventRecords_(sheet, sheetName, eventDate, suffix, format, preferredNames) {
  var records = [];

  try {
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return records;

    // Find "Player" and "Final Standing" columns
    var headers = data[0].map(function(h) {
      return String(h).toLowerCase().trim();
    });

    var playerCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.PLAYER);
    var standingCol = headers.indexOf(ATTENDANCE_CONFIG.EXPECTED_HEADERS.STANDING);

    if (playerCol === -1) {
      Logger.log('Warning: No "Player" column in ' + sheetName);
      return records;
    }

    // Extract each player's attendance
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rawPlayerName = String(row[playerCol]).trim();

      if (!rawPlayerName) continue;

      var playerName = resolveCanonicalName(rawPlayerName, preferredNames);

      if (playerName) {
        var rank = null;

        // Extract placement if available
        if (standingCol !== -1 && row[standingCol]) {
          var standing = parseInt(row[standingCol], 10);
          if (!isNaN(standing) && standing > 0) {
            rank = standing;
          }
        }

        records.push({
          playerId: playerName,
          eventId: sheetName,
          rank: rank,
          date: eventDate,
          suffix: suffix,
          format: format
        });
      }
    }
  } catch (error) {
    Logger.log('Error extracting records from ' + sheetName + ': ' + error.toString());
  }

  return records;
}

// ══════════════════════════════════════════════════════════════════════
// EVENT SHEET SCANNING (FOR OMEGA SYSTEM)
// ══════════════════════════════════════════════════════════════════════

/**
 * Scan all event sheets and extract attendance + placement data
 * Used by Omega Attendance System for comprehensive mission computation
 *
 * Returns:
 * {
 *   events: [
 *     {
 *       sheetName: '12-01-2025-C',
 *       date: Date object,
 *       format: 'Commander',
 *       suffix: 'C',
 *       players: ['PlayerName1', 'PlayerName2', ...],
 *       placements: {
 *         'PlayerName1': 1,
 *         'PlayerName2': 2,
 *         ...
 *       },
 *       top4: ['PlayerName1', 'PlayerName2', 'PlayerName3', 'PlayerName4'],
 *       top8: [...]
 *     },
 *     ...
 *   ],
 *   players: Set(['PlayerName1', 'PlayerName2', ...]),
 *   playerEventHistory: Map<playerName, [{event, standing}, ...]>
 * }
 *
 * @param {Spreadsheet} ss - Spreadsheet object
 * @return {Object} Event data structure
 */
function scanAllEventSheets(ss) {
  var sheets = ss.getSheets();
  var events = [];
  var players = new Set();
  var playerEventHistory = new Map(); // For streak calculations

  // Load PreferredNames for canonical name resolution
  var preferredNames = loadPreferredNames(ss);

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();
    var match = sheetName.match(ATTENDANCE_CONFIG.EVENT_PATTERN);

    if (match) {
      try {
        // Valid event sheet format
        var month = parseInt(match[1], 10);
        var day = parseInt(match[2], 10);
        var suffix = match[3] || '';
        var year = parseInt(match[4], 10);

        // Validate date
        var eventDate = new Date(year, month - 1, day);
        if (isNaN(eventDate.getTime()) ||
            eventDate.getMonth() !== month - 1 ||
            eventDate.getDate() !== day) {
          Logger.log('Warning: Invalid date in sheet name ' + sheetName);
          continue;
        }

        var format = ATTENDANCE_CONFIG.FORMAT_LEGEND[suffix] || 'Standard';

        // Extract attendance and placements
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

          // Add players to master set and track event history
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
  var historyIterator = playerEventHistory.keys();
  var result = historyIterator.next();

  while (!result.done) {
    var player = result.value;
    var history = playerEventHistory.get(player);
    history.sort(function(a, b) {
      return a.event.date - b.event.date;
    });
    result = historyIterator.next();
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
 * @param {Sheet} sheet - Event sheet
 * @param {Set} preferredNames - Set of canonical player names
 * @return {Object} Event data {players, placements, top4, top8}
 */
function extractEventData(sheet, preferredNames) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { players: [], placements: {}, top4: [], top8: [] };
  }

  // Find "Player" and "Final Standing" columns
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

      // Extract placement if available
      if (standingCol !== -1 && row[standingCol]) {
        var standing = parseInt(row[standingCol], 10);
        if (!isNaN(standing) && standing > 0) {
          placements[playerName] = standing;

          // Track Top 4 and Top 8
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
