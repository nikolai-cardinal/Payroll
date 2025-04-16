/**
 * Main entry point for the All Lead Set functionality.
 * Adds menu items and handles menu interactions.
 */

/**
 * Initializes the Lead Set module.
 * Called when the spreadsheet is opened.
 */
function initLeadSet() {
  // Set up any necessary configurations
  PropertiesService.getScriptProperties().setProperty('LEAD_SET_VERSION', '1.0.0');
}

/**
 * Adds the All Lead Set menu item to the Technician Tools > Payroll menu.
 * @param {UI.Menu} menu - The menu to add the item to.
 * @return {UI.Menu} The updated menu with the Lead Set item added.
 */
function addLeadSetMenuItem(menu) {
  return menu.addItem('All Lead Set', 'menuProcessAllLeadSet');
}

/**
 * Menu entry point for processing all lead sets.
 * Triggered when the user selects All Lead Set from the menu.
 */
function menuProcessAllLeadSet() {
  handleErrorsWithUI(() => {
    processAllLeadSet();
  }, "Processing Lead Sets");
}

/**
 * Main entry point for processing all lead sets.
 * Handles the batch processing of lead sets for all technicians.
 */
function processAllLeadSet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  if (!getUserConfirmation(ui)) return;
  
  const leadSetSheet = findLeadSetSheet(ss);
  if (!leadSetSheet) {
    ui.alert('Error', 'Lead Set sheet not found. Please create one first.', ui.ButtonSet.OK);
    return;
  }
  
  updateStatus("Processing lead sets...");
  const result = processLeadData(ss, leadSetSheet);
  updateStatus("Lead set processing complete");
  
  displayProcessingResults(ui, result);
}

/**
 * Gets user confirmation before processing lead sets.
 * @param {SpreadsheetApp.Ui} ui - The UI instance.
 * @return {boolean} True if user confirmed, false otherwise.
 */
function getUserConfirmation(ui) {
  const response = ui.alert(
    'Process All Lead Sets',
    'This will process lead payments for all technicians. Continue?',
    ui.ButtonSet.YES_NO
  );
  return response === ui.Button.YES;
}

/**
 * Displays the results of lead set processing.
 * @param {SpreadsheetApp.Ui} ui - The UI instance.
 * @param {Object} result - The processing results.
 */
function displayProcessingResults(ui, result) {
  const formattedTotal = typeof formatCurrency === 'function' 
    ? formatCurrency(result.totalCommission) 
    : '$' + result.totalCommission.toFixed(2);
  
  ui.alert(
    'Lead Set Processing Complete',
    `Successfully processed ${result.technicians} technicians with ${result.leads} total leads.\n\n` +
    `Total commission: ${formattedTotal}\n\n` +
    `${result.errors > 0 ? 'Errors encountered: ' + result.errors : ''}`,
    ui.ButtonSet.OK
  );
}

/**
 * Processes lead data for all technicians.
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @return {Object} Object containing count of technicians and leads processed.
 */
function processLeadData(ss, leadSetSheet) {
  const techSheets = getTechnicianSheets(ss);
  let results = {
    technicians: 0,
    leads: 0,
    errors: 0,
    totalCommission: 0
  };
  
  for (const techName of techSheets) {
    updateStatus(`Processing ${techName}...`);
    const techResult = updateLeadSetForTechnician(techName);
    
    if (techResult.success) {
      results.technicians++;
      results.leads += techResult.leadsProcessed || 0;
      results.totalCommission += techResult.totalCommission || 0;
    } else {
      results.errors++;
      Logger.log(`Error processing ${techName}: ${techResult.error || 'Unknown error'}`);
    }
  }
  
  return results;
}

/**
 * Main function to update the Lead Set data for a technician
 * @param {String} technicianName - The name of the technician
 * @param {Object} options - Optional parameters
 * @return {Object} Status of the operation
 */
