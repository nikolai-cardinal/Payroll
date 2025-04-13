/**
* Cardinal Payroll System - Main Script
* This script contains the core functions for the payroll system.
*/

// Processing control variables
var isProcessing = false;
var processingTimeoutId = null; // Changed variable name from processingTimeout

/**
* Creates the custom menu when the spreadsheet opens
*/
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Technician Tools')
    .addItem('Update All Rates', 'updateAllTechnicianRates')
    .addItem('Create New Sheet', 'createNewTechnicianSheet')
    .addItem('All Spiff/Bonus', 'processAllSpiffBonusWithCustomers') // Ensure this function exists (e.g., in SpiffBonusMainProcessor.gs or similar)
    .addItem('All PBP', 'processAllPBP') // Ensure this function exists (e.g., in PBPMain.gs or similar)
    .addToUi();
}

/**
* Handles edit events in the spreadsheet
* @param {Object} e - The edit event object
*/
function onEdit(e) {
  // If already processing, exit immediately
  if (isProcessing) {
    console.log("Already processing, skipping this execution");
    return;
  }
  try {
    // Set processing flag
    isProcessing = true;
    // Clear any existing timeout - modified to use Utilities.sleep instead of setTimeout
    if (processingTimeoutId) {
      // In Google Apps Script, we can't clear a timeout like in browser JS
      // So we'll just ignore the previous timeout ID
      processingTimeoutId = null;
    }
    var range = e.range;
    var sheet = range.getSheet();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = sheet.getName();
    var column = range.getColumn();
    var row = range.getRow();
    var value = range.getValue();

    // Get rates sheet mapping - use the one from SpiffBonusUtilities
    var ratesMapping = getRatesSheetMapping(); // Expects getRatesSheetMapping in SpiffBonusUtilities.gs

    // Check if this is the Hourly + Spiff Pay sheet and the Action column
    if (sheetName === 'Hourly + Spiff Pay' && column === ratesMapping.actionColumn) {
      // Only process rows after the header
      if (row >= ratesMapping.dataStartRow) {
        // Get the technician name from column A
        var techName = sheet.getRange(row, ratesMapping.nameColumn).getValue();
        if (!techName) {
           console.warn(`Skipping row ${row} because technician name is empty.`);
           isProcessing = false;
           return; 
        }

        // Check which action was selected
        if (value === "Timesheet") {
          // Update timesheet for this specific technician
          updateHoursForTechnician(techName, row, column);
        } else if (value === "Spiff/Bonus") {
          // Get the technician's sheet
          var techSheet = ss.getSheetByName(techName);
          if (!techSheet) {
            console.error(`Technician sheet not found for: ${techName}`);
            setActionStatus(sheet, row, column, 'Error: Tech Sheet Not Found'); // Expects setActionStatus
            SpreadsheetApp.getUi().alert(`Error: Could not find a sheet named "${techName}".`);
          } else {
            // Get the 'Spiff/Bonus' sheet
            var spiffBonusSheet = ss.getSheetByName('Spiff/Bonus'); // Adjust name if different
            if (!spiffBonusSheet) {
              console.error("'Spiff/Bonus' sheet not found.");
              setActionStatus(sheet, row, column, 'Error: Spiff Sheet Missing'); // Expects setActionStatus
              SpreadsheetApp.getUi().alert("Error: Could not find the 'Spiff/Bonus' sheet.");
            } else {
              // Call the main processing function from SpiffBonusMainProcessor.gs
              processSpiffAndBonus(techSheet, techName, spiffBonusSheet, sheet, row, column); // Expects processSpiffAndBonus
            }
          }
        } else if (value === "PBP") { 
           // Call updatePBPForTechnician from PBP/PBPMain.js
           updatePBPForTechnician(techName, row, column); // Expects updatePBPForTechnician
        } else {
           // If value is something else (like Ready or Complete), reset status
           setActionStatus(sheet, row, column, 'Ready'); // Expects setActionStatus
        }
      }
    }
  } catch (error) {
    console.error("Error in onEdit: " + error.message + " Stack: " + error.stack);
    // Try to reset status to Error if possible
    if (sheet && row && column) {
        try { setActionStatus(sheet, row, column, 'Error'); } catch (e) { console.error("Failed to set error status."); } // Expects setActionStatus
    }
  } finally {
    isProcessing = false;
  }
}

