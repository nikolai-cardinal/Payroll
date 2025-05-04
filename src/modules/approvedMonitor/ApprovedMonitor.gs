/**
* Cardinal Payroll System - Approval Monitor
* This script manages the approval process for technicians via a menu-driven interface.
* It sends webhooks when a technician's data is approved through the menu.
*/

const APPROVED_WEBHOOK_URL = 'https://hook.us1.make.com/bzgozxkytd2fi01701vwdpp9u37bkf2l';
// Delay (in ms) between each webhook when Approve All is used. Increase if your
// Make.com scenario still hits its concurrency limits. Set to 0 for no delay.
const BULK_APPROVAL_DELAY_MS = 10000; // 10 seconds
// Column J now uses a dropdown (e.g., "Completed"); we track approval status via Document Properties
const EMPLOYEE_NAME_COLUMN = 1; // Column A contains technician names
const EXEMPTION_COLUMN = 5; // Column E contains "Exempt" status
const APPROVAL_COLUMN = 10; // Column J dropdown (used only for manual reset)
// We track approval status via Document Properties; changing the dropdown will clear emojis

// Store function map for dynamic menu callbacks
let APPROVAL_FUNCTIONS = {};

// Initialize Document Properties for status tracking
const docProps = PropertiesService.getDocumentProperties();

/**
* Retrieves approval status for a given row
* @param {number} rowNumber
* @return {string|null} 'success' | 'failure' | null
*/
function getApprovalStatus(rowNumber) {
  return docProps.getProperty('approval_status_' + rowNumber);
}

/**
* Stores approval status for a given row
* @param {number} rowNumber
* @param {string} status 'success' | 'failure'
*/
function setApprovalStatus(rowNumber, status) {
  if (status === null || status === undefined) {
    docProps.deleteProperty('approval_status_' + rowNumber);
  } else {
    docProps.setProperty('approval_status_' + rowNumber, status);
  }
}

function clearApprovalStatus(rowNumber) {
  docProps.deleteProperty('approval_status_' + rowNumber);
}

/**
* Builds and adds the Approval menu to the spreadsheet UI
* This should be called from the main onOpen function
* @param {Ui} ui - The UI object passed from onOpen
*/
function addApprovalMenu(ui) {
  // Get non-exempt technician names
  const technicianMenuItems = getTechnicianMenuItems();
  
  // Create the main menu
  let menu = ui.createMenu('Approval ✔️');
  
  // Add bulk-approval option at the very top
  menu.addItem('Approve All', 'approveAllTechnicians');
  
  // Add technician names as menu items
  if (technicianMenuItems.length > 0) {
    technicianMenuItems.forEach(item => {
      menu.addItem(item.name, item.functionName);
    });
  } else {
    // Ensure menu has at least one item even if no eligible technicians are found
    menu.addItem("Refresh Technician List", "refreshApprovalMenu");
  }
  
  // Add the menu to UI
  menu.addToUi();
}

/**
* Gets technician names from the Main sheet
* to build dynamic menu items (excluding exempt employees)
* @return {Array} Array of menu item objects with name and function properties
*/
function getTechnicianMenuItems() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN);
    
    if (!sheet) {
      console.error("Main sheet not found");
      return [];
    }
    
    // Get rates sheet mapping for data boundaries
    const ratesMapping = getRatesSheetMapping();
    const startRow = ratesMapping.dataStartRow;
    
    // Get all data from the sheet
    const data = sheet.getDataRange().getValues();
    const menuItems = [];
    
    // Clear previous function map
    APPROVAL_FUNCTIONS = {};
    
    // Process each row starting from the data start row
    for (let i = startRow - 1; i < data.length; i++) {
      const rowData = data[i];
      
      // Check if this is an employee (has name) and is not exempt
      const techName = rowData[EMPLOYEE_NAME_COLUMN - 1];
      const isExempt = rowData[EXEMPTION_COLUMN - 1] === "Exempt";
      
      if (techName && techName.toString().trim() !== "" && !isExempt) {
        // Determine status from stored properties
        const status = getApprovalStatus(i + 1); // 'success' | 'failure' | null
        const isApproved = status === 'success';
        const isFailed = status === 'failure';
        
        // Create a unique function name for this technician
        const functionName = `approvePayroll_${i + 1}`;
        
        // Prefix a checkmark if approved
        let displayName = techName;
        if (isApproved) displayName = `✅ ${techName}`;
        else if (isFailed) displayName = `❌ ${techName}`;
        
        // Add to menu items
        menuItems.push({
          name: displayName,
          functionName: functionName,
          rowNumber: i + 1
        });
        
        // Create the function dynamically using scriptlets approach
        createApprovalFunction(functionName, i + 1, techName);
      }
    }
    
    return menuItems;
  } catch (error) {
    console.error("Error building technician menu: " + error.message);
    return [];
  }
}