function updateLeadSetForTechnician(technicianName, options = {}) {
  console.log(`Starting updateLeadSetForTechnician for ${technicianName}`);
  
  if (!technicianName) {
    return { success: false, message: "No technician name provided" };
  }
  
  try {
    // Open the Lead Set sheet
    const leadSetSheet = openLeadSetSheet();
    if (!leadSetSheet) {
      return { success: false, message: "Failed to open Lead Set sheet" };
    }
    
    // Get the technician's sheet
    const techSheet = getTechnicianSheet(technicianName);
    if (!techSheet) {
      return { success: false, message: `Could not find sheet for technician: ${technicianName}` };
    }
    
    // Initialize date range if provided
    let dateRange = null;
    if (options.startDate && options.endDate) {
      dateRange = {
        startDate: new Date(options.startDate),
        endDate: new Date(options.endDate)
      };
    }
    
    // Get lead data for this technician
    const leadData = getLeadDataForTechnician(leadSetSheet, technicianName, dateRange);
    
    if (!leadData || leadData.length === 0) {
      return { 
        success: true, 
        message: `No lead data found for ${technicianName}`,
        leadsProcessed: 0,
        totalCommission: 0 
      };
    }
    
    console.log(`Found ${leadData.length} leads for ${technicianName}`);
    
    // First, clear any existing lead entries
    const existingLeadRows = findExistingLeadSetRows(techSheet);
    console.log(`Found ${existingLeadRows.length} existing lead entries to clear`);
    
    // IMPORTANT: Ensure we clear existing lead entries before adding new ones
    clearExistingLeadEntries(techSheet, existingLeadRows);
    
    // Give the sheet a moment to process the clearing operation
    Utilities.sleep(500);
    
    // Update the technician's sheet with lead data
    const result = updateTechnicianSheet(techSheet, leadData);
    
    // Success message with additional details
    const successMessage = `Successfully processed ${result.leadsProcessed} leads for ${technicianName}. Total commission: $${result.totalCommission.toFixed(2)}`;
    
    // Show a summary alert with the results
    SpreadsheetApp.getActiveSpreadsheet().toast(
      successMessage,
      "Lead Set Update Complete",
      30
    );
    
    return {
      success: true,
      message: successMessage,
      leadsProcessed: result.leadsProcessed,
      totalCommission: result.totalCommission
    };
    
  } catch (error) {
    console.error(`Error in updateLeadSetForTechnician: ${error.message}`);
    console.error(error.stack);
    
    return {
      success: false,
      message: `Error updating lead set: ${error.message}`,
      error: error.toString()
    };
  }
}

/**
 * Update a technician's sheet with lead data
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet
 * @param {Array} leadData - Array of lead data objects
 * @return {Object} Results of the operation
 */
function updateTechnicianSheet(techSheet, leadData) {
  if (!techSheet || !leadData) {
    return { leadsProcessed: 0, totalCommission: 0 };
  }
  
  // Calculate the first empty row after the existing content
  const lastRow = Math.max(15, techSheet.getLastRow() + 1);
  let currentRow = lastRow;
  let totalCommission = 0;
  let leadsProcessed = 0;
  
  // Process each lead
  leadData.forEach(lead => {
    if (!lead.customer || !lead.revenue) {
      console.log("Skipping lead with missing customer or revenue data");
      return; // Skip this iteration
    }
    
    // Format the completion date
    let formattedDate = '';
    if (lead.completionDate) {
      if (lead.completionDate instanceof Date) {
        formattedDate = Utilities.formatDate(lead.completionDate, 
          Session.getScriptTimeZone(), 'MM/dd/yyyy');
      } else {
        // Try to parse the date
        try {
          const parsedDate = new Date(lead.completionDate);
          formattedDate = Utilities.formatDate(parsedDate, 
            Session.getScriptTimeZone(), 'MM/dd/yyyy');
        } catch (e) {
          formattedDate = String(lead.completionDate);
        }
      }
    }
    
    // Calculate lead commission (assuming 3% of revenue)
    const commission = lead.revenue * 0.03;
    totalCommission += commission;
    
    // Write data to sheet
    // E (5): Date
    techSheet.getRange(currentRow, 5).setValue(formattedDate);
    
    // F (6): Customer Name
    techSheet.getRange(currentRow, 6).setValue(lead.customer);
    
    // G (7): Business Unit 
    techSheet.getRange(currentRow, 7).setValue(lead.businessUnit || '');
    
    // H (8): Revenue
    techSheet.getRange(currentRow, 8).setValue(lead.revenue);
    
    // I (9): Commission amount
    techSheet.getRange(currentRow, 9).setValue(commission);
    
    // J (10): "L-E-A-D" marker
    techSheet.getRange(currentRow, 10).setValue("L-E-A-D");
    
    currentRow++;
    leadsProcessed++;
  });
  
  // If we processed any leads, format the cells
  if (leadsProcessed > 0) {
    // Format the revenue and commission columns as currency
    techSheet.getRange(lastRow, 8, leadsProcessed, 1).setNumberFormat("$#,##0.00");
    techSheet.getRange(lastRow, 9, leadsProcessed, 1).setNumberFormat("$#,##0.00");
  }
  
  return { leadsProcessed, totalCommission };
}

