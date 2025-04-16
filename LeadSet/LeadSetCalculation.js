/**
 * Functions for calculating lead payments based on job revenue.
 */

/**
 * Finds and calculates all lead set entries for a technician.
 * 
 * @param {String} technicianName - The name of the technician.
 * @return {Array} Array of lead set entries with calculated amounts.
 */
function calculateLeadSetEntries(technicianName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadSetSheet = findLeadSetSheet(ss);
  
  if (!leadSetSheet) {
    throw new Error('Lead Set sheet not found');
  }
  
  // Get all lead data for this technician
  const leadData = getLeadDataForTechnician(leadSetSheet, technicianName);
  
  if (!leadData || leadData.length === 0) {
    return [];
  }
  
  // Calculate payment for each lead
  return leadData.map(lead => processLeadEntry(lead, technicianName))
                .filter(entry => entry !== null); // Remove any entries that failed to process
}

/**
 * Processes a single lead entry and calculates its commission.
 * 
 * @param {Object} lead - The lead data object.
 * @param {String} technicianName - The technician's name for error logging.
 * @return {Object|null} Processed lead entry with calculated amount or null if processing failed.
 */
function processLeadEntry(lead, technicianName) {
  try {
    validateRevenueData(lead.revenue);
    const calculation = determineLeadSetAmount(lead.revenue);
    
    return {
      customer: lead.customer,
      unit: lead.unit,
      date: lead.date,
      revenue: lead.revenue,
      amount: calculation.amount,
      percentage: calculation.percentage,
      notes: formatCommissionNote(calculation.amount, calculation.percentage)
    };
  } catch (error) {
    Logger.log(`Error processing lead for ${technicianName}: ${error.message}`);
    return null;
  }
}

/**
 * Determines the lead set amount based on the total job revenue.
 * Uses tiered percentages based on revenue amount.
 * 
 * @param {Number} revenue - The total job revenue.
 * @return {Object} Object containing the calculated amount and percentage.
 */
function determineLeadSetAmount(revenue) {
  validateRevenueData(revenue);
  
  // Determine percentage based on revenue tier
  const percentage = determineCommissionPercentage(revenue);
  
  // Calculate the amount based on the percentage
  const amount = (revenue * percentage / 100);
  
  // Round to two decimal places
  const roundedAmount = Math.round(amount * 100) / 100;
  
  return {
    amount: roundedAmount,
    percentage: percentage
  };
}

/**
 * Determines the commission percentage based on revenue tier.
 * - 2% for $1-$9,999
 * - 3% for $10,000-$29,999
 * - 4% for $30,000+
 * 
 * @param {Number} revenue - The total job revenue.
 * @return {Number} The commission percentage.
 */
function determineCommissionPercentage(revenue) {
  if (revenue < 10000) {
    return 2; // 2% for amounts up to $9,999
  } else if (revenue < 30000) {
    return 3; // 3% for amounts between $10,000 and $29,999
  } else {
    return 4; // 4% for amounts $30,000 and above
  }
}

/**
 * Formats the commission note with amount and percentage.
 * 
 * @param {Number} amount - The calculated commission amount.
 * @param {Number} percentage - The percentage used for calculation.
 * @return {String} Formatted note string.
 */
function formatCommissionNote(amount, percentage) {
  return `${percentage}% commission: $${amount.toFixed(2)}`;
}

/**
 * Validates that the revenue data is a valid number.
 * 
 * @param {any} revenue - The revenue value to validate.
 * @throws {Error} If the revenue is invalid.
 */
function validateRevenueData(revenue) {
  if (typeof revenue !== 'number' || isNaN(revenue)) {
    throw new Error('Revenue must be a valid number');
  }
  
  if (revenue <= 0) {
    throw new Error('Revenue must be greater than zero');
  }
}

/**
 * Processes lead data from the Lead Set sheet for a specific technician.
 * Calculates commissions and writes to technician's sheet.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The active spreadsheet.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {String} technicianName - The name of the technician.
 * @return {Object} An object containing the number of leads processed and the total payment.
 */
