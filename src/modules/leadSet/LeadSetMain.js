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
    const techResult = updateLeadSetForTechnician(ss, leadSetSheet, techName);
    
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
 * Updates lead set for a specific technician.
 * This function is called when "Leads" or "Lead Set" is selected from the dropdown.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet (can be null, will be found if needed).
 * @param {String} technicianName - The name of the technician.
 * @param {Number} actionRow - Optional row in Hourly + Spiff Pay sheet to update status.
 * @param {Number} actionCol - Optional column in Hourly + Spiff Pay sheet to update status.
 * @param {Boolean} suppressPopup - Optional flag to suppress popup notifications, defaults to false.
 * @return {Object} Object containing processing results.
 */
function updateLeadSetForTechnician(ss, leadSetSheet, technicianName, actionRow, actionCol, suppressPopup = false) {
  try {
    console.log(`Starting updateLeadSetForTechnician for ${technicianName}`);
    
    // Update status and validate resources
    updateActionStatus(actionRow, actionCol, 'Processing...');
    ss = ss || SpreadsheetApp.getActiveSpreadsheet();
    
    // Get required sheets
    let techSheet, validLeadSetSheet;
    try {
      // Find technician sheet
      techSheet = ss.getSheetByName(technicianName);
      if (!techSheet) {
        const errorMsg = `Technician sheet not found for: ${technicianName}`;
        console.error(errorMsg);
        updateActionStatus(actionRow, actionCol, 'Error: No Sheet');
        return { success: false, error: errorMsg };
      }
      
      // Find Lead Set sheet if not provided
      validLeadSetSheet = leadSetSheet;
      if (!validLeadSetSheet) {
        validLeadSetSheet = ss.getSheetByName('Lead Set');
        if (!validLeadSetSheet) {
          const errorMsg = 'Lead Set sheet not found';
          console.error(errorMsg);
          updateActionStatus(actionRow, actionCol, 'Error: No LeadSet');
          return { success: false, error: errorMsg };
        }
      }
      
      console.log(`Found required sheets for ${technicianName}`);
    } catch (sheetError) {
      const errorMsg = `Error getting sheets: ${sheetError.message}`;
      console.error(errorMsg);
      updateActionStatus(actionRow, actionCol, 'Error: Sheet');
      return { success: false, error: errorMsg };
    }
    
    // Clear existing lead data
    console.log(`Clearing existing lead data for ${technicianName}`);
    try {
      const clearedRows = clearLeadDataInInstallSection(techSheet);
      console.log(`Cleared ${clearedRows} existing lead rows for ${technicianName}`);
    } catch (clearError) {
      console.error(`Error clearing existing data: ${clearError.message}`);
      // Continue anyway - we'll try to write new data
    }
    
    // Process lead data and write to sheet
    try {
      const result = processAndWriteLeadData(validLeadSetSheet, techSheet, technicianName, suppressPopup);
      updateActionStatus(actionRow, actionCol, 'Complete');
      return result;
    } catch (processError) {
      const errorMsg = `Error processing lead data: ${processError.message}`;
      console.error(errorMsg);
      console.error(`Stack: ${processError.stack}`);
      updateActionStatus(actionRow, actionCol, 'Error: Process');
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = `Error in updateLeadSetForTechnician: ${error.message}`;
    console.error(errorMsg);
    console.error(`Stack: ${error.stack}`);
    updateActionStatus(actionRow, actionCol, 'Error');
    return { success: false, error: errorMsg };
  }
}

/**
 * Gets the required sheets for lead set processing.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @param {String} technicianName - The name of the technician.
 * @return {Object} Object containing required sheets.
 * @throws {Error} If sheets are not found.
 */
function getRequiredSheets(ss, leadSetSheet, technicianName) {
  // Find the technician's sheet
  const techSheet = ss.getSheetByName(technicianName);
  if (!techSheet) {
    console.error(`Technician sheet not found for: ${technicianName}`);
    throw new Error(`Technician sheet not found for: ${technicianName}`);
  }
  
  // Find the Lead Set sheet if not provided
  let validLeadSetSheet = leadSetSheet;
  if (!validLeadSetSheet) {
    validLeadSetSheet = ss.getSheetByName('Lead Set');
    if (!validLeadSetSheet) {
      console.error('Lead Set sheet not found');
      throw new Error('Lead Set sheet not found');
    }
  }
  
  return { techSheet, validLeadSetSheet };
}

/**
 * Processes lead data and writes it to the technician sheet.
 * 
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {String} technicianName - The name of the technician.
 * @param {Boolean} suppressPopup - Optional flag to suppress popup notifications, defaults to false.
 * @return {Object} Object containing processing results.
 */
function processAndWriteLeadData(leadSetSheet, techSheet, technicianName, suppressPopup = false) {
  // Get lead data for this technician
  const leadData = getLeadDataForTechnician(leadSetSheet, technicianName);
  console.log(`Found ${leadData.length} leads for ${technicianName}`);
  
  if (leadData.length === 0) {
    // Show a popup indicating no leads were found
    if (!suppressPopup) {
      SpreadsheetApp.getUi().alert(`No leads found for ${technicianName} in the Lead Set sheet.`);
    }
    return { success: true, leadsProcessed: 0, totalCommission: 0 };
  }
  
  // Process lead data into formatted entries
  console.log(`DEBUG: About to calculate commissions for ${leadData.length} leads for ${technicianName}`);
  const { processedLeads, totalCommission } = calculateLeadCommissions(leadData);
  console.log(`DEBUG: Calculated commissions for ${processedLeads.length} leads, total: ${totalCommission}`);
  
  // Write the leads to the technician's sheet
  console.log(`DEBUG: About to write ${processedLeads.length} leads to sheet for ${technicianName}`);
  writeNewLeadEntries(techSheet, processedLeads);
  console.log(`DEBUG: After writeNewLeadEntries call for ${technicianName}`);
  
  // Update the top summary
  updateTopSummaryLeadSet(techSheet, processedLeads.length, totalCommission);
  console.log(`DEBUG: Updated summary for ${technicianName}: ${processedLeads.length} leads, total: ${totalCommission}`);
  
  // Display results
  displayLeadResults(technicianName, processedLeads, totalCommission, suppressPopup);
  
  return { 
    success: true, 
    leadsProcessed: processedLeads.length, 
    totalCommission: totalCommission 
  };
}

/**
 * Calculates commissions for lead data.
 * 
 * @param {Array} leadData - The lead data to process.
 * @return {Object} Object with processed leads and total commission.
 */
function calculateLeadCommissions(leadData) {
  let totalCommission = 0;
  const processedLeads = [];
  
  console.log(`Processing ${leadData.length} leads for commission calculations`);
  
  for (const lead of leadData) {
    // Convert revenue to number if it's not already
    const revenue = typeof lead.revenue === 'number' ? lead.revenue : parseFloat(lead.revenue);
    
    if (isNaN(revenue) || revenue <= 0) {
      console.warn(`Invalid revenue for ${lead.customer}: ${lead.revenue}`);
      continue;
    }
    
    // Calculate commission amount
    const calculation = getCommissionCalculation(revenue);
    totalCommission += calculation.amount;
    
    // Create a note showing the tier and percentage applied
    let tier = '';
    if (revenue < 10000) {
      tier = '$1-$9,999 → 2%';
    } else if (revenue < 30000) {
      tier = '$10,000-$29,999 → 3%';
    } else {
      tier = '$30,000+ → 4%';
    }
    
    // Format the revenue for display
    const formattedRevenue = revenue.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    
    // Create the standardized note for Column I
    const note = `${calculation.percentage}% commission on ${formattedRevenue} (${tier})`;
    console.log(`Generated note for ${lead.customer}: "${note}"`);
    
    processedLeads.push({
      customer: lead.customer,
      businessUnit: lead.businessUnit,
      completionDate: lead.completionDate,
      amount: calculation.amount,
      notes: note,
      marker: 'L-E-A-D'
    });
  }
  
  console.log(`Processed ${processedLeads.length} leads, total commission: ${totalCommission}`);
  
  return { processedLeads, totalCommission };
}

/**
 * Gets commission calculation for a revenue amount.
 * 
 * @param {Number} revenue - The revenue amount.
 * @return {Object} Object with calculated amount and percentage.
 */
function getCommissionCalculation(revenue) {
  try {
    // Check if the function exists in the global scope
    if (typeof calculateLeadCommission === 'function') {
      return calculateLeadCommission(revenue);
    } else {
      // Use our local fallback implementation
      return localCalculateLeadCommission(revenue);
    }
  } catch (e) {
    console.error(`Error calling calculateLeadCommission: ${e.message}. Using fallback.`);
    return localCalculateLeadCommission(revenue);
  }
}

/**
 * Fallback implementation of calculateLeadCommission if needed.
 * 
 * @param {Number} revenue - The revenue amount.
 * @return {Object} Object with calculated amount and percentage.
 */
function localCalculateLeadCommission(revenue) {
  // Implement the same tiered logic
  let percentage = 2; // Default to 2%
  
  if (revenue >= 10000 && revenue < 30000) {
    percentage = 3;
  } else if (revenue >= 30000) {
    percentage = 4;
  }
  
  const amount = revenue * (percentage / 100);
  return {
    amount: Math.round(amount * 100) / 100,
    percentage: percentage
  };
}

/**
 * Displays lead processing results to the user.
 * 
 * @param {String} technicianName - The name of the technician.
 * @param {Array} processedLeads - The processed lead entries.
 * @param {Number} totalCommission - The total commission amount.
 * @param {Boolean} suppressPopup - Optional flag to suppress popup notifications, defaults to false.
 */
function displayLeadResults(technicianName, processedLeads, totalCommission, suppressPopup = false) {
  console.log(`DEBUG: Entered displayLeadResults for ${technicianName}. suppressPopup = ${suppressPopup}`);
  const ui = SpreadsheetApp.getUi();
  
  // Create customer names string with notes
  let customerDetails = '';
  if (processedLeads.length > 0) {
    customerDetails = '\n\nDetails:';
    processedLeads.forEach((lead, index) => {
      const amount = typeof lead.amount === 'number' 
        ? '$' + lead.amount.toFixed(2) 
        : lead.amount;
      
      customerDetails += `\n${index+1}. ${lead.customer || 'Unknown'} (${amount})`;
      if (lead.notes) {
        customerDetails += `\n   Note: ${lead.notes}`;
      }
    });
  }
  
  console.log(`DEBUG: Just before checking suppressPopup. Value = ${suppressPopup}`);
  if (!suppressPopup) {
    ui.alert(
      'Lead processing complete',
      `Processed ${processedLeads.length} leads for ${technicianName}.\n` +
      `Total commission: $${totalCommission.toFixed(2)}${customerDetails}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Handles errors in lead set processing.
 * 
 * @param {Error} error - The error to handle.
 */
function handleLeadSetError(error) {
  // Log the error
  console.error(`Error in updateLeadSetForTechnician: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  
  // Show error alert
  try {
    SpreadsheetApp.getUi().alert(`Error processing leads: ${error.message}`);
  } catch (e) {
    // If we can't show an alert, just log it
    console.error(`Error showing alert: ${e.message}`);
  }
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
 * Updates technician sheet with lead data.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @param {Array} leads - Array of lead data objects.
 */
function updateTechnicianSheet(techSheet, leads) {
  if (!techSheet || !leads) {
    Logger.log("Cannot update technician sheet: Invalid arguments");
    return;
  }
  
  try {
    // Calculate total commission for all leads
    let totalCommission = 0;
    for (const lead of leads) {
      totalCommission += Number(lead.commissionAmount || 0);
    }
    
    // If no leads found, clear the section and reset summary
    if (leads.length === 0) {
      Logger.log("No leads found for technician: " + techSheet.getName());
      updateTopSummaryLeadSet(techSheet, 0, 0);
      clearLeadDataInInstallSection(techSheet);
      return;
    }
    
    // Use the new smart function to clear and write data
    smartWriteLeadDataToSheet(techSheet, leads, totalCommission);
    
    Logger.log("Successfully updated technician sheet with " + leads.length + " leads, total: $" + totalCommission.toFixed(2));
  } catch (error) {
    Logger.log("Error updating technician sheet: " + error.message);
  }
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
    // Validate inputs and check if this is a technician sheet
    if (!isValidLeadEntryRequest(sheet, row, sheetName)) {
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leadSetSheet = findLeadSetSheet(ss);
    if (!leadSetSheet) {
      Logger.log("Lead Set sheet not found when processing lead entry in column J");
      return;
    }
    
    // Get lead data and populate the row
    const leadData = getLeadDataForTechnician(leadSetSheet, sheetName);
    if (leadData && leadData.length > 0) {
      const leadItem = findMatchingLeadItem(sheet, row, leadData);
      populateLeadRowData(sheet, row, leadItem);
      updateLeadTotalsAfterEdit(sheet);
    }
  } catch (error) {
    Logger.log(`Error in handleLeadEntryInColumnJ: ${error.message}`);
    // Don't throw - this is called from onEdit which needs to continue
  }
}

/**
 * Validates that the lead entry request is valid.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The sheet where the edit occurred.
 * @param {Number} row - The row number (1-based) where the edit occurred.
 * @param {String} sheetName - The name of the sheet.
 * @return {Boolean} True if the request is valid, false otherwise.
 */
function isValidLeadEntryRequest(sheet, row, sheetName) {
  // Validate inputs
  if (!sheet || !row || !sheetName) {
    Logger.log("Invalid parameters for handleLeadEntryInColumnJ");
    return false;
  }
  
  // Verify this is a technician sheet
  if (!isTechnicianSheet(sheetName)) {
    return false; // Not a technician sheet, ignore
  }
  
  return true;
}

/**
 * Finds a matching lead item for a specific row.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The technician sheet.
 * @param {Number} row - The row number (1-based).
 * @param {Array} leadData - Array of lead data objects.
 * @return {Object} The matching lead item, or the first lead if no match found.
 */
function findMatchingLeadItem(sheet, row, leadData) {
  let leadItem = leadData[0]; // Default to first lead if no better match
  
  // Try to find a better match if possible based on existing customer name
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
  
  return leadItem;
}

/**
 * Populates a row with lead data.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The technician sheet.
 * @param {Number} row - The row number (1-based).
 * @param {Object} leadItem - The lead data item.
 */
function populateLeadRowData(sheet, row, leadItem) {
  // Batch update all cells at once
  const values = [
    leadItem.customer || '',                    // Column E - Customer name
    leadItem.businessUnit || '',                // Column F - Business unit
    leadItem.completionDate || '',              // Column G - Completion date
    0,                                          // Column H - Commission amount (placeholder)
    '',                                         // Column I - Notes (placeholder)
    'L-E-A-D'                                   // Column J - Lead marker
  ];
  
  // Calculate commission and description
  let commission = 0;
  let description = '';
  
  if (leadItem.revenue) {
    // Use proper calculation
    const commData = calculateCommissionForLeadEntry(leadItem.revenue);
    commission = commData.amount;
    description = commData.description;
    
    // Update commission and description in values array
    values[3] = commission;
    
    // Format notes to include both calculation description and any original notes
    const noteParts = [];
    
    // Add calculation description
    noteParts.push(description);
    
    // Add original notes if any exist
    if (leadItem.notes && leadItem.notes.trim() !== '') {
      noteParts.push(leadItem.notes.trim());
    }
    
    // Join all note parts with a separator
    values[4] = noteParts.join(' - ');
  }
  
  // Write all values at once
  sheet.getRange(row, 5, 1, 6).setValues([values]);
  
  // Format cells appropriately
  sheet.getRange(row, 8, 1, 1).setNumberFormat('$#,##0.00'); // Format commission as currency
  if (leadItem.completionDate instanceof Date) {
    sheet.getRange(row, 7, 1, 1).setNumberFormat('mm/dd/yyyy'); // Format date
  }
}

/**
 * Calculates commission for a lead entry.
 * 
 * @param {Number} revenue - The revenue amount.
 * @return {Object} The calculated commission data.
 */
function calculateCommissionForLeadEntry(revenue) {
  let amount = 0;
  let description = '';
  
  // Use the proper calculation function from LeadSetCalculation.js if available
  if (typeof calculateLeadCommission === 'function') {
    const calculated = calculateLeadCommission(revenue);
    amount = calculated.amount;
    
    // Create a note showing the tier and percentage applied
    let tier = '';
    if (revenue < 10000) {
      tier = '$1-$9,999 → 2%';
    } else if (revenue < 30000) {
      tier = '$10,000-$29,999 → 3%';
    } else {
      tier = '$30,000+ → 4%';
    }
    
    // Format the revenue for display
    const formattedRevenue = revenue.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    
    // Include the bracket information in the description
    description = `${calculated.percentage}% commission on ${formattedRevenue} (${tier})`;
  } else {
    // Fallback to a simple calculation if the function isn't available
    amount = revenue * 0.05; // 5% commission as example
    description = `5% commission on $${revenue.toFixed(2)} (Default 5% bracket)`;
  }
  
  return { amount, description };
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