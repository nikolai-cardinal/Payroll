/**
* Payroll System - PBP Calculation Logic
* Processes PBP entries from the Spiff/Bonus sheet, determines roles based on technician class,
* calculates splits according to defined rules, filters by eligibility, and finds the technician's share.
*/


/**
* Processes PBP entries from Spiff/Bonus data and calculates shares based on new class/role logic.
* @param {string} technicianName - The name of the technician being processed.
* @param {Array<Array>} spiffBonusData - 2D array of data from 'Spiff/Bonus' sheet.
* @param {Array<Array>} ratesData - 2D array of data from 'Hourly + Spiff Pay' sheet.
* @return {object} An object containing { entries: Array<object>, totalShare: number }.
*/
function calculatePbpEntries(technicianName, spiffBonusData, ratesData) {
 var allPbpEntries = [];
 var totalTechnicianShare = 0;
 var processedEntries = {}; // Track unique entries to prevent duplicates
 var techDetailsCache = {}; // Cache for technician details from ratesData

 // --- Pre-process ratesData for efficient lookup ---
 for (var i = 1; i < ratesData.length; i++) {
    var row = ratesData[i];
    var name = row[0] ? row[0].toString().trim().toLowerCase() : null;
    var title = row[2] ? row[2].toString() : ""; // Column C - Position Title
    if (name && !techDetailsCache[name]) {
        var techInfo = getTechnicianClassAndRole(title); // Use the new helper
        techDetailsCache[name] = {
            name: row[0].toString().trim(), // Preserve original casing
            class: techInfo.class,
            isEligible: techInfo.isEligible,
            initialRole: techInfo.role
        };
    }
 }
 console.log("Technician Details Cache:", JSON.stringify(techDetailsCache));

 // --- Loop through Spiff/Bonus data (skip header row) ---
 for (var i = 1; i < spiffBonusData.length; i++) {
   var row = spiffBonusData[i];
   console.log(`Processing Spiff/Bonus Row ${i+1}...`); // Log start of row processing
   var primaryTechnicianRaw = row[6]; // Column G
   var assignedTechsString = row[7] ? row[7].toString() : ""; // Column H
   var crossSaleGroup = row[9]; // Column J

   // --- Initial Check: Is this a PBP row involving the current tech? ---
   var pbpMatch = crossSaleGroup ? crossSaleGroup.toString().match(/pbp\s*(\d+(\.\d+)?)/i) : null; // Only match "pbp"
   var entryPbpAmount = (pbpMatch && pbpMatch[1]) ? parseFloat(pbpMatch[1]) : 0;
   console.log(` -> Row ${i+1}: Cross Sale Group='${crossSaleGroup}', Parsed PBP Amount=${entryPbpAmount}`); // Updated log message

   if (entryPbpAmount <= 0) {
     console.log(` -> Row ${i+1}: Skipping (Not PBP or zero amount).`); // Updated log message
     continue; // Skip if not PBP or zero amount
   }
   console.log(` -> Row ${i+1}: PBP Amount OK.`); // Updated log message

   // --- Identify Involved Technicians for this job ---
   var primaryTechnicianName = primaryTechnicianRaw ? primaryTechnicianRaw.toString().trim() : null;
   var assignedNames = parseTechnicianNames(assignedTechsString); // Use helper for parsing

   // Ensure primary tech is included and list is unique
   var uniqueNames = [];
   var uniqueNamesLower = new Set();
   if (primaryTechnicianName) {
       var lowerName = primaryTechnicianName.toLowerCase();
       if (!uniqueNamesLower.has(lowerName)) {
           uniqueNames.push(primaryTechnicianName);
           uniqueNamesLower.add(lowerName);
       }
   }
   assignedNames.forEach(function(name) {
       var lowerName = name.toLowerCase();
       if (!uniqueNamesLower.has(lowerName)) {
           uniqueNames.push(name);
           uniqueNamesLower.add(lowerName);
       }
   });
   console.log(` -> Row ${i+1}: Involved Techs (Unique): [${uniqueNames.join(', ')}]`);

   if (uniqueNames.length === 0) {
       console.log(` -> Row ${i+1}: Skipping (No technicians identified).`);
       continue;
   }
   console.log(` -> Row ${i+1}: Tech identification OK.`);

   // --- Check if the target technician is involved ---
   var targetTechnicianNameLower = technicianName.toLowerCase();
   var techIsInvolved = uniqueNamesLower.has(targetTechnicianNameLower);
   console.log(` -> Row ${i+1}: Is target '${targetTechnicianNameLower}' involved? ${techIsInvolved}`);

   if (!techIsInvolved) {
     console.log(` -> Row ${i+1}: Skipping (Target tech not involved).`);
     continue; // Skip if current tech not involved in this PBP entry
   }
   console.log(` -> Row ${i+1}: Target tech involvement OK.`);

   // --- Generate unique entry key ---
   var customerName = row[1] || ""; // Column B
   var completionDate = row[3] || ""; // Column D
   var itemName = row[10] || ""; // Column K
   var entryKey = customerName.toString().trim() + "|" + completionDate.toString().trim() + "|" + itemName.toString().trim() + "|" + entryPbpAmount;
   console.log(` -> Row ${i+1}: Entry Key='${entryKey}'`);

   if (processedEntries[entryKey]) {
     console.log(` -> Row ${i+1}: Skipping duplicate PBP entry for key: ${entryKey}`);
     continue;
   }
   processedEntries[entryKey] = true;
   console.log(` -> Row ${i+1}: Duplicate check OK.`);

   // --- Determine Roles and Splits for this Job ---
   var jobTechnicians = []; // Array of { name, class, isEligible, initialRole, finalRole, splitPercent, payoutAmount }
   var highestClass = 0;

   // 1. Get initial details from cache or lookup
   uniqueNames.forEach(function(name) {
       var techDetail = techDetailsCache[name.toLowerCase()];
       if (techDetail) {
           jobTechnicians.push({
               name: techDetail.name, // Use original casing
               class: techDetail.class,
               isEligible: techDetail.isEligible,
               initialRole: techDetail.initialRole,
               finalRole: techDetail.initialRole, // Start with initial role
               splitPercent: 0,
               payoutAmount: 0
           });
           if (techDetail.class > highestClass) {
               highestClass = techDetail.class;
           }
       } else {
           // Technician not found in rates sheet - treat as ineligible Class 0
           jobTechnicians.push({
               name: name,
               class: 0,
               isEligible: false,
               initialRole: 'None',
               finalRole: 'None',
               splitPercent: 0,
               payoutAmount: 0
           });
           console.log("Warning: Technician '" + name + "' for PBP row " + (i+1) + " not found in 'Hourly + Spiff Pay'. Treating as ineligible.");
       }
   });

   // 2. Refine Roles based on team context
   var leadCount = 0;
   var assistantCount = 0;
   var totalTechsOnJob = jobTechnicians.length;
   var hasClass3Or4 = jobTechnicians.some(t => t.class >= 3);

   jobTechnicians.forEach(function(tech) {
       // Rule: Promote Class 2 if highest class and no Class 3/4 present
       if (tech.class === 2 && tech.class === highestClass && !hasClass3Or4) {
           tech.finalRole = 'Lead';
       }
       // Rule: Solo tech (Class 2+) is Lead
       if (totalTechsOnJob === 1 && tech.class >= 2) {
           tech.finalRole = 'Lead';
       }
       // Rule: Solo tech (Class 1) is Assistant
       if (totalTechsOnJob === 1 && tech.class === 1) {
           tech.finalRole = 'Assistant';
       }

       // Count final roles
       if (tech.finalRole === 'Lead') {
           leadCount++;
       } else if (tech.finalRole === 'Assistant') {
           assistantCount++;
       }
   });

   // 3. Calculate Split Percentages
   jobTechnicians.forEach(function(tech) {
       tech.splitPercent = calculateSplitPercentage(totalTechsOnJob, leadCount, assistantCount, tech.finalRole);
   });

   // 4. Calculate Individual Share and Apply Eligibility Filter
   var currentTechFinalInfo = null;
   // ---> Log the target name we're looking for <---
   console.log(` -> Searching for target tech: '${targetTechnicianNameLower}' within jobTechnicians list for row ${i+1}`);
   jobTechnicians.forEach(function(tech) {
       var individualShare = entryPbpAmount * (tech.splitPercent / 100);
       // Only eligible techs get a payout amount
       tech.payoutAmount = tech.isEligible ? individualShare : 0;

       // Keep track of the target technician's final info
       var techNameLower = tech.name.toLowerCase();
       // ---> Log the comparison details <---
       console.log(`  --> Comparing: (cache name) '${techNameLower}' === (target name) '${targetTechnicianNameLower}' ?`);
       if (techNameLower === targetTechnicianNameLower) {
           currentTechFinalInfo = tech;
           console.log(`  --> Match found! Storing info for ${tech.name}`);
       }
   });

   // --- Store Processed Entry for the target technician ---
   if (currentTechFinalInfo) {
       console.log(` -> Storing PBP entry for ${currentTechFinalInfo.name}. Payout: ${currentTechFinalInfo.payoutAmount}`);
       var teamDetails = jobTechnicians.map(t => `${t.name} (C${t.class}/${t.finalRole}/${t.splitPercent.toFixed(1)}%)`).join(', ');

       allPbpEntries.push({
         customerName: customerName,
         jobBusinessUnit: row[2], // Column C
         completionDate: completionDate,
         itemName: itemName,
         totalPbp: entryPbpAmount,
         technicianShare: currentTechFinalInfo.payoutAmount, // Store the actual payout amount
         roleForJob: currentTechFinalInfo.finalRole,
         splitPercentage: currentTechFinalInfo.splitPercent,
         isEligible: currentTechFinalInfo.isEligible,
         teamDetails: teamDetails, // Add team details for clarity
         // Deprecate old apprentice fields
         // isApprentice: isApprentice,
         // apprenticePercentage: isApprentice ? apprenticePercentage : 0
       });

       totalTechnicianShare += currentTechFinalInfo.payoutAmount;
   } else {
       // This should not happen if techIsInvolved was true earlier
       console.error(`Error: Target technician ${technicianName} not found in final jobTechnicians list for PBP row ${i+1}.`);
   }

 } // End loop through spiffBonusData


 return {
   entries: allPbpEntries,
   totalShare: totalTechnicianShare
 };
}


