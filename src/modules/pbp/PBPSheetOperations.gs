/**
* Payroll System - PBP Sheet Operations
* Handles interactions with technician sheets: finding sections,
* clearing data, writing PBP entries, managing rows, and updating summaries.
*/


/**
* Writes the calculated PBP data to the technician's sheet.
* @param {Sheet} techSheet - The specific technician's sheet object.
* @param {Array<object>} allPbpEntries - Array of calculated PBP entry objects.
* @param {number} totalTechnicianShare - The total calculated PBP share for the tech.
*/
function writePbpDataToSheet(techSheet, allPbpEntries, totalTechnicianShare) {
  if (!techSheet || !allPbpEntries) {
    console.error("writePbpDataToSheet: Invalid arguments.");
    return;
  }

  // --- 1. Update Top Summary ---
  updateTopSummaryInstallPay(techSheet, totalTechnicianShare, allPbpEntries.length);

  // --- 2. Find existing PBP rows in column J ---
  var lastRow = techSheet.getLastRow();
  var existingPbpRows = findExistingPbpRows(techSheet);
  
  // --- 3. Prepare data for writing ---
  var tz = Session.getScriptTimeZone() || 'America/New_York';
  var dataToWrite = [];
  
  for (var idx = 0; idx < allPbpEntries.length; idx++) {
    var entry = allPbpEntries[idx];
    var dateObj = tryParseDate(entry.completionDate);
    var displayDate = dateObj ? Utilities.formatDate(dateObj, tz, "MM/dd/yyyy") : (entry.completionDate || "");
    
    // --- Enhanced Notes Column --- 
    var notesParts = [];
    // Start with the tech's role and percentage for this job
    notesParts.push(`${entry.roleForJob} (${entry.splitPercentage.toFixed(1)}%)`);

    // Add the detailed team breakdown if available
    if (entry.teamDetails) {
      // Check if it was a solo job - the teamDetails will only contain the current tech
      var teamMembers = entry.teamDetails.split(', ');
      if (teamMembers.length > 1) {
        notesParts.push(`Team: ${entry.teamDetails}`);
      } else {
        // Optional: Add specific text for solo jobs, or leave it out
        // notesParts.push("Solo Job"); 
      }
    }
    var notesText = notesParts.join(' - '); // Join parts with a separator
    
    dataToWrite.push([
      entry.customerName || "",      // Column E: Customer Name
      entry.jobBusinessUnit || "",   // Column F: Job Business Unit
      displayDate,                   // Column G: Completion Date
      entry.technicianShare,         // Column H: Commission Amount
      notesText,                     // Column I: Notes
      "PBP"                          // Column J: Type
    ]);
  }
  
  // --- 4. Write data to the sheet ---
  if (dataToWrite.length === 0) {
    console.log("No PBP data to write");
    return;
  }
  
  // If we have existing PBP rows, update them
  if (existingPbpRows.length > 0) {
    console.log("Found " + existingPbpRows.length + " existing PBP rows to update");
    
    // The number of rows we need to update
    var rowsToUpdate = Math.min(existingPbpRows.length, dataToWrite.length);
    
    // Update existing rows first
    for (var i = 0; i < rowsToUpdate; i++) {
      var targetRow = existingPbpRows[i];
      var targetRange = techSheet.getRange(targetRow, 5, 1, 6); // Columns E-J (5-10)
      targetRange.setValues([dataToWrite[i]]);
    }
    
    // If we have more entries than existing PBP rows, look for empty rows
    if (dataToWrite.length > existingPbpRows.length) {
      var remainingEntries = dataToWrite.slice(existingPbpRows.length);
      writeRemainingPbpEntries(techSheet, remainingEntries);
    }
    
    // If we have fewer entries than existing PBP rows, clear the excess rows
    if (existingPbpRows.length > dataToWrite.length) {
      console.log("Clearing " + (existingPbpRows.length - dataToWrite.length) + " excess PBP rows");
      for (var j = dataToWrite.length; j < existingPbpRows.length; j++) {
        var excessRow = existingPbpRows[j];
        // Only delete data in columns E-J (5-10) where column J contains "PBP"
        // These rows come from findExistingPbpRows, which guarantees column J contains "PBP"
        techSheet.getRange(excessRow, 5, 1, 6).clearContent();
      }
    }
  } else {
    // No existing PBP rows, write all entries to empty rows
    writeRemainingPbpEntries(techSheet, dataToWrite);
  }
  
  console.log("Sheet update finished for: " + techSheet.getName());
}

