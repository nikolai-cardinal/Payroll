# PBP Calculation Logic - Step-by-Step Guide

This document outlines the process for calculating Pay-By-Performance (PBP) for service technicians based on job completion data and technician classification.

**Source Data:**

1.  **Job Performance Data Sheet:** (Assumed to be 'Spiff/Bonus' based on current code)
    *   Column G: Primary Technician ("Sold By")
    *   Column H (in 'Spiff/Bonus'): Assigned Technicians (comma or space-separated list)
    *   Column J (in 'Spiff/Bonus'): PBP Indicator and Amount (e.g., "PBP 150.00")
    *   Other relevant columns: Customer Name, Completion Date, Item Name, etc.
2.  **Technician Rates & Details Sheet:** ('Hourly + Spiff Pay')
    *   Column A: Technician Name
    *   Column C: Position Title (e.g., "Class 3 HVAC Service Technician", "Apprentice Technician")
    *   Column H: Split Percentage (Used by old logic, potentially ignored now)

**Calculation Process per PBP Entry:**

For each row in the Job Performance Data Sheet identified as a PBP entry (containing "PBP [amount]" in Column J):

1.  **Identify PBP Amount:** Extract the total PBP amount for the job from Column J. If zero or invalid, skip the row.
2.  **Identify Involved Technicians:**
    *   Parse technician names from Column H ("Assigned Technicians"). Handle comma-separated and space-separated lists. Clean names (remove percentages, trim whitespace).
    *   Ensure the Primary Technician (Column G) is included in the list.
    *   Create a unique list of involved technician names for this job.
3.  **Determine Technician Class, Role, and Eligibility:**
    *   For each unique technician name involved:
        *   Find the technician in the 'Hourly + Spiff Pay' sheet.
        *   **Get Class:** Look for the pattern "Class X" (where X is 1, 2, 3, or 4) within their 'Position Title' (Column C). This is the primary method for determining the class.
            *   The script expects titles like "Class 1", "Class 2", "Class 3", "Class 4". Additional text (like "Service Technician") is ignored by the matching logic.
            *   *(Note: The script no longer specifically checks for the word "Apprentice". Class 1 technicians should have "Class 1" in their title).*
            *   Handle cases where the tech might not be found or the title does not match the "Class X" format (treat as ineligible or use a default/error state - Class 0 or -1).
        *   **Determine Eligibility:**
            *   Class 2, 3, 4: Eligible for PBP payout (`isEligible = true`).
            *   Class 1 or Class <= 0: Ineligible for PBP payout (`isEligible = false`).

        *   **Class Definitions & PBP Eligibility Details:**
            *   **Class 1:** (Formerly Apprentice)
                *   Overview: Entry-level tech in training. Works alongside senior techs. Focused on learning safety, process, and basics of the trade.
                *   PBP: Not eligible.
                *   *(Other Spiffs: Yard sign/review eligible, regular spiffs not eligible).*
            *   **Class 2 – Service Technician:**
                *   Overview: Runs basic service and maintenance calls with oversight. Begins handling customer-facing interactions.
                *   PBP: Eligible.
                *   *(Other Spiffs: All eligible).*
            *   **Class 3 – Service Technician:**
                *   Overview: Full-service technician. Runs all types of calls solo. Expected to hit KPIs and represent company standards in quality and communication.
                *   PBP: Eligible.
                *   *(Other Spiffs: All eligible).*
            *   **Class 4 – Service Technician:**
                *   Overview: Top-performing tech with leadership expectations. Trains class 1-3 techs, leads complex calls, and models company standards.
                *   PBP: Eligible.
                *   *(Other Spiffs: All eligible).*

        *   **Determine Initial Role (based on Class):**
            *   Class 4: Lead
            *   Class 3: Lead
            *   Class 2: Assistant (Default)
            *   Class 1: Assistant (Default)
            *   Class <= 0: None
        *   Store these details for each technician: `{ name: string, class: number, isEligible: boolean, role: 'Lead' | 'Assistant' | 'None' }`
4.  **Refine Roles (Team Context):**
    *   Review the list of technicians and their initial roles for the job.
    *   **Class 2 Promotion:** If a Class 2 technician is the *highest* class on the job *and* there are no Class 3 or 4 technicians present, promote that Class 2 technician's role to 'Lead'. If multiple Class 2 are the highest, they *all* become Leads.
    *   **Solo Technician:** If only one technician is assigned, their role is 'Lead' (if Class 2, 3, or 4) or 'Assistant' (if Class 1). Eligibility still applies. Re-evaluate the role based on Class if initially set otherwise.
5.  **Count Roles:**
    *   Count the total number of technicians assigned (`totalTechs`).
    *   Count the number of 'Lead' roles (`leadCount`).
    *   Count the number of 'Assistant' roles (`assistantCount`).
6.  **Calculate PBP Split Percentages:**
    *   Based on `totalTechs`, `leadCount`, and `assistantCount`, determine the correct split scenario:
        *   **One-Man Job (`totalTechs` === 1):**
            *   The single tech gets 100%.
        *   **Two-Man Job (`totalTechs` === 2):**
            *   1 Lead + 1 Assistant: Lead gets 65%, Assistant gets 35%.
            *   2 Leads (Class 3+ or highest class 2s): Each gets 50%.
            *   2 Assistants (Only Class 1/2s): Each gets 50%.
        *   **Three-Man Job (`totalTechs` === 3):**
            *   1 Lead + 2 Assistants: Lead gets 46%, each Assistant gets 27%.
            *   2 Leads + 1 Assistant: Each Lead gets 38%, Assistant gets 24%.
            *   3 Leads: Each gets 33.33% (handle rounding appropriately).
            *   3 Assistants: Each gets 33.33%.
        *   **Four-Man Job (`totalTechs` === 4):**
            *   2 Leads + 2 Assistants: Each Lead gets 30%, each Assistant gets 20%.
            *   3 Leads + 1 Assistant: Each Lead gets 30%, Assistant gets 10%.
            *   4 Leads: Each gets 25%.
            *   4 Assistants: Each gets 25%.
        *   **Fallback/Other:** If > 4 techs or an unexpected combination, split equally based on the number of *eligible* techs in paying roles (Lead/Assistant). Log a warning.
    *   Assign the calculated split percentage to each technician based on their *final* role ('Lead' or 'Assistant'). Technicians with role 'None' get 0%.
7.  **Calculate Individual PBP Share:**
    *   For each technician: `individualShare = totalPBP * (technicianSplitPercentage / 100)`
8.  **Apply Eligibility Filter for Payout:**
    *   For each technician:
        *   If `isEligible` is `false` (i.e., Class 1 or invalid class), set their final `payoutAmount = 0`.
        *   If `isEligible` is `true`, set `payoutAmount = individualShare`.
9.  **Store Results:**
    *   For the specific technician whose payroll is being run (`technicianName` parameter in the main function):
        *   Record the calculated `payoutAmount`.
        *   Store details for reporting/display: Customer Name, Date, Item Name, Total PBP for the job, Tech's Role for the Job, Tech's Split %, Final Payout Amount for the tech, and a detailed string listing all Team members with their Class, Role, and Split % (`teamDetails`).
10. **Aggregate Total:** Sum the `payoutAmount` for all processed PBP entries for the target technician.

**End Process** 