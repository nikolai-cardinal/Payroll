/**
* Payroll System - PBP Main Coordinator
* Contains the main entry point for PBP updates, coordinates calls
* to calculation and sheet operations, and handles status reporting.
*/

/**
* Returns a standard mapping object for columns in the 'Main' sheet relevant to PBP.
*
* @return {Object} An object with keys for common fields (nameColumn, positionColumn, etc.)
*                  and values representing their 1-based column index and the data start row.
*/
function _getRatesSheetMappingPBP() {
  // These indices correspond to the columns in the Modules.Constants.SHEET.MAIN sheet
  // TODO: Consider moving these index numbers to Constants.gs if they are stable and reused elsewhere
  return {
    nameColumn: 1,       // Column A: Technician Name
    positionColumn: 3,   // Column C: Position (Used for Class 1 check)
    actionColumn: 7,     // Column G: Action Dropdown (Assuming this remains the PBP trigger column)
    dataStartRow: 3      // Row number where the actual technician data begins
  };
}


/**
* Updates PBP for a specific technician when Action is set to PBP.
* This is the main entry point called from the module index or triggers.
* @param {string} technicianName - The name of the technician to update.
* @param {number} actionRow - The row in the Main sheet where the action was triggered.
* @param {number} actionColumn - The column in the Main sheet where the action was triggered.
* @param {Object} [options={}] Optional configuration object.
* @param {boolean} [options.skipStatusUpdate=false] - Flag to skip status updates (for batch processing).
* @param {boolean} [options.suppressPopup=false] - Flag to suppress popup notifications.
* @return {object|null} Result object with entryCount and totalAmount if successful, null otherwise.
*/
function pbpMain_updatePBPForTechnician(technicianName, actionRow, actionColumn, options = {}) {
  const { skipStatusUpdate = false, suppressPopup = false } = options;
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let techSheet;
  let ratesSheet;
  let spiffBonusSheet;
  const summaryInfo = []; // Array to collect detailed information for the popup

  try {
    // --- 1. Setup and Sheet Validation ---
    ratesSheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN); // Use Constant
    spiffBonusSheet = ss.getSheetByName(Modules.Constants.SHEET.SPIFF); // Use Constant
    techSheet = ss.getSheetByName(technicianName);

    if (!ratesSheet) throw new Error(`Required sheet not found: ${Modules.Constants.SHEET.MAIN}`);
    if (!spiffBonusSheet) throw new Error(`Required sheet not found: ${Modules.Constants.SHEET.SPIFF}`);
    if (!techSheet) throw new Error(`Required sheet not found for Technician: ${technicianName}`);

    // Set status to Processing if not skipping status updates
    if (!skipStatusUpdate && actionRow && actionColumn) {
      Modules.Shared.SheetUtils.setActionStatus(ratesSheet, actionRow, actionColumn, "Processing..."); // Use Shared Util
    }

    // --- Check if the technician is Class 1 and skip if so ---
    try {
      const ratesMapping = _getRatesSheetMappingPBP(); // Use local mapping getter
      const ratesDataForCheck = ratesSheet.getRange(
        ratesMapping.dataStartRow,
        ratesMapping.nameColumn,
        ratesSheet.getLastRow() - ratesMapping.dataStartRow + 1,
        ratesMapping.positionColumn // Read up to the position column
      ).getValues();

      let technicianRowData = null;
      for (let i = 0; i < ratesDataForCheck.length; i++) {
        // Check name in nameColumn (index 0 in the slice)
        if (ratesDataForCheck[i][0] && ratesDataForCheck[i][0].toString().trim().toLowerCase() === technicianName.toLowerCase()) {
          // Get position from positionColumn (index 2 in the slice, since name is 0, B is 1, C is 2)
          technicianRowData = { name: ratesDataForCheck[i][0], position: ratesDataForCheck[i][ratesMapping.positionColumn - ratesMapping.nameColumn] };
          break;
        }
      }


      if (technicianRowData) {
        const title = technicianRowData.position;
        // Assuming getTechnicianClassAndRole is in PBPCalculation
        const techInfo = Modules.PBP.Calculation.getTechnicianClassAndRole(title);

        if (techInfo.class === 1) {
          console.log(`Skipping PBP processing for Class 1 technician: ${technicianName}`);

          // Update summary to 0 and clear section
          Modules.PBP.SheetOperations.updateTopSummaryInstallPay(techSheet, 0, 0);
          Modules.PBP.SheetOperations.clearInstallDataSection(techSheet);

          // Set status to Complete if not skipping status updates
          if (!skipStatusUpdate && actionRow && actionColumn) {
            Modules.Shared.SheetUtils.setActionStatus(ratesSheet, actionRow, actionColumn, "Complete");
          }

          // Show popup with info about skipping
          if (!suppressPopup) {
            ui.alert(`PBP processing skipped for ${technicianName}.\n\nReason: Class 1 technicians are not eligible for PBP.`);
          }
          return { entryCount: 0, totalAmount: 0 }; // Exit the function early, return standard object
        }
      } else {
         console.warn(`Could not find technician ${technicianName} in rates sheet for Class 1 check.`);
      }
    } catch (e) {
      console.error(`Error checking Class 1 status: ${e.message} ${e.stack}`);
      // Continue with processing to be safe, but log the error
    }
    // --- End Class 1 Check ---

    // Get Data for lookups - Fetch ONCE for efficiency
    const spiffBonusData = spiffBonusSheet.getDataRange().getValues();
    const ratesData = ratesSheet.getDataRange().getValues(); // Used for default splits

    // --- 2. Perform Calculations (Delegate to PBPCalculation.gs) ---
    console.log("Starting PBP calculation for: " + technicianName);
    // Assuming calculatePbpEntries is in PBPCalculation
    const calculationResult = Modules.PBP.Calculation.calculatePbpEntries(technicianName, spiffBonusData, ratesData);

    const allPbpEntries = calculationResult.entries;
    const totalTechnicianShare = calculationResult.totalShare;
    console.log("Calculation complete. Entries found: " + allPbpEntries.length + ", Total Share: $" + totalTechnicianShare.toFixed(2));

    // --- 3. Handle No Entries Found ---
    if (allPbpEntries.length === 0) {
      const techExists = ratesData.some(rateRow =>
           rateRow[0] && rateRow[0].toString().trim().toLowerCase() === technicianName.trim().toLowerCase()
      );
      if (techExists) {
         if (!suppressPopup) {
           ui.alert("No PBP entries found for " + technicianName + " in the Spiff/Bonus tab for this period.");
         }
         // Update summary to 0 and clear section
         Modules.PBP.SheetOperations.updateTopSummaryInstallPay(techSheet, 0, 0);
         Modules.PBP.SheetOperations.clearInstallDataSection(techSheet);
         if (!skipStatusUpdate && actionRow && actionColumn) {
            Modules.Shared.SheetUtils.setActionStatus(ratesSheet, actionRow, actionColumn, "Complete"); // Mark as complete even if 0 entries
         }
      } else {
         if (!suppressPopup) {
           ui.alert("Technician " + technicianName + ` not found in ${Modules.Constants.SHEET.MAIN} tab.`); // Use Constant
         }
         if (!skipStatusUpdate && actionRow && actionColumn) {
            Modules.Shared.SheetUtils.setActionStatus(ratesSheet, actionRow, actionColumn, "⚠️ Error");
         }
      }
      return { entryCount: 0, totalAmount: 0 }; // Return standard object
    }

    // --- 4. Update Technician Sheet (Delegate to PBPSheetOperations.gs) ---
    console.log("Starting sheet update for: " + technicianName);
    // Assuming writePbpDataToSheet is in PBPSheetOperations
    Modules.PBP.SheetOperations.writePbpDataToSheet(techSheet, allPbpEntries, totalTechnicianShare);
    console.log("Sheet update finished for: " + technicianName);

    // --- 5. Prepare and Show Summary Popup ---
    if (!suppressPopup) {
        summaryInfo.push("PBP Update for: " + technicianName);
        // Add apprentice information if applicable
        const isApprentice = allPbpEntries.length > 0 && allPbpEntries[0].isApprentice;
        if (isApprentice) {
        const apprenticePercentage = allPbpEntries[0].apprenticePercentage;
        summaryInfo.push("Apprentice Technician (Tracked at " + apprenticePercentage + "%)");
        }
        summaryInfo.push("Total Calculated PBP Share: $" + totalTechnicianShare.toFixed(2));
        summaryInfo.push("Number of PBP Entries Processed: " + allPbpEntries.length);
        summaryInfo.push("\nPBP DETAILS:");

        // Build detailed summary string
        for (let k = 0; k < allPbpEntries.length; k++) {
            const entry = allPbpEntries[k];
            summaryInfo.push("\nEntry #" + (k+1) + ":");
            summaryInfo.push("• Customer: " + entry.customerName);
            // Assuming formatDate is in Shared.DateUtils
            summaryInfo.push("• Date: " + Modules.Shared.DateUtils.formatDate(entry.completionDate));
            summaryInfo.push("• Item: " + entry.itemName);
            summaryInfo.push("• Job Total PBP: $" + entry.totalPbp.toFixed(2));
            summaryInfo.push("• Tech Role (Job): " + entry.roleForJob + " (" + entry.splitPercentage.toFixed(1) + "%)");
            summaryInfo.push("• Calculated Tech Share: $" + entry.technicianShare.toFixed(2));

            if (entry.teamDetails) {
                summaryInfo.push("• Team Split Details: " + entry.teamDetails);
            } else {
                summaryInfo.push("• Split Team: Details unavailable");
            }
        }
        ui.alert(summaryInfo.join("\n"));
    }

    // --- 6. Final Status Update ---
    if (!skipStatusUpdate && actionRow && actionColumn) {
      Modules.Shared.SheetUtils.setActionStatus(ratesSheet, actionRow, actionColumn, "Complete");
    }

    // --- 7. Return Result ---
    return { entryCount: allPbpEntries.length, totalAmount: totalTechnicianShare };

  } catch (error) {
    console.error("Error updating PBP for " + technicianName + ": " + error.message + " Stack: " + error.stack);
    const errorMsg = "Error updating PBP: " + error.toString();
    if (!suppressPopup) {
      ui.alert(errorMsg);
    }
    // Attempt to set error status
    try {
      const sheetForError = ratesSheet || ss.getActiveSheet(); // Fallback
      if (!skipStatusUpdate && actionRow && actionColumn && sheetForError) {
         Modules.Shared.SheetUtils.setActionStatus(sheetForError, actionRow, actionColumn, "⚠️ Error");
      }
    } catch (e) {
      console.error("Failed to set error status: " + e.message);
    }
    return null; // Indicate failure
  }
}

