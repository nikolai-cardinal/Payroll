# Pop-up Debrief Notification Modification Guide

## 1. Overview and Goal

**Initial Problem:** Running the full payroll function (`runFullPayroll` or similar batch processes) triggered multiple pop-up notifications (via `ui.alert`). One pop-up appeared for each distinct payroll stage (Spiff/Bonus, PBP, Yard Sign, Lead Set, Timesheet) processed for *each* technician included in the batch run. This resulted in a potentially large number of pop-ups that the user had to click through sequentially.

**Desired Goal:** Modify the system so that:
1.  When the **full payroll** process is executed, only **one single, final summary pop-up** is displayed at the very end of the entire batch run. This pop-up should summarize the overall results of the batch process.
2.  When **individual payroll stages** are run for a single technician (e.g., by selecting "PBP" or "Timesheet" from the Action column in the 'Main' sheet), their respective **summary pop-ups should still be displayed** as they were originally.

This retains the detailed feedback for individual runs while streamlining the user experience for the full batch process.

## 2. Implementation Strategy

The chosen strategy involves adding an optional boolean parameter to each function responsible for displaying a stage-specific pop-up notification.

*   A parameter named `suppressPopup` (or `suppressFinalSummary` in one specific case) was added to the function definitions.
*   This parameter defaults to `false`.
*   When a function is called normally (e.g., for an individual stage run), the parameter remains `false`, and the `ui.alert()` call proceeds as usual.
*   When the main batch processing function (`runFullPayroll`) calls the underlying functions (often via `processPayrollForTechnicianSilently`), it explicitly passes `true` for this parameter.
*   Inside the stage-specific functions, the `ui.alert()` call is wrapped in a conditional check (e.g., `if (!suppressPopup)`). If `suppressPopup` is `true`, the alert is skipped; otherwise, it is shown.

This ensures that only the final summary alert from the top-level batch function is displayed during a full run, while individual runs maintain their specific feedback pop-ups. Error pop-ups were generally *not* suppressed, as they indicate problems needing immediate attention.

## 3. Step-by-Step Micro AI Prompts / Implementation Instructions

The following steps and micro-prompts were used to guide the implementation:

---

**Step 1: Modify `runPayrollForTechnician` in `Main`**

*   **File:** `Main`
*   **Function:** `runPayrollForTechnician`
*   **Change:** Prevent the summary pop-up *for a single tech* when called as part of the full batch run, but allow it otherwise.
*   **Micro-Instruction:** "Add an optional `suppressFinalSummary = false` parameter to the `runPayrollForTechnician` function definition in `Main`. Wrap the final `ui.alert` call (around line 792) within an `if (!suppressFinalSummary)` block."

---

**Step 2: Modify `processPayrollForTechnicianSilently` in `Main`**

*   **File:** `Main`
*   **Function:** `processPayrollForTechnicianSilently`
*   **Change:** Accept the suppression flag and pass it down to all individual stage-processing functions it calls.
*   **Micro-Instruction:** "Add an optional `suppressStagePopups = false` parameter to `processPayrollForTechnicianSilently`. When calling each individual stage function (`processSpiffAndBonusData`/`processSpiffAndBonus`, `updatePBPForTechnician`, `updateYardSignForTechnician`, `updateLeadSetForTechnician`, `updateHoursForTechnician`), pass this `suppressStagePopups` value to their corresponding `suppressPopup` parameter (which will be added in subsequent steps)."

---

**Step 3: Modify Spiff/Bonus Function (`processSpiffAndBonus`)**

*   **File:** `SpiffBonus/SpiffBonusMainProcessor`
*   **Function:** `processSpiffAndBonus`
*   **Change:** Add suppression parameter and make its summary pop-up conditional.
*   **Micro-Instruction:** "Add an optional `suppressPopup = false` parameter to the `processSpiffAndBonus` function definition in `SpiffBonus/SpiffBonusMainProcessor`. Wrap its `ui.alert()` call for the summary (around line 131) and the non-critical error alert in the catch block in an `if (!suppressPopup)` block."

---

**Step 4: Modify PBP Function (`pbpMain_updatePBPForTechnician`)**

*   **File:** `PBP/PBPMain`
*   **Function:** `pbpMain_updatePBPForTechnician`
*   **Change:** Add suppression parameter (alongside existing `skipStatusUpdate`) and make its various pop-ups conditional.
*   **Micro-Instruction:** "Add an optional `suppressPopup = false` parameter *after* the `skipStatusUpdate` parameter in the `pbpMain_updatePBPForTechnician` function definition in `PBP/PBPMain`. Wrap its main summary `ui.alert()` call (around line 171), the 'No PBP entries found' alert (around line 113), the 'Technician not found' alert (around line 119), and the apprentice skip alert (around line 84) in `if (!suppressPopup)` blocks."

---

**Step 5: Modify Yard Sign Function (`updateYardSignForTechnician`)**

*   **File:** `YardSign/YardSignMain`
*   **Function:** `updateYardSignForTechnician`
*   **Change:** Add suppression parameter (alongside existing `skipStatusUpdate`) and make its various pop-ups conditional.
*   **Micro-Instruction:** "Add an optional `suppressPopup = false` parameter *after* `skipStatusUpdate` in the `updateYardSignForTechnician` function definition in `YardSign/YardSignMain`. Wrap its main summary `ui.alert()` call (around line 212), the 'No yard sign entries found' alert (around line 180), and the apprentice skip alert (around line 139) in `if (!suppressPopup)` blocks."

---

**Step 6: Modify Lead Set Functions**

*   **File:** `LeadSet/LeadSetMain.js`
*   **Functions:** `updateLeadSetForTechnician`, `processAndWriteLeadData`, `displayLeadResults`
*   **Change:** Add suppression parameter to the call chain and make relevant pop-ups conditional.
*   **Micro-Instruction:**
    *   "a) Add `suppressPopup = false` parameter to `updateLeadSetForTechnician`. Pass this parameter when calling `processAndWriteLeadData`."
    *   "b) Add `suppressPopup = false` parameter to `processAndWriteLeadData`. Wrap the 'No leads found' alert (around line 247) in `if (!suppressPopup)`. Pass this parameter when calling `displayLeadResults`."
    *   "c) Add `suppressPopup = false` parameter to `displayLeadResults`. Wrap the main summary alert (around line 403) in `if (!suppressPopup)`."

---

**Step 7: Modify Timesheet Function (`updateHoursForTechnician`)**

*   **File:** `TimeSheet/TimeSheetLogic`
*   **Function:** `updateHoursForTechnician`
*   **Change:** Add suppression parameter and make its summary pop-up conditional (considering existing conditions).
*   **Micro-Instruction:** "Add an optional `suppressPopup = false` parameter to the `updateHoursForTechnician` function definition in `TimeSheet/TimeSheetLogic`. Modify the check for its summary `ui.alert()` call (around line 384) to be `if (!skipStatusUpdate && !suppressPopup)`."

---

## 4. Summary of Affected Files

The following files were modified during this process:

*   `Main`
*   `SpiffBonus/SpiffBonusMainProcessor`
*   `PBP/PBPMain`
*   `YardSign/YardSignMain`
*   `LeadSet/LeadSetMain.js`
*   `TimeSheet/TimeSheetLogic`

## 5. Final Behavior

After implementing these changes:

*   Running **individual stages** (e.g., via Action column) will show the specific summary pop-up for that stage, providing detailed feedback for that action.
*   Running the **full payroll** (`runFullPayroll` or similar batch process) will suppress all intermediate stage pop-ups. Only the single, final summary pop-up generated by the main batch function will be displayed at the end of the entire process. 