/**
 * Cardinal Payroll System - New Technician Sheet
 * This script handles creating new technician sheets.
 */

/**
 * Creates a new technician sheet based on the Template for Service
 */
function createNewTechnicianSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Prompt for technician name
  var response = ui.prompt(
    'Create New Technician Sheet',
    'Enter the technician\'s name:',
    ui.ButtonSet.OK_CANCEL);
  
  // Get the response
  var button = response.getSelectedButton();
  var techName = response.getResponseText();
  
  if (button !== ui.Button.OK || !techName) {
    return;
  }
  
  // Check if the sheet already exists
  try {
    var existingSheet = ss.getSheetByName(techName);
    if (existingSheet) {
      ui.alert('A sheet with this name already exists.');
      return;
    }
  } catch (e) {
    // Sheet doesn't exist, which is what we want
  }
  
  // Get the template sheet
  var templateSheet = ss.getSheetByName('Template for Service');
  if (!templateSheet) {
    ui.alert('Template for Service sheet not found.');
    return;
  }
  
  // Create a new sheet by copying the template
  var newSheet = templateSheet.copyTo(ss);
  newSheet.setName(techName);
  
  // Get mapping for rates sheet and new technician sheet
  var ratesMapping = getRatesSheetMapping();
  var mapping = getTechnicianSheetMapping(newSheet);
  
  // Check if the technician exists in the Hourly + Spiff Pay sheet
  var ratesSheet = ss.getSheetByName('Hourly + Spiff Pay');
  var ratesData = ratesSheet.getDataRange().getValues();
  
  var techFound = false;
  var techPosition = '';
  var techRate = 0;
  var departmentAndBusinessUnit = ''; // Variable to store combined value
  
  for (var i = ratesMapping.dataStartRow - 1; i < ratesData.length; i++) {
    if (ratesData[i][ratesMapping.nameColumn - 1] === techName) {
      techFound = true;
      techPosition = ratesData[i][ratesMapping.positionColumn - 1];
      techRate = ratesData[i][ratesMapping.rateColumn - 1];
      var department = ratesData[i][1]; // Column B (0-based index 1) contains the department
      var businessUnit = ratesData[i][2]; // Column C (0-based index 2) contains the business unit
      departmentAndBusinessUnit = department + " / " + businessUnit; // Combine B and C with format 'B / C'
      break;
    }
  }
  
  // Get the current pay period
  var currentPayPeriod = getCurrentPayPeriod();
  
  // Update the new sheet
  newSheet.getRange(1, 1).setValue(techName);
  
  // Update pay period regardless of whether the tech was found
  newSheet.getRange(mapping.payPeriodRow, 1).setValue("Pay Period: " + currentPayPeriod);
  
  if (techFound) {
    // Set combined department and business unit in cell A3
    newSheet.getRange(mapping.positionRow, 1).setValue(departmentAndBusinessUnit);
    // Update the hourly rate in the new location (cell C4)
    newSheet.getRange(mapping.hourlyRateRow, mapping.rateValueColumn).setValue(techRate);
    ui.alert('Technician sheet created with data from Hourly + Spiff Pay.');
  } else {
    ui.alert('Technician sheet created, but the technician was not found in Hourly + Spiff Pay. Please add them to that sheet and run Update All Technician Rates.');
  }
}

/**
* Gets the field mappings for a technician sheet
* @param {Sheet} sheet - The technician sheet to map
* @return {Object} An object containing row and column indexes for important fields
*/
function getTechnicianSheetMapping(sheet) {
  return {
    payPeriodRow: 2,      // Row containing the pay period text
    positionRow: 3,       // Row containing the position
    hourlyRateRow: 4,     // Row containing hourly rate information (updated from 5 to 4)
    valueColumn: 2,       // Column B - Main value column
    rateValueColumn: 3,   // Column C - For the rate value in C4 (new)
    ptoRateColumn: 7      // Column G - PTO rate column
  };
}