function processLeadDataForTechnician(ss, leadSetSheet, techSheet, technicianName) {
  // Get calculated lead entries
  const leadEntries = calculateLeadSetEntries(technicianName);
  
  if (leadEntries.length === 0) {
    return { leads: 0, totalPayment: 0 };
  }
  
  // Calculate total payment
  const totalPayment = calculateTotalPayment(leadEntries);
  
  // Write the lead data to the technician's sheet
  writeLeadDataToTechnicianSheet(techSheet, leadEntries);
  
  // Update the summary information
  updateLeadSummary(techSheet, leadEntries.length, totalPayment);
  
  return {
    leads: leadEntries.length,
    totalPayment: totalPayment
  };
}

/**
 * Calculates the total payment from all lead entries.
 * 
 * @param {Array} leadEntries - Array of lead entries with calculated amounts.
 * @return {Number} The total payment amount.
 */
function calculateTotalPayment(leadEntries) {
  return leadEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * Writes lead data to a technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Array} leadEntries - The lead entries to write.
 */
function writeLeadDataToTechnicianSheet(techSheet, leadEntries) {
  // Implementation can reference the existing function in LeadSetSheetOperations.js
  if (typeof writeLeadSetDataToSheet === 'function') {
    writeLeadSetDataToSheet(techSheet, leadEntries);
  } else {
    // Fallback implementation if writeLeadSetDataToSheet is not available
    writeLeadEntriesFallback(techSheet, leadEntries);
  }
}

/**
 * Updates the lead summary information in the technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Number} leadCount - The number of leads.
 * @param {Number} totalPayment - The total payment amount.
 */
function updateLeadSummary(techSheet, leadCount, totalPayment) {
  // Implementation can reference the existing function in LeadSetSheetOperations.js
  if (typeof updateTopSummaryLeadSet === 'function') {
    updateTopSummaryLeadSet(techSheet, leadCount, totalPayment);
  } else {
    // Fallback implementation if updateTopSummaryLeadSet is not available
    updateLeadSummaryFallback(techSheet, leadCount, totalPayment);
  }
}

/**
 * Fallback implementation to write lead entries to a technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Array} leadEntries - The lead entries to write.
 */
function writeLeadEntriesFallback(techSheet, leadEntries) {
  // Clear existing entries first
  const data = techSheet.getDataRange().getValues();
  for (let i = 15; i < data.length; i++) {
    if (data[i][9] && data[i][9].toString().includes('LEAD')) {
      techSheet.getRange(i + 1, 5, 1, 6).clearContent();
    }
  }
  
  // Write new entries
  let row = 16;
  for (const entry of leadEntries) {
    techSheet.getRange(row, 5).setValue(entry.customer);
    techSheet.getRange(row, 6).setValue(entry.unit);
    techSheet.getRange(row, 7).setValue(entry.date);
    techSheet.getRange(row, 8).setValue(entry.amount);
    techSheet.getRange(row, 9).setValue(entry.notes);
    techSheet.getRange(row, 10).setValue('L-E-A-D');
    
    techSheet.getRange(row, 8).setNumberFormat('$#,##0.00');
    row++;
  }
}

/**
 * Fallback implementation to update lead summary in a technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Number} leadCount - The number of leads.
 * @param {Number} totalPayment - The total payment amount.
 */
function updateLeadSummaryFallback(techSheet, leadCount, totalPayment) {
  techSheet.getRange(14, 2).setValue(leadCount);
  const totalCell = techSheet.getRange(13, 3);
  totalCell.setValue(totalPayment);
  totalCell.setNumberFormat('$#,##0.00');
}

/**
 * Main calculation function for lead commission.
 * Uses the tiered percentage structure:
 * - 2% for $1-$9,999
 * - 3% for $10,000-$29,999
 * - 4% for $30,000+
 *
 * @param {Number} revenue - The total job revenue.
 * @return {Object} Object containing the calculated amount and percentage.
 */
function calculateLeadCommission(revenue) {
  if (typeof revenue !== 'number' || isNaN(revenue) || revenue <= 0) {
    return { amount: 0, percentage: 0 };
  }
  
  // Get the appropriate percentage based on revenue
  const percentage = determineCommissionPercentage(revenue);
  
  // Calculate amount
  const amount = (revenue * percentage / 100);
  
  // Round to two decimal places
  const roundedAmount = Math.round(amount * 100) / 100;
  
  return {
    amount: roundedAmount,
    percentage: percentage
  };
} 