/**
* Payroll System - Yard Sign Utilities
* Contains utility functions for yard sign operations.
*/

/**
* Safe wrapper for accessing or modifying cells to prevent validation errors
* @param {function} operation - Function that performs the cell operation
* @return {any} Result of the operation or null if it failed
*/
function safeOperation(operation) {
  try {
    return operation();
  } catch (e) {
    console.error("Safe operation failed: " + e.message);
    return null;
  }
}

/**
* Validates that the yard sign sheet exists and has the required columns.
* @param {Sheet} yardSignSheet - The Yard Sign sheet to validate.
* @return {Object} Object with validation result and error message.
*/
function validateYardSignSheet(yardSignSheet) {
  if (!yardSignSheet) {
    return { isValid: false, message: "Yard Sign sheet not found" };
  }
  
  try {
    // Check if the sheet has at least one row
    var lastRow = yardSignSheet.getLastRow();
    if (lastRow < 1) {
      return { isValid: false, message: "Yard Sign sheet is empty" };
    }
    
    // Get the header row safely without triggering validation errors
    var headerValues;
    try {
      // Use getDisplayValues instead of getValue to avoid triggering validation
      headerValues = yardSignSheet.getRange(1, 1, 1, yardSignSheet.getLastColumn()).getDisplayValues()[0];
      console.log("Found headers in Yard Sign sheet: " + headerValues.filter(Boolean).join(", "));
    } catch (headerError) {
      console.error("Error reading header row: " + headerError.message);
      return { isValid: false, message: "Error reading header row: " + headerError.message };
    }
    
    // Required columns and their possible alternate names based on actual spreadsheet
    var requiredColumnVariants = {
      "Customer Name": ["customer", "client", "name", "customer name", "customerName"],
      "Job #": ["job #", "job", "job number", "job#", "jobnumber"],
      "Business Unit": ["business unit", "business", "unit", "bu", "division"],
      "Completion Date": ["completion date", "completion", "install date", "date", "installation date", "installed", "installed date", "installdate"],
      "Jobs Total": ["jobs total", "total", "job total", "amount", "fee", "price", "payment", "cost", "charge", "pay", "$"],
      "Assigned Technicians": ["assigned technicians", "technician", "tech", "installer", "employee", "worker", "person", "staff", "assigned tech", "technicians"]
    };
    
    // Check for missing columns with flexible matching
    var missingColumns = [];
    var foundColumns = {};
    
    // For each required column key
    for (var mainColumn in requiredColumnVariants) {
      var variants = requiredColumnVariants[mainColumn];
      var found = false;
      
      // Check if any header matches any variant of this column
      for (var j = 0; j < headerValues.length; j++) {
        var headerValue = headerValues[j];
        if (!headerValue) continue;
        
        var headerText = headerValue.toString().trim().toLowerCase();
        
        // Check if this header matches any of the variants
        if (variants.some(variant => headerText.includes(variant))) {
          found = true;
          foundColumns[mainColumn] = headerValue; // Store the actual header name found
          break;
        }
      }
      
      if (!found) {
        missingColumns.push(mainColumn);
      }
    }
    
    if (missingColumns.length > 0) {
      console.log("Found columns: " + Object.values(foundColumns).join(", "));
      return { 
        isValid: false, 
        message: "Missing required columns in Yard Sign sheet: " + missingColumns.join(", ") 
      };
    }
    
    return { isValid: true, message: "Yard Sign sheet is valid" };
  } catch (e) {
    return { isValid: false, message: "Error validating Yard Sign sheet: " + e.message };
  }
}

