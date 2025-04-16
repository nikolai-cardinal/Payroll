/**
 * Functions for handling sheet operations related to lead data.
 */

/**
 * Finds the Lead Set sheet in the spreadsheet.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - The spreadsheet to search in.
 * @return {SpreadsheetApp.Sheet|null} The Lead Set sheet or null if not found.
 */
function findLeadSetSheet(ss) {
  try {
    return ss.getSheetByName('Lead Set');
  } catch (error) {
    Logger.log('Error finding Lead Set sheet: ' + error.message);
    return null;
  }
}

/**
 * Gets lead data for the specified technician from the Lead Set.
 * @param {SpreadsheetApp.Sheet} leadSetSheet - The Lead Set sheet.
 * @param {String} technicianName - The name of the technician.
 * @param {Object} dateRange - Optional date range for filtering (startDate, endDate).
 * @return {Array} Array of lead data objects.
 */
function getLeadDataForTechnician(leadSetSheet, technicianName, dateRange) {
  // Validate inputs
  if (!leadSetSheet) {
    console.error('getLeadDataForTechnician: leadSetSheet is null or undefined');
    return [];
  }
  
  if (!technicianName) {
    console.error('getLeadDataForTechnician: technicianName is null or undefined');
    return [];
  }
  
  try {
    console.log(`Fetching lead data for technician: ${technicianName}`);
    
    // Get all data from the Lead Set sheet
    const data = leadSetSheet.getDataRange().getValues();
    
    // Check if we have any data
    if (data.length <= 1) {
      console.log('Lead Set sheet has no data (only headers or empty)');
      return [];
    }
    
    // Get the header row to find column indices
    const headerRow = data[0];
    
    // Find necessary column indices
    const technicianCol = headerRow.findIndex(col => 
      col.toString().toLowerCase().includes('technician'));
    const customerCol = headerRow.findIndex(col => 
      col.toString().toLowerCase().includes('customer'));
    const businessUnitCol = headerRow.findIndex(col => 
      col.toString().toLowerCase().includes('business unit'));
    const completionDateCol = headerRow.findIndex(col => 
      col.toString().toLowerCase().includes('completion'));
    const revenueCol = headerRow.findIndex(col => 
      col.toString().toLowerCase().includes('revenue') || 
      col.toString().toLowerCase().includes('amount'));
    
    // Verify we found all required columns
    if (technicianCol === -1 || customerCol === -1 || completionDateCol === -1) {
      console.error(`Required columns not found: Tech=${technicianCol}, Customer=${customerCol}, CompletionDate=${completionDateCol}`);
      return [];
    }
    
    console.log(`Column indices: Tech=${technicianCol}, Customer=${customerCol}, Unit=${businessUnitCol}, CompDate=${completionDateCol}, Rev=${revenueCol}`);
    
    // Process date range if provided
    let startDate = null;
    let endDate = null;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      startDate = new Date(dateRange.startDate);
      endDate = new Date(dateRange.endDate);
      
      // Set to start of day for startDate
      startDate.setHours(0, 0, 0, 0);
      
      // Set to end of day for endDate
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`Filtering by date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    }
    
    // Filter and map data to collect leads for the specified technician
    const leads = [];
    let skippedDueToDate = 0;
    let skippedDueToInvalidDate = 0;
    
    // Start from row 1 (skipping header at row 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[technicianCol] && !row[customerCol]) continue;
      
      // Check if this is for our technician (case insensitive comparison)
      if (row[technicianCol] && 
          row[technicianCol].toString().toLowerCase() === technicianName.toLowerCase()) {
        
        // Parse completion date
        let completionDate = null;
        try {
          if (row[completionDateCol]) {
            // Handle if it's already a Date object
            if (row[completionDateCol] instanceof Date) {
              completionDate = new Date(row[completionDateCol]);
            } else {
              // Try to parse as a date if it's a string
              completionDate = new Date(row[completionDateCol]);
            }
            
            // Skip invalid dates
            if (isNaN(completionDate.getTime())) {
              console.log(`Row ${i+1}: Invalid completion date: ${row[completionDateCol]}`);
              skippedDueToInvalidDate++;
              continue;
            }
          }
        } catch (e) {
          console.log(`Row ${i+1}: Error parsing completion date: ${e.message}`);
          skippedDueToInvalidDate++;
          continue;
        }
        
        // Filter by date range if provided
        if (dateRange && startDate && endDate && completionDate) {
          // Skip if completion date is outside the specified range
          if (completionDate < startDate || completionDate > endDate) {
            skippedDueToDate++;
            continue;
          }
        }
        
        // Convert revenue to number
        let revenue = 0;
        if (revenueCol !== -1 && row[revenueCol]) {
          if (typeof row[revenueCol] === 'number') {
            revenue = row[revenueCol];
          } else {
            // Try to parse as number, removing any currency symbols
            const revStr = row[revenueCol].toString().replace(/[$,]/g, '');
            revenue = parseFloat(revStr) || 0;
          }
        }
        
        // Create lead data object
        leads.push({
          customer: row[customerCol] || 'Unknown Customer',
          businessUnit: businessUnitCol !== -1 ? (row[businessUnitCol] || '') : '',
          completionDate: completionDate,
          revenue: revenue
        });
      }
    }
    
    console.log(`Found ${leads.length} leads for ${technicianName}`);
    if (skippedDueToDate > 0) {
      console.log(`Skipped ${skippedDueToDate} leads due to date range filter`);
    }
    if (skippedDueToInvalidDate > 0) {
      console.log(`Skipped ${skippedDueToInvalidDate} leads due to invalid dates`);
    }
    
    return leads;
    
  } catch (error) {
    console.error(`Error in getLeadDataForTechnician: ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

/**
 * Writes lead set data to a technician's sheet.
 * Main entry point for writing lead data.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Array} leadData - Array of lead data objects.
 * @return {Boolean} True if successful, false otherwise.
 */
function writeLeadSetDataToSheet(techSheet, leadData) {
  if (!leadData || leadData.length === 0) {
    return true; // Nothing to do, considered successful
  }
  
  // Validate technician sheet structure
  if (!validateSheetStructure(techSheet)) {
    return false;
  }
  
  try {
    // Process data and update the sheet in batches
    const calculatedData = calculateLeadAmounts(leadData);
    clearAndWriteLeadEntries(techSheet, calculatedData.formattedEntries);
    updateLeadSummaryInfo(techSheet, calculatedData.count, calculatedData.total);
    return true;
  } catch (error) {
    Logger.log(`Error writing lead set data: ${error.message}`);
    return false;
  }
}

/**
 * Validates the technician sheet structure for lead operations.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet to validate.
 * @return {Boolean} True if valid, false otherwise.
 */
function validateSheetStructure(techSheet) {
  if (typeof validateTechnicianSheetForLeadSet === 'function' && 
      !validateTechnicianSheetForLeadSet(techSheet)) {
    Logger.log(`Technician sheet ${techSheet.getName()} has invalid structure for lead set operations`);
    return false;
  }
  return true;
}

/**
 * Calculates commission amounts for lead data entries.
 * 
 * @param {Array} leadData - Raw lead data.
 * @return {Object} Processed data with formatted entries, count and total.
 */
function calculateLeadAmounts(leadData) {
  let total = 0;
  const formattedEntries = [];
  
  for (const lead of leadData) {
    // Calculate commission amount
    let amount = 0;
    if (typeof lead.amount === 'number') {
      amount = lead.amount;
    } else if (typeof lead.revenue === 'number' && typeof calculateLeadCommission === 'function') {
      amount = calculateLeadCommission(lead.revenue).amount;
    } else if (typeof lead.revenue === 'number') {
      amount = lead.revenue * 0.05; // 5% fallback
    }
    
    total += amount;
    formattedEntries.push({
      customer: lead.customer || lead.customerName,
      businessUnit: lead.businessUnit || lead.unit,
      completionDate: lead.completionDate || lead.date,
      amount: amount,
      notes: lead.notes || '',
      marker: 'L-E-A-D'
    });
  }
  
  return {
    formattedEntries: formattedEntries,
    count: formattedEntries.length,
    total: total
  };
}

/**
 * Clears existing lead entries and writes new ones in a batch operation.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @param {Array} entries - Formatted lead entries to write.
 */
function clearAndWriteLeadEntries(techSheet, entries) {
  // Clear existing entries
  const existingRows = findExistingLeadSetRows(techSheet);
  clearExistingLeadEntries(techSheet, existingRows);
  
  // Prepare data for batch write
  const startRow = findFirstEmptyRow(techSheet);
  const values = entries.map(entry => [
    entry.customer,
    entry.businessUnit,
    entry.completionDate,
    entry.amount,
    entry.notes,
    entry.marker
  ]);
  
  // Write all data at once if we have any
  if (values.length > 0) {
    // Batch write all entries
    techSheet.getRange(startRow, 5, values.length, 6).setValues(values);
    
    // Format cells in batch
    techSheet.getRange(startRow, 8, values.length, 1).setNumberFormat('$#,##0.00');
    techSheet.getRange(startRow, 7, values.length, 1).setNumberFormat('mm/dd/yyyy');
  }
}

/**
 * Updates the lead summary information in a batch operation.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician sheet.
 * @param {Number} count - Number of leads.
 * @param {Number} total - Total commission amount.
 */
function updateLeadSummaryInfo(techSheet, count, total) {
  // Update summary info in batch
  const updateRanges = [
    techSheet.getRange(14, 2), // Lead count
    techSheet.getRange(13, 3)  // Commission total
  ];
  
  const updateValues = [
    [count],
    [total]
  ];
  
  // Update count and total
  for (let i = 0; i < updateRanges.length; i++) {
    updateRanges[i].setValue(updateValues[i][0]);
  }
  
  // Format commission total
  updateRanges[1].setNumberFormat('$#,##0.00');
}

/**
 * Finds rows containing "L-E-A-D" in column J of a technician's sheet.
 * This function specifically looks for the lead marker text "L-E-A-D" with dashes.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet to search
 * @return {Array} Array of row indexes (1-based) that have lead entries
 */
function findExistingLeadSetRows(techSheet) {
  try {
    // Get last row with data
    const lastRow = techSheet.getLastRow();
    if (lastRow < 1) return [];
    
    // Get all values from column J (index 10)
    const jColumnValues = techSheet.getRange(1, 10, lastRow, 1).getValues();
    const leadRows = [];
    
    // Look for any variation of "LEAD" in column J (more inclusive search)
    for (let i = 0; i < jColumnValues.length; i++) {
      const cellValue = jColumnValues[i][0]; // First column in our range
      
      // Check if cell contains any variation of lead marker (case insensitive)
      if (cellValue && 
          typeof cellValue === 'string' && 
          (cellValue.toUpperCase().includes('L-E-A-D') || 
           cellValue.toUpperCase().includes('LEAD'))) {
        leadRows.push(i + 1); // +1 for 1-based row index
        console.log(`Found lead marker in row ${i + 1}: "${cellValue}"`);
      }
    }
    
    console.log(`Total lead rows found: ${leadRows.length}`);
    return leadRows;
  } catch (error) {
    console.error(`Error in findExistingLeadSetRows: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    return [];
  }
}

/**
 * Clears existing lead entries from a technician's sheet.
 * Removes content from columns E through J for rows that were identified as lead entries.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet
 * @param {Array} rowIndexes - Array of row indexes (1-based) to clear
 */
function clearExistingLeadEntries(techSheet, rowIndexes) {
  try {
    if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
      console.log("No rows to clear");
      return;
    }
    
    // Log what we're about to do
    console.log(`Clearing ${rowIndexes.length} lead entries in rows: ${rowIndexes.join(', ')}`);
    
    // The last row in the sheet
    const lastRow = techSheet.getLastRow();
    let clearedCount = 0;
    
    // Process rows in batches for efficiency
    for (const rowIndex of rowIndexes) {
      if (rowIndex > 0 && rowIndex <= lastRow) {
        // Clear columns E through J (5-10) without rechecking
        techSheet.getRange(rowIndex, 5, 1, 6).clearContent();
        clearedCount++;
        
        // Also explicitly set column J to empty to ensure the marker is gone
        techSheet.getRange(rowIndex, 10, 1, 1).setValue("");
      } else {
        console.warn(`Invalid row index ${rowIndex}, skipping`);
      }
    }
    
    console.log(`Successfully cleared ${clearedCount} lead entries`);
  } catch (error) {
    console.error(`Error in clearExistingLeadEntries: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

/**
 * Updates the lead summary information in rows 13-14 of a technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Number} count - The number of leads.
 * @param {Number} total - The total lead payment amount.
 */
function updateTopSummaryLeadSet(techSheet, count, total) {
  // Update row 14, column B with lead count
  techSheet.getRange(14, 2).setValue(count);
  
  // Update row 13, column C with commission information
  const totalCell = techSheet.getRange(13, 3);
  totalCell.setValue(total);
  formatLeadSetCells(totalCell);
}

/**
 * Writes new lead entries to the technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @param {Array} entries - Array of lead data objects.
 */
function writeNewLeadEntries(techSheet, entries) {
  if (!entries || entries.length === 0) {
    return;
  }
  
  // Find where to start writing data (first empty row in the commission section)
  const startRow = findFirstEmptyRow(techSheet);
  
  // Prepare data for batch update
  const values = [];
  
  for (const entry of entries) {
    values.push([
      entry.customer || entry.customerName, // Column E: Customer name
      entry.businessUnit || entry.unit,     // Column F: Business unit
      entry.completionDate || entry.date,   // Column G: Completion date
      entry.amount || entry.payment,        // Column H: Commission amount
      entry.notes,                          // Column I: Notes
      'L-E-A-D'                             // Column J: Lead identifier
    ]);
  }
  
  // Write all data at once
  techSheet.getRange(startRow, 5, values.length, 6).setValues(values);
  
  // Format all commission amounts at once
  techSheet.getRange(startRow, 8, values.length, 1).setNumberFormat('$#,##0.00');
  
  // Format all dates at once
  techSheet.getRange(startRow, 7, values.length, 1).setNumberFormat('mm/dd/yyyy');
}

/**
 * Applies proper formatting to lead set cells.
 * 
 * @param {SpreadsheetApp.Range} range - The range to format.
 */
function formatLeadSetCells(range) {
  if (!range) return;
  
  // Determine what to format based on column
  const column = range.getColumn();
  
  if (column === 8 || column === 3) {
    // Commission amount formatting (column H or C)
    range.setNumberFormat('$#,##0.00');
  } else if (column === 7) {
    // Date formatting (column G)
    range.setNumberFormat('mm/dd/yyyy');
  }
}

/**
 * Finds the first empty row in the commission section of a technician's sheet.
 * 
 * @param {SpreadsheetApp.Sheet} techSheet - The technician's sheet.
 * @return {Number} The row number of the first empty row.
 */
function findFirstEmptyRow(techSheet) {
  const data = techSheet.getDataRange().getValues();
  
  // Start from row 2 (index 1) right after the header row
  // and look for the first empty row in columns E-J (indexes 4-9)
  for (let i = 1; i < data.length; i++) {
    // Check if this row is empty in columns E-J
    const rowEmpty = !data[i][4] && !data[i][5] && !data[i][6] && 
                     !data[i][7] && !data[i][8] && !data[i][9];
    
    if (rowEmpty) {
      return i + 1; // +1 because array is 0-indexed, but sheets are 1-indexed
    }
  }
  
  // If no empty row found, return the next row after the last data row
  return data.length + 1;
}

/**
 * Processes all lead set data for all technicians.
 * This function is called from the "All Lead Set" menu item.
 */
function processAllLeadSets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    // Find the Lead Set sheet
    const leadSetSheet = findLeadSetSheet(ss);
    if (!leadSetSheet) {
      ui.alert('Error: Could not find "Lead Set" sheet.');
      return;
    }
    
    // Get all technician names from the Hourly + Spiff Pay sheet
    const ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
    if (!ratesSheet) {
      ui.alert('Error: Could not find "Hourly + Spiff Pay" sheet.');
      return;
    }
    
    // Get rates sheet mapping
    const ratesMapping = getRatesSheetMapping();
    const dataRange = ratesSheet.getRange(
      ratesMapping.dataStartRow, 
      ratesMapping.nameColumn, 
      ratesSheet.getLastRow() - ratesMapping.dataStartRow + 1, 
      1
    );
    
    const technicianNames = dataRange.getValues().flat().filter(name => 
      name && typeof name === 'string' && name.trim() !== ''
    );
    
    if (technicianNames.length === 0) {
      ui.alert('No technicians found in Hourly + Spiff Pay sheet.');
      return;
    }
    
    let processedCount = 0;
    let skippedCount = 0;
    const processedTechs = [];
    const skippedTechs = [];
    
    // Process each technician
    for (const techName of technicianNames) {
      const techSheet = ss.getSheetByName(techName);
      
      if (!techSheet) {
        skippedTechs.push(techName + ' (Sheet not found)');
        skippedCount++;
        continue;
      }
      
      try {
        // Get lead data for this technician
        const leadData = getLeadDataForTechnician(leadSetSheet, techName);
        
        // Write the lead data to the technician's sheet
        writeLeadSetDataToSheet(techSheet, leadData);
        
        processedTechs.push(techName);
        processedCount++;
      } catch (err) {
        skippedTechs.push(techName + ': ' + err.message);
        skippedCount++;
        Logger.log("Error processing " + techName + ": " + err.message);
      }
    }
    
    // Display summary message
    const summaryMessage = `LEAD SET PROCESSING COMPLETE

SUMMARY:
• Processed: ${processedCount} technicians
${processedCount > 0 ? '• ' + processedTechs.join(', ') : ''}
${skippedCount > 0 ? '\nSkipped: ' + skippedCount + ' technicians\n• ' + skippedTechs.join('\n• ') : ''}`;
    
    ui.alert(summaryMessage);
    
  } catch (e) {
    Logger.log("Error in processAllLeadSets: " + e.message);
    SpreadsheetApp.getUi().alert("Error processing lead sets: " + e.message);
  }
}

/**
 * Gets the field mappings for the Hourly + Spiff Pay sheet
 * @return {Object} An object containing column indexes for important fields
 */
function getRatesSheetMapping() {
  return {
    nameColumn: 1,       // Column A - Technician name
    positionColumn: 2,   // Column B - Position
    rateColumn: 4,       // Column D - Base Rate
    actionColumn: 7,     // Column G - Action column
    dataStartRow: 3      // Data starts at row 3
  };
} 