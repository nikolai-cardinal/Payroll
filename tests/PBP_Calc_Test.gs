/**
 * Minimal unit-style tests for calculatePbpEntries.
 * Run these manually from the Apps Script editor (select the test_… functions).
 * They use static arrays so no spreadsheet access is required.
 */

function test_calculatePbpEntries_forLeadTech() {
  var ratesData = [
    ['Name', 'ColB', 'Position'], // header row (ignored)
    ['John Smith', '', 'Class 4 Installer'],
    ['Jane Doe',   '', 'Class 2 Apprentice'],
    ['Bob Brown',  '', 'Class 1 Helper']
  ];

  var spiffBonusData = [
    ['H1','Customer','BU','Date','C4','C5','Primary','Assigned','C8','CrossSale','Item'], // header
    ['', 'Acme Corp', 'Install', new Date('2024-06-01'), '', '', 'John Smith', 'John Smith,Jane Doe', '', 'PBP 400', 'Main Panel'],
    ['', 'Beta Inc',  'Install', new Date('2024-06-02'), '', '', 'Jane Doe',   'Jane Doe,John Smith', '', 'PBP 300', 'Backup Panel'],
  ];

  var result = calculatePbpEntries('John Smith', spiffBonusData, ratesData);
  Logger.log('Lead tech result: ' + JSON.stringify(result, null, 2));
}

function test_calculatePbpEntries_forAssistantTech() {
  var ratesData = [
    ['Name', 'ColB', 'Position'],
    ['John Smith', '', 'Class 4 Installer'],
    ['Jane Doe',   '', 'Class 2 Apprentice'],
    ['Bob Brown',  '', 'Class 1 Helper']
  ];

  var spiffBonusData = [
    ['H1','Customer','BU','Date','C4','C5','Primary','Assigned','C8','CrossSale','Item'],
    ['', 'Gamma LLC', 'Install', new Date('2024-06-03'), '', '', 'John Smith', 'John Smith,Jane Doe', '', 'PBP 200', 'EV Charger'],
  ];

  var result = calculatePbpEntries('Jane Doe', spiffBonusData, ratesData);
  Logger.log('Assistant tech result: ' + JSON.stringify(result, null, 2));
} 