// Namespace stub – ErrorHandlers
var Modules = Modules || {};
Modules.ErrorHandlers = Modules.ErrorHandlers || {}; 

/**
 * Wraps a function call with try/catch; shows a UI alert and rethrows on error.
 *
 * @param {Function} fn      The function to execute.
 * @param {Object=}  ctx     Optional context object to bind as `this` when calling fn.
 * @return {*}               The return value of `fn` if successful.
 */
Modules.ErrorHandlers.withErrorAlert = function (fn, ctx) {
  try {
    return fn.call(ctx);
  } catch (err) {
    var ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
    if (ui) {
      ui.alert('⚠️ Error', String(err), ui.ButtonSet.OK);
    }
    throw err; // rethrow so triggers fail visibly in execution log
  }
}; 