/**
* Gets the rates sheet mapping for the 'Hourly + Spiff Pay' sheet.
* @return {Object} An object containing column indices.
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

/**
* Processes all yard signs
* Only processes technicians with existing sheets
* @param {function} statusCallback - Optional callback function for status updates
* @return {object} Result information including success status, message, and processed technicians
*/
function processAllYardSignsUtility(statusCallback) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
    
    if (!ratesSheet) {
      return { success: false, message: "Could not find 'Hourly + Spiff Pay' sheet" };
    }
    
    // Get or create yard sign sheet with proper structure
    var yardSignSheet;
    try {
      yardSignSheet = ensureYardSignSheetExists();
    } catch (sheetError) {
      return { 
        success: false, 
        message: "Error ensuring Yard Sign sheet exists: " + sheetError.message
      };
    }
    
    // Log sheet information
    console.log("Found Yard Sign sheet: " + yardSignSheet.getName() + 
               " with " + yardSignSheet.getLastRow() + " rows and " + 
               yardSignSheet.getLastColumn() + " columns");
    
    // Get rates sheet mapping
    var mapping = getRatesSheetMapping();
    
    // Get all technician names from the rates sheet safely
    var techNames = [];
    try {
      var dataRange = ratesSheet.getRange(
        mapping.dataStartRow, 
        mapping.nameColumn, 
        ratesSheet.getLastRow() - mapping.dataStartRow + 1, 
        1
      );
      techNames = dataRange.getValues();
    } catch (e) {
      console.error("Error getting technician names: " + e.message);
      return { success: false, message: "Error getting technician names: " + e.message };
    }
    
    // Get all existing sheet names to check against
    var allSheets = ss.getSheets();
    var existingSheetNames = allSheets.map(function(sheet) {
      return sheet.getName();
    });
    
    var processedTechs = [];    // Array to store processed technician info
    var errorMessages = [];     // Array to store error messages
    var skippedTechs = [];      // Array to store skipped technicians
    var processedCount = 0;     // Count of technicians with entries
    var totalEntryCount = 0;    // Total count of yard sign entries
    
    // Process each technician
    for (var i = 0; i < techNames.length; i++) {
      var techName = techNames[i][0];
      if (!techName) {
        continue; // Skip empty rows
      }
      
      // Skip technicians without an existing sheet
      if (existingSheetNames.indexOf(techName) === -1) {
        console.log("Skipping " + techName + " - no sheet exists");
        continue;
      }
      
      // Update status if callback provided
      if (statusCallback) {
        statusCallback("Processing " + techName + " (" + (i+1) + "/" + techNames.length + ")");
      }
      
      try {
        // Get the technician's sheet (we already know it exists)
        var techSheet = ss.getSheetByName(techName);
        
        // --- Check if the technician is an apprentice with 0% commission rate ---
        var isApprenticeWith0Percent = false;
        try {
          // Find the technician's row in the rates sheet
          var technicianRow = -1;
          for (var j = 1; j < ratesSheet.getLastRow(); j++) { // Skip header row
            var name = ratesSheet.getRange(j, 1).getValue();
            if (name && name.toString().trim().toLowerCase() === techName.toLowerCase()) {
              technicianRow = j;
              break;
            }
          }
          
          if (technicianRow >= 0) {
            var title = ratesSheet.getRange(technicianRow, 3).getValue(); // Column C - Position
            var commissionPercentStr = ratesSheet.getRange(technicianRow, 8).getValue(); // Column H - Commission %
            
            // Parse the commission percentage
            var commissionPercent = 0;
            if (typeof commissionPercentStr === "string" && commissionPercentStr.includes("%")) {
              commissionPercent = parseFloat(commissionPercentStr.replace("%", "")) || 0;
            } else if (typeof commissionPercentStr === "number") {
              commissionPercent = commissionPercentStr < 1 ? commissionPercentStr * 100 : commissionPercentStr;
            }
            
            // Check if it's an apprentice with 0% commission
            if (title && title.toString().includes("Apprentice") && commissionPercent === 0) {
              isApprenticeWith0Percent = true;
              console.log(`Skipping Yard Sign processing for apprentice with 0% commission: ${techName}`);
              
              // Update summary to 0 and clear any existing yard sign entries
              updateTopSummaryYardSignPay(techSheet, 0, 0);
              clearExistingYardSignEntries(techSheet);
              
              // Add to skipped techs list
              skippedTechs.push(techName + ": Apprentice with 0% commission - No yard sign pay earned");
              continue;
            }
          }
        } catch (e) {
          console.error(`Error checking apprentice status: ${e.message}`);
          // Continue with processing to be safe
        }
        
        // Calculate yard sign entries for this technician
        var result = calculateYardSignEntries(techName, yardSignSheet);
        
        // If there are entries, write them to the technician's sheet
        if (result.entries.length > 0) {
          writeYardSignDataToSheet(techSheet, result.entries, result.totalAmount);
          processedCount++;
          totalEntryCount += result.entries.length;
          
          // Add info to the processed technicians array
          processedTechs.push({
            name: techName,
            count: result.entries.length,
            total: result.totalAmount
          });
          
          console.log("Processed " + result.entries.length + " yard sign entries for " + techName);
        } else {
          skippedTechs.push(techName + ": No entries found");
          console.log("No yard sign entries found for " + techName);
        }
      } catch (e) {
        errorMessages.push(techName + ": " + e.message);
        console.error("Error processing yard signs for " + techName + ": " + e.message);
      }
    }
    
    return {
      success: true,
      message: "Processed yard signs for " + processedCount + " technicians. Total entries: " + totalEntryCount,
      processed: processedTechs,         // Array of processed tech info objects
      errors: errorMessages,             // Array of error messages
      skipped: skippedTechs,             // Array of skipped tech messages
      totalCount: totalEntryCount        // Total count of all yard sign entries
    };
  } catch (e) {
    return { success: false, message: "Error processing all yard signs: " + e.message };
  }
}

