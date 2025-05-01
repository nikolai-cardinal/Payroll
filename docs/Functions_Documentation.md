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

## Module: PBP (Performance-Based Pay)

**Namespace:** `Modules.PBP`

**Source:** `src/modules/pbp/`

Handles the PBP (Performance-Based Pay) calculations and sheet updates for technician payroll.

### Public API

#### `addMenuEntries(ui)`
- **Description:** Adds PBP-related menu entries to the spreadsheet UI.
- **Parameters:**
    - `ui`: `GoogleAppsScript.Base.Ui` - The spreadsheet UI environment.
- **Called From:** `Main.gs` (`onOpen`) via `core/Menu.gs`.

#### `handleEdit(e)`
- **Description:** Processes edit events related to PBP, ignoring triggers from Column G in the Main sheet.
- **Parameters:**
    - `e`: `GoogleAppsScript.Events.SheetsOnEdit` - The edit event object.
- **Returns:** `Object|null` - Optional result or status.
- **Called From:** `Main.gs` (`onEdit`).

#### `processAll()`
- **Description:** Processes PBP for all technicians listed in the Main sheet. Calculates and updates PBP entries for each eligible technician.
- **Called From:** Menu items or direct script execution.

#### `processForTechnician(technicianName)`
- **Description:** Processes PBP entries for a specific technician.
- **Parameters:**
    - `technicianName`: `string` - The name of the technician to process.
- **Called From:** Menu items, action buttons, or direct script execution.

#### `writePbpDataToSheet(techSheet, allPbpEntries, totalTechnicianShare)`
- **Description:** Writes calculated PBP data to the technician's sheet.
- **Parameters:**
    - `techSheet`: `Sheet` - The technician's sheet object.
    - `allPbpEntries`: `Array<object>` - Array of calculated PBP entry objects.
    - `totalTechnicianShare`: `number` - The total calculated PBP share for the technician.

#### `updateTopSummaryInstallPay(techSheet, totalAmount, entryCount)`
- **Description:** Updates the PBP summary in the top section of a technician's sheet.
- **Parameters:**
    - `techSheet`: `Sheet` - The technician's sheet object.
    - `totalAmount`: `number` - The total PBP amount to display.
    - `entryCount`: `number` - The number of PBP entries processed.

#### `clearInstallDataSection(techSheet)`
- **Description:** Clears existing PBP data in a technician's sheet to prepare for new entries.
- **Parameters:**
    - `techSheet`: `Sheet` - The technician's sheet object.

### Code Organization
All functionality is organized across three files:
- `index.gs` - Public API and entry points
- `PBPMain.gs` - Core business logic and calculation functions
- `PBPUtilities.gs` - Sheet operations and utility functions 