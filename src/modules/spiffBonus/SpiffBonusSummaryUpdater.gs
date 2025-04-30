/**
 * Cardinal Payroll System - Spiff/Bonus Summary Updater
 * Contains functions for updating the summary section at the top of technician sheets.
 */

/**
 * Updates the total spiff amount in the technician's top summary section.
 * ONLY updates cells B11 and C11 for the Total Spiff row.
 * Does not modify any other cells in the spreadsheet.
 *
 * @param {Sheet} techSheet The technician's sheet object.
 * @param {number} totalSpiff The calculated total spiff amount.
 * @param {number} spiffCount The number of spiff entries.
 */
function updateTopSummarySpiffs(techSheet, totalSpiff, spiffCount) {
  if (!techSheet || totalSpiff === undefined || totalSpiff === null) {
    console.error("updateTopSummarySpiffs: Invalid parameters");
    return;
  }

  try {
    // ONLY set Total Spiff data directly in row 11 as per screenshot
    // Column B gets the count
    techSheet.getRange("B11").setValue(spiffCount);
    
    // Column C gets the amount
    techSheet.getRange("C11").setValue(totalSpiff).setNumberFormat('$#,##0.00');
    
    console.log(`Updated Total Spiff row 11: Count=${spiffCount}, Amount=${totalSpiff}`);
    console.log(`Updated summary for ${techSheet.getName()}: Spiffs=${spiffCount}, Total Spiff=$${totalSpiff}`);
    
  } catch (e) {
    console.error("Error updating top summary spiffs: " + e);
  }
} 