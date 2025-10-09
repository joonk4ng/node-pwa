// Federal Field Mapper
// Maps Federal form data to PDF field names for the Federal Equipment Time Sheet

import type { FederalFormData, FederalEquipmentEntry, FederalPersonnelEntry } from '../engineTimeDB';
import * as PDFLib from 'pdf-lib';
import { autoCalculateFederalEquipmentTotals, autoCalculateFederalPersonnelTotals } from '../timeCalculations';

// Federal Equipment Entry for PDF
export interface FederalEquipmentEntryForPDF {
  date: string;
  start: string;      // Maps to _16_StartRow (legacy)
  stop: string;       // Maps to _17_StopRow (legacy)
  start1: string;     // Maps to _16_StartRow (first period)
  stop1: string;      // Maps to _17_StopRow (first period)
  start2: string;     // Maps to _16_StartRow (second period)
  stop2: string;      // Maps to _17_StopRow (second period)
  total: string;      // Maps to _18_TotalRow
  quantity: string;   // Maps to _19_QuantityRow
  type: string;       // Maps to _20_TypeRow
  remarks: string;    // Maps to _21_Note_Travel_Other_remarksRow
}

// Federal Personnel Entry for PDF
export interface FederalPersonnelEntryForPDF {
  date: string;
  operatorName: string; // Maps to _23_Operator_Name_First__LastRow
  start1: string;       // Maps to _24_StartRow
  stop1: string;        // Maps to _25_StopRow
  start2: string;       // Maps to _26_StartRow
  stop2: string;        // Maps to _27_StopRow
  total: string;        // Maps to _28_TotalRow
  remarks: string;      // Maps to _29_Note_Travel_Other_remarksRow
}

// Federal PDF Field Names
export interface FederalPDFFields {
  // Form header fields
  agreementNumber: string;
  contractorAgencyName: string;
  resourceOrderNumber: string;
  incidentName: string;
  incidentNumber: string;
  financialCode: string;
  
  // Equipment fields
  equipmentMakeModel: string;
  equipmentType: string;
  serialVinNumber: string;
  licenseIdNumber: string;
  transportRetained: string;
  isFirstLastTicket: string;
  rateType: string;
  
  // Personnel fields
  agencyRepresentative: string;
  incidentSupervisor: string;
  
  // Remarks field
  remarks: string;
  
  // Equipment time entries (array of entries)
  equipmentEntries: FederalEquipmentEntryForPDF[];
  
  // Personnel time entries (array of entries)
  personnelEntries: FederalPersonnelEntryForPDF[];
}

/**
 * Maps Federal form data to PDF field names
 */
