# Approval Monitor

Menu-driven payroll approval for the "Hourly + Spiff Pay" sheet that sends a webhook for each approved technician. 100 % configured with Apps Script – no add-ons required.

## Key Features

• Dynamic "Approval ✔️" menu that lists every non-exempt technician (column A)
• Approve All bulk action – processes everyone in one click and shows a summary
• ✅ / ❌ emoji next to each name indicate last webhook result (stored in Document Properties, not the sheet)
• Clicking a name immediately fires a webhook built from the entire row plus:
  – `rowNumber` – row index in the sheet
  – `payrollPeriod` – value of cell F1
  – `approvedTimestamp` – ISO time stamp
• No disruptive pop-ups; the menu stays open and refreshes once the icon is updated
• Column J dropdown drives all actions. Setting it to **Complete**:
  – deletes the old technician tab
  – creates a fresh copy from **Template for Service**
  – resets the dropdown back to **Ready** so the next workflow can start
• Manual emoji reset: choosing **Ready** (or editing the cell) clears ✅/❌ so the row can be re-approved

## File & Constant Summary

| File | Purpose |
|------|---------|
| `ApprovedMonitor.gs` | All Approval Monitor logic (menu, webhook, status) |
| `MonitorLoader.gs` | Helper that initialises the menu in `onOpen` and keeps it refreshed |
| `Complete.gs` | Re-creates a technician sheet when column J is set to **Complete** and resets it to **Ready** |
| `ReportUpload.gs` | Sends five PDF report tabs via webhook after bulk approval (10-s spacing) |
| `Main.gs` | Core payroll logic – delegates to both Approval Monitor **and** the Complete handler |

Important constants defined at the top of `ApprovedMonitor.gs`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `HOURLY_SPIFF_SHEET_NAME` | (defined in **Main.gs**) | Target sheet name |
| `EMPLOYEE_NAME_COLUMN` | **1** | Names are in column A |
| `EXEMPTION_COLUMN` | **5** | "Exempt" flag is in column E |
| `APPROVAL_COLUMN` | **10** | Column J dropdown (values **Ready/Timesheet/…/Complete**) |

## Installation / Setup

1. Copy **ApprovedMonitor.gs** into your Apps Script project.
2. Make sure **Main.gs** (or your own entry script) defines `HOURLY_SPIFF_SHEET_NAME`.
3. Add the menu and initialise once the spreadsheet opens:

```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Technician Tools') /* …your existing items… */
    .addToUi();

  // Approval Monitor
  initApprovalMonitor();
}
```

4. **Delegate `onEdit`** to both Approval Monitor **and** the Complete handler:

```javascript
function onEdit(e) {
  // … your own onEdit logic …

  if (typeof onEditResetApprovalStatus === 'function') {
    try { onEditResetApprovalStatus(e); } catch (err) {
      console.error('Approval Monitor reset failed: ' + err);
    }
  }

  // When a row is marked Complete in column J recreate the technician sheet
  if (typeof onEditRecreateTechnicianSheet === 'function') {
    try { onEditRecreateTechnicianSheet(e); } catch (err) {
      console.error('Sheet recreation failed: ' + err);
    }
  }
}
```

> `Main.gs` already contains this hook if you accepted the previous edits in this repo.

5. (Optional) Install the **installable onEdit trigger** for `onEditUpdateApprovalMenu` in case technician rows are added/removed by other means. In most cases simply refreshing the sheet is enough.

## Typical Workflow

1. Open the spreadsheet → "Approval ✔️" appears next to the standard menu bar.
2. Either:
   • Click a single technician → ✅/❌ appears instantly, or
   • Click Approve All → a modal summary lists every result.
3. If a webhook fails you get a ❌; fix the issue and click again.
4. To totally reset a row just tick/untick the checkbox in column J – the emoji disappears and you can re-approve.

## Webhook Payload (example)

```json
{
  "Employee": "Jane Doe",
  "Dept": "HVAC Service",
  "Position": "Class 2",
  "Rate": 28,
  …all other headers…
  "rowNumber": 12,
  "payrollPeriod": "Pay Period: 2024-05-01 → 2024-05-15",
  "approvedTimestamp": "2024-05-16T22:14:38.179Z"
}
```

## Troubleshooting

• **Menu missing?** Make sure `initApprovalMonitor()` runs in `onOpen`.
• **No ✅/❌ change?** Check script logs for webhook errors or mismatched header names.
• **Column J change ignored?** Make sure both `onEditResetApprovalStatus(e)` **and** `onEditRecreateTechnicianSheet(e)` are called from your global `onEdit`, or install them as installable triggers.
• **Webhook payload wrong?** The script grabs headers from the first header row (identified by `getRatesSheetMapping().dataStartRow - 1`). Ensure mapping is correct.

## Changelog (condensed)

• **v4** – adds **ReportUpload.gs** for PDF uploads spaced 10 s apart after bulk approval.
• **v3** – added **Complete.gs** handler.
• **v2** – moved approval status to Document Properties; bulk approval, emoji status, etc.
• **v1** – original version. 