/**
* Creates a dynamic function for each technician's approval action
* @param {string} functionName - The name of the function to create
* @param {number} rowNumber - The row number for this technician
* @param {string} techName - The technician's name
*/
function createApprovalFunction(functionName, rowNumber, techName) {
  // Store the row number and tech name in our function map
  APPROVAL_FUNCTIONS[functionName] = {
    rowNumber: rowNumber,
    techName: techName
  };
  
  // Create the function in the global scope using this helper
  this[functionName] = function() {
    handleApproval(rowNumber);
  };
}

/**
* Handles approval confirmation dialog and processing
* @param {number} rowNumber - The row number for this technician
*/
function handleApproval(rowNumber) {
  // Directly approve without any pop‑ups to avoid interrupting user flow
  approvePayroll(rowNumber);
}

/**
* Approves the payroll for a specific row/technician
* @param {number} row - The row number to approve
*/
function approvePayroll(row, silent) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN);
    
    if (!sheet) {
      console.error("Main sheet not found");
      return;
    }
    
    // Send the webhook with all row data
    const success = sendApprovalWebhook(sheet, row);

    // Store status for this row
    setApprovalStatus(row, success ? 'success' : 'failure');

    if (!silent) {
      // Refresh menu so status symbol appears immediately
      refreshApprovalMenu();
    }
    
    return success;
  } catch (error) {
    console.error("Error approving payroll: " + error.message);
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    return false;
  }
}

/**
* Sends webhook with row data when a row is approved
* @param {Sheet} sheet - The sheet containing the approved row
* @param {number} row - The row number that was approved
*/
function sendApprovalWebhook(sheet, row) {
  try {
    // Collect row data to send in webhook
    var rowData = {};
    
    // Get the rates sheet mapping for proper header row
    var ratesMapping = getRatesSheetMapping();
    var headerRow = ratesMapping.dataStartRow - 1;
    
    // Get header row values
    var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Get row values
    var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map headers to values
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header && header.toString().trim() !== "") {
        rowData[header] = values[i];
      }
    }
    
    // Add row number for reference - force as integer string to avoid decimal notation
    rowData["rowNumber"] = Math.floor(row).toString();
    
    // Add payroll period from cell F1
    try {
      const payrollPeriod = sheet.getRange('F1').getValue();
      rowData["payrollPeriod"] = payrollPeriod;
    } catch(err) {
      console.warn('Could not read payroll period from F1: '+err.message);
    }
    
    // Add timestamp
    rowData["approvedTimestamp"] = new Date().toISOString();
    
    // Convert data to JSON
    var jsonPayload = JSON.stringify(rowData);

    // Attempt to locate a sheet whose name matches the technician (column A)
    var techName = sheet.getRange(row, EMPLOYEE_NAME_COLUMN).getValue();
    var ss = sheet.getParent();
    var sheetBlob = null;

    if (techName) {
      var techSheet = ss.getSheetByName(techName);
      if (techSheet) {
        // Export the technician tab as PDF so formatting is preserved.
        sheetBlob = getSheetAsPdfBlob(techSheet, techName);
      }
    }

    // Log what will be sent for easier debugging
    console.log("Sending webhook with form data payload" + (sheetBlob ? " and PDF attachment " + sheetBlob.getName() : ""));

    var options;
    if (sheetBlob) {
      // Send multipart/form-data with both form data and the file
      options = {
        'method': 'post',
        'payload': {
          // Add each field from rowData directly to the form payload
          ...rowData,
          'file': sheetBlob
        }
      };
    } else {
      // Fallback: form data only
      options = {
        'method': 'post',
        'payload': rowData
      };
    }

    var response = UrlFetchApp.fetch(APPROVED_WEBHOOK_URL, options);

    // Log the response
    console.log("Webhook response: " + response.getContentText());

    return response.getResponseCode() === 200;
  } catch (error) {
    console.error("Error sending approval webhook: " + error.message);
    return false;
  }
}

/**
* Initializes the approval monitor system by ensuring all requirements are met
*/
function initApprovalMonitor() {
  console.log("Initializing Approval Monitor");
  
  // Check if the required global constants are available
  if (typeof Modules.Constants === 'undefined' || typeof Modules.Constants.SHEET === 'undefined' || typeof Modules.Constants.SHEET.MAIN === 'undefined') {
    console.error("Modules.Constants.SHEET.MAIN constant not found. Approval Monitor may not function correctly.");
  }
  
  if (typeof getRatesSheetMapping !== 'function') {
    console.error("getRatesSheetMapping function not found. Approval Monitor may not function correctly.");
  }
  
  // Refresh the menu to ensure it's up to date with the latest technicians
  refreshApprovalMenu();
  
  console.log("Approval Monitor initialized successfully");
}

/**
* Refreshes the Approval menu to update with new technicians
* This can be called manually or automatically
*/
function refreshApprovalMenu() {
  const ui = SpreadsheetApp.getUi();
  addApprovalMenu(ui);
}