/**
 * Finds all rows that have "PBP" in column J
 * @param {Sheet} sheet - The technician sheet to search
 * @return {Array} Array of row numbers that have "PBP" in column J
 */
function findExistingPbpRows(sheet) {
  var lastRow = sheet.getLastRow();
  var typeColumn = 10; // Column J
  var rows = [];
  
  // Skip if sheet doesn't have enough columns
  if (sheet.getLastColumn() < typeColumn) {
    return rows;
  }
  
  // Get all values in column J
  var typeValues = sheet.getRange(1, typeColumn, lastRow, 1).getValues();
  
  // Find rows with "PBP" in column J - ONLY these rows will ever be cleared
  for (var i = 0; i < typeValues.length; i++) {
    var cellValue = typeValues[i][0];
    if (cellValue && typeof cellValue === 'string' && 
        cellValue.toString().trim().toLowerCase() === "pbp") {
      rows.push(i + 1); // Convert to 1-based row index
    }
  }
  
  console.log("Found " + rows.length + " rows with PBP in type column");
  return rows;
}

/**
 * Writes PBP entries to empty rows in columns E-J
 * @param {Sheet} sheet - The technician sheet
 * @param {Array} entries - The PBP entries to write
 */
function writeRemainingPbpEntries(sheet, entries) {
  if (!entries || entries.length === 0) return;
  
  // Find the header row with "Customer Name" in column E
  var headerRow = findCustomerNameHeaderRow(sheet);
  if (headerRow <= 0) {
    console.log("Could not find 'Customer Name' header in column E in " + sheet.getName());
    return;
  }
  
  // Start looking at the row after the header
  var firstDataRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  
  // Find first empty row in columns E-J
  var startRow = -1;
  var rowsToSearch = Math.min(50, lastRow - firstDataRow + 1); // Cap at 50 rows
  
  if (rowsToSearch > 0) {
    var rowData = sheet.getRange(firstDataRow, 5, rowsToSearch, 6).getValues(); // Columns E-J (5-10)
    
    for (var i = 0; i < rowData.length; i++) {
      var isEmpty = true;
      for (var j = 0; j < rowData[i].length; j++) {
        if (rowData[i][j] !== "") {
          isEmpty = false;
          break;
        }
      }
      
      if (isEmpty) {
        startRow = firstDataRow + i;
        break;
      }
    }
  }
  
  // If we couldn't find an empty row, use the first data row
  if (startRow === -1) {
    startRow = firstDataRow;
    console.log("No empty rows found, using first row after header: " + startRow);
  }
  
  console.log("Writing " + entries.length + " entries starting at row " + startRow);
  
  // Write each entry
  for (var k = 0; k < entries.length; k++) {
    var currentRow = startRow + k;
    var targetRange = sheet.getRange(currentRow, 5, 1, 6); // Columns E-J (5-10)
    targetRange.setValues([entries[k]]);
    
    // Apply formatting
    sheet.getRange(currentRow, 7, 1, 1).setNumberFormat('MM/dd/yyyy'); // Date column format
    sheet.getRange(currentRow, 8, 1, 1).setNumberFormat('$#,##0.00'); // Commission column format
  }
}

/**
 * Finds the row that contains "Customer Name" in column E
 * @param {Sheet} sheet - The technician sheet
 * @return {number} The row number (1-based) or -1 if not found
 */
