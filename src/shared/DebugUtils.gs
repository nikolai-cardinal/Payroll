// DebugUtils is now DEPRECATED - use SafeLogger instead
var Modules = Modules || {};
Modules.Shared = Modules.Shared || {};

(function() {
  'use strict';
  
  // Create a non-functional Debug object to prevent errors
  var Debug = {
    isEnabled: function() { return false; },
    setEnabled: function() { /* do nothing */ },
    log: function() { /* do nothing */ },
    warn: function() { /* do nothing */ },
    error: function() { /* do nothing */ }
  };
  
  // Expose the safe debug object
  Modules.Shared.Debug = Debug;
  
  // Set up a non-conflicting logger for backward compatibility
  Modules.Shared.PayrollLogger = {
    log: function() { 
      if (Modules.Safe && Modules.Safe.Logger) {
        Modules.Safe.Logger.log.apply(null, arguments);
      }
    },
    warn: function() {
      if (Modules.Safe && Modules.Safe.Logger) {
        Modules.Safe.Logger.warn.apply(null, arguments);
      }
    },
    error: function() {
      if (Modules.Safe && Modules.Safe.Logger) {
        Modules.Safe.Logger.error.apply(null, arguments);
      }
    }
  };
})(); 