/**
* Creates or updates the Yard Sign sheet with proper headers if it doesn't exist or is missing required columns.
* @return {Sheet} The Yard Sign sheet object
*/
function ensureYardSignSheetExists() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var yardSignSheet = ss.getSheetByName('Yard Sign');
  
  if (!yardSignSheet) {
    console.log("Yard Sign sheet not found, creating it...");
    yardSignSheet = ss.insertSheet('Yard Sign');
  }
  
  // Check if the sheet already has headers
  var lastRow = yardSignSheet.getLastRow();
  var lastCol = yardSignSheet.getLastColumn();
  
  // If sheet is empty or only has 1 cell filled, set up headers
  if (lastRow <= 1 && lastCol <= 1) {
    var headers = [
      "Customer Name", 
      "Job #", 
      "Business Unit", 
      "Completion Date", 
      "Jobs Total", 
      "Tags", 
      "Assigned Technicians"
    ];
    
    // Set headers
    yardSignSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    yardSignSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f3f3f3");
    
    // Set column formats
    yardSignSheet.getRange(2, 4, 999, 1).setNumberFormat("MM/dd/yyyy"); // Date format for Completion Date
    yardSignSheet.getRange(2, 5, 999, 1).setNumberFormat("$#,##0.00"); // Currency format for Jobs Total
    
    // Auto-resize columns
    for (var i = 1; i <= headers.length; i++) {
      yardSignSheet.autoResizeColumn(i);
    }
    
    // Add data validation for business unit if needed
    // This is optional - uncomment if you want to add a dropdown
    /*
    var businessUnitRange = yardSignSheet.getRange(2, 3, 999, 1);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Main', 'Commercial', 'Residential'], true)
      .build();
    businessUnitRange.setDataValidation(rule);
    */
    
    console.log("Created new Yard Sign sheet with proper headers");
  } else {
    // Validate the sheet structure
    var validation = validateYardSignSheet(yardSignSheet);
    if (!validation.isValid) {
      console.log("Yard Sign sheet structure is invalid: " + validation.message);
      
      // Try to fix by adding any missing columns to the existing sheet
      var currentHeaders = yardSignSheet.getRange(1, 1, 1, yardSignSheet.getLastColumn()).getDisplayValues()[0];
      
      // Required column names
      var requiredColumns = [
        "Customer Name", 
        "Job #", 
        "Business Unit", 
        "Completion Date", 
        "Jobs Total", 
        "Tags", 
        "Assigned Technicians"
      ];
      
      // Identify which required columns are missing
      var missingColumns = [];
      for (var i = 0; i < requiredColumns.length; i++) {
        var columnName = requiredColumns[i];
        if (findColumnIndex(currentHeaders, columnName) === -1) {
          missingColumns.push(columnName);
        }
      }
      
      // If there are missing columns, append them
      if (missingColumns.length > 0) {
        console.log("Adding missing columns: " + missingColumns.join(", "));
        
        // Get the next available column index
        var nextCol = yardSignSheet.getLastColumn() + 1;
        
        // Add each missing column
        for (var i = 0; i < missingColumns.length; i++) {
          yardSignSheet.getRange(1, nextCol + i).setValue(missingColumns[i]);
        }
        
        // Format the new headers
        if (missingColumns.length > 0) {
          yardSignSheet.getRange(1, nextCol, 1, missingColumns.length)
            .setFontWeight("bold")
            .setBackground("#f3f3f3");
        }
        
        // Set appropriate number formats for special columns
        var completionDateIdx = findColumnIndex(missingColumns, "Completion Date");
        if (completionDateIdx !== -1) {
          yardSignSheet.getRange(2, nextCol + completionDateIdx - 1, 999, 1).setNumberFormat("MM/dd/yyyy");
        }
        
        var jobsTotalIdx = findColumnIndex(missingColumns, "Jobs Total");
        if (jobsTotalIdx !== -1) {
          yardSignSheet.getRange(2, nextCol + jobsTotalIdx - 1, 999, 1).setNumberFormat("$#,##0.00");
        }
        
        console.log("Added missing columns to Yard Sign sheet");
      }
    }
  }
  
  return yardSignSheet;
} 