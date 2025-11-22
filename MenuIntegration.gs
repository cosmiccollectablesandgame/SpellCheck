/**
 * ════════════════════════════════════════════════════════════════════════
 * COSMIC MISSION & ATTENDANCE SYSTEM - MENU INTEGRATION
 *
 * Menu hooks and UI integration for the unified mission/attendance system
 * Compatible with: Engine v7.9.6+
 * Version: 1.0.0
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * Creates custom menus when the spreadsheet opens
 * Add this to your existing onOpen() or call it from there
 */
function createMissionMenus() {
  var ui = SpreadsheetApp.getUi();

  // Create Systems menu with mission and attendance functions
  ui.createMenu('🎯 Systems')
    .addItem('📊 Scan + Update Missions', 'runOmegaAttendanceScan')
    .addSeparator()
    .addItem('✅ Check Gate I (MissionLog Health)', 'runGateIHealthCheck')
    .addItem('🔧 Fix Gate I Issues', 'runGateIAutoFix')
    .addSeparator()
    .addItem('🆕 Initialize MissionLog', 'initializeMissionLog_')
    .addItem('🔄 Sync Players to MissionLog', 'runPlayerSync')
    .addToUi();
}

/**
 * Run Gate I health check and display results
 */
function runGateIHealthCheck() {
  var ui = SpreadsheetApp.getUi();

  try {
    var result = checkGateI_MissionLog_();

    var icon = result.pass ? '✅' : '❌';
    var title = icon + ' Gate I: ' + result.name;
    var message = 'Status: ' + (result.pass ? 'PASS' : 'FAIL') + '\n\n';
    message += 'Details:\n';

    for (var i = 0; i < result.details.length; i++) {
      message += '• ' + result.details[i] + '\n';
    }

    if (!result.pass) {
      message += '\nWould you like to attempt auto-fix?';
      var response = ui.alert(title, message, ui.ButtonSet.YES_NO);

      if (response === ui.Button.YES) {
        runGateIAutoFix();
      }
    } else {
      ui.alert(title, message, ui.ButtonSet.OK);
    }

  } catch (error) {
    ui.alert('❌ Gate I Error',
             'Failed to run Gate I health check:\n\n' + error.toString(),
             ui.ButtonSet.OK);
  }
}

/**
 * Run Gate I auto-fix
 */
function runGateIAutoFix() {
  var ui = SpreadsheetApp.getUi();

  try {
    var message = fixGateI_();

    ui.alert('🔧 Gate I Auto-Fix Complete',
             message + '\n\nRun health check again to verify.',
             ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('❌ Auto-Fix Error',
             'Failed to fix Gate I issues:\n\n' + error.toString(),
             ui.ButtonSet.OK);
  }
}

/**
 * Run player sync with progress dialog
 */
function runPlayerSync() {
  var ui = SpreadsheetApp.getUi();

  try {
    var response = ui.alert('Sync Players to MissionLog',
                           'This will ensure every player in PreferredNames has a MissionLog row.\n\nContinue?',
                           ui.ButtonSet.YES_NO);

    if (response !== ui.Button.YES) {
      return;
    }

    var stats = syncAllPlayersToMissionLog_();

    ui.alert('✅ Player Sync Complete',
             'Existing players: ' + stats.existing + '\n' +
             'New rows created: ' + stats.created + '\n' +
             'Errors: ' + stats.errors,
             ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('❌ Sync Error',
             'Failed to sync players:\n\n' + error.toString(),
             ui.ButtonSet.OK);
  }
}

/**
 * Example: Integrate with existing onOpen
 *
 * If you already have an onOpen() function, add this:
 *
 * function onOpen() {
 *   // Your existing onOpen code...
 *
 *   // Add mission system menus
 *   createMissionMenus();
 * }
 */
