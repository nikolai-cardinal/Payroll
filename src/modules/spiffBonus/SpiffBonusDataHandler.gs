/**
 * Cardinal Payroll System - Spiff/Bonus Data Handler
 * Contains functions for writing spiff data to technician sheets while preserving existing data when needed.
 */

/**
 * Writes spiff/bonus data to a technician sheet, preserving any existing customer data if there isn't 
 * a replacement for that specific customer in the new data.
 * IMPORTANT: Only modifies cells in columns E-J, preserving columns A-D.
 * 
 * @param {Sheet} sheet - The technician sheet to write spiff data to.
 * @param {Array} newSpiffData - The new spiff data to write to the sheet.
 * @param {number} customerNameColIndex - The column index (0-based) in newSpiffData that contains customer names.
 * @param {boolean} preserveUnreplacedData - Whether to keep existing customers not present in new data (default: false).
 */
function writeSpiffDataWithPreservation(sheet, newSpiffData, customerNameColIndex, preserveUnreplacedData) {
  if (!sheet || !newSpiffData) return;
  if (preserveUnreplacedData === undefined) preserveUnreplacedData = false; // Default to false
  
  try {
    console.log("Starting writeSpiffDataWithPreservation for " + sheet.getName() + " with " + newSpiffData.length + " new spiff entries.");
    
    // First, get existing data before clearing anything
    var existingData = getExistingSpiffData(sheet);
    console.log("Found " + existingData.length + " existing spiff entries in " + sheet.getName());
    
    // Prepare the data we'll be writing - start with the new data
    var dataToWrite = newSpiffData.slice(); // Clone the array
    
    // If we're preserving unmatched data, merge with existing
    if (preserveUnreplacedData && existingData.length > 0) {
      // Extract customer names from new data for comparison
      var newCustomerNames = {};
      for (var i = 0; i < newSpiffData.length; i++) {
        var customerName = newSpiffData[i][customerNameColIndex];
        if (customerName && typeof customerName === 'string') {
          newCustomerNames[customerName.toLowerCase().trim()] = true;
        }
      }
      
      // Add existing customers that aren't in the new data
      for (var j = 0; j < existingData.length; j++) {
        var existingCustomer = existingData[j][0]; // Assuming customer name is in col A
        if (existingCustomer && typeof existingCustomer === 'string') {
          var existingKey = existingCustomer.toLowerCase().trim();
          if (!newCustomerNames[existingKey] && existingKey !== "total") {
            console.log("Preserving existing customer: " + existingCustomer + " not found in new data");
            dataToWrite.push(existingData[j]);
          }
        }
      }
      
      console.log("Combined data has " + dataToWrite.length + " entries after preserving existing customers.");
    } else {
      console.log("Complete data replacement mode: Only using new data, not preserving existing entries.");
    }
    
    // Now clear the section to prepare for writing
    clearSpiffDataSection(sheet, false, dataToWrite);
    
    // Skip if no data to write
    if (dataToWrite.length === 0) {
      console.log("No spiff data to write for " + sheet.getName());
      return;
    }
    
    // Find section boundaries to determine where to write
    var spiffSectionRow = findSpiffCustomerDataSection(sheet);
    if (spiffSectionRow <= 0) {
      console.error("Cannot find Spiff section to write data in " + sheet.getName());
      return;
    }
    
    var spiffHeaderRow = spiffSectionRow + 1;
    var spiffDataStartRow = spiffHeaderRow + 1;
    
    // Calculate the next section row to know available space
    var nextSectionRow = findNextSectionStart(sheet, spiffHeaderRow + 1);
    if (nextSectionRow <= 0) {
      nextSectionRow = sheet.getLastRow() + 1;
    }
    
    // Calculate rows needed vs available rows
    var rowsNeeded = dataToWrite.length;
    var availableRows = nextSectionRow - spiffDataStartRow;
    
    // Write the data only if we have actual rows to write
    if (rowsNeeded > 0) {
      // Write only to existing rows - do NOT add new rows to preserve table structure
      var rowsToWrite = Math.min(rowsNeeded, availableRows);
      
      // We only want to write to columns E-J (5-10), but our dataToWrite may have more columns
      // Extract just the data for columns E-J
      var dataForEToJ = [];
      for (var i = 0; i < rowsToWrite; i++) {
        var rowData = dataToWrite[i];
        // Assuming the data layout matches E-J format (usually we'd map it more explicitly)
        var eToJData = [
          rowData[4] || "",  // Column E - Customer Name (index 4)
          rowData[5] || "",  // Column F - Job Business Unit (index 5)
          rowData[6] || "",  // Column G - Date (index 6)
          rowData[7] || 0,   // Column H - Amount (index 7)
          rowData[8] || "",  // Column I - Notes (index 8)
          rowData[9] || "Spiff" // Column J - Type (index 9)
        ];
        dataForEToJ.push(eToJData);
      }
      
      // Write to columns E-J only
      if (dataForEToJ.length > 0) {
        var targetRange = sheet.getRange(spiffDataStartRow, 5, rowsToWrite, 6); // Columns E-J (5-10)
        targetRange.setValues(dataForEToJ);
        console.log("Wrote " + rowsToWrite + " spiff entries to columns E-J in sheet " + sheet.getName());
        
        // Apply formatting to amounts in column H
        sheet.getRange(spiffDataStartRow, 8, rowsToWrite, 1).setNumberFormat("$#,##0.00");
        
        // Apply formatting to dates in column G
        sheet.getRange(spiffDataStartRow, 7, rowsToWrite, 1).setNumberFormat("MM/dd/yyyy");
      }
      
      // Calculate the total amount
      var total = 0;
      for (var k = 0; k < dataToWrite.length; k++) {
        var val = dataToWrite[k][7]; // Column H - Amount (index 7)
        if (typeof val === 'number') {
          total += val;
        } else if (typeof val === 'string') {
          // Try to parse a number from the string (e.g. "$100" -> 100)
          var numStr = val.replace(/[^0-9.-]+/g, "");
          if (numStr) {
            total += parseFloat(numStr) || 0;
          }
        }
      }
      
      // Update the "Total" row in column H with the total amount
      var totalRow = spiffDataStartRow + rowsToWrite;
      sheet.getRange(totalRow, 5).setValue("Total").setFontWeight("bold");
      sheet.getRange(totalRow, 8).setValue(total).setNumberFormat("$#,##0.00").setFontWeight("bold");
      
      console.log("Added Total row at " + totalRow + " with calculated value " + total + " in sheet " + sheet.getName() + ".");
      
      // Clear any remaining rows with "Spiff" in Type column (column J)
      if (availableRows > rowsNeeded) {
        var remainingRows = availableRows - rowsNeeded;
        if (remainingRows > 0) {
          // Find remaining rows that have "Spiff" in Type column
          var startRow = spiffDataStartRow + rowsNeeded;
          var remainingSpiffRows = [];
          
          var typeColumnIndex = 10; // Column J
          var typeValues = sheet.getRange(startRow, typeColumnIndex, remainingRows, 1).getValues();
          
          for (var i = 0; i < typeValues.length; i++) {
            var cellValue = typeValues[i][0];
            if (cellValue && typeof cellValue === 'string' && 
                cellValue.toString().toLowerCase().includes("spiff")) {
              remainingSpiffRows.push(startRow + i);
            }
          }
          
          // Only clear cells in columns E-J for rows with "Spiff" in Type column
          for (var j = 0; j < remainingSpiffRows.length; j++) {
            sheet.getRange(remainingSpiffRows[j], 5, 1, 6).clearContent(); // Clear E-J (5-10) only
          }
          
          console.log(`Cleared ${remainingSpiffRows.length} remaining Spiff rows (columns E-J only)`);
        }
      }
    }
    
  } catch (e) {
    console.error("Error writing spiff data with preservation for " + sheet.getName() + ": " + e);
  }
}

