// Safe logging utilities that don't attempt to modify built-in objects
var Modules = Modules || {};
Modules.Safe = Modules.Safe || {}; 

/**
 * A completely safe logging utility that doesn't modify any global objects.
 * Use this instead of console.log or other built-in logging.
 */
(function() {
  'use strict';
  
  // Debug flag - set to true to enable logging
  var LOGGING_ENABLED = false;
  
  // Simple logger that respects the enabled flag
  function safeLog() {
    if (LOGGING_ENABLED) {
      var args = Array.prototype.slice.call(arguments);
      Logger.log(args.join(' '));
    }
  }
  
  function safeWarn() {
    if (LOGGING_ENABLED) {
      var args = Array.prototype.slice.call(arguments);
      Logger.log('⚠️ ' + args.join(' '));
    }
  }
  
  function safeError() {
    if (LOGGING_ENABLED) {
      var args = Array.prototype.slice.call(arguments);
      Logger.log('🛑 ' + args.join(' '));
    }
  }
  
  // Public API
  Modules.Safe.Logger = {
    log: safeLog,
    warn: safeWarn,
    error: safeError,
    isEnabled: function() { return LOGGING_ENABLED; },
    setEnabled: function(value) { LOGGING_ENABLED = !!value; }
  };
})(); 