function findCustomerNameHeaderRow(sheet) {
  var lastRow = Math.min(50, sheet.getLastRow()); // Check first 50 rows
  var columnE = sheet.getRange(1, 5, lastRow, 1).getValues();
  
  for (var i = 0; i < columnE.length; i++) {
    var cellValue = columnE[i][0];
    if (cellValue && typeof cellValue === 'string' &&
        cellValue.toString().trim().toLowerCase() === "customer name") {
      return i + 1; // Convert to 1-based row index
    }
  }
  
  return -1; // Not found
}

/**
* Updates the top summary section ('Total Install Pay') with amount and count.
* @param {Sheet} sheet - The technician sheet to update.
* @param {number} amount - The total PBP amount.
* @param {number} count - The number of PBP entries.
*/
function updateTopSummaryInstallPay(sheet, amount, count) {
  if (!sheet) return;
  // Target row 13 specifically for Total Install Pay based on screenshot
  var installPayRow = 13;
  try {
     sheet.getRange(installPayRow, 2).setValue(count); // Count in Col B (B13)
     sheet.getRange(installPayRow, 3).setValue(amount).setNumberFormat("$#,##0.00"); // Amount in Col C (C13)
     console.log("Updated Total Install Pay in B13/C13 with count: " + count + ", amount: $" + amount.toFixed(2));
  } catch (e) { 
     console.error("Error updating top summary install pay for " + sheet.getName() + ": " + e); 
     
     // Fallback to searching for "Total Install Pay" if row 13 doesn't work
     var data = sheet.getRange("A1:A20").getValues(); // Check first 20 rows
     for (var row = 0; row < data.length; row++) {
       if (data[row][0] && data[row][0].toString().trim() === "Total Install Pay") {
         installPayRow = row + 1;
         try {
           sheet.getRange(installPayRow, 2).setValue(count); // Count in Col B
           sheet.getRange(installPayRow, 3).setValue(amount).setNumberFormat("$#,##0.00"); // Amount in Col C
           console.log("Fallback: Updated Total Install Pay in row " + installPayRow);
         } catch (err) { 
           console.error("Fallback also failed to update top summary: " + err); 
         }
         break;
       }
     }
  }
}

/**
* Finds the row where the Install Customer Data section starts.
* @param {Sheet} sheet - The sheet to search in.
* @return {number} The row number (1-based) or -1 if not found.
*/
function findInstallCustomerDataSection(sheet) {
  if (!sheet) return -1;
  var data = sheet.getRange("A1:A50").getValues(); // Search first 50 rows
  for (var i = 0; i < data.length; i++) {
    var value = data[i][0];
    if (value && typeof value === "string") {
      var trimmedValue = value.trim();
      if (trimmedValue === "Install [Customer Data]" || trimmedValue === "Install Customer Data" || trimmedValue === "Install & Sales") { return i + 1; }
    }
  }
  // Fallback search (case-insensitive, partial, below row 15)
  for (var i = 0; i < data.length; i++) { // Start from the beginning instead of row 15
     var value = data[i][0];
     if (value && typeof value === "string") {
       var lowerValue = value.toLowerCase().trim();
       if (lowerValue.includes("install") && (lowerValue.includes("customer") || lowerValue.includes("data") || lowerValue.includes("sales") || lowerValue.includes("&"))) {
         console.log("Found install section using partial match: '" + value + "' at row " + (i+1));
         return i + 1;
       }
     }
  }
  console.log("No Install section header found in sheet: " + sheet.getName());
  return -1;
}