/**
* Parses technician names from a string (comma or space separated).
* @param {string} nameString - The string containing technician names.
* @return {Array<string>} An array of cleaned technician names.
*/
function parseTechnicianNames(nameString) {
    if (!nameString || typeof nameString !== 'string') return [];
    
    var names = [];
    // Replace multiple spaces with single space, trim
    var cleanedString = nameString.replace(/\\s+/g, ' ').trim();
    
    // Handle common separators (comma, semicolon, potentially multiple spaces between names)
    if (cleanedString.includes(',')) {
        names = cleanedString.split(',');
    } else if (cleanedString.includes(';')) {
        names = cleanedString.split(';');
    } else {
        // Attempt space separation, trying to group first/last names
        var parts = cleanedString.split(' ');
        if (parts.length <= 2) { // Likely one name
            names = [cleanedString];
        } else {
             // Heuristic: Assume names are pairs if even number of parts > 2
             if (parts.length % 2 === 0) {
                 for (var i = 0; i < parts.length; i += 2) {
                     names.push(parts[i] + ' ' + parts[i+1]);
                 }
             } else {
                  // Odd number of parts - less certain. Treat as single names or log warning?
                  // For now, treat as single name parts - may need refinement
                  console.log("Warning: Ambiguous space-separated names detected: '" + cleanedString + "'. Splitting by space.");
                  names = parts;
             }
        }
    }
    
    // Final clean: remove percentages, trim, filter empty
    return names.map(function(name) {
        return name.replace(/\\(\\d+%?\\)/, '').replace(/\\(Lead|Assistant|\\d+%?\\)/i, '').trim(); // Remove role/percent hints too
    }).filter(function(name){ return name.length > 0; });
}