export function mapFederalToPDFFields(
  formData: FederalFormData,
  equipmentEntries: FederalEquipmentEntry[],
  personnelEntries: FederalPersonnelEntry[]
): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // Auto-calculate totals for entries before mapping
  const calculatedEquipmentEntries = autoCalculateFederalEquipmentTotals(equipmentEntries);
  const calculatedPersonnelEntries = autoCalculateFederalPersonnelTotals(personnelEntries);
  
  // Debug: Log the incoming form data
  console.log('Federal Field Mapper: Incoming form data:', formData);
  console.log('Federal Field Mapper: Equipment entries (with calculated totals):', calculatedEquipmentEntries);
  console.log('Federal Field Mapper: Personnel entries (with calculated totals):', calculatedPersonnelEntries);
  console.log('Federal Field Mapper: Looking for Agency Representative and Incident Supervisor fields...');
  
  // Map form data to PDF fields using the field mapper
  // Truncate text to fit better in the PDF fields (increased limits)
  fields[getFederalPDFFieldName('agreementNumber')] = (formData.agreementNumber || '').substring(0, 50);
  fields[getFederalPDFFieldName('contractorAgencyName')] = (formData.contractorAgencyName || '').substring(0, 50);
  fields[getFederalPDFFieldName('resourceOrderNumber')] = (formData.resourceOrderNumber || '').substring(0, 30);
  fields[getFederalPDFFieldName('incidentName')] = (formData.incidentName || '').substring(0, 50);
  fields[getFederalPDFFieldName('incidentNumber')] = (formData.incidentNumber || '').substring(0, 30);
  fields[getFederalPDFFieldName('financialCode')] = (formData.financialCode || '').substring(0, 30);
  
  // Equipment fields
  fields[getFederalPDFFieldName('equipmentMakeModel')] = (formData.equipmentMakeModel || '').substring(0, 50);
  fields[getFederalPDFFieldName('equipmentType')] = (formData.equipmentType || '').substring(0, 40);
  fields[getFederalPDFFieldName('serialVinNumber')] = (formData.serialVinNumber || '').substring(0, 40);
  fields[getFederalPDFFieldName('licenseIdNumber')] = (formData.licenseIdNumber || '').substring(0, 30);
  fields[getFederalPDFFieldName('transportRetained')] = (formData.transportRetained || '').substring(0, 20);
  fields[getFederalPDFFieldName('isFirstLastTicket')] = (formData.isFirstLastTicket || '').substring(0, 20);
  fields[getFederalPDFFieldName('rateType')] = (formData.rateType || '').substring(0, 20);
  
  // Personnel fields
  const agencyRepField = getFederalPDFFieldName('agencyRepresentative');
  const incidentSupField = getFederalPDFFieldName('incidentSupervisor');
  const agencyRepValue = (formData.agencyRepresentative || '').substring(0, 50);
  const incidentSupValue = (formData.incidentSupervisor || '').substring(0, 50);
  
  fields[agencyRepField] = agencyRepValue;
  fields[incidentSupField] = incidentSupValue;
  
  console.log('Federal Field Mapper: Agency Representative field:', agencyRepField, 'value:', agencyRepValue);
  console.log('Federal Field Mapper: Incident Supervisor field:', incidentSupField, 'value:', incidentSupValue);
  
  // Remarks field - Now enabled
  fields[getFederalPDFFieldName('remarks')] = (formData.remarks || '').substring(0, 200);
  
  // General remarks field for equipment breakdown/operating issues
  // Note: We need to find the correct field name for this from the debug output
  // fields['topmostSubform[0].Page1[0]._30_Remarks__Provide_details_of_any_equipment_breakdown_or_operating_issues_Include_other_information_as_necessary[0]'] = (formData.remarks || '').substring(0, 200);
  
  // Map equipment time entries to PDF fields (only first entry) - using calculated entries
  if (calculatedEquipmentEntries.length > 0) {
    const entry = calculatedEquipmentEntries[0]; // Only map the first equipment entry
    const rowNum = 1; // Always use row 1
    fields[`topmostSubform[0].Page1[0]._15_DateRow${rowNum}[0]`] = (entry.date || '').substring(0, 12);
    
    // Use start1/stop1 for the first time period, fallback to legacy start/stop
    const startTime = entry.start1 || entry.start || '';
    const stopTime = entry.stop2|| entry.stop || '';
    
    fields[`topmostSubform[0].Page1[0]._16_StartRow${rowNum}[0]`] = startTime.substring(0, 8);
    fields[`topmostSubform[0].Page1[0]._17_StopRow${rowNum}[0]`] = stopTime.substring(0, 8);
    fields[`topmostSubform[0].Page1[0]._18_TotalRow${rowNum}[0]`] = (entry.total || '').substring(0, 15);
    fields[`topmostSubform[0].Page1[0]._19_QuantityRow${rowNum}[0]`] = (entry.quantity || '').substring(0, 15);
    fields[`topmostSubform[0].Page1[0]._20_TypeRow${rowNum}[0]`] = (entry.type || '').substring(0, 20);
    fields[`topmostSubform[0].Page1[0]._21_Note_Travel_Other_remarksRow${rowNum}[0]`] = (entry.remarks || '').substring(0, 50);
  }
  
  // Map personnel time entries to PDF fields (4 rows) - copy from equipment entries
  if (calculatedEquipmentEntries.length > 0) {
    const equipmentEntry = calculatedEquipmentEntries[0]; // Use first equipment entry
    
    // Map to all 4 personnel rows (copying the same equipment data)
    for (let index = 0; index < 3; index++) {
      const rowNum = index + 1;
      const personnelEntry = calculatedPersonnelEntries[index] || {}; // Get personnel entry for name/remarks
      
      fields[`topmostSubform[0].Page1[0]._22_DateRow${rowNum}[0]`] = (equipmentEntry.date || '').substring(0, 12);
      fields[`topmostSubform[0].Page1[0]._23_Operator_Name_First__LastRow${rowNum}[0]`] = (personnelEntry.name || '').substring(0, 30);
      fields[`topmostSubform[0].Page1[0]._24_StartRow${rowNum}[0]`] = (equipmentEntry.start1 || equipmentEntry.start || '').substring(0, 8);
      fields[`topmostSubform[0].Page1[0]._25_StopRow${rowNum}[0]`] = (equipmentEntry.stop1 || equipmentEntry.stop || '').substring(0, 8);
      fields[`topmostSubform[0].Page1[0]._26_StartRow${rowNum}[0]`] = (equipmentEntry.start2 || '').substring(0, 8);
      fields[`topmostSubform[0].Page1[0]._27_StopRow${rowNum}[0]`] = (equipmentEntry.stop2 || '').substring(0, 8);
      fields[`topmostSubform[0].Page1[0]._28_TotalRow${rowNum}[0]`] = (equipmentEntry.total || '').substring(0, 15);
      fields[`topmostSubform[0].Page1[0]._29_Note_Travel_Other_remarksRow${rowNum}[0]`] = (personnelEntry.remarks || '').substring(0, 50);
    }
  }
  
  console.log('Federal Field Mapper: Final fields:', fields);
  
  return fields;
}

/**
 * Gets the PDF field name for a given Federal field
 */
