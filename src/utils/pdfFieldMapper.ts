// Types for the data structures we're working with
export interface TimeEntry {
  date?: string;
  equipmentUse?: 'HOURS' | 'MILES' | 'DAYS';
  equipBegin?: string;
  equipEnd?: string;
  name?: string;
  job?: string;
  timeBegin?: string;
  timeEnd?: string;
}

export interface CrewInfo {
  divUnit?: string;
  shift?: string;
  ownerContractor?: string;
  contractNumber?: string;
  resourceReqNo?: string;
  resourceType?: 'GOVERNMENT' | 'CONTRACT' | 'PRIVATE';
  doubleShifted?: 'YES' | 'NO';
  incidentName?: string;
  incidentNumber?: string;
  equipmentType?: string;
  equipmentMakeModel?: string;
  remarks?: string;
  licenseVinSerial?: string;
  ownerIdNumber?: string; // Added for the new field
  checkboxStates?: {
    hotline?: boolean;
    travel?: boolean;
    noMealsLodging?: boolean;
    noMeals?: boolean;
    noLunch?: boolean;
  };
  customEntries?: string[];
  totalHours?: string;
}

export function mapToPDFFields(
  timeEntries: TimeEntry[], 
  crewInfo: CrewInfo
): Record<string, string> {
  const fields: Record<string, string> = {};

  // Crew info fields
  if (crewInfo) {
    fields['1 DIVUNIT'] = crewInfo.divUnit || '';
    fields['2 SHIFT'] = crewInfo.shift || '';
    fields['3 OWNERCONTRACTOR name'] = crewInfo.ownerContractor || '';
    fields['4 CONTRACTAGREEMENT NUMBER'] = crewInfo.contractNumber || '';
    fields['5 RESOURCE REQ NO'] = crewInfo.resourceReqNo || '';
    fields['8 INCIDENT NAME'] = crewInfo.incidentName || '';
    fields['9 INCIDENT NUMBER'] = crewInfo.incidentNumber || '';
    fields['10 EQUIPMENT TYPE'] = crewInfo.equipmentType || '';
    // Equipment Make/Model goes in the full remarks field name
    fields['12 REMARKS released down time and cause problems etc'] = crewInfo.equipmentMakeModel || '';
    // Owner ID Number goes in the LICENSE VIN OR SERIAL field
    fields['14 LICENSE VIN OR SERIAL'] = crewInfo.ownerIdNumber || '';
    // License/VIN/Serial goes in the equipment use field
    fields['14 LICENSE VIN OR SERIAL 16 EQUIPMENT USE check one'] = crewInfo.licenseVinSerial || '';

    // Resource type (checkboxes)
    if (crewInfo.resourceType) {
      // Set all resource type checkboxes, only the selected one will be true
      fields['GOVERNMENT'] = (crewInfo.resourceType === 'GOVERNMENT').toString();
      fields['CONTRACT'] = (crewInfo.resourceType === 'CONTRACT').toString();
      fields['PRIVATE'] = (crewInfo.resourceType === 'PRIVATE').toString();
    }

    // Double shifted (checkboxes) - using exact field names
    fields['7y'] = (crewInfo.doubleShifted === 'YES').toString();
    fields['7n'] = (crewInfo.doubleShifted === 'NO').toString();

    // Equipment use checkboxes - using the correct mapping
    if (timeEntries.length > 0) {
      const firstEntry = timeEntries[0];
      if (firstEntry.equipmentUse) {
        // Map the equipment use to the correct fields based on the PDF structure
        switch (firstEntry.equipmentUse) {
          case 'HOURS':
            fields['undefined'] = 'true';  // Hours checkbox
            fields['HOURS'] = 'false';     // Miles checkbox
            fields['MILES'] = 'false';     // Days checkbox
            break;
          case 'MILES':
            fields['undefined'] = 'false'; // Hours checkbox
            fields['HOURS'] = 'true';      // Miles checkbox
            fields['MILES'] = 'false';     // Days checkbox
            break;
          case 'DAYS':
            fields['undefined'] = 'false'; // Hours checkbox
            fields['HOURS'] = 'false';     // Miles checkbox
            fields['MILES'] = 'true';      // Days checkbox
            break;
        }
      }
    }

    // Map time entry data to the correct fields
    timeEntries.forEach((entry, index) => {
      if (index < 6) { // Limit to 6 entries as that's what the PDF supports
        // Map dates (Row1 through Row6)
        if (entry.date) {
          fields[`15 DATE MODAYYRRow${index + 1}`] = entry.date;
        }

        // Map operator names (Row3 through Row8)
        if (entry.name) {
          fields[`14 LICENSE VIN OR SERIAL Row${index + 3}`] = entry.name;
        }

        // Map jobs (Job.0 through Job.5)
        if (entry.job) {
          fields[`19. Job.${index}`] = entry.job;
        }

        // Map equipment beginning hours (Beg.0 through Beg.5)
        if (entry.equipBegin) {
          fields[`17 Beg.${index}`] = entry.equipBegin;
        }

        // Map equipment ending hours (End.0 through End.5)
        if (entry.equipEnd) {
          fields[`18 End.${index}`] = entry.equipEnd;
        }

        // Map personnel beginning times (Begin.0 through Begin.5)
        if (entry.timeBegin) {
          fields[`19. Begin.${index}`] = entry.timeBegin;
        }

        // Map personnel ending times (End.0 through End.5)
        if (entry.timeEnd) {
          fields[`20. End.${index}`] = entry.timeEnd;
        }
      }
    });

    // Handle remarks - using the correct field name
    if (crewInfo.checkboxStates) {
      const remarks: string[] = [];
      
      // Build remarks array based on checkbox states
      if (crewInfo.checkboxStates.noMealsLodging && crewInfo.checkboxStates.noMeals) {
        remarks.push('Self Sufficient - No Meals & No Lodging Provided');
      } else if (crewInfo.checkboxStates.noMealsLodging) {
        remarks.push('Self Sufficient - No Meals Provided');
      } else if (crewInfo.checkboxStates.noMeals) {
        remarks.push('Self Sufficient - No Lodging Provided');
      }

      if (crewInfo.checkboxStates.travel && crewInfo.checkboxStates.hotline) {
        remarks.push('Travel');
      }

      if (crewInfo.checkboxStates.noLunch) {
        remarks.push('No Lunch Taken due to Uncontrolled Fire Line');
      }

      // Add any custom entries
      if (crewInfo.customEntries?.length) {
        remarks.push(...crewInfo.customEntries);
      }

      // Combine all remarks into the main remarks field using the correct field name
      const remarksText = [
        `${crewInfo.checkboxStates.hotline ? 'HOTLINE' : 'Travel'}${crewInfo.totalHours ? `                Total Hours: ${crewInfo.totalHours}` : ''}`,
        ...remarks
      ].join('\n');

      // Put actual remarks in field '12'
      fields['12'] = remarksText;
    }
  }

  return fields;
}

// Helper function to format remarks
export function formatRemarks(remarks: string[]): string {
  return remarks
    .filter(remark => remark && remark.trim()) // Remove empty remarks
    .join('\n');
} 