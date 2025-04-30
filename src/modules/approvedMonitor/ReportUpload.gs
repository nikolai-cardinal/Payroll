/*
 * Cardinal Payroll System - Report Upload
 * After a successful Bulk Approval, this module sends five PDF reports (Time Sheet,
 * Spiff/Bonus, Lead Set, Service, Yard Sign) to the same webhook endpoint used
 * for individual approvals. Each report is sent 10 seconds apart and contains
 * the payroll period (F1 from Hourly + Spiff Pay) plus the file payload.
 */

/* global HOURLY_SPIFF_SHEET_NAME, APPROVED_WEBHOOK_URL, getSheetAsPdfBlob */

const REPORT_UPLOAD_SHEETS = [
  'Time Sheet',
  Modules.Constants.SHEET.SPIFF,
  Modules.Constants.SHEET.SERVICE,
  'Lead Set',
  'Yard Sign'
];

/**
 * Sends the defined report sheets as PDF files to APPROVED_WEBHOOK_URL.
 * This function is intended to run right after the user clicks OK on the
 * Bulk Approval Summary dialog.
 */
function sendBulkReportUploads() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ratesSheet = ss.getSheetByName(HOURLY_SPIFF_SHEET_NAME);
    let payrollPeriod = '';
    try {
      payrollPeriod = ratesSheet ? ratesSheet.getRange('F1').getValue() : '';
    } catch (e) {
      console.warn('Could not read F1 value: ' + e.message);
    }

    REPORT_UPLOAD_SHEETS.forEach(function(sheetName, idx) {
      const tab = ss.getSheetByName(sheetName);
      if (!tab) {
        console.warn('Report sheet not found: ' + sheetName);
        return; // Skip missing sheet
      }

      const pdfBlob = getSheetAsPdfBlob(tab, sheetName);
      if (!pdfBlob) {
        console.warn('Unable to create PDF blob for sheet: ' + sheetName);
        return;
      }

      const payload = {
        payrollPeriod: payrollPeriod,
        reportName: sheetName,
        file: pdfBlob
      };

      const options = {
        method: 'post',
        payload: payload
      };

      try {
        const response = UrlFetchApp.fetch(APPROVED_WEBHOOK_URL, options);
        console.log('Report uploaded for ' + sheetName + ' – HTTP ' + response.getResponseCode());
      } catch (err) {
        console.error('Failed to upload report for ' + sheetName + ': ' + err.message);
      }

      // Wait 10 seconds between uploads except after the last one
      if (idx < REPORT_UPLOAD_SHEETS.length - 1) {
        Utilities.sleep(10000);
      }
    });
  } catch (err) {
    console.error('Error in sendBulkReportUploads: ' + err.message);
  }
} 