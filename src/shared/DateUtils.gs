// Namespace stub – DateUtils
var Modules = Modules || {};
Modules.DateUtils = Modules.DateUtils || {}; 

/**
 * Attempts to coerce an arbitrary input (string, number, Date) into a JS Date object.
 * Returns null if the value cannot be parsed.
 *
 * @param {*} value The value representing a date.
 * @return {Date|null}
 */
Modules.DateUtils.parseDate = function (value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Google Sheets often stores dates as serial numbers (days since Dec 30, 1899)
    return new Date(Math.round((value - 25569) * 86400000));
  }
  if (typeof value === 'string') {
    var parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

/**
 * Formats a date into a string with the given pattern using Utilities.formatDate.
 * Defaults to yyyy-MM-dd.
 *
 * @param {Date}   date      The date to format.
 * @param {string} pattern   Optional pattern, defaults to 'yyyy-MM-dd'.
 * @param {string} tz        Optional timezone, defaults to Session time zone.
 * @return {string}
 */
Modules.DateUtils.formatDate = function (date, pattern, tz) {
  if (!(date instanceof Date)) throw new Error('formatDate expects Date');
  pattern = pattern || 'yyyy-MM-dd';
  tz = tz || Session.getScriptTimeZone();
  return Utilities.formatDate(date, tz, pattern);
};

/**
 * Determines the current pay period assuming two semi-monthly periods:
 *  1st-15th and 16th-last day of month.
 * Returns an object with start and end Date.
 *
 * @return {{start: Date, end: Date}}
 */
Modules.DateUtils.getCurrentPayPeriod = function () {
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth(); // 0-based
  var start, end;
  if (today.getDate() <= 15) {
    start = new Date(year, month, 1);
    end = new Date(year, month, 15);
  } else {
    start = new Date(year, month, 16);
    end = new Date(year, month + 1, 0); // Last day of month
  }
  return { start: start, end: end };
}; 