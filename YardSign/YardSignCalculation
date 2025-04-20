/**
* Payroll System - Yard Sign Calculation
* Handles calculation of yard sign pay amounts.
*/

/**
* Safe wrapper for accessing sheet data to prevent validation errors
* @param {function} operation - Function that performs the cell operation
* @return {any} Result of the operation or null if it failed
*/
function safeCalculationOperation(operation) {
  try {
    return operation();
  } catch (e) {
    console.error("Safe calculation operation failed: " + e.message);
    return null;
  }
}

/**
* Calculates yard sign entries for a technician.
* @param {string} technicianName - The name of the technician.
* @param {Sheet} yardSignSheet - The Yard Sign sheet.
* @return {Object} Object containing calculated entries and total amount.
*/
function calculateYardSignEntries(technicianName, yardSignSheet) {
  if (!technicianName || !yardSignSheet) {
    console.error("calculateYardSignEntries: Invalid arguments");
    return { entries: [], totalAmount: 0 };
  }

  try {
    // Get all data from the Yard Sign sheet
    var lastRow = yardSignSheet.getLastRow();
    var lastCol = yardSignSheet.getLastColumn();
    
    // Ensure we have data to process
    if (lastRow <= 1) {
      console.log("Yard Sign sheet has no data");
      return { entries: [], totalAmount: 0 };
    }
    
    // Get all data as a 2D array - use getDisplayValues to avoid triggering validation rules
    var data;
    try {
      // Use safe operation wrapper
      data = safeCalculationOperation(function() {
        return yardSignSheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
      });
      
      if (!data) {
        console.error("Failed to safely get Yard Sign data");
        return { entries: [], totalAmount: 0 };
      }
    } catch (dataError) {
      console.error("Error reading Yard Sign data: " + dataError.message);
      return { entries: [], totalAmount: 0 };
    }
    
    // Find column indices (1-based)
    var headerRow = data[0];
    console.log("Yard Sign sheet headers: " + headerRow.filter(Boolean).join(", "));
    
    var colIndices = {
      customerName: findColumnIndex(headerRow, "Customer Name"),
      jobNumber: findColumnIndex(headerRow, "Job #"),
      businessUnit: findColumnIndex(headerRow, "Business Unit"),
      completionDate: findColumnIndex(headerRow, "Completion Date"),
      jobsTotal: findColumnIndex(headerRow, "Jobs Total"),
      tags: findColumnIndex(headerRow, "Tags"),
      assignedTech: findColumnIndex(headerRow, "Assigned Technicians")
    };
    
    // Log found column indices for debugging
    console.log("Found column indices: " + JSON.stringify(colIndices));
    
    // Validate column indices - we need at minimum the technician and amount columns
    if (colIndices.assignedTech === -1) {
      console.error("Could not find Assigned Technicians column in Yard Sign sheet - this is required");
      return { entries: [], totalAmount: 0 };
    }
    
    // Check if the 'Tags' column was found, as it's now needed for calculation
    if (colIndices.tags === -1) {
      console.error("Could not find Tags column in Yard Sign sheet - this is required for the new payment logic");
      return { entries: [], totalAmount: 0 };
    }
    
    if (colIndices.jobsTotal === -1) {
      // Although Jobs Total isn't directly used for the *new* calculation, keep the check
      // as it might be relevant contextually or for future features.
      console.warn("Jobs Total column not found in Yard Sign sheet.");
    }
    
    // Other columns can have default values if missing
    if (colIndices.customerName === -1) {
      console.warn("Customer Name column not found - using default values");
    }
    
    if (colIndices.jobNumber === -1) {
      console.warn("Job # column not found - using default values");
    }
    
    if (colIndices.completionDate === -1) {
      console.warn("Completion Date column not found - using default values");
    }
    
    // Find entries for this technician
    var entries = [];
    var totalAmount = 0;
    var countYardSigns = 0; // Keep this count if needed elsewhere, though totalAmount is now variable
    
    for (var i = 1; i < data.length; i++) { // Skip header row
      var row = data[i];
      
      // Ensure row has data for both assigned tech and tags columns
      if (row.length < Math.max(colIndices.assignedTech, colIndices.tags) || 
          !row[colIndices.assignedTech - 1]) {
          continue; // Skip row if essential data is missing or too short
      }
      
      var rowTechName = row[colIndices.assignedTech - 1]; // Convert to 0-based
      
      // Check if this row is for our technician (case insensitive)
      if (rowTechName.toString().trim().toLowerCase().includes(technicianName.toLowerCase())) {
        // Get the tags for this row
        var tags = row[colIndices.tags - 1] ? row[colIndices.tags - 1].toString().toLowerCase() : "";
        
        // Determine amount based on tags
        var amount;
        if (tags.includes("yard sign w/ pic")) {
          amount = 25;
        } else {
          amount = 10;
        }
        
        countYardSigns++; // Increment count for logging/summary purposes
        
        var entry = {
          customerName: colIndices.customerName > 0 && row.length > colIndices.customerName - 1 ? 
                       (row[colIndices.customerName - 1] || "Yard Sign Customer") : "Yard Sign Customer",
          location: colIndices.jobNumber > 0 && row.length > colIndices.jobNumber - 1 ? 
                  (row[colIndices.jobNumber - 1] || "Job # not specified") : "Job # not specified",
          installDate: colIndices.completionDate > 0 && row.length > colIndices.completionDate - 1 ? 
                     row[colIndices.completionDate - 1] : new Date().toLocaleDateString(),
          amount: amount, // Use the calculated amount
          businessUnit: colIndices.businessUnit > 0 && row.length > colIndices.businessUnit - 1 ? 
                     row[colIndices.businessUnit - 1] || "" : ""
        };
        
        entries.push(entry);
        totalAmount += amount;
      }
    }
    
    console.log("Found " + entries.length + " yard sign entries for " + technicianName + 
                " totaling $" + totalAmount.toFixed(2));
    
    return {
      entries: entries,
      totalAmount: totalAmount
    };
  } catch (e) {
    console.error("Error calculating yard sign entries: " + e.message);
    return { entries: [], totalAmount: 0 };
  }
}