/**
 * Updates the action status cell in the Hourly + Spiff Pay sheet.
 * @param {Number} row - The row number.
 * @param {Number} col - The column number.
 * @param {String} status - The status message.
 */
function updateActionStatus(row, col, status) {
  if (!row || !col) return;
  
  const ratesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hourly + Spiff Pay');
  if (ratesSheet) {
    ratesSheet.getRange(row, col).setValue(status);
  }
}

/**
 * Gets and verifies the technician sheet exists.
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {String} technicianName - The name of the technician.
 * @return {SpreadsheetApp.Sheet|null} The technician sheet or null if not found.
 */
function getTechnicianSheet(ss, technicianName) {
  return ss.getSheetByName(technicianName);
}

/**
 * Gets and verifies the Lead Set sheet.
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - Optional existing Lead Set sheet.
 * @return {SpreadsheetApp.Sheet|null} The verified Lead Set sheet or null if invalid.
 */
function getVerifiedLeadSetSheet(ss, leadSetSheet) {
  if (!leadSetSheet) {
    leadSetSheet = findLeadSetSheet(ss);
  }
  return leadSetSheet;
}

/**
 * Processes leads for a specific technician.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {String} technicianName - The name of the technician.
 * @return {Object} Processing results.
 */
function processLeadsForTechnician(leadSetSheet, techSheet, technicianName) {
  const leadsData = getLeadDataForTechnician(leadSetSheet, technicianName);
  
  if (!leadsData || leadsData.length === 0) {
    return { success: true, leadsProcessed: 0, totalCommission: 0 };
  }
  
  let totalCommission = 0;
  const formattedLeads = [];
  
  for (const lead of leadsData) {
    const commissionData = calculateCommission(lead.revenue);
    totalCommission += commissionData.amount;
    
    formattedLeads.push({
      customerName: lead.customer,
      businessUnit: lead.businessUnit,
      completionDate: lead.completionDate,
      commissionAmount: commissionData.amount,
      notes: commissionData.note,
      leadMarker: "L-E-A-D"
    });
  }
  
  updateTechnicianSheet(techSheet, formattedLeads);
  updateLeadSummary(techSheet, formattedLeads.length, totalCommission);
  
  return { 
    success: true, 
    leadsProcessed: formattedLeads.length, 
    totalCommission: totalCommission 
  };
}

/**
 * Calculates commission for a lead based on revenue.
 * @param {Number} revenue - The lead revenue amount.
 * @return {Object} The calculated commission amount and note.
 */
function calculateCommission(revenue) {
  let amount = 0;
  let percentage = 0;
  let note = '';
  
  if (typeof calculateLeadCommission === 'function') {
    const calculated = calculateLeadCommission(revenue);
    amount = calculated.amount;
    percentage = calculated.percentage;
    note = `${percentage}% of $${revenue}`;
  } else {
    // Fallback calculation
    amount = revenue * 0.05; // 5% as default
    note = `5% of $${revenue}`;
  }
  
  return { amount, note, percentage };
}

/**
 * Updates the lead summary information in the technician sheet.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @param {Number} leadCount - The count of leads processed.
 * @param {Number} totalCommission - The total commission amount.
 */
function updateLeadSummary(techSheet, leadCount, totalCommission) {
  // Batch update lead count and total commission
  const ranges = [
    techSheet.getRange(14, 2), // Lead count
    techSheet.getRange(13, 3)  // Total commission
  ];
  
  const values = [
    [leadCount],
    [totalCommission]
  ];
  
  for (let i = 0; i < ranges.length; i++) {
    ranges[i].setValue(values[i][0]);
  }
  
  // Format the commission amount
  ranges[1].setNumberFormat('$#,##0.00');
}

/**
 * Updates the status display for the user.
 * @param {String} message - The status message to display.
 */
function updateStatus(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, "Lead Set Status");
}

/**
 * Error handling wrapper for UI functions.
 * @param {Function} fn - The function to execute.
 * @param {String} context - The context of the operation for error reporting.
 */
