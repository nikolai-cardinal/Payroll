// Namespace stub – SheetUtils
var Modules = Modules || {};
Modules.SheetUtils = Modules.SheetUtils || {}; 

/**
 * Returns a Sheet by name from the supplied Spreadsheet. Throws an error if not found.
 *
 * @param {string} sheetName          The name of the sheet to retrieve.
 * @param {Spreadsheet=} spreadsheet  Optional Spreadsheet instance. Defaults to the active spreadsheet.
 * @return {Sheet}                    The matching Google Sheet.
 */
Modules.SheetUtils.getSheetByName = function (sheetName, spreadsheet) {
  var ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
};

/**
 * Finds the first row index (1-based) in `sheet` where the given value exists in a column.
 *
 * @param {Sheet}   sheet        The sheet to search within.
 * @param {*}       value        The value to match using strict equality (===).
 * @param {number}  columnIndex  1-based column index to search. Defaults to 1 (column A).
 * @return {number}              Row number where the value is found, or ‑1 if not found.
 */
Modules.SheetUtils.findRowByValue = function (sheet, value, columnIndex) {
  columnIndex = columnIndex || 1;
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return -1;

  var range = sheet.getRange(1, columnIndex, lastRow, 1);
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === value) {
      return i + 1; // convert to 1-based row number
    }
  }
  return -1;
};

/**
 * Sets a status string (e.g. ✔, ❌, In-Progress) in the specified row/column and optionally applies a note.
 *
 * @param {Sheet}   sheet        Target sheet.
 * @param {number}  row          1-based row number to update.
 * @param {number}  columnIndex  1-based column where the status lives.
 * @param {string}  status       The status text to write.
 * @param {string=} note         Optional note to attach to the cell.
 * @return {void}
 */
Modules.SheetUtils.setActionStatus = function (sheet, row, columnIndex, status, note) {
  var cell = sheet.getRange(row, columnIndex);
  cell.setValue(status);
  if (note !== undefined) {
    cell.setNote(String(note));
  }
  SpreadsheetApp.flush();
}; 