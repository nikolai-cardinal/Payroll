# Spiff/Bonus Sheet Column Mapping

This document provides the column mapping for the Spiff/Bonus sheet and explains how these columns are used in bonus calculations.

## Column Mapping

| Column | Letter | Name                   | Description                                      |
|--------|--------|------------------------|--------------------------------------------------|
| 1      | A      |                        |                                                  |
| 2      | B      | Customer Name          | The name of the customer                         |
| 3      | C      | Business Unit          | The business unit for the entry                  |
| 4      | D      | Completion Date        | The date when the job was completed              |
| 5      | E      | Invoice Number         | The invoice number for the job                   |
| 6      | F      | Sold By Technician     | The technician who sold the service/product      |
| 7      | G      | Technician             | The primary technician assigned to the job       |
| 8      | H      | Assigned Technicians   | Additional technicians assigned (comma-separated)|
| 9      | I      | $ Bonus                | The bonus amount for this entry                  |
| 10     | J      | Cross Sale Group       | Group information for cross-sales                |
| 11     | K      | Item Name              | The name of the item or service                  |
| 12     | L      | Invoice Total          | The total amount on the invoice                  |
| 13     | M      | Pays Tech Specific Bonus| Indicates if entry pays technician-specific bonus|

## Bonus Qualification Logic

A technician qualifies for a bonus entry when either:

1. The technician appears in BOTH the "Sold By Technician" column (F) AND the "Technician" column (G)
   
   **OR**
   
2. The "Sold By Technician" field (column F) is blank AND the technician appears in the "Technician" column (G)

The bonus amount is taken directly from the "$ Bonus" column (I).

## Implementation Details

The bonus calculation logic is implemented in `src/modules/Bonus/BonusMain.js` in the `processSpiffAndBonusData` function:

```javascript
var soldBy = (row[map.soldBy - 1] || '').toString().trim();
var primaryTech = (row[map.technician - 1] || '').toString().trim();
var primaryTechMatch = primaryTech.toLowerCase() === techLower;
var soldByMatch = soldBy.toLowerCase() === techLower;

var qualifies = (soldByMatch && assignmentMatch) || (!soldBy && primaryTechMatch);
```

The system looks up column indices dynamically using `getHeaderMap` function in `src/modules/Bonus/BonusUtilities.js`, which matches column headers to their proper indices regardless of column position changes.

## Technician Eligibility

Technicians with Class 1 designation are not eligible for bonuses. This is checked before any bonus processing occurs. 