/**
* Helper function to find column index by header name.
* @param {Array} headerRow - The header row array.
* @param {string} columnName - The name of the column to find.
* @return {number} The 1-based column index or -1 if not found.
*/
function findColumnIndex(headerRow, columnName) {
  // Define possible variants for common column names based on actual spreadsheet
  var columnVariants = {
    "Customer Name": ["customer", "client", "name", "customer name", "customerName"],
    "Job #": ["job #", "job", "job number", "job#", "jobnumber", "location"],
    "Business Unit": ["business unit", "business", "unit", "bu", "division"],
    "Completion Date": ["completion date", "completion", "install date", "date", "installation date", "installed", "installed date", "installdate"],
    "Jobs Total": ["jobs total", "total", "job total", "amount", "fee", "price", "payment", "cost", "charge", "pay", "$"],
    "Tags": ["tags", "tag", "notes", "note", "comment", "comments", "description"],
    "Assigned Technicians": ["assigned technicians", "technician", "tech", "installer", "employee", "worker", "person", "staff", "assigned tech", "technicians"]
  };
  
  // Get possible variants for the requested column
  var variants = columnVariants[columnName] || [columnName.toLowerCase()];
  
  // First try exact match
  for (var i = 0; i < headerRow.length; i++) {
    var header = headerRow[i];
    if (header && header.toString().trim().toLowerCase() === columnName.toLowerCase()) {
      console.log(`Found exact match for column "${columnName}" at position ${i+1}: "${header}"`);
      return i + 1; // Convert to 1-based index
    }
  }
  
  // Then try partial matches with variants
  for (var i = 0; i < headerRow.length; i++) {
    var header = headerRow[i];
    if (!header) continue;
    
    var headerText = header.toString().trim().toLowerCase();
    
    // Check if this header includes any of the variants
    if (variants.some(variant => headerText.includes(variant))) {
      console.log(`Found variant match for column "${columnName}" at position ${i+1}: "${header}"`);
      return i + 1; // Convert to 1-based index
    }
  }
  
  console.log(`Column not found: "${columnName}". Available headers: ${headerRow.filter(Boolean).join(', ')}`);
  return -1;
} 