/**
* Determines technician class, eligibility, and initial role based on Position Title.
* @param {string} positionTitle - The technician's position title from 'Hourly + Spiff Pay'.
* @return {{class: number, isEligible: boolean, role: string}}
*/
function getTechnicianClassAndRole(positionTitle) {
    var techClass = 0; // Default to invalid/ineligible
    var isEligible = false;
    var initialRole = 'None';
    // Ensure it's treated as a string, trim whitespace, then lowercase
    var titleLower = positionTitle ? positionTitle.toString().trim().toLowerCase() : "";

    // ---> Enhanced Debug Logging <---
    console.log("Parsing Position Title: Raw='" + positionTitle + "' ==> Trimmed Lowercase='" + titleLower + "'");

    if (!titleLower) {
        console.log(" -> Title is empty. Defaulting to Class 0/Ineligible.");
        return { class: techClass, isEligible: isEligible, role: initialRole };
    }

    // Check for Class number first
    var classMatch = titleLower.match(/class\s*([1-4])/);
    if (classMatch && classMatch[1]) {
        techClass = parseInt(classMatch[1], 10);
        console.log(" -> Matched Class: " + techClass); // Log success
    } else {
        // Only log failure if we didn't match Class 1-4
        if (techClass === 0) { 
           console.log(" -> No 'Class [1-4]' match found in title."); // Log failure
        }
    }
    // Add other potential title mappings if needed (e.g., "lead installer" mapping to Class 4)
    // else if (titleLower.includes("lead installer")) { techClass = 4; console.log(" -> Matched 'lead installer'. Setting Class: 4"); }

    // Determine Eligibility and Initial Role based on Class
    switch (techClass) {
        case 4:
            isEligible = true;
            initialRole = 'Lead';
            break;
        case 3:
            isEligible = true;
            initialRole = 'Lead';
            break;
        case 2:
            isEligible = true;
            initialRole = 'Assistant'; // Default for Class 2
            break;
        case 1:
            isEligible = false; // Apprentices are ineligible for payout
            initialRole = 'Assistant';
            break;
        default: // Includes Class 0 or unparsed
            isEligible = false;
            initialRole = 'None';
            break;
    }
    console.log(" -> Result: Class=" + techClass + ", Eligible=" + isEligible + ", Role=" + initialRole); // Log final result for this title
    return { class: techClass, isEligible: isEligible, role: initialRole };
}


