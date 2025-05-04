/**
 * Total_Pay – Keeps Main sheet column I in sync with each technician's Total Pay.
 *
 * Assumptions
 *   • Each technician has an individual sheet named exactly after their display name.
 *   • Their Total Pay is calculated in column C of the row labelled "Total Pay" (row 18 in the template).
 *   • Column A of the Main sheet lists technician names, and column I stores the latest Total Pay.
 *   • A Constants helper may exist (Modules.Constants.SHEET.MAIN). Falls back to literal "Main".
 *
 * Usage
 *   This module exposes a handleEdit(e) method which will be invoked by Core/Main's
 *   delegation flow *if* Modules.TotalPay is included in the ordered modules list.
 *   To stay self-contained, it also adds itself to the list at runtime when loaded.
 */

var Modules = Modules || {};
Modules.TotalPay = Modules.TotalPay || {};

/**
 * Internal helper – finds the technician's row number in Main sheet.
 * @param {Sheet} mainSheet The Main sheet object.
 * @param {string} techName The technician's name.
 * @return {number} 1-based row index or ‑1 if not found.
 */
function _findTechnicianRow(mainSheet, techName) {
  if (!mainSheet || !techName) return -1;
  // Read just column A to minimise quota usage
  var names = mainSheet.getRange(1, 1, mainSheet.getLastRow()).getValues();
  for (var r = 0; r < names.length; r++) {
    if (String(names[r][0]).trim() === techName) return r + 1; // 1-based
  }
  return -1;
}

/**
 * handleEdit – Fired by Core/Main via delegation. Syncs Total Pay → Main!I.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Edit event payload.
 * @return {boolean} true if this module handled the edit.
 */
Modules.TotalPay.handleEdit = function(e) {
  try {
    if (!e || !e.range) return false;

    var sheet      = e.range.getSheet();
    var techName   = sheet.getName();
    var mainName   = (Modules.Constants && Modules.Constants.SHEET && Modules.Constants.SHEET.MAIN) || 'Main';

    // Ignore edits on Main sheet
    if (techName === mainName) return false;

    // Only continue if the sheet appears to be a technician sheet.
    // Heuristic: It must contain the text "Total Pay" somewhere in column A, first 25 rows.
    var appearsTechSheet = false;
    try {
      var colA = sheet.getRange(1, 1, 25, 1).getValues();
      for (var i = 0; i < colA.length; i++) {
        if (String(colA[i][0]).trim().toLowerCase() === 'total pay') { appearsTechSheet = true; break; }
      }
    } catch (ignore) {}
    if (!appearsTechSheet) return false;

    // Locate the Total Pay cell (usually C18)
    var mapping;
    if (typeof getTechnicianSheetMappingForTimesheet === 'function') {
      mapping = getTechnicianSheetMappingForTimesheet(sheet);
    }
    mapping = mapping || { totalPayRow: 18, calculatedValueColumn: 3 }; // C18 fallback

    // Read the current Total Pay value (formula outcome)
    var totalPay = sheet.getRange(mapping.totalPayRow, mapping.calculatedValueColumn).getValue();

    // Update Main sheet column I
    var ss        = sheet.getParent();
    var mainSheet = ss.getSheetByName(mainName);
    if (!mainSheet) return false;

    var techRow = _findTechnicianRow(mainSheet, techName);
    if (techRow === -1) return false;

    var mainCell = mainSheet.getRange(techRow, 9); // Column I
    if (mainCell.getValue() !== totalPay) {
      mainCell.setValue(totalPay);
    }
    return true; // Claim responsibility so Main.onEdit stops delegating further.
  } catch (err) {
    if (Modules.Shared && Modules.Shared.PayrollLogger) {
      Modules.Shared.PayrollLogger.error('TotalPay.handleEdit error:', err);
    } else {
      console.error('TotalPay.handleEdit error: ' + err);
    }
    return false;
  }
};

/**
 * Runtime patch – inject this module into Core/Main's ordered list (if available).
 * This avoids manual edits to Core/Main.
 */
(function(){
  try {
    // Core/Main defines _getOrderedModules() returning the current array.
    // We wrap it once so TotalPay participates in future delegations.
    var coreMain = Modules.Main || {};
    if (coreMain._totalPayPatched) return; // Prevent double patching

    var originalGetter = typeof _getOrderedModules === 'function' && _getOrderedModules;
    if (!originalGetter) return; // Not available yet

    globalThis._getOrderedModules = function() {
      var list = originalGetter();
      if (list.indexOf(Modules.TotalPay) === -1) {
        list.push(Modules.TotalPay); // Append at the end to keep precedence
      }
      return list;
    };
    coreMain._totalPayPatched = true;
  } catch (ignore) {}
})(); 