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
 * @return {Object} Object containing processing results.
 */
function updateLeadSetForTechnician(ss, leadSetSheet, technicianName, actionRow, actionCol) {
  try {
    // Debugging
    console.log(`Starting updateLeadSetForTechnician for ${technicianName}`);
    
    // Set status to Processing if action row/col provided
    if (actionRow && actionCol) {
      const ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
      if (ratesSheet) {
        ratesSheet.getRange(actionRow, actionCol).setValue('Processing...');
      }
    }
    
    // Make sure we have the spreadsheet object
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    // Find the technician's sheet
    const techSheet = ss.getSheetByName(technicianName);
    if (!techSheet) {
      console.error(`Technician sheet not found for: ${technicianName}`);
      return { success: false, error: `Technician sheet not found for: ${technicianName}` };
    }
    
    // Find the Lead Set sheet if not provided
    if (!leadSetSheet) {
      leadSetSheet = ss.getSheetByName('Lead Set');
      if (!leadSetSheet) {
        console.error('Lead Set sheet not found');
        return { success: false, error: 'Lead Set sheet not found' };
      }
    }
    
    // IMPORTANT: Clear existing lead data BEFORE fetching new lead data
    console.log(`Clearing existing lead data for ${technicianName} before writing new data`);
    const clearedRows = clearLeadDataInInstallSection(techSheet);
    console.log(`Cleared ${clearedRows} existing lead rows for ${technicianName}`);
    
    // Get lead data where this technician is listed in Column G (Lead Generated By)
    const leadData = getLeadDataForTechnician(leadSetSheet, technicianName);
    console.log(`Found ${leadData.length} leads for ${technicianName}`);
    
    if (leadData.length === 0) {
      // Show a popup indicating no leads were found
      SpreadsheetApp.getUi().alert(`No leads found for ${technicianName} in the Lead Set sheet.`);
      return { success: true, leadsProcessed: 0, totalCommission: 0 };
    }
    
    // Process and write lead data to technician's sheet
    let totalCommission = 0;
    const processedLeads = [];
    
    // Define a local fallback implementation of calculateLeadCommission if needed
    const localCalculateLeadCommission = function(revenue) {
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
    };
    
    // Process each lead and calculate commission
    for (const lead of leadData) {
      // Convert revenue to number if it's not already
      const revenue = typeof lead.revenue === 'number' ? lead.revenue : parseFloat(lead.revenue);
      
      if (isNaN(revenue) || revenue <= 0) {
        console.warn(`Invalid revenue for ${lead.customer}: ${lead.revenue}`);
        continue;
      }
      
      // Calculate commission using tiered percentage structure
      // Try to use the standard function first, fall back to local implementation if not available
      let calculation;
      try {
        // Check if the function exists in the global scope
        if (typeof calculateLeadCommission === 'function') {
          calculation = calculateLeadCommission(revenue);
        } else {
          // Use our local fallback implementation
          calculation = localCalculateLeadCommission(revenue);
        }
      } catch (e) {
        console.error(`Error calling calculateLeadCommission: ${e.message}. Using fallback.`);
        calculation = localCalculateLeadCommission(revenue);
      }
      
      totalCommission += calculation.amount;
      
      // Create a note showing the percentage applied
      let tier = '';
      if (revenue < 10000) {
        tier = '$1-$9,999 → 2%';
      } else if (revenue < 30000) {
        tier = '$10,000-$29,999 → 3%';
      } else {
        tier = '$30,000+ → 4%';
      }
      
      const formattedLead = {
        customer: lead.customer,
        businessUnit: lead.businessUnit,
        completionDate: lead.completionDate,
        amount: calculation.amount,
        notes: `${calculation.percentage}% commission on $${revenue.toFixed(2)} (${tier})`,
        marker: 'L-E-A-D'
      };
      
      processedLeads.push(formattedLead);
    }
    
    // Write the leads to the technician's sheet
    console.log(`Writing ${processedLeads.length} leads to sheet for ${technicianName}`);
    writeNewLeadEntries(techSheet, processedLeads);
    
    // Update the summary cells (B14 for count, C13 for total)
    updateTopSummaryLeadSet(techSheet, processedLeads.length, totalCommission);
    
    // Show a popup with the results
    const ui = SpreadsheetApp.getUi();
    
    // Create customer names string
    let customerNames = '';
    if (processedLeads.length > 0) {
      customerNames = '\n\nCustomer(s): ' + processedLeads.map(lead => lead.customer).join(', ');
    }
    
    ui.alert(
      'Lead processing complete',
      `Processed ${processedLeads.length} leads for ${technicianName}.\n` +
      `Total commission: $${totalCommission.toFixed(2)}${customerNames}`,
      ui.ButtonSet.OK
    );
    
    // Return success
    return { 
      success: true, 
      leadsProcessed: processedLeads.length, 
      totalCommission: totalCommission 
    };
  } catch (error) {
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
    
    return { success: false, error: error.message };
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