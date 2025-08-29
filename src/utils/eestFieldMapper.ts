// EEST Field Mapper
// Maps EEST form data to PDF field names for the Emergency Equipment Shift Ticket

import type { EESTFormData, EESTTimeEntry } from './engineTimeDB';

// EEST Time Entry for PDF
export interface EESTTimeEntryForPDF {
  date: string;
  start: string;
  stop: string;
  work: string;
  special: string;
}

// EEST Crew/Equipment Info for PDF
export interface EESTCrewInfo {
  agreementNumber: string;
  resourceOrderNumber: string;
  contractorAgencyName: string;
  incidentName: string;
  incidentNumber: string;
  operatorName: string;
  equipmentMake: string;
  equipmentModel: string;
  serialNumber: string;
  licenseNumber: string;
  equipmentStatus: string;
  invoicePostedBy: string;
  dateSigned: string;
  remarks: string;
  remarksOptions: string[];
  customRemarks: string[];
}

// EEST PDF Field Names
export interface EESTPDFFields {
  // Form header fields
  agreementNumber: string;
  resourceOrderNumber: string;
  contractorAgencyName: string;
  incidentName: string;
  incidentNumber: string;
  operatorName: string;
  
  // Equipment fields
  equipmentMake: string;
  equipmentModel: string;
  serialNumber: string;
  licenseNumber: string;
  equipmentUse: string;
  
  // Checkbox fields
  contractorCheckbox1: string;
  contractorCheckbox3: string;
  inspectedUnderAgreementCheckbox: string;
  
  // Remarks checkbox fields
  hotlineCheckbox: string;
  noMealsLodgingCheckbox: string;
  noMealsCheckbox: string;
  travelCheckbox: string;
  noLunchCheckbox: string;
  
  // Time entry fields (array of entries)
  timeEntries: EESTTimeEntryForPDF[];
  
  // Remarks fields
  remarks: string;
  remarksOptions: string[];
  customRemarks: string[];
  
  // Signature and date fields
  invoicePostedBy: string;
  dateSigned: string;
}

/**
 * Maps EEST form data to PDF field names
 */