export function getFederalPDFFieldName(field: keyof FederalPDFFields): string {
  const fieldMappings: Record<keyof FederalPDFFields, string> = {
    // Form header fields
    agreementNumber: 'topmostSubform[0].Page1[0]._1_Agreement_Number[0]',
    contractorAgencyName: 'topmostSubform[0].Page1[0]._2_ContractorAgency_Name[0]',
    resourceOrderNumber: 'topmostSubform[0].Page1[0]._3_Resource_Order_Number[0]',
    incidentName: 'topmostSubform[0].Page1[0]._4_Incident_Name[0]',
    incidentNumber: 'topmostSubform[0].Page1[0]._5_Incident_Number[0]',
    financialCode: 'topmostSubform[0].Page1[0]._6_Financial_Code[0]',
    
    // Equipment fields
    equipmentMakeModel: 'topmostSubform[0].Page1[0]._7_Equipment_MakeModel[0]',
    equipmentType: 'topmostSubform[0].Page1[0]._8_Equipment_Type[0]',
    serialVinNumber: 'topmostSubform[0].Page1[0]._9_SerialVIN_Number[0]',
    licenseIdNumber: 'topmostSubform[0].Page1[0]._10_LicenseID_Number[0]',
    transportRetained: 'topmostSubform[0].Page1[0]._12_Transport_Retained_Yes[0]',
    isFirstLastTicket: 'topmostSubform[0].Page1[0]._13_Mobilization[0]',
    rateType: 'topmostSubform[0].Page1[0]._14_Hours[0]',
    
    // Personnel fields - Verified with debug output
    agencyRepresentative: 'topmostSubform[0].Page1[0]._31_ContractorAgency_Representative_Printed_Name[0]',
    incidentSupervisor: 'topmostSubform[0].Page1[0]._33_Incident_Supervisor_Printed_Name__Resource_Order_number[0]',
    
    // Remarks field
    remarks: 'topmostSubform[0].Page1[0]._30_Remarks__Provide_details_of_any_equipment_breakdown_or_operating_issues_Include_other_information_as_necessary[0]',
    
    // Time entry arrays - these are handled separately in the mapping function
    equipmentEntries: 'equipment_entries',
    personnelEntries: 'personnel_entries',
  };
  
  return fieldMappings[field] || field;
}

/**
 * Debug function to help identify PDF field names
 * This can be called to log all available fields in the PDF
 */
export function debugFederalPDFFields(form: unknown): void {
  console.group('Federal PDF Field Debug Info');
  const fields = (form as { getFields(): unknown[] }).getFields();
  console.log('All available PDF fields:');
  fields.forEach((field: unknown) => {
    const fieldObj = field as { getName(): string; constructor: { name: string } };
    console.log(`- ${fieldObj.getName()} (${fieldObj.constructor.name})`);
  });
  console.groupEnd();
}

/**
 * Debug function to extract all field names from a PDF document
 * Call this function to see what field names are actually available
 */
export async function debugFederalPDFFieldNames(pdfBlob: Blob): Promise<void> {
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.group('🔍 Federal PDF Field Names Debug');
    console.log('Total fields found:', fields.length);
    console.log('Field names:');
    
    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      console.log(`${index + 1}. "${fieldName}" (${fieldType})`);
    });
    
    console.log('\n📋 Copy-paste friendly list:');
    fields.forEach((field) => {
      console.log(`"${field.getName()}",`);
    });
    
    console.log('\n🔍 Looking for Agency Representative and Incident Supervisor fields...');
    console.log('Search for fields containing: "Agency", "Representative", "Supervisor", "Incident", "Signature"');
    
    // Search for fields containing specific keywords
    const searchTerms = ['Agency', 'Representative', 'Supervisor', 'Incident', 'Signature', '31', '33'];
    const matchingFields = fields.filter(field => {
      const fieldName = field.getName();
      return searchTerms.some(term => fieldName.includes(term));
    });
    
    if (matchingFields.length > 0) {
      console.log('\n🎯 Fields matching search terms:');
      matchingFields.forEach(field => {
        console.log(`- "${field.getName()}" (${field.constructor.name})`);
      });
    } else {
      console.log('\n❌ No fields found matching search terms');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error debugging PDF fields:', error);
  }
}

/**
 * Validates Federal form data for PDF generation
 */
export function validateFederalFormData(
  formData: FederalFormData, 
  equipmentEntries: FederalEquipmentEntry[], 
  personnelEntries: FederalPersonnelEntry[]
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Required fields validation
  if (!formData.agreementNumber) errors.push('Agreement Number is required');
  if (!formData.contractorAgencyName) errors.push('Contractor Agency Name is required');
  if (!formData.incidentName) errors.push('Incident Name is required');
  if (!formData.incidentNumber) errors.push('Incident Number is required');
  
  // Equipment validation
  if (!formData.equipmentMakeModel) {
    errors.push('Equipment Make/Model is required');
  }
  
  // Time entries validation
  const hasValidEquipmentEntries = equipmentEntries.some(entry => 
    entry.date && (entry.start || entry.stop || entry.total)
  );
  const hasValidPersonnelEntries = personnelEntries.some(entry => 
    entry.date && (entry.start1 || entry.stop1 || entry.name)
  );
  
  if (!hasValidEquipmentEntries && !hasValidPersonnelEntries) {
    errors.push('At least one time entry (equipment or personnel) with date and work information is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
