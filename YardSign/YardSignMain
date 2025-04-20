/**
* Payroll System - Yard Sign Main
* Main entry points for yard sign processing.
*/

/**
* Initializes the Yard Sign module.
* This should be called before any other functions in this module.
*/
function initYardSign() {
  // This function ensures that the module is properly initialized
  console.log("Yard Sign module initialized");
  return true;
}

/**
* Sets the status in the Action column of the rates sheet.
* Local version to avoid cross-file reference issues.
* @param {Sheet} ratesSheet The 'Hourly + Spiff Pay' sheet object.
* @param {number} row The 1-based row index.
* @param {number} col The 1-based column index (should be the Action column).
* @param {string} status The status to set (e.g., 'Complete', 'Error', 'Processing...').
*/
function yardSignSetActionStatus(ratesSheet, row, col, status) {
  if (!ratesSheet || !row || !col || !status) {
    console.error("yardSignSetActionStatus: Invalid parameters provided.");
    return;
  }
  
  try {
    // Make sure status is one of the allowed values for the data validation
    var allowedValues = ["Timesheet", "Spiff/Bonus", "Yard Sign", "PBP", "Complete", "Ready", "⚠️ Error"];
    
    // Default to "Ready" if status isn't in the allowed list
    if (allowedValues.indexOf(status) === -1) {
      if (status.startsWith("Error")) {
        status = "⚠️ Error";
      } else if (status.startsWith("Complete")) {
        status = "Complete";
      } else {
        status = "Ready";
      }
    }
    
    // Get the range first, then set the value to avoid validation issues
    var range = ratesSheet.getRange(row, col);
    SpreadsheetApp.flush(); // Force any pending changes to complete
    range.setValue(status);
  } catch (e) {
    console.error(`Failed to set status to '${status}' at row ${row}, col ${col}: ${e.message}`);
    // No need for alternative approach since we've already handled validation
  }
}

