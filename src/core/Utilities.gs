// Namespace stub – Utilities
var Modules = Modules || {};
Modules.Utilities = Modules.Utilities || {};

(function() {
  'use strict';

  /**
   * Returns a standard mapping object for columns in the common
   * "Hourly + Spiff Pay" admin sheet so we only define this once.
   *
   * @return {{nameColumn:number, positionColumn:number, rateColumn:number, actionColumn:number, dataStartRow:number}}
   */
  function getRatesSheetMapping() {
    return Object.freeze({
      nameColumn: 1,       // Column A
      positionColumn: 2,   // Column B
      rateColumn: 4,       // Column D
      actionColumn: 7,     // Column G – action dropdown
      dataStartRow: 3      // First row of technician data (after header rows)
    });
  }

  /**
   * Converts a 1-based column index to its spreadsheet letter notation.
   * Example: 1 → A, 27 → AA.
   *
   * @param {number} columnNumber 1-based column index.
   * @return {string} Column letter(s).
   */
  function columnToLetter(columnNumber) {
    if (!columnNumber || columnNumber < 1) return '';

    var temp = columnNumber;
    var letter = '';

    while (temp > 0) {
      var modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - modulo - 1) / 26);
    }

    return letter;
  }

  /**
   * Executes a spreadsheet operation and swallows any runtime errors,
   * logging them to the console instead of crashing the whole flow.
   *
   * @template T
   * @param {() => T} operation Callback performing the risky operation.
   * @param {T} [fallback=null] Value to return if the operation throws.
   * @return {T|null} Returns the operation result or the fallback on error.
   */
  function safeOperation(operation, fallback) {
    try {
      return operation();
    } catch (err) {
      console.error('safeOperation error:', err);
      return (fallback === undefined ? null : fallback);
    }
  }

  // Expose helpers on the namespace without overwriting any existing keys.
  Object.assign(Modules.Utilities, {
    getRatesSheetMapping: getRatesSheetMapping,
    columnToLetter: columnToLetter,
    safeOperation: safeOperation,
  });
})();