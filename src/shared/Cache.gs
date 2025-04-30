// Namespace stub – Cache
var Modules = Modules || {};
Modules.Cache = Modules.Cache || {}; 

/**
 * Very small wrapper around PropertiesService (document scope) to memoize expensive reads
 * for the duration of a single script execution and across short-lived triggers.
 */
(function (ns) {
  var runtimeCache = {};
  var store = PropertiesService.getDocumentProperties();

  /**
   * Retrieves a value from cache by key.
   * Checks in-memory first, then script properties. If value was stored as JSON, parses it.
   *
   * @param {string} key
   * @return {*|null}
   */
  ns.get = function (key) {
    if (runtimeCache.hasOwnProperty(key)) {
      return runtimeCache[key];
    }
    var raw = store.getProperty(key);
    if (raw === null) return null;
    try {
      var parsed = JSON.parse(raw);
      runtimeCache[key] = parsed;
      return parsed;
    } catch (e) {
      runtimeCache[key] = raw;
      return raw;
    }
  };

  /**
   * Saves a value to cache under key. Stores JSON string for objects.
   *
   * @param {string} key
   * @param {*} value
   */
  ns.set = function (key, value) {
    runtimeCache[key] = value;
    var toStore = (typeof value === 'object') ? JSON.stringify(value) : String(value);
    store.setProperty(key, toStore);
  };

  /**
   * Removes a key from cache (both runtime and stored).
   * @param {string} key
   */
  ns.invalidate = function (key) {
    delete runtimeCache[key];
    store.deleteProperty(key);
  };

  /** Clears ALL cached keys. */
  ns.clearAll = function () {
    runtimeCache = {};
    store.deleteAllProperties();
  };
})(Modules.Cache); 