/**
 * Ensures dynamic approvePayroll_<row> functions are defined in every execution.
 * This prevents "Script function not found" errors when a menu item is clicked,
 * because each menu callback runs in a fresh Apps Script runtime where the
 * functions created during onOpen would otherwise be absent.
 */
function initDynamicApprovalFunctions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN);
    if (!sheet) return;

    const ratesMapping = getRatesSheetMapping();
    const startRow = ratesMapping.dataStartRow;
    const lastRow = sheet.getLastRow();

    for (let row = startRow; row <= lastRow; row++) {
      const functionName = `approvePayroll_${row}`;
      if (typeof this[functionName] !== 'function') {
        // Capture row in closure
        this[functionName] = (function(r) {
          return function() {
            const techName = sheet.getRange(r, EMPLOYEE_NAME_COLUMN).getValue();
            handleApproval(r);
          };
        })(row);
      }
    }
  } catch (e) {
    console.error('Error initializing dynamic approval functions: ' + e.message);
  }
}

// Run the initializer so functions are available before any callbacks
initDynamicApprovalFunctions();

/**
 * Approves everyone currently visible in the menu, sequentially.
 * Shows a summary popup when finished.
 */
function approveAllTechnicians() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(Modules.Constants.SHEET.MAIN);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Main sheet not found');
    return;
  }

  const ratesMapping = getRatesSheetMapping();
  const startRow = ratesMapping.dataStartRow;
  const lastRow = sheet.getLastRow();

  const results = [];

  for (let row = startRow; row <= lastRow; row++) {
    const techName = sheet.getRange(row, EMPLOYEE_NAME_COLUMN).getValue();
    const isExempt = sheet.getRange(row, EXEMPTION_COLUMN).getValue() === 'Exempt';
    if (!techName || String(techName).trim() === '' || isExempt) continue;

    const success = approvePayroll(row, true); // silent to avoid many menu rebuilds
    results.push(`${success ? '✅' : '❌'} ${techName}`);

    // Prevent hammering the webhook endpoint / Make.com scenario. A short delay
    // between calls gives the scenario enough time to finish processing the
    // previous bundle before the next arrives.
    if (BULK_APPROVAL_DELAY_MS > 0) {
      Utilities.sleep(BULK_APPROVAL_DELAY_MS);
    }
  }

  // One refresh at the end
  refreshApprovalMenu();

  // Log summary to the non-blocking Progress panel instead of showing a modal alert
  if (typeof Modules !== 'undefined' && Modules.Shared && Modules.Shared.Progress && typeof Modules.Shared.Progress.log === 'function') {
    Modules.Shared.Progress.log('Bulk Approval Summary:\n' + results.join('\n'));
  }

  // Immediately upload consolidated reports (no user click required)
  if (typeof sendBulkReportUploads === 'function') {
    try {
      sendBulkReportUploads();
    } catch (e) {
      console.error('Error sending bulk report uploads: ' + e.message);
    }
  } else {
    console.warn('sendBulkReportUploads function not found. Report upload skipped.');
  }
}

/**
 * Clears stored approval status when the manual dropdown is changed
 * Install this as an onEdit trigger.
 * It removes ✅ / ❌ for that row in the menu.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEditResetApprovalStatus(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== Modules.Constants.SHEET.MAIN) return;

    if (range.getColumn() !== APPROVAL_COLUMN) return;

    const row = range.getRow();

    // Only consider rows that are in data region
    const ratesMapping = getRatesSheetMapping();
    if (row < ratesMapping.dataStartRow) return;

    // Only clear when the dropdown value is 'Complete'
    const value = String(range.getValue()).trim();
    if (/^complete$/i.test(value)) {
      clearApprovalStatus(row);
      // Refresh menu to remove emoji
      refreshApprovalMenu();
    }
  } catch (err) {
    console.error('Error in onEditResetApprovalStatus: ' + err.message);
  }
}

/**
* Exports a given sheet as a PDF blob so formatting is preserved.
* @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to export.
* @param {string} filename The base filename (without extension).
* @return {GoogleAppsScript.Base.Blob} The resulting PDF blob.
*/
function getSheetAsPdfBlob(sheet, filename) {
  try {
    var ss = sheet.getParent();
    var spreadsheetId = ss.getId();
    var sheetId = sheet.getSheetId();

    // Build the export URL. Adjust parameters as needed (page size, etc.).
    var exportUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export?' +
      'format=pdf' +
      '&gid=' + sheetId +
      '&portrait=false' +
      '&size=letter' +
      '&scale=4' + // Fit to width
      '&sheetnames=false' +
      '&printtitle=false' +
      '&pagenumbers=false' +
      '&gridlines=false' +
      '&fzr=false';

    var token = ScriptApp.getOAuthToken();
    var response = UrlFetchApp.fetch(exportUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });

    return response.getBlob()
      .setName(filename + '.pdf')
      .setContentType('application/pdf');
  } catch (err) {
    console.error('Error creating PDF blob: ' + err.message);
    return null;
  }
} 