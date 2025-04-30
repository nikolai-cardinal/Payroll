/**
* Cardinal Payroll System - Approval Monitor Loader
* This script initializes the approval monitor system with a menu-driven interface.
*/

/**
* Initializes the approval monitor system
*/
function initApprovalMonitor() {
  console.log("Initializing Approval Monitor");
  
  // Check if the required global constants are available
  if (typeof Modules.Constants === 'undefined' || typeof Modules.Constants.SHEET === 'undefined' || typeof Modules.Constants.SHEET.MAIN === 'undefined') {
    console.error("Modules.Constants.SHEET.MAIN constant not found. Approval Monitor may not function correctly.");
    return;
  }
  
  if (typeof getRatesSheetMapping !== 'function') {
    console.error("getRatesSheetMapping function not found. Approval Monitor may not function correctly.");
    return;
  }
  
  // Refresh the menu with current technicians
  try {
    refreshApprovalMenu();
    console.log("Approval Monitor initialized and ready with dynamic technician menu");
  } catch (e) {
    console.error("Error refreshing approval menu: " + e.message);
  }
}

/**
* This function should be called from the main script's onOpen function
* Adds the Approval menu with technician names
* @param {Ui} ui - The UI object passed from onOpen
*/
function addApprovalMonitorMenuItems(ui) {
  // Call the new function that creates the dynamic Approval menu
  try {
    if (typeof addApprovalMenu === 'function') {
      addApprovalMenu(ui);
    } else {
      console.error("addApprovalMenu function not found. Menu will not be created.");
      // Create a fallback menu with at least one item
      ui.createMenu('Approval ✔️')
        .addItem("Initialize Approval System", "initApprovalMonitor")
        .addToUi();
    }
  } catch (e) {
    console.error("Error adding approval menu: " + e.message);
    // Create a fallback menu with at least one item
    try {
      ui.createMenu('Approval ✔️')
        .addItem("Initialize Approval System", "initApprovalMonitor")
        .addToUi();
    } catch (e2) {
      console.error("Error creating fallback menu: " + e2.message);
    }
  }
}

/**
* Trigger for spreadsheet open event to ensure menu is up to date
* This function should be set as an onOpen trigger
*/
function onOpenApprovalMonitor() {
  try {
    const ui = SpreadsheetApp.getUi();
    addApprovalMenu(ui);
  } catch (e) {
    console.error("Error in onOpenApprovalMonitor: " + e.message);
  }
}

/**
* Trigger for edit events to keep the menu in sync with technician changes
* This function should be set as an onEdit trigger
* @param {Object} e - The edit event object
*/
function onEditUpdateApprovalMenu(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();
    
    // Only refresh the menu if changes are made to the Main sheet
    if (sheetName === Modules.Constants.SHEET.MAIN) {
      // Check if changes were made to the name column (A) or exemption column (E)
      var column = range.getColumn();
      if (column === EMPLOYEE_NAME_COLUMN || column === EXEMPTION_COLUMN) {
        console.log("Employee data changed, refreshing Approval menu");
        refreshApprovalMenu();
      }
    }
  } catch (error) {
    console.error("Error in onEdit technician menu update: " + error.message);
  }
} 