## Module: ApprovedMonitor

**Namespace:** `Modules.ApprovedMonitor`

**Source:** `src/modules/approvedMonitor/`

Handles the technician payroll approval process via a dynamic menu and webhooks.

### Public API

#### `addMenuEntries(ui)`
- **Description:** Adds the 'Approval ✔️' menu to the spreadsheet UI. This menu includes an 'Approve All' item and dynamically generated entries for each non-exempt technician listed in the 'Main' sheet. Technician entries are prefixed with ✅ (approved) or ❌ (failed webhook) based on their stored status.
- **Parameters:**
    - `ui`: `GoogleAppsScript.Base.Ui` - The spreadsheet UI environment.
- **Called From:** `Main.gs` (`onOpen`) via `core/Menu.gs`.

#### `handleEdit(e)`
- **Description:** Processes edit events on the spreadsheet. Specifically handles:
    - Resetting approval status (clearing ✅/❌) for a technician if their corresponding row in the 'Main' sheet, column J, is set to 'Complete'.
    - Refreshing the 'Approval ✔️' menu if technician details (Name in column A or Exempt status in column E) are changed in the 'Main' sheet.
    - Ensures dynamic approval functions needed for menu items are initialized.
- **Parameters:**
    - `e`: `GoogleAppsScript.Events.SheetsOnEdit` - The edit event object.
- **Returns:** `boolean` - `true` if the event was potentially handled by one of the approval monitor's edit handlers, `false` otherwise.
- **Called From:** `Main.gs` (`onEdit`).

#### `processAll()`
- **Description:** Initiates the bulk approval process for all non-exempt technicians currently listed in the 'Main' sheet. It sequentially triggers the approval webhook for each technician, displays a summary dialog with results (✅/❌), and then triggers the bulk report PDF uploads (`sendBulkReportUploads`). A delay (`BULK_APPROVAL_DELAY_MS`) is observed between webhook calls.
- **Called From:** Potentially from a menu item or direct script execution (currently mapped to the 'Approve All' menu item via internal logic). 