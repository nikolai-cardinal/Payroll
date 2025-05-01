// Namespace stub – YardSign
var Modules = Modules || {};
Modules.YardSign = Modules.YardSign || {};

// Public API for YardSign Module

/**
 * Adds menu entries specific to the Yard Sign module.
 * @param {GoogleAppsScript.Base.Ui} ui The UI environment.
 */
Modules.YardSign.addMenuEntries = function(ui) {
  // TODO: Call internal logic from moved files (YardSignMain, etc.)
  Logger.log('YardSign: addMenuEntries called');
};

/**
 * Handles edit events relevant to the YardSign module.
 * Ignores any triggers from Column G in the Main sheet.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The edit event object.
 * @return {Object|null} Optional result or status.
 */
Modules.YardSign.handleEdit = function(e) {
  // Skip processing if edit is in Column G of Main sheet
  if (e && e.range) {
    var sheet = e.range.getSheet();
    if (sheet.getName() === Modules.Constants.SHEET.MAIN && e.range.getColumn() === 7) {
      Logger.log('YardSign: Ignoring trigger from Column G in Main sheet as requested');
      return null;
    }
  }
  
  // TODO: Call internal logic from moved files
  Logger.log('YardSign: handleEdit called for range ' + (e && e.range ? e.range.getA1Notation() : 'N/A'));
  return null;
};

/**
 * Processes all relevant entries for the Yard Sign module (if applicable).
 */
Modules.YardSign.processAll = function() {
  // TODO: Call internal logic from moved files (YardSignMain, etc.)
  Logger.log('YardSign: processAll called');
};

/**
 * Processes Yard Sign entries for a specific technician.
 * @param {string} technicianName The name of the technician to process.
 */
Modules.YardSign.processForTechnician = function(technicianName) {
  if (!technicianName) return;
  
  // Call internal function to process Yard Signs for the specific technician
  Logger.log('YardSign: Processing for technician ' + technicianName);
  
  // Use existing function if available or implement placeholder for future
  if (typeof processYardSignsForTechnician === 'function') {
    processYardSignsForTechnician(technicianName);
  } else {
    console.log('Yard Sign individual processing not yet implemented for: ' + technicianName);
  }
}; 