// Node runner to execute GAS test files locally with minimal stubs.
// Usage: `node tests/run_all_tests.js`

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// ------------------ Stub GAS globals ------------------
global.Logger = { log: (...args) => console.log('[LOG]', ...args) };

const _cache = {};
global.CacheService = {
  getDocumentCache() {
    return {
      put: (k, v) => { _cache[k] = v; },
      get: (k) => _cache[k],
      remove: (k) => { delete _cache[k]; },
    };
  },
};

global.SpreadsheetApp = {
  getUi: () => ({
    alert: (...args) => console.log('[UI.alert]', ...args),
    showModelessDialog: () => console.log('[UI.showModelessDialog]'),
  }),
  getActiveSpreadsheet: () => ({
    getSheetByName: () => ({}),
  }),
};

global.HtmlService = {
  createHtmlOutputFromFile: () => ({ setTitle: () => ({}) }),
};

global.Modules = { Shared: {} };
Modules.Shared.PayrollLogger = { error: (...args) => console.error('[ERROR]', ...args) };

// ------------------------------------------------------
function loadScript(p) {
  const code = fs.readFileSync(p, 'utf8');
  vm.runInThisContext(code, { filename: path.basename(p) });
}

// Load source files required for tests
loadScript(path.join(__dirname, '../src/core/Progress'));
loadScript(path.join(__dirname, '../src/core/Main'));

// Load test files
const testsDir = __dirname;
fs.readdirSync(testsDir)
  .filter((f) => !f.endsWith('.js')) // skip this runner file
  .forEach((file) => loadScript(path.join(testsDir, file)));

// Execute test functions if defined
const maybeRun = (fnName) => {
  if (typeof global[fnName] === 'function') {
    try {
      global[fnName]();
      console.log(`✓ ${fnName} passed`);
    } catch (err) {
      console.error(`✗ ${fnName} failed:`, err.message);
      process.exitCode = 1;
    }
  }
};

[
  'runProgressTests',
  'testFullPayrollProgress',
  'testSidebarDuplicatePrevention',
].forEach(maybeRun);

if (process.exitCode !== 1) {
  console.log('\nAll tests completed successfully');
} 