export function mapEESTToPDFFields(
  formData: EESTFormData & { equipmentUse?: string },
  timeEntries: EESTTimeEntry[]
): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // Map form data to PDF fields using the field mapper
  // Truncate text to fit better in the PDF fields
  fields[getEESTPDFFieldName('agreementNumber')] = (formData.agreementNumber || '').substring(0, 20);
  fields[getEESTPDFFieldName('resourceOrderNumber')] = (formData.resourceOrderNumber || '').substring(0, 15);
  fields[getEESTPDFFieldName('contractorAgencyName')] = (formData.contractorAgencyName || '').substring(0, 25);
  fields[getEESTPDFFieldName('incidentName')] = (formData.incidentName || '').substring(0, 30);
  fields[getEESTPDFFieldName('incidentNumber')] = (formData.incidentNumber || '').substring(0, 15);
  fields[getEESTPDFFieldName('operatorName')] = (formData.operatorName || '').substring(0, 20);
  
  // Equipment fields
  fields[getEESTPDFFieldName('equipmentMake')] = (formData.equipmentMake || '').substring(0, 15);
  fields[getEESTPDFFieldName('equipmentModel')] = (formData.equipmentModel || '').substring(0, 15);
  fields[getEESTPDFFieldName('serialNumber')] = (formData.serialNumber || '').substring(0, 20);
  fields[getEESTPDFFieldName('licenseNumber')] = (formData.licenseNumber || '').substring(0, 15);
  
  // Equipment status checkboxes - map to appropriate status checkboxes
  // Note: equipmentStatus field mapping removed - should use checkboxes instead
  
  // Equipment use field - map dropdown values to PDF field
  if (formData.equipmentUse) {
    // Map equipment use to DROPDOWN 9 field - only HOURS is used
    fields['Dropdown9'] = 'HRS';  // Set dropdown to HRS
    
    console.log('EEST Field Mapper: Equipment use mapping:', {
      equipmentUse: formData.equipmentUse,
      dropdownValue: fields['Dropdown9'],
      fieldName: 'Dropdown9'
    });
  } else {
    console.log('EEST Field Mapper: No equipment use found in form data');
  }
  
  // Contractor checkbox logic - always check these boxes by default
  console.log('EEST Field Mapper: Raw equipment status:', JSON.stringify(formData.equipmentStatus));
  const isContractor = formData.equipmentStatus === 'Contractor';
  console.log('EEST Field Mapper: Equipment status:', formData.equipmentStatus, 'isContractor:', isContractor);
  
  // Check Box1 = "Operator Furnished By" (Contractor) - always checked by default
  fields[getEESTPDFFieldName('contractorCheckbox1')] = 'Yes';
  
  // Check Box3 = "Operating Supplies Furnished By" (Contractor) - always checked by default
  fields[getEESTPDFFieldName('contractorCheckbox3')] = 'Yes';
  
  // Equipment Status checkbox - "a Inspected and under agreement" - always checked by default
  fields[getEESTPDFFieldName('inspectedUnderAgreementCheckbox')] = 'Yes';
  
  // Equipment Status checkboxes - map equipment status to appropriate checkboxes
  // These should be mapped to GOVERNMENT, CONTRACT, PRIVATE checkboxes from the CSV
  if (formData.equipmentStatus) {
    // TODO: Add proper equipment status checkbox mappings
    // fields['GOVERNMENT'] = formData.equipmentStatus === 'Government' ? 'Yes' : 'Off';
    // fields['CONTRACT'] = formData.equipmentStatus === 'Contractor' ? 'Yes' : 'Off';
    // fields['PRIVATE'] = formData.equipmentStatus === 'Private' ? 'Yes' : 'Off';
  }
  
  console.log('EEST Field Mapper: Checkbox values:', {
    operatorFurnishedBy: fields[getEESTPDFFieldName('contractorCheckbox1')],
    suppliesFurnishedBy: fields[getEESTPDFFieldName('contractorCheckbox3')]
  });
  
  // Map remarks data to PDF fields
  console.log('EEST Field Mapper: Remarks data:', {
    remarksOptions: formData.remarksOptions,
    customRemarks: formData.customRemarks
  });
  
  // Combine all remarks into the main remarks field
  const allRemarks: string[] = [];
  
  // Add standard remarks options
  if (formData.remarksOptions) {
    allRemarks.push(...formData.remarksOptions);
  }
  
  // Add custom remarks
  if (formData.customRemarks && formData.customRemarks.length > 0) {
    allRemarks.push(...formData.customRemarks);
  }
  
  // Map crew members to remarks if provided, otherwise use other remarks
  if (formData.remarks) {
    fields[getEESTPDFFieldName('remarks')] = formData.remarks;
  } else if (allRemarks.length > 0) {
    fields[getEESTPDFFieldName('remarks')] = allRemarks.join('\n');
  }
  
  // Also map individual checkbox fields for compatibility
  if (formData.remarksOptions) {
    // HOTLINE checkbox
    fields[getEESTPDFFieldName('hotlineCheckbox')] = 
      formData.remarksOptions.includes('HOTLINE') ? 'Yes' : 'Off';
    
    // Self Sufficient - No Meals Provided checkbox
    fields[getEESTPDFFieldName('noMealsLodgingCheckbox')] = 
      formData.remarksOptions.includes('Self Sufficient - No Meals Provided') ? 'Yes' : 'Off';
    
    // Self Sufficient - No Lodging Provided text field
    if (formData.remarksOptions.includes('Self Sufficient - No Lodging Provided')) {
      fields[getEESTPDFFieldName('noMealsCheckbox')] = 'Self Sufficient - No Lodging Provided';
    }
    
    // Travel text field
    if (formData.remarksOptions.includes('Travel')) {
      fields[getEESTPDFFieldName('travelCheckbox')] = 'Travel';
    }
    
    // No Lunch Taken due to Uncontrolled Fire text field
    if (formData.remarksOptions.includes('No Lunch Taken due to Uncontrolled Fire')) {
      fields[getEESTPDFFieldName('noLunchCheckbox')] = 'No Lunch Taken due to Uncontrolled Fire';
    }
  }
  
  // Map time entries to PDF fields
  timeEntries.forEach((entry, index) => {
    if (index < 4) { // PDF has 4 rows for time entries
      const rowNum = index + 1;
      fields[`12 DATE MODAYRRow${rowNum}`] = (entry.date || '').substring(0, 8);
      fields[`STARTRow${rowNum}`] = (entry.start || '').substring(0, 4);
      fields[`STOPRow${rowNum}`] = (entry.stop || '').substring(0, 4);
      fields[`WORKRow${rowNum}`] = (entry.work || '').substring(0, 10);
      fields[`SPECIALRow${rowNum}`] = (entry.special || '').substring(0, 10);
    }
  });
  
  console.log('EEST Field Mapper: Final fields:', fields);
  
  return fields;
}

