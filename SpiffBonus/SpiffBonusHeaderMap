/**
 * Creates an object mapping expected "Spiff/Bonus" sheet column headers to their 1-based column index.
 * Uses flexible matching to accommodate variations in header names.
 *
 * @param {Sheet} sheet - The Spiff/Bonus sheet object.
 * @return {Object} An object where keys are standardized header names (e.g., 'customerName')
 *                  and values are the corresponding 1-based column indices.
 *                  Returns null for keys if the header is not found.
 */
function getSpiffBonusHeaderMap(sheet) {
  if (!sheet) {
    console.error("getSpiffBonusHeaderMap: Sheet object is required.");
    return {}; // Return empty map if no sheet provided
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {
    customerName: null,
    jobBusinessUnit: null,
    completionDate: null,
    soldBy: null,
    assignedTechnician: null,
    bonusAmount: null,
    actualBonusAmount: null, // For cases where bonus amount is boolean/true
    itemName: null,
    crossSaleGroup: null
  };
 
  for (var c = 0; c < headers.length; c++) {
    var h = (headers[c] || "").toString().trim().toLowerCase();
    var columnIndex = c + 1;
 
    // Match based on common variations
    if (!map.customerName && h.includes("customer") && (h.includes("name") || h.includes("client"))) {
      map.customerName = columnIndex;
    }
    else if (!map.jobBusinessUnit && (h.includes("business") && h.includes("unit") || h.includes("bu") || h === "dept")) {
      map.jobBusinessUnit = columnIndex;
    }
    else if (!map.completionDate && ((h.includes("completion") || h.includes("complete")) && h.includes("date"))) {
      map.completionDate = columnIndex;
    }
    else if (!map.completionDate && (h === "date" || h === "job date")) { // Allow fallback generic date
      map.completionDate = columnIndex;
    }
    else if (!map.soldBy && (h.includes("sold") && h.includes("by"))) {
      map.soldBy = columnIndex;
    }
    else if (!map.assignedTechnician && (h === "tech" || h === "technician" || h === "assigned tech")) {
      map.assignedTechnician = columnIndex;
    }
    else if (!map.bonusAmount && (h.includes("bonus") || h.includes("spiff") || h.includes("commission") || h.includes("amt") || h.includes("amount") || h.includes("$"))) {
      // Prioritize finding the *main* bonus amount column first
      if (h === "bonus" || h === "bonus amount" || h === "spiff" || h === "spiff amount") { // More specific names take precedence
          map.bonusAmount = columnIndex;
      }
    }
    else if (!map.itemName && ((h.includes("item") && h.includes("name")) || h === "task" || h === "service" || h === "description")) {
      map.itemName = columnIndex;
    }
  }
 
  // --- Refinements and Fallbacks ---
 
  // Improved assignedTechnician detection for plural forms
  if (!map.assignedTechnician) {
    for (var c = 0; c < headers.length; c++) {
      var h = (headers[c] || "").toString().trim().toLowerCase();
      var columnIndex = c + 1;
      if ((h.includes("assigned") && (h.includes("tech") || h.includes("technician"))) || 
          h === "technicians" || h === "assigned techs") {
        map.assignedTechnician = columnIndex;
        console.log(`Found assignedTechnician with plural form: '${headers[c]}' in column ${columnIndex}`);
        break;
      }
    }
  }
 
  // --- Specific Check for '$ Bonus' ---
  // Try to find '$ Bonus' specifically before broad fallbacks, as it often holds the actual value.
  if (!map.actualBonusAmount || !map.bonusAmount) { // Check if either is still needed
      for (var c_dollar = 0; c_dollar < headers.length; c_dollar++) {
          var h_dollar = (headers[c_dollar] || "").toString().trim().toLowerCase();
          var colIdx_dollar = c_dollar + 1;
          if (h_dollar === "$ bonus" || h_dollar === "bonus $" || h_dollar === "actual bonus" || h_dollar === "actual spiff") { // More specific check
              if (!map.actualBonusAmount) { // Prioritize filling actualBonusAmount
                  map.actualBonusAmount = colIdx_dollar;
                  console.log(`Found potential actualBonusAmount via specific check: '${headers[c_dollar]}' in column ${colIdx_dollar}`);
              }
              if (!map.bonusAmount) { // Also fill bonusAmount if it's empty
                  map.bonusAmount = colIdx_dollar;
                  console.log(`Assigning bonusAmount based on specific check: '${headers[c_dollar]}' in column ${colIdx_dollar}`);
              }
              // If we found it for both needed slots, we can stop searching this specific pattern
              if (map.actualBonusAmount && map.bonusAmount) {
                  break;
              }
          }
      }
  }
 
  // If the primary bonus amount wasn't found with specific terms OR the specific '$ Bonus' check, try broader terms again
  if (!map.bonusAmount) {
     for (var c2 = 0; c2 < headers.length; c2++) {
         var h2 = (headers[c2] || "").toString().trim().toLowerCase();
         var colIdx2 = c2 + 1;
         if (h2.includes("bonus") || h2.includes("spiff") || h2.includes("commission") || h2.includes("amt") || h2.includes("amount") || h2.includes("$")) {
             map.bonusAmount = colIdx2;
             console.log(`Fallback found bonusAmount: '${headers[c2]}' in column ${colIdx2}`);
             break; // Take the first match found this way
         }
     }
  }
 
  // Look for 'Actual Bonus Amount' or similar, often in the column *after* the main bonus column
  // This might be redundant now but leave as a secondary check
  if (map.bonusAmount && !map.actualBonusAmount) { // Only run if actual still missing
    var nextIndex = map.bonusAmount; // This is 1-based index + 1 = next column index
    if (nextIndex < headers.length) { // Check if next column exists
      var nextHeader = (headers[nextIndex] || "").toString().trim().toLowerCase();
      // Check if the *next* column seems like an amount column (useful if main one is boolean)
      if (nextHeader.includes("actual") || nextHeader.includes("$") || nextHeader.includes("amount") || nextHeader.includes("value")) {
        map.actualBonusAmount = nextIndex + 1; // map.bonusAmount is 1-based, headers is 0-based, so +1 gets 1-based next col index
        console.log(`Found actualBonusAmount: '${headers[nextIndex]}' in column ${map.actualBonusAmount}`);
      }
    }
  }
 
  // Second attempt to find actualBonusAmount anywhere in the headers (if specific check and next col failed)
  if (!map.actualBonusAmount) {
    for (var c = 0; c < headers.length; c++) {
      var h = (headers[c] || "").toString().trim().toLowerCase();
      var columnIndex = c + 1;
      if ((h.includes("actual") && (h.includes("bonus") || h.includes("amount"))) || 
          h === "$ bonus" || h === "bonus $" || h === "$ amount") {
        map.actualBonusAmount = columnIndex;
        console.log(`Found actualBonusAmount in separate search: '${headers[c]}' in column ${columnIndex}`);
        break;
      }
    }
  }
 
  // If 'Sold By' wasn't found, specifically check for "Sold By Technician"
  if (!map.soldBy) {
    for (var c3 = 0; c3 < headers.length; c3++) {
      var hh = (headers[c3] || "").toString().trim(); // Case-sensitive check might be needed?
      if (hh === "Sold By Technician") {
        map.soldBy = c3 + 1;
        console.log(`Found Sold By column: '${hh}' in column ${map.soldBy}`);
        break;
      }
    }
  }
 
  // Add logic to find 'Cross Sale Group'
  if (!map.crossSaleGroup) {
    for (var c4 = 0; c4 < headers.length; c4++) {
      var h4 = (headers[c4] || "").toString().trim().toLowerCase();
      var colIdx4 = c4 + 1;
      if (h4.includes("cross") && h4.includes("sale") && h4.includes("group")) {
        map.crossSaleGroup = colIdx4;
        console.log(`Found crossSaleGroup: '${headers[c4]}' in column ${colIdx4}`);
        break;
      }
    }
  }
  // If still not found, try a simpler match (e.g., check column J explicitly if headers are consistent)
  if (!map.crossSaleGroup && headers.length >= 10) { // Check if Column J exists
     var headerJ = (headers[9] || "").toString().trim().toLowerCase(); // Index 9 is Column J
     if (headerJ.includes("cross") && headerJ.includes("sale")) {
         map.crossSaleGroup = 10; // Default to Column J (index 10)
         console.log(`Assumed crossSaleGroup: '${headers[9]}' in column 10 (J)`);
     }
  }
 
  // Last resort: If specific key headers are *still* missing, assign defaults or log warnings
  // Example: Default 'Sold By' to column F (index 6) if absolutely necessary
  if (!map.soldBy) {
    console.warn("Could not find 'Sold By' column header. Defaulting to Column F (index 6). This may be incorrect.");
    map.soldBy = 6;
  }
 
  // --- Final Check ---
  // If actualBonusAmount is still null, but bonusAmount refers to a column
  // that clearly holds a numeric value (like '$ Bonus'), use it for actualBonusAmount.
  if (map.bonusAmount !== null && map.actualBonusAmount === null) {
    var bonusHeaderIndex = map.bonusAmount - 1; // 0-based index
    if (bonusHeaderIndex >= 0 && bonusHeaderIndex < headers.length) {
      var bonusHeader = (headers[bonusHeaderIndex] || "").toString().trim().toLowerCase();
      // Check if this header strongly implies a numeric value was found
      if (bonusHeader.includes("$") || bonusHeader.includes("actual") || bonusHeader === "$ bonus" || bonusHeader === "bonus $" || bonusHeader.includes("value")) {
         map.actualBonusAmount = map.bonusAmount;
         console.log(`Assigning actualBonusAmount based on the identified bonusAmount column ('${headers[bonusHeaderIndex]}' in column ${map.bonusAmount}) as a final fallback.`);
      }
    }
  }
 
  // Log any headers that were not successfully mapped
  for (var key in map) {
     if (map[key] === null) {
         console.warn(`Header key '${key}' could not be mapped to a column in the Spiff/Bonus sheet.`);
     }
  }
 
  console.log("Spiff/Bonus Header Map: ", map);
  return map;
 } 