/**
* Gets the field mappings for a technician sheet
* @param {Sheet} sheet - The technician sheet to map
* @return {Object} An object containing row and column indexes for important fields
*/
function getTechnicianSheetMapping(sheet) {
  if (!sheet) {
    return {
      hourlyRateRow: 5,
      regHoursRow: 6,
      otHoursRow: 7,
      ptoHoursRow: 8,
      totalHourlyPayRow: 9,
      totalSalesPayRow: 15,
      totalPayRow: 17,
      positionRow: 2,
      payPeriodRow: 3,
      valueColumn: 2,
       calculatedValueColumn: 3,
      ptoRateColumn: 14
    };
  }
  // Find rows by label text
  var mapping = {
    hourlyRateRow: findRowWithText(sheet, "Hourly Rate", 0), // Uses local findRowWithText
    regHoursRow: findRowWithText(sheet, "Regular Hours", 0),
    otHoursRow: findRowWithText(sheet, "Overtime Hours", 0),
    ptoHoursRow: findRowWithText(sheet, "PTO", 0),
    totalHourlyPayRow: findRowWithText(sheet, "Total Hourly Pay", 0),
    totalSalesPayRow: findRowWithText(sheet, "Total Sales Pay", 0),
    totalPayRow: findRowWithText(sheet, "Total Pay", 0),
    positionRow: findRowWithText(sheet, "Position", 0),
    payPeriodRow: 3
  };
  // If any key fields are not found, fall back to the known structure
  if (mapping.hourlyRateRow === -1) mapping.hourlyRateRow = 5;
  if (mapping.regHoursRow === -1) mapping.regHoursRow = 6;
  if (mapping.otHoursRow === -1) mapping.otHoursRow = 7;
  if (mapping.ptoHoursRow === -1) mapping.ptoHoursRow = 8;
  if (mapping.totalHourlyPayRow === -1) mapping.totalHourlyPayRow = 9;
  if (mapping.totalSalesPayRow === -1) mapping.totalSalesPayRow = 15;
  if (mapping.totalPayRow === -1) mapping.totalPayRow = 17;
  if (mapping.positionRow === -1) mapping.positionRow = 2;
  // Set the standard columns
  mapping.valueColumn = 2; // B column
  mapping.calculatedValueColumn = 3;  // C column
  mapping.ptoRateColumn = 14;  // N column
  return mapping;
}

/**
* Helper function to find a row that contains specific text in a specific column (Local to Main.gs)
* @param {Sheet} sheet - The sheet to search in
* @param {string} text - The text to search for
* @param {number} columnIndex - The column index to search in (0-based)
* @param {number} maxRows - Maximum number of rows to search
* @return {number} The row number (1-based) or -1 if not found
*/
function findRowWithText(sheet, text, columnIndex, maxRows) {
  if (!sheet) return -1;
  var maxRows = maxRows || 30; // Default to searching first 30 rows
  var data = sheet.getRange(1, columnIndex + 1, maxRows, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === text) {
      return i + 1; // Convert to 1-based index
    }
  }
  return -1; // Not found
}

/**
* Gets the current pay period from Hourly + Spiff Pay sheet
* @return {string} The current pay period string
*/
function getCurrentPayPeriod() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
     if (!ratesSheet) {
      console.error("Hourly + Spiff Pay sheet not found!");
      return "Current Pay Period";
    }
     // Get pay period from cell F1
    var payPeriod = ratesSheet.getRange(1, 6).getValue();
     // If it's a date object, format it appropriately
    if (payPeriod instanceof Date) {
      payPeriod = Utilities.formatDate(payPeriod, Session.getScriptTimeZone(), "M/dd - M/dd Matisse");
    }
     return payPeriod.toString() || "Current Pay Period";
  } catch (error) {
    console.error("Error in getCurrentPayPeriod: " + error.message);
    return "Current Pay Period";
  }
}

/**
* Helper function to find a technician's row in the rates sheet (Local to Main.gs)
* @param {Sheet} sheet - The rates sheet to search in
* @param {string} techName - The technician name to find
* @param {number} startRow - The row to start searching from
* @return {number} The row number (1-based) or -1 if not found
*/
function findTechnicianRow(sheet, techName, startRow) {
  if (!sheet) return -1;
   var nameColumn = 1; // Assuming technician name is in column A
  var data = sheet.getRange(startRow, nameColumn, sheet.getLastRow() - startRow + 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === techName) {
      return startRow + i; // Convert to actual row number
    }
  }
   return -1; // Not found
}

// --- Placeholder functions potentially called by onOpen menu items ---
function updateAllTechnicianRates() { SpreadsheetApp.getUi().alert('updateAllTechnicianRates function needs to be defined.'); }
function createNewTechnicianSheet() { SpreadsheetApp.getUi().alert('createNewTechnicianSheet function needs to be defined.'); }
// Ensure processAllSpiffBonusWithCustomers and processAllPBP are defined in their respective modules.

// --- Placeholder functions potentially called by onEdit actions ---
function updateHoursForTechnician(techName, row, column) { 
  var ratesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hourly + Spiff Pay');
  SpreadsheetApp.getUi().alert('updateHoursForTechnician function needs to be defined for: ' + techName);
  setActionStatus(ratesSheet, row, column, 'Error: Not Implemented'); // Expects setActionStatus
}

/**
 * Sets the status in the Action column of the rates sheet.
 * @param {Sheet} ratesSheet The 'Hourly + Spiff Pay' sheet object.
 * @param {number} row The 1-based row index.
 * @param {number} col The 1-based column index (should be the Action column).
 * @param {string} status The status to set (e.g., 'Complete', 'Error', 'Processing...').
 */
function setActionStatus(ratesSheet, row, col, status) {
  if (!ratesSheet || !row || !col || !status) {
    console.error("setActionStatus: Invalid parameters provided.");
    return;
  }
  try {
    ratesSheet.getRange(row, col).setValue(status);
  } catch (e) {
    console.error(`Failed to set status to '${status}' at row ${row}, col ${col}: ${e.message}`);
    // Consider adding a UI alert here if this failure is critical
    // SpreadsheetApp.getUi().alert(`Failed to update status for row ${row}. Please check logs.`);
  }
}

// --- Spiff/Bonus helper functions MOVED to SpiffBonus/* modules --- 