/**
 * Gets the PDF field name for a given EEST field
 */
export function getEESTPDFFieldName(field: keyof EESTPDFFields): string {
  const fieldMappings: Record<keyof EESTPDFFields, string> = {
    // Form header fields
    agreementNumber: '1 AGREEMENT NUMBER',
    contractorAgencyName: '2 CONTRACTOR name',
    incidentName: '3 INCIDENT OR PROJECT NAME',
    incidentNumber: '4 INCIDENT NUMBER',
    operatorName: '5 OPERATOR name',
    
    // Equipment fields
    equipmentMake: '6 EQUIPMENT MAKE',
    equipmentModel: '7 EQUIPMENT MODEL',
    serialNumber: '9 SERIAL NUMBER',
    licenseNumber: '10 LICENSE NUMBER',
    equipmentUse: 'Dropdown9',
    
    // Checkbox fields
    contractorCheckbox1: 'Check Box1', // Operator Furnished By
    contractorCheckbox3: 'Check Box3', // Operating Supplies Furnished By
    inspectedUnderAgreementCheckbox: 'a Inspected and under agreement',
    
    // Remarks checkbox fields - using actual PDF field names
    hotlineCheckbox: 'Check Box2',
    noMealsLodgingCheckbox: 'Check Box4',
    noMealsCheckbox: 'Text2',
    travelCheckbox: 'Text3',
    noLunchCheckbox: 'Text4',
    
    // TODO: Add remaining PDF field names
    resourceOrderNumber: 'RESOURCE ORDER #',
    // equipmentStatus: removed - should use checkboxes instead of text field
    timeEntries: 'time_entries',
    remarks: '14 REMARKS released down time and cause problems etc',
    remarksOptions: 'remarks_options',
    customRemarks: 'Text5',
    invoicePostedBy: '16 INVOICE POSTED BY Recorders Initials',
    dateSigned: '19 DATE SIGNED',
  };
  
  return fieldMappings[field] || field;
}

/**
 * Debug function to help identify PDF field names
 * This can be called to log all available fields in the PDF
 */
export function debugPDFFields(form: unknown): void {
  console.group('PDF Field Debug Info');
  const fields = (form as { getFields(): unknown[] }).getFields();
  console.log('All available PDF fields:');
  fields.forEach((field: unknown) => {
    const fieldObj = field as { getName(): string; constructor: { name: string } };
    console.log(`- ${fieldObj.getName()} (${fieldObj.constructor.name})`);
  });
  console.groupEnd();
}

/**
 * Validates EEST form data for PDF generation
 */
export function validateEESTFormData(formData: EESTFormData, timeEntries: EESTTimeEntry[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Required fields validation
  if (!formData.agreementNumber) errors.push('Agreement Number is required');
  if (!formData.contractorAgencyName) errors.push('Contractor Agency Name is required');
  if (!formData.incidentName) errors.push('Incident Name is required');
  if (!formData.incidentNumber) errors.push('Incident Number is required');
  if (!formData.operatorName) errors.push('Operator Name is required');
  
  // Equipment validation
  if (!formData.equipmentMake && !formData.equipmentModel) {
    errors.push('Equipment Make or Model is required');
  }
  
  // Time entries validation
  const hasValidTimeEntries = timeEntries.some(entry => 
    entry.date && (entry.start || entry.stop || entry.work)
  );
  if (!hasValidTimeEntries) {
    errors.push('At least one time entry with date and work information is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 