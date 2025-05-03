# Technician Sheet Column Mapping

This document provides the detailed column mapping for the Technician sheet and explains how these columns are used in payroll and commission calculations.

## Column Mapping

| Column | Letter | Name              | Description                                          |
|--------|--------|-------------------|------------------------------------------------------|
| 1      | A-C    | Tech Name/Info    | Technician information and categorization            |
| 2      | D      | Status            | Current status of the technician                     |

## Pay Structure Sections (By Row)

### Header Information
- **Row 1**: **Tech Name** (Columns A-C) and **Status** (Column D) Merged
- **Row 2**: **Pay Period:** (Columns A-C) Merged
- **Row 3**: **HVAC Service / Class 3** (Columns A-C) Merged 

### Hourly Pay Section
- **Row 4**: **Hourly Rate** - Base hourly rate for the technician 
- **Row 5**: Contains column headers **Total** and **Pay**
- **Row 6**: **Hours Worked** - Total hours worked with pay amount 
- **Row 7**: **Overtime Hours** - Overtime hours with pay rate 
- **Row 8**: **PTO/Sick/Holiday Hours** - Time off hours (shows "-" in Total column)
- **Row 9**: **Total Hourly Pay** - Sum of all hourly pay components 

### Install & Sales Section
- **Row 10**: **Install & Sales** - Section header
- **Row 11**: **Total Spiff** - Bonus
- **Row 12**: **Yard Sign Spiff** - Commission for yard sign placements
- **Row 13**: **Total Install Pay** - Total pay for installation work
- **Row 14**: **Lead Set Sale** - Commission for lead-generated sales
- **Row 15**: **Call by Call Score** - Performance metric for call quality
- **Row 16**: **Completed Revenue** - Total revenue from completed jobs
- **Row 17**: **Total Sales** - Sum of all sales

### Summary Section
- **Row 18**: **Total Pay** - Combined total of hourly pay and commission/bonus amounts ($0.00)
- **Rows 19-21**: Empty rows (visible in the screenshot)

## Visual Indicators

- **Percentage Display**: A large red "0.0%" indicator appears in Column D (rows 6-9), representing commission achievement against targets
- **Column Layout**: The sheet uses columns A-C for category labels and descriptions, with column D for status and visual indicators
- **Section Formatting**: Different sections are visually separated with distinct background colors:
  - Header rows (1-3) have a dark green background
  - Hourly rate (row 4) has a gray background
  - Column headers row (5) has a brown background
  - Install & Sales header (row 10) has a dark orange/brown background
  - Total Pay row (18) has a green background
  - Rows between section headers have alternating light gray background

## Implementation Details

The total pay calculation includes both hourly compensation and sales/commission components. The value shown at the bottom of the sheet represents the complete compensation for a technician, including all hourly work, commissions, bonuses, and other incentives.

## GP Designation

The "GP" status in Row 3, Column D indicates a specific job classification that may affect commission and bonus eligibility. This status marker is used for tracking and categorization purposes within the payroll system.

## Technician Classification

The sheet displays "HVAC Service / Class 3" in Row 3, indicating the technician's service category and classification level, which likely affects pay rates and commission structures. 