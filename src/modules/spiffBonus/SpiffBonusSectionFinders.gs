/**
 * Cardinal Payroll System - Spiff/Bonus Section Finders
 * Contains functions for locating specific sections within technician sheets.
 */

/**
 * Finds the row number containing the header for the Customer Data section.
 * In the redesigned sheet, we look for the Customer Name header (column E).
 * @param {Sheet} sheet The technician sheet object to search within.
 * @return {number} The 1-based row index of the section header, or -1 if not found.
 */
function findSpiffCustomerDataSection(sheet) {
  if (!sheet) return -1;
  
  // In the redesigned sheet, look for the Customer Name header in column E
  var headerRow = findRowWithText(sheet, "Customer Name", 5, 1, 30, false); // Search Col E (index 5), first 30 rows
  
  if (headerRow > 0) {
    console.log("Found Customer Name header at row " + headerRow + " in sheet " + sheet.getName());
    return headerRow;
  }
  
  // Fallback search with partial match
  headerRow = findRowWithText(sheet, "Customer", 5, 1, 30, true);
  if (headerRow > 0) {
    console.log("Found Customer header (partial match) at row " + headerRow + " in sheet " + sheet.getName());
    return headerRow;
  }
  
  console.error("Could not find Customer Data section header in sheet: " + sheet.getName());
  return -1;
}

/**
 * Finds the row number of the next section after the customer data.
 * @param {Sheet} sheet The sheet object to search within.
 * @param {number} searchStartRow The 1-based row index to start searching after.
 * @param {number} [maxRowsToSearch=40] Maximum number of rows to look ahead.
 * @return {number} The 1-based row index of the next section, or -1 if none found within range.
 */
function findNextSectionStart(sheet, searchStartRow, maxRowsToSearch) {
  if (!sheet || searchStartRow <= 0) return -1;
  var startLookup = searchStartRow;
  var rowsToScan = maxRowsToSearch || 40; // Default scan range
  
  var lastRow = sheet.getLastRow();
  if (startLookup > lastRow) return -1;
  if (startLookup + rowsToScan - 1 > lastRow) {
    rowsToScan = lastRow - startLookup + 1;
  }
  if (rowsToScan <= 0) return -1;
  
  // Look for the "Install & Sales" section or "Total Pay" section
  // which are the proper section headers in the payroll sheet
  var searchRange = sheet.getRange(startLookup, 1, rowsToScan, 1); // Look ahead in Column A
  var values = searchRange.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var actualRow = startLookup + i;
    var cellValue = values[i][0];
    if (cellValue && typeof cellValue === 'string') {
      var trimmedValue = cellValue.toString().trim().toLowerCase();
      
      // ONLY identify these specific values as section headers
      if (trimmedValue === "install & sales" || 
          trimmedValue === "total spiff" ||
          trimmedValue === "total sales pay" ||
          trimmedValue === "total pay" ||
          trimmedValue === "total hourly pay") {
        console.log("Found next section header '" + cellValue + "' at row " + actualRow);
        return actualRow;
      }
    }
  }
  
  // If no section header found, look for a large gap of empty rows
  var emptyRowsNeeded = 5; // Consider a section break after this many empty rows
  var consecutiveEmptyRows = 0;
  
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0] && values[i][0] !== 0) {
      consecutiveEmptyRows++;
      if (consecutiveEmptyRows >= emptyRowsNeeded) {
        var sectionRow = startLookup + i - emptyRowsNeeded + 1;
        console.log("Found section break at row " + sectionRow + " after " + emptyRowsNeeded + " empty rows");
        return sectionRow;
      }
    } else {
      consecutiveEmptyRows = 0;
    }
  }
  
  console.log("No clear next section found after row " + searchStartRow + ", using last row: " + lastRow);
  return lastRow + 1;
}

/**
 * Finds rows where Type column (J) contains "Spiff"
 * @param {Sheet} sheet The technician sheet
 * @param {number} startRow Row to start searching from
 * @param {number} numRows Number of rows to check
 * @return {Array} Array of row numbers containing Spiff in Type column
 */
function findSpiffTypeRows(sheet, startRow, numRows) {
  if (!sheet || startRow <= 0 || numRows <= 0) return [];
  
  var typeColumnIndex = 10; // Column J
  var dataRange = sheet.getRange(startRow, typeColumnIndex, numRows, 1);
  var values = dataRange.getValues();
  var spiffRows = [];
  
  for (var i = 0; i < values.length; i++) {
    var cellValue = values[i][0];
    if (cellValue && typeof cellValue === 'string' && 
        cellValue.toString().toLowerCase().includes("spiff")) {
      spiffRows.push(startRow + i);
    }
  }
  
  console.log("Found " + spiffRows.length + " rows with Type='Spiff'");
  return spiffRows;
} 