/**
* Updates yard sign data for a specific technician.
* This is called from the main onEdit function when "Yard Sign" is selected.
* @param {string} techName - The technician's name.
* @param {number} row - The row in the rates sheet where the action was triggered.
* @param {number} column - The column in the rates sheet where the action was triggered.
* @param {boolean} skipStatusUpdate - Optional flag to skip status updates (for batch processing)
* @param {boolean} suppressPopup - Optional flag to suppress popup notifications
*/
function updateYardSignForTechnician(techName, row, column, skipStatusUpdate, suppressPopup = false) {
  // Initialize the module
  initYardSign();
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
  var ui = SpreadsheetApp.getUi();
  var summaryInfo = []; // Array to collect detailed information for the popup
  
  try {
    // --- Add check for Class 1 technician ---
    var techClass = '';
    var technicianRowInRates = -1; // Store row index found
    try {
      // Find the technician's row and get class from Column C (index 3)
      var ratesData = ratesSheet.getRange(3, 1, ratesSheet.getLastRow() - 2, 3).getValues(); // Get Name (A), Dept (B), Class (C) from row 3 onwards
      for (var i = 0; i < ratesData.length; i++) {
        if (ratesData[i][0] && ratesData[i][0].toString().trim().toLowerCase() === techName.toLowerCase()) {
          technicianRowInRates = i + 3; // Actual row number (1-based)
          techClass = ratesData[i][2] ? ratesData[i][2].toString().trim() : ''; // Get Class from Col C
          break;
        }
      }

      console.log(`Checked class for ${techName} at row ${technicianRowInRates}: Found '${techClass}'`);

      // If Class 1, skip processing
      if (techClass.toLowerCase() === 'class 1') {
          console.log(`Skipping Yard Sign processing for Class 1 technician: ${techName}`);
          
          // Ensure Technician sheet exists before trying to clear/update
          var techSheetCheck = ss.getSheetByName(techName);
          if (techSheetCheck) {
            // Update summary to 0 and clear any existing yard sign entries
            updateTopSummaryYardSign(techSheetCheck, 0, 0);
            clearExistingYardSignEntries(techSheetCheck);
          } else {
             console.warn(`Technician sheet for ${techName} not found. Cannot clear previous entries or update summary.`);
          }
          
          // Set status to indicate skipping
          if (!skipStatusUpdate) {
            // Use a specific status for clarity, or 'Complete' if preferred
            yardSignSetActionStatus(ratesSheet, row, column, 'Skipped (Class 1)'); 
            if (!suppressPopup) {
              ui.alert(`Yard Sign processing skipped for ${techName}.\n\nReason: Technician is Class 1.`);
            }
          }
          
          return; // Exit the function
      }
    } catch (classCheckError) {
        console.error(`Error checking technician class for ${techName}: ${classCheckError.message}. Proceeding with calculation.`);
        // Optionally add error status here if the check fails critically
        // if (!skipStatusUpdate) yardSignSetActionStatus(ratesSheet, row, column, 'Error');
        // return;
    }
    // --- End Class 1 check ---

    // First, set status to "Processing..." using our local function
    if (!skipStatusUpdate) {
      yardSignSetActionStatus(ratesSheet, row, column, 'Processing...');
    }
    
    // Get or create yard sign sheet with proper structure
    var yardSignSheet;
    try {
      yardSignSheet = ensureYardSignSheetExists();
    } catch (sheetError) {
      console.error("Error ensuring Yard Sign sheet exists: " + sheetError.message);
      if (!skipStatusUpdate) {
        yardSignSetActionStatus(ratesSheet, row, column, 'Error');
        if (!suppressPopup) {
          ui.alert("Error: Could not ensure Yard Sign sheet exists. " + sheetError.message);
        }
      }
      return;
    }
    
    // Log the name and existence of the sheet
    console.log("Found Yard Sign sheet: " + yardSignSheet.getName() + 
               " with " + yardSignSheet.getLastRow() + " rows and " + 
               yardSignSheet.getLastColumn() + " columns");
    
    // Get technician's sheet
    var techSheet = ss.getSheetByName(techName);
    if (!techSheet) {
      console.error("Technician sheet not found for: " + techName);
      if (!skipStatusUpdate) {
        yardSignSetActionStatus(ratesSheet, row, column, 'Error');
        if (!suppressPopup) {
          ui.alert("Error: Technician sheet not found for " + techName);
        }
      }
      return;
    }
    
    // --- Check if the technician is an apprentice with 0% commission rate ---
    // Note: This check remains after the Class 1 check. If a tech is Class 1 AND Apprentice 0%, they are skipped by Class 1 rule first.
    var isApprenticeWith0Percent = false;
    try {
      // Find the technician's row in the rates sheet
      var technicianRow = -1;
      var ratesDataApprenticeCheck = ratesSheet.getDataRange().getValues(); // Re-fetch needed data including commission
      
      for (var i = 1; i < ratesDataApprenticeCheck.length; i++) { // Skip header row
        var rowData = ratesDataApprenticeCheck[i];
        var name = rowData[0]; // Column A - Technician name
        
        if (name && name.toString().trim().toLowerCase() === techName.toLowerCase()) {
          technicianRow = i; // This is the index within the data array
          break;
        }
      }
      
      if (technicianRow >= 0) {
        var title = ratesDataApprenticeCheck[technicianRow][2]; // Column C - Position/Class
        var commissionPercentStr = ratesDataApprenticeCheck[technicianRow][7]; // Column H - Commission %
        
        // Parse the commission percentage
        var commissionPercent = 0;
        if (typeof commissionPercentStr === "string" && commissionPercentStr.includes("%")) {
          commissionPercent = parseFloat(commissionPercentStr.replace("%", "")) || 0;
        } else if (typeof commissionPercentStr === "number") {
          commissionPercent = commissionPercentStr < 1 ? commissionPercentStr * 100 : commissionPercentStr;
        }
        
        // Check if it's an apprentice with 0% commission
        if (title && title.toString().toLowerCase().includes("apprentice") && commissionPercent === 0) {
          isApprenticeWith0Percent = true;
          console.log(`Skipping Yard Sign processing for apprentice with 0% commission: ${techName}`);
          
          // Update summary to 0 and clear any existing yard sign entries
          updateTopSummaryYardSign(techSheet, 0, 0);
          clearExistingYardSignEntries(techSheet);
          
          // Set status to Complete (or a specific status if preferred)
          if (!skipStatusUpdate) {
             // Changed status message for clarity
            yardSignSetActionStatus(ratesSheet, row, column, 'Skipped (Apprentice 0%)');
            if (!suppressPopup) {
              ui.alert(`Yard Sign processing skipped for ${techName}.\n\nReason: Apprentice with 0% commission rate. No Yard Sign pay is earned.`);
            }
          }
          
          return; // Exit the function
        }
      }
    } catch (e) {
      console.error(`Error checking apprentice status: ${e.message}`);
      // Continue with processing to be safe
    }
    
    // Calculate yard sign entries for this technician
    // Wrap in try/catch to prevent errors
    var result;
    try {
      // Skip validation here - calculateYardSignEntries will handle missing columns
      result = calculateYardSignEntries(techName, yardSignSheet);
    } catch (calcError) {
      console.error("Error calculating yard sign entries: " + calcError.message);
      if (!skipStatusUpdate) {
        yardSignSetActionStatus(ratesSheet, row, column, 'Error');
        if (!suppressPopup) {
          ui.alert("Error calculating yard sign entries for " + techName + ".\n\n" + calcError.message);
        }
      }
      return;
    }
    
    // If no entries found, show message and clear data
    if (!result || !result.entries || result.entries.length === 0) {
      console.log("No yard sign entries found for: " + techName);
      // Update summary to 0 and clear any existing yard sign entries if none found
      updateTopSummaryYardSign(techSheet, 0, 0);
      clearExistingYardSignEntries(techSheet);
      if (!skipStatusUpdate) {
        yardSignSetActionStatus(ratesSheet, row, column, 'Complete');
        if (!suppressPopup) {
          ui.alert("No yard sign entries found for " + techName + " in the Yard Sign sheet for this period.");
        }
      }
      return; // Exit if no entries
    }
    
    // Write data to technician sheet
    // Wrap in try/catch to prevent errors
    try {
      writeYardSignDataToSheet(techSheet, result.entries, result.totalAmount);
    } catch (writeError) {
      console.error("Error writing yard sign data: " + writeError.message);
      if (!skipStatusUpdate) {
        yardSignSetActionStatus(ratesSheet, row, column, 'Error');
        if (!suppressPopup) {
          ui.alert("Error writing yard sign data: " + writeError.message);
        }
      }
      return;
    }
    
    // Update status
    if (!skipStatusUpdate) {
      yardSignSetActionStatus(ratesSheet, row, column, 'Complete');
    }
    
    console.log("Yard Sign update complete for: " + techName + 
               " - " + result.entries.length + " entries, $" + result.totalAmount.toFixed(2));
    
    // --- Prepare and Show Summary Popup ---
    summaryInfo.push("Yard Sign Update for: " + techName);
    summaryInfo.push("Total Yard Signs: " + result.entries.length);
    // Assuming a fixed rate calculation happens elsewhere or is implied
    summaryInfo.push("Total Amount: $" + result.totalAmount.toFixed(2)); 
    
    summaryInfo.push("\nYARD SIGN DETAILS:");
    
    for (var k = 0; k < result.entries.length; k++) {
      var entry = result.entries[k];
      summaryInfo.push("\nEntry #" + (k+1) + ":");
      summaryInfo.push("• Customer: " + entry.customerName);
      
      // Format date
      var dateDisplay = "";
      if (entry.installDate instanceof Date) {
        dateDisplay = Utilities.formatDate(entry.installDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
      } else {
        dateDisplay = entry.installDate || "N/A";
      }
      
      summaryInfo.push("• Date: " + dateDisplay);
      summaryInfo.push("• Job #: " + entry.location); // Assuming location maps to Job #
      summaryInfo.push("• Business Unit: " + (entry.businessUnit || "N/A"));
      summaryInfo.push("• Amount: $" + entry.amount.toFixed(2)); // Use actual amount from entry
    }
    
    if (!suppressPopup) {
      ui.alert(summaryInfo.join("\n"));
    }
    
  } catch (e) {
    console.error("Error in updateYardSignForTechnician for " + techName + ": " + e.message + " Stack: " + e.stack);
    if (!skipStatusUpdate) {
      try {
        yardSignSetActionStatus(ratesSheet, row, column, 'Error');
      } catch (statusError) {
        console.error("Failed to set error status after main try-catch failure.");
      }
      if (!suppressPopup) {
         ui.alert("An unexpected error occurred during Yard Sign processing for " + techName + ": " + e.message);
      }
    }
  }
}

/**
* Processes yard signs for all technicians with existing sheets
* No approval required, no "Sheet not found" errors
*/
function processAllYardSigns() {
  initYardSign(); // Ensure initialization
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
  var ui = SpreadsheetApp.getUi();
  var processedCount = 0;
  var skippedCount = 0;
  var errorCount = 0;
  var skippedTechs = []; // Store names of skipped technicians

  if (!ratesSheet) {
    ui.alert('Error: Hourly + Spiff Pay sheet not found.');
    return;
  }

  // Get technician names and classes from the rates sheet (Columns A and C)
  // Assuming data starts from row 3
  var startRow = 3; 
  var lastRow = ratesSheet.getLastRow();
  if (lastRow < startRow) {
    ui.alert("No technician data found in 'Hourly + Spiff Pay' sheet (starting row 3).");
    return;
  }
  // Get columns A (Name), B (Dept - maybe needed later?), C (Class)
  var range = ratesSheet.getRange(startRow, 1, lastRow - startRow + 1, 3); 
  var data = range.getValues();

  // Use a sidebar or toast for progress instead of modal dialog if possible
  // ui.showSidebar(...) or SpreadsheetApp.getActiveSpreadsheet().toast(...)
  // For simplicity, using modal dialog as before:
  ui.showModalDialog(HtmlService.createHtmlOutput('<p>Processing all Yard Signs... Please wait.</p>'), 'Processing');

  for (var i = 0; i < data.length; i++) {
    var techName = data[i][0];
    // Get Class from Column C (index 2 in the zero-based data array)
    var techClass = data[i][2] ? data[i][2].toString().trim() : ''; 
    var currentRow = startRow + i; // Actual row number for logging

    // Skip empty rows
    if (!techName || techName.toString().trim() === '') {
      continue;
    }

    // Check if technician is Class 1
    if (techClass.toLowerCase() === 'class 1') {
        console.log(`Skipping Yard Sign processing for Class 1 technician: ${techName} (Row ${currentRow})`);
        skippedCount++;
        skippedTechs.push(`${techName} (Class 1)`);
        
        // Ensure tech sheet exists before clearing/updating
        var techSheetCheck = ss.getSheetByName(techName);
        if (techSheetCheck) {
            try {
              // Clear previous entries and set summary to 0
              updateTopSummaryYardSign(techSheetCheck, 0, 0);
              clearExistingYardSignEntries(techSheetCheck);
            } catch (clearError) {
               console.error(`Error clearing data for skipped Class 1 tech ${techName}: ${clearError.message}`);
               // Don't increment error count here, just log it.
            }
        } else {
            console.warn(`Technician sheet for skipped Class 1 tech ${techName} not found. Cannot clear previous entries.`);
        }
        continue; // Move to the next technician
    }

    // Check if technician sheet exists before processing (redundant check if updateYardSign handles it, but safe)
    var techSheet = ss.getSheetByName(techName);
    if (!techSheet) {
      console.warn(`Skipping Yard Sign for ${techName}: Technician sheet not found.`);
      skippedCount++;
      skippedTechs.push(`${techName} (No Sheet)`);
      continue; // Skip to next technician
    }

    try {
      // Call the individual processing function
      // Pass null for row/column as they aren't relevant for status updates here
      // Pass true for skipStatusUpdate and suppressPopup
      console.log(`Processing Yard Signs for: ${techName} (Row ${currentRow})`);
      // The called function will now handle apprentice checks internally as well
      updateYardSignForTechnician(techName, null, null, true, true); 
      processedCount++;
    } catch (e) {
      console.error(`Error processing Yard Signs for ${techName}: ${e.message}`);
      errorCount++;
      // Optionally: Log error without stopping the loop for other techs
      skippedTechs.push(`${techName} (Error: ${e.message.substring(0, 50)})`); // Add to skipped list with error note
    }
    
    // Add a small delay and flush to prevent timeouts on large lists
    Utilities.sleep(50); // Reduced delay slightly
    SpreadsheetApp.flush(); 
  }
  
  // Close the modal dialog - usually happens automatically
  // Example: DriveApp.getApp().close(); // Incorrect, just letting script end handle it.

  // Display summary message
  var summaryMessage = `Yard Sign Processing Complete.\n\n` +
                       `Processed: ${processedCount}\n` +
                       `Skipped: ${skippedCount}\n` +
                       `Errors: ${errorCount}`;
                       
  if (skippedTechs.length > 0) {
     // Limit the number of names shown in the alert if the list is very long
     const maxSkippedToShow = 15;
     let skippedDisplayList = skippedTechs;
     if (skippedTechs.length > maxSkippedToShow) {
        skippedDisplayList = skippedTechs.slice(0, maxSkippedToShow);
        skippedDisplayList.push(`... and ${skippedTechs.length - maxSkippedToShow} more`);
     }
     // Correctly format the skipped list joining
     summaryMessage += "\n\nSkipped/Error Technicians:\n - "; // Add separator
     summaryMessage += skippedDisplayList.join('\n - '); // Join the list items
     summaryMessage += "\n(Check Logs for full details if list is long)"; // Add final note
  }

  ui.alert(summaryMessage);
} 