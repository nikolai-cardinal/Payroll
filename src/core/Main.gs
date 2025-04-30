// Namespace stub – Main
var Modules = Modules || {};
Modules.Main = Modules.Main || {};

// Avoid re-entrant edits
var _isProcessingEdit = false;

// Ordered list used for delegation
function _getOrderedModules() {
  return [
    Modules.ApprovedMonitor,
    Modules.TimeSheet,
    Modules.SpiffBonus,
    Modules.PBP,
    Modules.YardSign,
    Modules.LeadSet,
    Modules.NewTechnician,
  ].filter(function (m) {
    return m;
  });
}

/**
 * Spreadsheet onOpen trigger.
 * Builds the root menu and lets each module perform optional init work.
 *
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e
 */
function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  if (Modules.Menu && typeof Modules.Menu.buildRootMenu === 'function') {
    // Delegate menu construction to Core/Menu to keep Main slim.
    Modules.Menu.buildRootMenu(ui);
  }
  
  // Optional per-module open initialisation
  _getOrderedModules().forEach(function (mod) {
    if (typeof mod.onOpenInit === 'function') {
      try {
        mod.onOpenInit(e);
      } catch (err) {
        console.error(err);
      }
    }
  });
}

/**
 * Spreadsheet onEdit trigger.
 * Delegates the edit event to each module until one claims responsibility.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEdit(e) {
  if (_isProcessingEdit) return;
  _isProcessingEdit = true;
  try {
    _getOrderedModules().some(function (mod) {
      try {
        return typeof mod.handleEdit === 'function' && mod.handleEdit(e) === true;
      } catch (err) {
        console.error('handleEdit error:', err);
      }
      return false;
    });
  } finally {
    _isProcessingEdit = false;
  }
}

/**
 * Convenience batch action to run all module processes sequentially.
 * Exposed via the UI so payroll admins can execute everything in one click.
 */
function runFullPayroll() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('Running full payroll – please wait');

  var steps = [
    { fn: Modules.SpiffBonus && Modules.SpiffBonus.processAll },
    { fn: Modules.PBP && Modules.PBP.processAll },
    { fn: Modules.YardSign && Modules.YardSign.processAll },
    { fn: Modules.TimeSheet && Modules.TimeSheet.processAll },
    { fn: Modules.LeadSet && Modules.LeadSet.processAll },
  ];

  steps.forEach(function (s) {
    if (typeof s.fn === 'function') {
      try {
        s.fn();
      } catch (err) {
        console.error(err);
      }
    }
  });

  ui.alert('Full payroll complete');
}

Modules.Main = {
  onOpen: onOpen,
  onEdit: onEdit,
  runFullPayroll: runFullPayroll,
}; 