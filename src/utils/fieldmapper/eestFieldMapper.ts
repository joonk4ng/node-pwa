// EEST Field Mapper
// Maps EEST form data to PDF field names for the Emergency Equipment Shift Ticket

import type { EESTFormData, EESTTimeEntry } from '../engineTimeDB';
import { autoCalculateEESTTimeTotals } from '../timeCalculations';

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
  
  // Operator and Supplies text fields
  operatorFurnishedBy: string;
  operatingSuppliesFurnishedBy: string;
  
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
  
  console.log('🔍 EEST Field Mapper: Starting field mapping...');
  console.log('🔍 EEST Field Mapper: Form data received:', {
    agreementNumber: formData.agreementNumber,
    contractorAgencyName: formData.contractorAgencyName,
    incidentName: formData.incidentName,
    incidentNumber: formData.incidentNumber,
    operatorName: formData.operatorName,
    equipmentMake: formData.equipmentMake,
    equipmentModel: formData.equipmentModel,
    serialNumber: formData.serialNumber,
    licenseNumber: formData.licenseNumber,
    equipmentStatus: formData.equipmentStatus,
    equipmentUse: formData.equipmentUse,
    remarks: formData.remarks,
    remarksOptions: formData.remarksOptions,
    customRemarks: formData.customRemarks
  });
  console.log('🔍 EEST Field Mapper: Time entries received:', timeEntries);
  
  // Auto-calculate totals for time entries before mapping
  const calculatedTimeEntries = autoCalculateEESTTimeTotals(timeEntries);
  console.log('🔍 EEST Field Mapper: Calculated time entries:', calculatedTimeEntries);
  
  // Map form data to PDF fields using the field mapper
  // Truncate text to fit better in the PDF fields
  console.log('🔍 EEST Field Mapper: Mapping header fields...');
  
  const agreementFieldName = getEESTPDFFieldName('agreementNumber');
  const agreementValue = (formData.agreementNumber || '').substring(0, 20);
  fields[agreementFieldName] = agreementValue;
  console.log(`🔍 EEST Field Mapper: ${agreementFieldName} = "${agreementValue}"`);
  
  const resourceOrderFieldName = getEESTPDFFieldName('resourceOrderNumber');
  const resourceOrderValue = (formData.resourceOrderNumber || '').substring(0, 15);
  fields[resourceOrderFieldName] = resourceOrderValue;
  console.log(`🔍 EEST Field Mapper: ${resourceOrderFieldName} = "${resourceOrderValue}"`);
  
  const contractorFieldName = getEESTPDFFieldName('contractorAgencyName');
  const contractorValue = (formData.contractorAgencyName || '').substring(0, 25);
  fields[contractorFieldName] = contractorValue;
  console.log(`🔍 EEST Field Mapper: ${contractorFieldName} = "${contractorValue}"`);
  
  const incidentNameFieldName = getEESTPDFFieldName('incidentName');
  const incidentNameValue = (formData.incidentName || '').substring(0, 30);
  fields[incidentNameFieldName] = incidentNameValue;
  console.log(`🔍 EEST Field Mapper: ${incidentNameFieldName} = "${incidentNameValue}"`);
  
  const incidentNumberFieldName = getEESTPDFFieldName('incidentNumber');
  const incidentNumberValue = (formData.incidentNumber || '').substring(0, 15);
  fields[incidentNumberFieldName] = incidentNumberValue;
  console.log(`🔍 EEST Field Mapper: ${incidentNumberFieldName} = "${incidentNumberValue}"`);
  
  const operatorFieldName = getEESTPDFFieldName('operatorName');
  const operatorValue = (formData.operatorName || '').substring(0, 20);
  fields[operatorFieldName] = operatorValue;
  console.log(`🔍 EEST Field Mapper: ${operatorFieldName} = "${operatorValue}"`);
  
  // Equipment fields
  console.log('🔍 EEST Field Mapper: Mapping equipment fields...');
  
  const equipmentMakeFieldName = getEESTPDFFieldName('equipmentMake');
  const equipmentMakeValue = (formData.equipmentMake || '').substring(0, 15);
  fields[equipmentMakeFieldName] = equipmentMakeValue;
  console.log(`🔍 EEST Field Mapper: ${equipmentMakeFieldName} = "${equipmentMakeValue}"`);
  
  const equipmentModelFieldName = getEESTPDFFieldName('equipmentModel');
  const equipmentModelValue = (formData.equipmentModel || '').substring(0, 15);
  fields[equipmentModelFieldName] = equipmentModelValue;
  console.log(`🔍 EEST Field Mapper: ${equipmentModelFieldName} = "${equipmentModelValue}"`);
  
  const serialNumberFieldName = getEESTPDFFieldName('serialNumber');
  const serialNumberValue = (formData.serialNumber || '').substring(0, 20);
  fields[serialNumberFieldName] = serialNumberValue;
  console.log(`🔍 EEST Field Mapper: ${serialNumberFieldName} = "${serialNumberValue}"`);
  
  const licenseNumberFieldName = getEESTPDFFieldName('licenseNumber');
  const licenseNumberValue = (formData.licenseNumber || '').substring(0, 15);
  fields[licenseNumberFieldName] = licenseNumberValue;
  console.log(`🔍 EEST Field Mapper: ${licenseNumberFieldName} = "${licenseNumberValue}"`);
  
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
  
  // Contractor checkbox logic - auto-check the specific PDF fields
  console.log('EEST Field Mapper: Raw equipment status:', JSON.stringify(formData.equipmentStatus));
  const isContractor = formData.equipmentStatus === 'Contractor';
  console.log('EEST Field Mapper: Equipment status:', formData.equipmentStatus, 'isContractor:', isContractor);
  
  // Auto-check Check Box1 = "Operator Furnished By" (Contractor)
  fields['Check Box1'] = 'Yes';
  
  // Auto-check Check Box3 = "Operating Supplies Furnished By" (Contractor)
  fields['Check Box3'] = 'Yes';
  
  // Auto-check "a Inspected and under agreement" checkbox
  fields['a Inspected and under agreement'] = 'Yes';
  
  console.log('EEST Field Mapper: Checkbox values:', {
    operatorFurnishedBy: fields['Check Box1'],
    suppliesFurnishedBy: fields['Check Box3'],
    inspectedUnderAgreement: fields['a Inspected and under agreement']
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
  const remarksFieldName = getEESTPDFFieldName('remarks');
  const customRemarksFieldName = getEESTPDFFieldName('customRemarks');
  console.log('🔍 EEST Field Mapper: Remarks field name:', remarksFieldName);
  console.log('🔍 EEST Field Mapper: Custom remarks field name:', customRemarksFieldName);
  console.log('🔍 EEST Field Mapper: All remarks to map:', allRemarks);
  console.log('🔍 EEST Field Mapper: Form data remarks:', formData.remarks);
  console.log('🔍 EEST Field Mapper: Custom remarks (crew members):', formData.customRemarks);
  
  // Try mapping to both the main remarks field and the custom remarks field
  if (formData.remarks) {
    fields[remarksFieldName] = formData.remarks;
    console.log(`🔍 EEST Field Mapper: Mapped remarks field "${remarksFieldName}" with form data remarks: "${formData.remarks}"`);
  } else if (allRemarks.length > 0) {
    const combinedRemarks = allRemarks.join('\n');
    fields[remarksFieldName] = combinedRemarks;
    console.log(`🔍 EEST Field Mapper: Mapped remarks field "${remarksFieldName}" with combined remarks: "${combinedRemarks}"`);
  } else {
    console.log('🔍 EEST Field Mapper: No remarks to map to main field');
  }
  
  // Map crew members to the correct operator and supplies fields
  if (formData.customRemarks && formData.customRemarks.length > 0) {
    console.log(`🔍 EEST Field Mapper: Processing ${formData.customRemarks.length} crew members:`, formData.customRemarks);
    
    // Map crew members to operator and supplies text fields
    const crewMembersText = formData.customRemarks.join(', '); // Use comma separation for better readability
    
    // Map to Operator Furnished By text field
    const operatorFieldName = getEESTPDFFieldName('operatorFurnishedBy');
    fields[operatorFieldName] = crewMembersText;
    console.log(`🔍 EEST Field Mapper: Mapped operator field "${operatorFieldName}" with crew members: "${crewMembersText}"`);
    
    // Map to Operating Supplies Furnished By text field
    const suppliesFieldName = getEESTPDFFieldName('operatingSuppliesFurnishedBy');
    fields[suppliesFieldName] = crewMembersText;
    console.log(`🔍 EEST Field Mapper: Mapped supplies field "${suppliesFieldName}" with crew members: "${crewMembersText}"`);
    
    console.log(`🔍 EEST Field Mapper: Crew members text length: ${crewMembersText.length} characters`);
  } else {
    console.log('🔍 EEST Field Mapper: No crew members (customRemarks) found in form data');
    console.log('🔍 EEST Field Mapper: Form data customRemarks:', formData.customRemarks);
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
  
  // Map time entries to PDF fields - using calculated entries
  console.log('🔍 EEST Field Mapper: Mapping time entries...');
  calculatedTimeEntries.forEach((entry, index) => {
    if (index < 4) { // PDF has 4 rows for time entries
      const rowNum = index + 1;
      console.log(`🔍 EEST Field Mapper: Processing time entry row ${rowNum}:`, entry);
      
      const dateFieldName = `12 DATE MODAYRRow${rowNum}`;
      const dateValue = (entry.date || '').substring(0, 8);
      fields[dateFieldName] = dateValue;
      console.log(`🔍 EEST Field Mapper: ${dateFieldName} = "${dateValue}"`);
      
      const startFieldName = `STARTRow${rowNum}`;
      const startValue = (entry.start || '').substring(0, 4);
      fields[startFieldName] = startValue;
      console.log(`🔍 EEST Field Mapper: ${startFieldName} = "${startValue}"`);
      
      const stopFieldName = `STOPRow${rowNum}`;
      const stopValue = (entry.stop || '').substring(0, 4);
      fields[stopFieldName] = stopValue;
      console.log(`🔍 EEST Field Mapper: ${stopFieldName} = "${stopValue}"`);
      
      const workFieldName = `WORKRow${rowNum}`;
      const workValue = (entry.work || '').substring(0, 10);
      fields[workFieldName] = workValue;
      console.log(`🔍 EEST Field Mapper: ${workFieldName} = "${workValue}"`);
      
      // Use special selections from form data if available, otherwise use entry.special
      const specialSelections = formData.specialSelections || {};
      const rowSpecialSelections = specialSelections[index] || [];
      const specialText = rowSpecialSelections.length > 0 
        ? rowSpecialSelections.join(', ') 
        : (entry.special || '');
      const specialFieldName = `SPECIALRow${rowNum}`;
      const specialValue = specialText.substring(0, 10);
      fields[specialFieldName] = specialValue;
      console.log(`🔍 EEST Field Mapper: ${specialFieldName} = "${specialValue}"`);
      console.log(`🔍 EEST Field Mapper: Special selections for row ${rowNum}:`, rowSpecialSelections);
      console.log(`🔍 EEST Field Mapper: Entry special:`, entry.special);
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
    
    // Checkbox fields - using exact PDF field names
    contractorCheckbox1: 'Check Box1', // Operator Furnished By
    contractorCheckbox3: 'Check Box3', // Operating Supplies Furnished By
    inspectedUnderAgreementCheckbox: 'a Inspected and under agreement', // Equipment status
    
    // Remarks checkbox fields - using actual PDF field names
    hotlineCheckbox: 'Check Box2',
    noMealsLodgingCheckbox: 'Check Box4',
    noMealsCheckbox: 'Text2',
    travelCheckbox: 'Text3',
    noLunchCheckbox: 'Text4',
    
    // Operator and Supplies text fields
    operatorFurnishedBy: 'Text6', // Text field next to "Operator Furnished By" checkbox
    operatingSuppliesFurnishedBy: 'Text7', // Text field next to "Operating Supplies Furnished By" checkbox
    
    // TODO: Add remaining PDF field names
    resourceOrderNumber: 'RESOURCE ORDER #',
    // equipmentStatus: removed - should use checkboxes instead of text field
    timeEntries: 'time_entries',
    // Try different possible REMARKS field names
    remarks: '14 REMARKS released down time and cause problems etc', // Original attempt
    // Alternative field names to try:
    // remarks: 'REMARKS',
    // remarks: '14 REMARKS',
    // remarks: 'Text2', // This might be the actual field name
    // remarks: 'Text3',
    // remarks: 'Text4',
    // remarks: 'Text5',
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
  console.group('🔍 EEST PDF Field Debug Info');
  const fields = (form as { getFields(): unknown[] }).getFields();
  console.log('All available PDF fields:');
  fields.forEach((field: unknown) => {
    const fieldObj = field as { getName(): string; constructor: { name: string } };
    console.log(`- ${fieldObj.getName()} (${fieldObj.constructor.name})`);
  });
  console.groupEnd();
}

/**
 * Enhanced debug function to compare mapped fields with available PDF fields
 */
export function debugEESTFieldMapping(
  mappedFields: Record<string, string>,
  form: unknown
): void {
  console.group('🔍 EEST Field Mapping Debug');
  
  const availableFields = (form as { getFields(): unknown[] }).getFields();
  const availableFieldNames = availableFields.map((field: unknown) => 
    (field as { getName(): string }).getName()
  );
  
  console.log('📋 Mapped Fields:');
  Object.entries(mappedFields).forEach(([fieldName, value]) => {
    const isFieldAvailable = availableFieldNames.includes(fieldName);
    const status = isFieldAvailable ? '✅' : '❌';
    console.log(`${status} ${fieldName} = "${value}"`);
  });
  
  console.log('\n📋 Available PDF Fields:');
  availableFieldNames.forEach(fieldName => {
    const isMapped = fieldName in mappedFields;
    const status = isMapped ? '✅' : '❓';
    console.log(`${status} ${fieldName}`);
  });
  
  console.log('\n📊 Summary:');
  const mappedCount = Object.keys(mappedFields).length;
  const availableCount = availableFieldNames.length;
  const matchedCount = Object.keys(mappedFields).filter(name => 
    availableFieldNames.includes(name)
  ).length;
  
  console.log(`- Total mapped fields: ${mappedCount}`);
  console.log(`- Total available fields: ${availableCount}`);
  console.log(`- Successfully matched: ${matchedCount}`);
  console.log(`- Unmatched mapped fields: ${mappedCount - matchedCount}`);
  
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