/**
 * Cardinal Payroll System - Timesheet Actions
 * This script delegates to the TimeSheet/TimeSheetLogic module.
 */

/**
 * Helper function to find a column by its header text in a specific row
 * @param {Sheet} sheet - The sheet to search in
 * @param {string} headerText - The text to search for
 * @param {number} searchRow - The row index to search in (0-based)
 * @return {number} The column index (1-based) or -1 if not found
 */
function findColumnByHeaderForTimesheet(sheet, headerText, searchRow = 0) {
  // Delegate to the TimeSheetLogic module
  return findColumnByHeaderForTimesheet(sheet, headerText, searchRow);
}

/**
 * Helper function to find a row by its label in a specific column
 * @param {Sheet} sheet - The sheet to search in
 * @param {string} labelText - The text to search for
 * @param {number} searchColumn - The column index to search in (0-based)
 * @return {number} The row index (1-based) or -1 if not found
 */
function findRowByLabelForTimesheet(sheet, labelText, searchColumn = 0) {
  // Delegate to the TimeSheetLogic module
  return findRowByLabelForTimesheet(sheet, labelText, searchColumn);
}

/**
 * Gets the field mappings for the time sheet
 * @return {Object} An object containing column indexes for important fields
 */
function getTimeSheetMapping() {
  // Delegate to the TimeSheetLogic module
  return getTimeSheetMapping();
}

/**
 * Gets the field mappings for a technician sheet
 * @param {Sheet} sheet - The technician sheet to map
 * @return {Object} An object containing row and column indexes for important fields
 */
function getTechnicianSheetMappingForTimesheet(sheet) {
  // Delegate to the TimeSheetLogic module
  return getTechnicianSheetMappingForTimesheet(sheet);
}

/**
 * Gets the current pay period from Hourly + Spiff Pay sheet
 * @return {string} The current pay period string
 */
function getCurrentPayPeriodForTimesheet() {
  // Delegate to the TimeSheetLogic module
  return getCurrentPayPeriodForTimesheet();
}

/**
 * Formats decimal hours to display with two decimal places
 * @param {number} decimalHours - The hours in decimal format
 * @return {string} The formatted decimal hours
 */
function formatHoursToHM(decimalHours) {
  // Just return the decimal hours with 2 decimal places
  return decimalHours.toFixed(2);
}

/**
 * Updates hours for a specific technician based on the Time Sheet
 * @param {string} technicianName - The name of the technician to update
 * @param {number} actionRow - The row in the Hourly + Spiff Pay sheet where the action was triggered
 * @param {number} actionColumn - The column in the Hourly + Spiff Pay sheet where the action was triggered
 */
function updateHoursForTechnician(technicianName, actionRow, actionColumn, skipStatusUpdate) {
  // Delegate to the TimeSheetLogic module
  return updateHoursForTechnician(technicianName, actionRow, actionColumn, skipStatusUpdate);
}