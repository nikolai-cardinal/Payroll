/**
 * Cardinal Payroll System - Spiff/Bonus Data Writer
 * Contains functions for writing Spiff/Bonus data and totals to technician sheets.
 */

/**
* Writes the collected Spiff data into the technician sheet using the new column layout.
* Writes data to columns E-J, with Type column set to 'Spiff'.
* IMPORTANT: Only modifies cells in columns E-J, preserving columns A-D.
*
* @param {Sheet} techSheet The technician's sheet object.
* @param {number} headerRow The 1-based row index of the section's header row.
* @param {Array<Object>} customerData An array of objects, each representing a spiff entry.
*                        Expected properties: customerName, jobBusinessUnit, completionDate, commission, notes
* @return {number} The calculated total spiff amount.
*/
function writeSpiffDataToSheet(techSheet, headerRow, customerData) {
  if (!techSheet || headerRow <= 0 || !customerData) {
    console.error("writeSpiffDataToSheet: Invalid parameters");
    return 0;
  }

  // Find a free row to start writing data
  var dataStartRow = headerRow + 1;
  var nextSectionRow = findNextSectionStart(techSheet, headerRow + 1);
  
  if (nextSectionRow <= 0) {
    nextSectionRow = techSheet.getLastRow() + 1;
  }
  
  // Check if there's data to write
  if (!customerData || customerData.length === 0) {
    console.log("No spiff data provided to write");
    return 0;
  }

  var tz = Session.getScriptTimeZone() || 'America/New_York';
  var totalSpiff = 0;
  
  // Prepare data array for writing (map to columns E-J)
  var dataToWrite = customerData.map(function(c) {
    var commissionAmount = Number(c.commission || 0);
    totalSpiff += commissionAmount;
    
    var dateObj = tryParseDate(c.completionDate);
    var displayDate = dateObj
      ? Utilities.formatDate(dateObj, tz, 'MM/dd/yyyy')
      : (c.completionDate || "");
    
    return [
      c.customerName || "",       // Column E: Customer Name
      c.jobBusinessUnit || "",    // Column F: Job Business Unit
      displayDate,                // Column G: Completion Date
      commissionAmount,           // Column H: Commission Amount
      c.notes || "",              // Column I: Notes
      "Spiff"                     // Column J: Type
    ];
  });
  
  // Calculate rows needed vs available rows - ONLY for actual data entries
  var rowsNeeded = dataToWrite.length;
  var availableRows = nextSectionRow - dataStartRow;
  
  // Write data to columns E-J (indices 5-10) - ONLY if we have actual data
  if (rowsNeeded > 0) {
    // Make sure we have enough rows to write our data to (using existing rows)
    // Do NOT insert new rows - this would disrupt the table structure
    var rowsToWrite = Math.min(rowsNeeded, availableRows);
    
    // Write to existing rows first
    var targetRange = techSheet.getRange(dataStartRow, 5, rowsToWrite, 6);
    targetRange.setValues(dataToWrite.slice(0, rowsToWrite));

    // Apply formatting
    techSheet.getRange(dataStartRow, 7, rowsToWrite, 1).setNumberFormat('MM/dd/yyyy'); // Date format
    techSheet.getRange(dataStartRow, 8, rowsToWrite, 1).setNumberFormat('$#,##0.00'); // Currency format
    
    // Clear any remaining rows that have "Spiff" in Type column (column J)
    if (availableRows > rowsNeeded) {
      var remainingRows = availableRows - rowsNeeded;
      if (remainingRows > 0) {
        // Find remaining rows that have "Spiff" in Type column
        var remainingSpiffRows = [];
        if (remainingRows > 0) {
          var typeValues = techSheet.getRange(dataStartRow + rowsNeeded, 10, remainingRows, 1).getValues();
          for (var i = 0; i < typeValues.length; i++) {
            var cellValue = typeValues[i][0];
            if (cellValue && typeof cellValue === 'string' && 
                cellValue.toString().toLowerCase().includes("spiff")) {
              remainingSpiffRows.push(dataStartRow + rowsNeeded + i);
            }
          }
        }
        
        // Only clear cells in columns E-J with "Spiff" in Type column
        for (var j = 0; j < remainingSpiffRows.length; j++) {
          techSheet.getRange(remainingSpiffRows[j], 5, 1, 6).clearContent();
        }
        
        console.log(`Cleared ${remainingSpiffRows.length} remaining Spiff rows (columns E-J only)`);
      }
    }
  }

  console.log(`Wrote ${rowsNeeded} spiff entries starting at row ${dataStartRow}, total: ${totalSpiff}`);
  return totalSpiff;
} 