/**
 * Calculates the PBP split percentage for a technician based on team composition.
 * @param {number} totalTechs - Total number of technicians on the job.
 * @param {number} leadCount - Number of technicians with the 'Lead' role.
 * @param {number} assistantCount - Number of technicians with the 'Assistant' role.
 * @param {string} techRole - The final role ('Lead' or 'Assistant') of the technician asking for their split.
 * @return {number} The percentage split (0-100).
 */
function calculateSplitPercentage(totalTechs, leadCount, assistantCount, techRole) {
    if (techRole === 'None' || totalTechs === 0) {
        return 0;
    }

    // Ensure counts add up (or handle discrepancy)
    if (leadCount + assistantCount !== totalTechs) {
         // This might happen if some techs had role 'None' initially
         console.log(`Warning: Role count mismatch. Total: ${totalTechs}, Leads: ${leadCount}, Assistants: ${assistantCount}. Recalculating effective total.`);
         totalTechs = leadCount + assistantCount; // Adjust total to only paying roles
         if (totalTechs === 0) return 0; // No paying roles left
    }


    switch (totalTechs) {
        case 1:
            return 100; // Solo job

        case 2:
            if (leadCount === 1 && assistantCount === 1) { return (techRole === 'Lead') ? 65 : 35; }
            if (leadCount === 2 && assistantCount === 0) { return 50; }
            if (leadCount === 0 && assistantCount === 2) { return 50; } // Handles 2 Class 2s who were both Assistants initially
            break; // Go to fallback if mismatch

        case 3:
            if (leadCount === 1 && assistantCount === 2) { return (techRole === 'Lead') ? 46 : 27; }
            if (leadCount === 2 && assistantCount === 1) { return (techRole === 'Lead') ? 38 : 24; }
            if (leadCount === 3 && assistantCount === 0) { return 100 / 3; } // Equal split for 3 leads
            if (leadCount === 0 && assistantCount === 3) { return 100 / 3; } // Equal split for 3 assistants
             break; // Go to fallback if mismatch

        case 4:
            if (leadCount === 2 && assistantCount === 2) { return (techRole === 'Lead') ? 30 : 20; }
            if (leadCount === 3 && assistantCount === 1) { return (techRole === 'Lead') ? 30 : 10; }
            if (leadCount === 4 && assistantCount === 0) { return 25; } // Equal split for 4 leads
            if (leadCount === 0 && assistantCount === 4) { return 25; } // Equal split for 4 assistants
            break; // Go to fallback if mismatch
    }

    // Fallback for > 4 techs or unexpected role combinations
    console.log(`Using fallback split calculation for ${totalTechs} techs (${leadCount}L / ${assistantCount}A)`);
    return (totalTechs > 0) ? (100 / totalTechs) : 0;
}



// --- Remove the old helper function ---
/*
* Helper function to get the default split percentage for a technician
* from the 'Hourly + Spiff Pay' sheet data. (Belongs with Calculation logic)
* @param {string} techName - The name of the technician.
* @param {Array<Array>} ratesData - The 2D array of data from 'Hourly + Spiff Pay'.
* @return {number} The default split percentage (e.g., 65, 35, 0) or 0 if not found.
*/
/* DEPRECATED
function getTechnicianDefaultSplit(techName, ratesData) {
  // ... old logic ...
}
*/