/**
* Finds the row where the next section after Install starts.
* @param {Sheet} sheet - The sheet to search in.
* @param {number} installSectionRow - The row where the Install section starts.
* @return {number} The row number (1-based) or -1 if not found.
*/
function findNextSectionAfterInstall(sheet, installSectionRow) {
  if (!sheet || installSectionRow <= 0) return -1;
  var startSearchRow = installSectionRow + 3; // Start looking below header/first data
  var maxSearchRow = Math.min(sheet.getLastRow() + 1, installSectionRow + 60); // Search ample rows
  if (startSearchRow >= maxSearchRow) return -1;


  var searchValues = sheet.getRange(startSearchRow, 1, maxSearchRow - startSearchRow, 1).getValues();
  for (var i = 0; i < searchValues.length; i++) {
    var rowValue = searchValues[i][0];
    var actualRow = startSearchRow + i;
    if (rowValue && typeof rowValue === "string") {
      var trimmedValue = rowValue.trim();
      var lowerValue = trimmedValue.toLowerCase();
      // Look for non-empty cells that don't seem like data continuation or total rows
      if (trimmedValue.length > 0 && !lowerValue.includes("install") && !lowerValue.includes("total")) {
         // Simple check: If it contains common section words or ends with 'Data]'?
        if (lowerValue.includes("data") || lowerValue.includes("sales") || lowerValue.includes("spiff") || lowerValue.includes("bonus") || lowerValue.includes("lead") || lowerValue.includes("customer") || trimmedValue.endsWith("Data]")) {
           console.log("Found next section header '" + trimmedValue + "' at row " + actualRow);
           return actualRow;
        }
      }
    }
  }
  console.log("No next section found after Install section in sheet: " + sheet.getName());
  return -1;
}

/**
* Helper function to try parsing a date value in various formats
* @param {any} dateValue - The value to try to parse as a date
* @return {Date|null} The parsed Date object or null if parsing failed
*/
function tryParseDate(dateValue) {
  if (!dateValue) return null;
  
  // If it's already a Date object, return it
  if (dateValue instanceof Date) return dateValue;
  
  // Try to parse various date formats
  try {
    // If it's a string with timestamp format
    if (typeof dateValue === 'string') {
      // Try normal Date parsing first
      var parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      // Try MM/dd/yyyy format
      var parts = dateValue.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    }
    
    // If it's a number (serial date)
    if (typeof dateValue === 'number') {
      // Excel/Sheets epoch starts at 1/1/1900, and JS at 1/1/1970
      // There's a 25569 days difference (approximately)
      var excelEpoch = new Date(1900, 0, 1);
      var jsDate = new Date(excelEpoch);
      jsDate.setDate(excelEpoch.getDate() + dateValue - 2); // -2 for Excel date system quirk
      return jsDate;
    }
  } catch (e) {
    console.error("Error parsing date: " + e.message);
  }
  
  return null;
}

/**
* Clears the data rows in the Install section where Type column (J) contains 'PBP'.
* Only clears columns E-J (5-10), preserving columns A-D.
*
* @param {Sheet} sheet - The technician sheet to clear.
* @return {number} The number of rows cleared
*/
function clearInstallDataSection(sheet) {
  if (!sheet) return 0;
  try {
    // First, find the Install section
    var installSectionRow = findInstallCustomerDataSection(sheet);
    if (installSectionRow <= 0) {
      console.log("Clear Install Data: Install section not found in " + sheet.getName());
      return 0;
    }
    
    var dataStartRow = installSectionRow + 1;
    var nextSectionRow = findNextSectionAfterInstall(sheet, installSectionRow);
    
    if (nextSectionRow <= 0) {
      nextSectionRow = sheet.getLastRow() + 1;
      console.log("No next section found, using last row + 1 (" + nextSectionRow + ") as boundary");
    }

    var rowsAvailable = nextSectionRow - dataStartRow;
    if (rowsAvailable <= 0) {
      console.log("No data rows available to clear in " + sheet.getName());
      return 0;
    }
    
    // Find existing PBP rows
    var pbpRows = findExistingPbpRows(sheet);
    
    // ONLY clear the CELLS in columns E-J where Type column (J) contains 'PBP'
    var rowsCleared = 0;
    for (var i = 0; i < pbpRows.length; i++) {
      var rowToClear = pbpRows[i];
      // Only clear row if it's in the Install section range
      if (rowToClear >= dataStartRow && rowToClear < nextSectionRow) {
        sheet.getRange(rowToClear, 5, 1, 6).clearContent(); // Clear ONLY columns E-J (5-10)
        rowsCleared++;
      }
    }
    
    console.log("Cleared " + rowsCleared + " rows with Type='PBP' in " + sheet.getName());
    return rowsCleared;
  } catch (e) {
    console.error("Error clearing install data section: " + e.message);
    return 0;
  }
}

