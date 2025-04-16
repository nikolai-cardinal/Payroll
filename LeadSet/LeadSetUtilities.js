/**
 * Helper functions for the Lead Set module.
 */

/**
 * Validates the Lead Set sheet has all required columns.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The Lead Set sheet to validate.
 * @return {Boolean} True if the sheet is valid, false otherwise.
 */
function validateLeadSetSheet(sheet) {
  if (!sheet) return false;
  
  // We no longer need to validate specific column names since we're using fixed positions
  // Just check that the sheet has data
  try {
    const data = sheet.getDataRange().getValues();
    return data.length > 0 && data[0].length >= 7; // Make sure we have at least 7 columns (up to column G)
  } catch (error) {
    Logger.log(`Error validating Lead Set sheet: ${error.message}`);
    return false;
  }
}

/**
 * Validates that all required columns exist in the Lead Set sheet.
 * 
 * @param {Array} headers - Array of column headers.
 * @return {Boolean} True if all required columns exist, false otherwise.
 */
function validateRequiredColumns(headers) {
  const requiredColumns = [
    'Technician', 
    'Customer', 
    'Business Unit', 
    'Completion Date', 
    'Revenue'
  ];
  
  // Check all required columns exist
  for (const column of requiredColumns) {
    if (headers.indexOf(column) === -1) {
      Logger.log(`Lead Set sheet missing required column: ${column}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Validates the data types in the Lead Set sheet.
 * 
 * @param {SpreadsheetApp.Sheet} sheet - The Lead Set sheet.
 * @param {Array} headers - Array of column headers.
 * @return {Boolean} True if all data is valid, false otherwise.
 */
function validateLeadSetData(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  const indices = findLeadSetColumnIndices(headers);
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check that revenue is a valid number
    const revenue = row[indices.revenue];
    if (revenue !== null && revenue !== '' && isNaN(parseFloat(revenue))) {
      Logger.log(`Row ${i+1}: Invalid revenue value: ${revenue}`);
      return false;
    }
    
    // Check that completion date is a valid date
    const date = row[indices.completionDate];
    if (date !== null && date !== '' && !(date instanceof Date) && isNaN(new Date(date).getTime())) {
      Logger.log(`Row ${i+1}: Invalid date value: ${date}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Validates a technician sheet has the proper structure for lead set operations.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet to validate.
 * @return {Boolean} True if the sheet structure is valid, false otherwise.
 */
function validateTechnicianSheetForLeadSet(techSheet) {
  if (!techSheet) return false;
  
  try {
    // Check for required cells
    if (!validateTechSheetRequiredCells(techSheet)) {
      return false;
    }
    
    // Check for a valid lead section
    if (!validateTechSheetLeadSection(techSheet)) {
      return false;
    }
    
    return true;
  } catch (error) {
    Logger.log(`Error validating technician sheet: ${error.message}`);
    return false;
  }
}

/**
 * Validates that a technician sheet has the required cells.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @return {Boolean} True if the required cells exist, false otherwise.
 */
function validateTechSheetRequiredCells(techSheet) {
  // Check for B14 (lead count) and C13 (total commission) cells
  const b14 = techSheet.getRange("B14");
  const c13 = techSheet.getRange("C13");
  
  if (!b14 || !c13) {
    Logger.log(`Technician sheet missing required cells B14 or C13`);
    return false;
  }
  
  // Check for columns E-J structure (should be editable)
  const columnsEJ = techSheet.getRange("E15:J20"); // Just checking a sample range
  if (!columnsEJ) {
    Logger.log(`Technician sheet missing columns E-J for lead data`);
    return false;
  }
  
  return true;
}

/**
 * Validates that a technician sheet has a lead section.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @return {Boolean} True if a lead section exists, false otherwise.
 */
function validateTechSheetLeadSection(techSheet) {
  // Look for a row with "Lead" or "Lead Commission" text in column A
  let hasLeadSection = false;
  const data = techSheet.getDataRange().getValues();
  
  for (let i = 0; i < data.length; i++) {
    const cell = data[i][0]; // Column A
    if (cell && typeof cell === 'string' && 
        (cell.includes('Lead') || cell.includes('LEAD') || cell.includes('lead'))) {
      hasLeadSection = true;
      break;
    }
  }
  
  if (!hasLeadSection) {
    Logger.log(`Technician sheet does not have a lead section identified in column A`);
    return false;
  }
  
  return true;
}

/**
 * Ensures the Lead Set sheet exists, creating it if needed.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The spreadsheet to check.
 * @return {SpreadsheetApp.Sheet} The existing or newly created Lead Set sheet.
 */
function ensureLeadSetSheetExists(ss) {
  let leadSetSheet = ss.getSheetByName('Lead Set');
  
  // If the sheet doesn't exist, create it
  if (!leadSetSheet) {
    leadSetSheet = createLeadSetSheet(ss);
  }
  
  return leadSetSheet;
}

/**
 * Creates a new Lead Set sheet with proper formatting.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The spreadsheet.
 * @return {SpreadsheetApp.Sheet} The newly created Lead Set sheet.
 */
function createLeadSetSheet(ss) {
  const leadSetSheet = ss.insertSheet('Lead Set');
  
  // Set up headers matching the actual structure
  const headers = [
    'Invoice ID', 
    'Completion Date', 
    'Customer Name', 
    'Business Unit',
    'Job Total Revenue',
    'Balance',
    'Lead Generated By',
    'Sold By',
    'Assigned Technicians'
  ];
  
  leadSetSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  leadSetSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Format the sheet
  leadSetSheet.setFrozenRows(1);
  leadSetSheet.getRange(2, 5, 999, 1).setNumberFormat('$#,##0.00'); // Column E (Job Total Revenue)
  leadSetSheet.getRange(2, 6, 999, 1).setNumberFormat('$#,##0.00'); // Column F (Balance)
  leadSetSheet.getRange(2, 2, 999, 1).setNumberFormat('mm/dd/yyyy'); // Column B (Completion Date)
  leadSetSheet.autoResizeColumns(1, headers.length);
  
  return leadSetSheet;
}

/**
 * Gets lead set entries for a specific technician.
 * 
 * @param {String} techName - The name of the technician.
 * @return {Array} Array of lead set entries for the technician.
 */
function getTechnicianLeadSetEntries(techName) {
  return safeLeadSetOperation(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leadSetSheet = ensureLeadSetSheetExists(ss);
    
    if (!validateLeadSetSheet(leadSetSheet)) {
      throw new Error('Lead Set sheet is invalid. Please check required columns.');
    }
    
    const data = leadSetSheet.getDataRange().getValues();
    const indices = findLeadSetColumnIndices(data[0]);
    
    // Filter for this technician's entries
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[indices.technician] === techName) {
        entries.push({
          customer: row[indices.customer],
          businessUnit: row[indices.businessUnit],
          completionDate: row[indices.completionDate],
          revenue: row[indices.revenue],
          notes: `Lead for ${techName}`
        });
      }
    }
    
    return entries;
  }, []);
}

/**
 * Validates a technician's lead data before writing to their sheet.
 * 
 * @param {Array} leadsData - Array of lead data to validate.
 * @return {Boolean} True if the data is valid, false otherwise.
 */
function validateLeadData(leadsData) {
  if (!leadsData || !Array.isArray(leadsData)) {
    return false;
  }
  
  for (const lead of leadsData) {
    // Check required fields
    if (!lead.customer) {
      Logger.log('Lead missing customer name');
      return false;
    }
    
    // Validate revenue is a number
    if (lead.revenue !== undefined && lead.revenue !== null) {
      const revenue = parseFloat(lead.revenue);
      if (isNaN(revenue)) {
        Logger.log(`Invalid revenue value for ${lead.customer}: ${lead.revenue}`);
        return false;
      }
      lead.revenue = revenue; // Convert to number if it's valid
    }
    
    // Validate completion date
    if (lead.completionDate) {
      if (!(lead.completionDate instanceof Date)) {
        // Try to convert to date if it's not already
        const dateValue = new Date(lead.completionDate);
        if (isNaN(dateValue.getTime())) {
          Logger.log(`Invalid completion date for ${lead.customer}: ${lead.completionDate}`);
          return false;
        }
        lead.completionDate = dateValue;
      }
    }
  }
  
  return true;
}

/**
 * Error wrapper for lead set operations.
 * 
 * @param {Function} operation - The operation to execute.
 * @param {*} defaultReturn - The default return value if operation fails.
 * @param {Boolean} showAlert - Whether to show an alert on error.
 * @return {*} The result of the operation or defaultReturn on error.
 */
function safeLeadSetOperation(operation, defaultReturn, showAlert = false) {
  try {
    return operation();
  } catch (error) {
    Logger.log(`Lead Set error: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
    
    if (showAlert) {
      SpreadsheetApp.getUi().alert(
        'Lead Set Error',
        `An error occurred: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
    return defaultReturn;
  }
}

/**
 * Shows a summary popup with lead set processing results.
 * 
 * @param {Number} techCount - Number of technicians processed.
 * @param {Number} leadCount - Number of leads processed.
 * @param {Number} totalAmount - Total commission amount.
 */
function showLeadSetSummary(techCount, leadCount, totalAmount) {
  const ui = SpreadsheetApp.getUi();
  const message = `Processed ${techCount} technician${techCount !== 1 ? 's' : ''} with a total of ${leadCount} lead${leadCount !== 1 ? 's' : ''}.\n` +
                 `Total commission: ${formatCurrency(totalAmount)}`;
  
  ui.alert('Lead Set Processing Complete', message, ui.ButtonSet.OK);
}

/**
 * Finds indices for important columns in the Lead Set sheet.
 * 
 * @param {Array} headerRow - The header row from the Lead Set sheet.
 * @return {Object} Object with column indices.
 */
function findLeadSetColumnIndices(headerRow) {
  // Return the hardcoded indices based on the actual sheet structure
  return {
    invoiceId: 0,          // Column A - Invoice ID
    completionDate: 1,     // Column B - Completion Date
    customer: 2,           // Column C - Customer Name
    businessUnit: 3,       // Column D - Business Unit
    revenue: 4,            // Column E - Job Total Revenue
    balance: 5,            // Column F - Balance
    technician: 6,         // Column G - Lead Generated By
    soldBy: 7,             // Column H - Sold By
    assignedTechs: 8       // Column I - Assigned Technicians
  };
}

/**
 * Gets all technician sheet names from the spreadsheet.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The spreadsheet to search in.
 * @return {Array} Array of technician sheet names.
 */
function getTechnicianSheets(ss) {
  const sheets = ss.getSheets();
  const technicianSheets = [];
  
  // Exclude known non-technician sheets
  const excludedSheets = ['Lead Set', 'Menu', 'PBP', 'Spiff/Bonus', 'Yard Signs', 'Timesheet'];
  
  for (let i = 0; i < sheets.length; i++) {
    const sheetName = sheets[i].getName();
    if (!excludedSheets.includes(sheetName)) {
      technicianSheets.push(sheetName);
    }
  }
  
  return technicianSheets;
}

/**
 * Formats a date object to a string in MM/DD/YYYY format.
 * 
 * @param {Date} date - The date to format.
 * @return {String} The formatted date string.
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  
  return month + '/' + day + '/' + year;
}

/**
 * Formats a number as a currency string.
 * 
 * @param {Number} amount - The amount to format.
 * @return {String} The formatted currency string.
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    return '';
  }
  
  return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
} 