/**
* Processes PBP for all technicians listed in the Main sheet.
* Called from the Technician Tools menu or the module index.
*/
function pbpMain_processAllPBP() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ratesSheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN); // Use Constant
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0; // Count sheets skipped because they don't exist
  let class1SkippedCount = 0; // Count Class 1 skips
  const techniciansProcessed = [];
  const errors = [];
  let totalAmount = 0;

  if (!ratesSheet) {
    ui.alert(`Error: Could not find '${Modules.Constants.SHEET.MAIN}' sheet.`); // Use Constant
    return;
  }

  // Use local mapping
  const ratesMapping = _getRatesSheetMappingPBP();

  // Get all sheet names to check for existence efficiently
  const allSheetNames = ss.getSheets().map(sheet => sheet.getName());
  const sheetNameSet = new Set(allSheetNames); // Use Set for faster lookups

  // Get all technicians from Main sheet
  const dataRange = ratesSheet.getRange(ratesMapping.dataStartRow, ratesMapping.nameColumn, ratesSheet.getLastRow() - ratesMapping.dataStartRow + 1, 1);
  const data = dataRange.getValues();

  // Process each technician
  for (let i = 0; i < data.length; i++) {
    const techName = data[i][0]; // Technician name

    // Skip empty rows or rows with no technician name
    if (!techName || typeof techName !== 'string' || techName.trim() === '') {
      continue;
    }
    const trimmedTechName = techName.trim();

    // Check if the technician has a sheet using the Set
    if (!sheetNameSet.has(trimmedTechName)) {
      console.log(`Skipping ${trimmedTechName} - no sheet exists`);
      skippedCount++;
      continue;
    }

    // Calculate row index in the rates sheet (needed if we were setting status per row)
    // const actualRow = i + ratesMapping.dataStartRow;

    try {
      // Call the single, refactored update function with options
      const result = pbpMain_updatePBPForTechnician(trimmedTechName, null, null, { // Pass null for row/col as they aren't relevant here
        skipStatusUpdate: true,
        suppressPopup: true
      });

      // Check the result
      if (result !== null) {
         // Check if it was a Class 1 skip (indicated by amount 0 and count 0, but not an error)
         const isClass1Skip = result.entryCount === 0 && result.totalAmount === 0 &&
            // Add a check here based on Class 1 logic if possible,
            // otherwise, assume 0/0 might be a skip.
            // We might need pbpMain_updatePBPForTechnician to return an explicit skip flag.
            // For now, we can't definitively distinguish 0 entries from a Class 1 skip without more info.
            // Let's assume for now it processed successfully, even if with 0 result.
             true; // Placeholder - Assume success if no error thrown

         if (isClass1Skip) {
            // This distinction isn't perfectly reliable with current return value.
            // Needs improvement if accurate Class 1 skip count is vital.
            // class1SkippedCount++;
            console.log(`Technician ${trimmedTechName} processed (likely Class 1 or no entries).`);
            // We still count it as processed, just with 0 amount/entries.
         }

         // Record success and track amount
         successCount++;
         techniciansProcessed.push({
            name: trimmedTechName,
            count: result.entryCount || 0,
            amount: result.totalAmount || 0
         });
         totalAmount += (result.totalAmount || 0);

      } else {
        // The function returned null, indicating an error occurred and was caught internally
        console.error(`Error processing PBP for ${trimmedTechName} (handled within update function).`);
        errorCount++;
        errors.push(`${trimmedTechName}: Processing error (see logs)`);
      }

    } catch (error) {
      // Catch errors thrown *up* from pbpMain_updatePBPForTechnician (should be rare if it handles its own)
      console.error(`Unhandled error processing PBP for ${trimmedTechName}: ${error.message} ${error.stack}`);
      errorCount++;
      errors.push(`${trimmedTechName}: ${error.message}`);
    }
  }

  // Build pretty summary message
  const summaryMessage = ["PBP BATCH PROCESSING COMPLETE"];
  summaryMessage.push("\nSUMMARY:");
  summaryMessage.push(`• Technicians Processed Successfully: ${successCount}`);
  summaryMessage.push(`• Technicians Skipped (No Sheet): ${skippedCount}`);
  // summaryMessage.push(`• Technicians Skipped (Class 1): ${class1SkippedCount}`); // Optional, if tracking improves
  summaryMessage.push(`• Technicians with Errors: ${errorCount}`);
  summaryMessage.push(`• Total PBP Amount Calculated: $${totalAmount.toFixed(2)}`);

  // Add technician details section if we have any successful non-zero results
  const successfulEntries = techniciansProcessed.filter(t => t.count > 0);
  if (successfulEntries.length > 0) {
    summaryMessage.push("\nDETAILS BY TECHNICIAN (with entries):");
    successfulEntries.forEach(tech => {
        summaryMessage.push(`\n  ${tech.name}:`);
        summaryMessage.push(`  • Entries: ${tech.count}`);
        summaryMessage.push(`  • Amount: $${tech.amount.toFixed(2)}`);
    });
  }

  // Add errors section if any
  if (errors.length > 0) {
    summaryMessage.push("\nERRORS ENCOUNTERED:");
    errors.forEach(err => summaryMessage.push(`• ${err}`));
  }

  // Show the popup
  ui.alert(summaryMessage.join("\n"));
}


// REMOVED Global Exports:
// var updatePBPForTechnician = pbpMain_updatePBPForTechnician;
// var processAllPBP = pbpMain_processAllPBP;

// REMOVED Function: updatePBPForTechnicianAll (logic merged into pbpMain_processAllPBP and pbpMain_updatePBPForTechnician) 