function handleErrorsWithUI(fn, context) {
  try {
    return fn();
  } catch (error) {
    Logger.log(`Error in ${context}: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
    SpreadsheetApp.getUi().alert(
      'Error',
      `An error occurred while ${context.toLowerCase()}: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return null;
  }
}

/**
 * Checks if a sheet is a technician sheet.
 * @param {String} sheetName - The name of the sheet.
 * @return {Boolean} True if it's a technician sheet, false otherwise.
 */
function isTechnicianSheet(sheetName) {
  // Exclude system sheets and known non-technician sheets
  const nonTechSheets = ['Setup', 'Summary', 'Lead Set', 'Config', 'Instructions'];
  return !nonTechSheets.includes(sheetName) && !sheetName.startsWith('_');
}

/**
 * Handles "LEAD" entries detected in column J of technician sheets.
 * This function is called from the Main onEdit function when LEAD text is found in column J.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The sheet where the edit occurred.
 * @param {Number} row - The row number (1-based) where the edit occurred.
 * @param {String} sheetName - The name of the sheet (technician name).
 */
function handleLeadEntryInColumnJ(sheet, row, sheetName) {
  try {
    // Validate inputs
    if (!sheet || !row || !sheetName) {
      Logger.log("Invalid parameters for handleLeadEntryInColumnJ");
      return;
    }
    
    // Verify this is a technician sheet
    if (!isTechnicianSheet(sheetName)) {
      return; // Not a technician sheet, ignore
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Find Lead Set sheet
    const leadSetSheet = findLeadSetSheet(ss);
    if (!leadSetSheet) {
      Logger.log("Lead Set sheet not found when processing lead entry in column J");
      return;
    }
    
    // Get lead data for this technician
    const leadData = getLeadDataForTechnician(leadSetSheet, sheetName);
    
    // If we have lead data, update row E-J with the lead information
    if (leadData && leadData.length > 0) {
      // Find the specific lead for this row based on available data
      // This is a simplified approach - in a real implementation, 
      // you might want to match based on more criteria
      let leadItem = leadData[0]; // Default to first lead if no better match
      
      // Try to find a better match if possible (e.g., based on existing data in the row)
      const existingCustomer = sheet.getRange(row, 5).getValue();
      if (existingCustomer) {
        // Look for a lead that matches the customer name
        const matchingLead = leadData.find(lead => 
          lead.customer && lead.customer.toString().toLowerCase() === existingCustomer.toString().toLowerCase()
        );
        if (matchingLead) {
          leadItem = matchingLead;
        }
      }
      
      // Update columns E-J
      sheet.getRange(row, 5).setValue(leadItem.customer || ''); // Column E - Customer name
      sheet.getRange(row, 6).setValue(leadItem.businessUnit || ''); // Column F - Business unit
      sheet.getRange(row, 7).setValue(leadItem.completionDate || ''); // Column G - Completion date
      
      // Calculate commission
      let commission = 0;
      let description = '';
      
      if (leadItem.revenue) {
        // Use the proper calculation function from LeadSetCalculation.js if available
        if (typeof calculateLeadCommission === 'function') {
          const calculated = calculateLeadCommission(leadItem.revenue);
          commission = calculated.amount;
          description = `${calculated.percentage}% commission on $${leadItem.revenue.toFixed(2)}`;
        } else {
          // Fallback to a simple calculation if the function isn't available
          commission = leadItem.revenue * 0.05; // 5% commission as example
          description = `5% commission on $${leadItem.revenue.toFixed(2)}`;
        }
      }
      
      // Add any notes from the lead data
      if (leadItem.notes) {
        description += ` - ${leadItem.notes}`;
      }
      
      // Set values
      sheet.getRange(row, 8).setValue(commission); // Column H - Commission amount
      sheet.getRange(row, 9).setValue(description); // Column I - Notes/Description
      
      // Format cells appropriately
      sheet.getRange(row, 8).setNumberFormat('$#,##0.00'); // Format commission as currency
      if (leadItem.completionDate instanceof Date) {
        sheet.getRange(row, 7).setNumberFormat('mm/dd/yyyy'); // Format date
      }
      
      // Update the totals in the summary section (row 13-14)
      updateLeadTotalsAfterEdit(sheet);
    }
  } catch (error) {
    Logger.log(`Error in handleLeadEntryInColumnJ: ${error.message}`);
    // Don't throw - this is called from onEdit which needs to continue
  }
}

/**
 * Updates the lead set totals in rows 13-14 after editing a lead entry.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 */
function updateLeadTotalsAfterEdit(techSheet) {
  try {
    // Count all rows with "LEAD" in column J
    const data = techSheet.getDataRange().getValues();
    let leadCount = 0;
    let totalCommission = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[9] && row[9].toString().toUpperCase().includes('LEAD')) {
        leadCount++;
        // Add commission amount from column H (index 7)
        if (row[7] && typeof row[7] === 'number') {
          totalCommission += row[7];
        }
      }
    }
    
    // Update lead count in row 14, column B
    techSheet.getRange(14, 2).setValue(leadCount);
    
    // Update total commission in row 13, column C
    techSheet.getRange(13, 3).setValue(totalCommission);
    techSheet.getRange(13, 3).setNumberFormat('$#,##0.00');
  } catch (error) {
    Logger.log(`Error in updateLeadTotalsAfterEdit: ${error.message}`);
  }
}