/**
 * Processes spiff and bonus data for a technician.
 * Extracts data from spiffBonusSheet for the specified technician and updates their sheet.
 * Skips processing for Class 1 technicians.
 * 
 * @param {Sheet} techSheet The technician's sheet object.
 * @param {string} technicianName The name of the technician being processed.
 * @param {Sheet} spiffBonusSheet The 'Spiff/Bonus' sheet object.
 * @param {boolean} suppressPopup Optional flag to suppress popups, defaults to false.
 * @return {Object} Result object with entryCount and totalAmount properties.
 */
function processSpiffAndBonusData(techSheet, technicianName, spiffBonusSheet, suppressPopup = false) {
  try {
    console.log(`Starting Spiff/Bonus data processing for: ${technicianName}`);
    
    // Check if technician is Class 1 and skip if so
    if (typeof isTechnicianClass1 === 'function') {
      // Don't pass ratesSheet here - let isTechnicianClass1 get it when needed
      if (isTechnicianClass1(technicianName)) {
        console.log(`Skipping Spiff/Bonus processing for Class 1 technician: ${technicianName}`);
        
        if (!suppressPopup) {
          SpreadsheetApp.getUi().alert(`Skipped Spiff/Bonus processing for ${technicianName} (Class 1 technician)`);
        }
        
        // Return empty success result
        return {
          entryCount: 0,
          totalAmount: 0,
          skipped: true,
          reason: "Class 1 technician"
        };
      }
    }
    
    // Get Header Map
    var headerMap = getSpiffBonusHeaderMap(spiffBonusSheet);
    if (!headerMap || !headerMap.soldBy || !headerMap.assignedTechnician || 
        !headerMap.customerName || !headerMap.jobBusinessUnit || 
        !headerMap.completionDate || !headerMap.bonusAmount) {
      console.error("Failed to get valid header map from Spiff/Bonus sheet");
      throw new Error("Could not find expected columns in the Spiff/Bonus sheet");
    }
    
    // Get all data from Spiff/Bonus sheet
    var spiffBonusData = spiffBonusSheet.getDataRange().getValues();
    
    // Collect customer data for the technician
    var customerData = [];
    var totalSpiffAmount = 0;
    var tz = Session.getScriptTimeZone() || 'America/New_York';
    
    // Filter data for rows where 'Sold By' matches or is empty and 'Assigned Tech' includes this technician
    for (var i = 1; i < spiffBonusData.length; i++) {
      var row = spiffBonusData[i];
      var soldBy = row[headerMap.soldBy - 1] || "";
      var assignedTech = row[headerMap.assignedTechnician - 1] || "";
      
      // Check if this row applies to this technician
      var isMatch = false;
      if (soldBy === technicianName && assignedTech.includes(technicianName)) {
        isMatch = true;
      } 
      else if ((soldBy === "" || !soldBy) && assignedTech.includes(technicianName)) {
        isMatch = true;
      }
      
      // Skip if not a match
      if (!isMatch) continue;
      
      // Extract data using the map
      var custName = row[headerMap.customerName - 1] || "";
      var busUnit = row[headerMap.jobBusinessUnit - 1] || "";
      var dateVal = row[headerMap.completionDate - 1] || "";
      var notesVal = row[headerMap.itemName - 1] || ""; // Using item name as notes
      
      // Extract bonus amount (handle different formats)
      var bonusAmountRaw = row[headerMap.bonusAmount - 1];
      var bonusAmt = 0;
      
      if (typeof bonusAmountRaw === 'string' && bonusAmountRaw.includes('$')) {
        bonusAmt = parseFloat(bonusAmountRaw.replace(/[^0-9.-]+/g,''));
      } else {
        bonusAmt = parseFloat(bonusAmountRaw || 0);
      }
      
      // Add to customer data if valid amount
      if (!isNaN(bonusAmt) && bonusAmt > 0) {
        totalSpiffAmount += bonusAmt;
        
        customerData.push({
          customerName: custName,
          jobBusinessUnit: busUnit,
          completionDate: dateVal,
          commission: bonusAmt,
          notes: notesVal
        });
      }
    }
    
    // Find customer data section
    var customerHeaderRow = findSpiffCustomerDataSection(techSheet);
    if (customerHeaderRow <= 0) {
      console.error(`Could not find Customer section in ${technicianName}'s sheet`);
      throw new Error(`No Customer section found in ${technicianName}'s sheet`);
    }
    
    // Clear existing Spiff rows
    var rowsCleared = clearSpiffDataSection(techSheet, customerData);
    console.log(`Cleared ${rowsCleared} existing spiff rows`);
    
    // Update technician's top summary
    updateTopSummarySpiffs(techSheet, totalSpiffAmount, customerData.length);
    
    // Write new Spiff data
    writeSpiffDataToSheet(techSheet, customerHeaderRow, customerData);
    
    console.log(`Successfully processed Spiff/Bonus data for: ${technicianName}`);
    
    return {
      entryCount: customerData.length,
      totalAmount: totalSpiffAmount
    };
    
  } catch (e) {
    console.error(`Error processing Spiff/Bonus data for ${technicianName}: ${e.message}`);
    throw e;
  }
} 