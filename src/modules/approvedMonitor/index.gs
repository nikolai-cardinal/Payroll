// Namespace stub – ApprovedMonitor
var Modules = Modules || {};
Modules.ApprovedMonitor = Modules.ApprovedMonitor || {};

(function(ns) {
  'use strict';

  /**
   * Delegate to legacy addApprovalMenu to populate menu items.
   * Fallbacks gracefully if internal logic not yet loaded.
   *
   * @param {GoogleAppsScript.Base.Menu} ui
   */
  ns.addMenuEntries = function(ui) {
    if (typeof addApprovalMenu === 'function') {
      addApprovalMenu(ui);
    } else {
      console.warn('ApprovedMonitor: addApprovalMenu function not found');
      // Optionally provide a fallback menu entry
      // ui.createMenu('Approval ✔️').addItem('Initialize', 'initApprovalMonitor').addToUi();
    }
  };

  /**
   * Handle onEdit events relevant to the approval monitor.
   * Calls internal handlers and returns true if the event was consumed.
   *
   * @param {GoogleAppsScript.Events.SheetsOnEdit} e
   * @return {boolean}
   */
  ns.handleEdit = function(e) {
    var handled = false;

    // Call the handler that resets status based on Column J dropdown
    if (typeof onEditResetApprovalStatus === 'function') {
      try {
        onEditResetApprovalStatus(e);
        // We don't strictly know if it *did* anything, but we assume it handled the relevant case
        handled = true; 
      } catch (err) {
        console.error('Error calling onEditResetApprovalStatus: ' + err.message);
      }
    }

    // Call the handler that updates the menu if technician data changes (Name/Exempt)
    if (typeof onEditUpdateApprovalMenu === 'function') {
      try {
        onEditUpdateApprovalMenu(e);
        // Similar assumption as above
        handled = true;
      } catch (err) {
        console.error('Error calling onEditUpdateApprovalMenu: ' + err.message);
      }
    }
    
    // Ensure dynamic functions are available if not already defined
    // This might be needed if the edit happens before onOpen finishes
    if (typeof initDynamicApprovalFunctions === 'function') {
        initDynamicApprovalFunctions();
    }

    return handled;
  };

  /**
   * Batch-approve all technicians.
   */
  ns.processAll = function() {
    if (typeof approveAllTechnicians === 'function') {
      approveAllTechnicians();
    } else {
      console.error('ApprovedMonitor: approveAllTechnicians function not found.');
      SpreadsheetApp.getUi().alert('Bulk Approval function is not available.');
    }
  };

})(Modules.ApprovedMonitor);

// No further code needed here - the IIFE above defines the public API.