/**
 * Finds rows containing lead set entries in a technician's sheet
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet
 * @return {Array} Array of row indexes (1-based) containing lead entries
 */
function findExistingLeadSetRows(techSheet) {
  const data = techSheet.getDataRange().getValues();
  const leadRows = [];
  
  // Look for "L-E-A-D" (with or without dashes) in column J (index 9)
  for (let i = 0; i < data.length; i++) {
    const cellValue = String(data[i][9] || '');
    // Check for various ways "LEAD" might be written
    if (cellValue.toUpperCase().includes('LEAD') || 
        cellValue.toUpperCase().includes('L-E-A-D') || 
        cellValue.toUpperCase().includes('L E A D')) {
      leadRows.push(i + 1); // +1 for 1-based row index
    }
  }
  
  return leadRows;
}

/**
 * Clear existing lead entries from a technician's sheet
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet
 * @param {Array} rowIndexes - Optional array of row indexes to clear
 */
function clearExistingLeadEntries(techSheet, rowIndexes) {
  // If row indexes not provided, find them
  if (!rowIndexes || !rowIndexes.length) {
    rowIndexes = findExistingLeadSetRows(techSheet);
  }
  
  if (rowIndexes.length === 0) {
    console.log("No existing lead entries found to clear");
    return;
  }
  
  console.log(`Clearing ${rowIndexes.length} lead entries at rows: ${rowIndexes.join(', ')}`);
  
  // Clear each row (columns E through J)
  rowIndexes.forEach(rowIndex => {
    // Clear columns E through J (5 through 10)
    techSheet.getRange(rowIndex, 5, 1, 6).clearContent();
    
    // Specifically verify column J (index 10) is cleared
    techSheet.getRange(rowIndex, 10, 1, 1).clearContent();
  });
}

/**
 * Opens the Lead Set sheet from either the active spreadsheet or an external one.
 * 
 * @param {String} spreadsheetId - Optional ID of the external spreadsheet.
 * @return {SpreadsheetApp.Sheet} The Lead Set sheet or null if not found.
 */
function openLeadSetSheet(spreadsheetId) {
  try {
    let ss;
    
    if (spreadsheetId) {
      // Open external spreadsheet
      ss = SpreadsheetApp.openById(spreadsheetId);
    } else {
      // Use active spreadsheet
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) {
      console.error("Could not open spreadsheet");
      return null;
    }
    
    // Look for "Lead Set" sheet
    const leadSetSheet = ss.getSheetByName("Lead Set");
    if (!leadSetSheet) {
      console.error("Could not find 'Lead Set' sheet");
      return null;
    }
    
    return leadSetSheet;
  } catch (error) {
    console.error(`Error opening Lead Set sheet: ${error.message}`);
    return null;
  }
}

/**
 * Finds the first empty row in a technician sheet, starting from row 20.
 * @param {SpreadsheetApp.Sheet} sheet - The sheet to search.
 * @return {Number} The first empty row index.
 */
function findFirstEmptyRow(sheet) {
  try {
    // Start from row 20 (typical header/other content ends before this)
    const startRow = 20;
    const maxRows = sheet.getMaxRows();
    
    // Get values in column E (index 5)
    const values = sheet.getRange(startRow, 5, maxRows - startRow + 1, 1).getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (!values[i][0]) {
        return startRow + i;
      }
    }
    
    // If no empty row found, return the next row after the last data
    return sheet.getLastRow() + 1;
  } catch (error) {
    console.error(`Error finding first empty row: ${error.message}`);
    return 20; // Default starting row
  }
}