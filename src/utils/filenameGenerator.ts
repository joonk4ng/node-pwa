// Enhanced filename generator with form type support
import { FormType } from './engineTimeDB';

// Form type display names and abbreviations
const FORM_TYPE_INFO = {
  [FormType.FEDERAL]: {
    displayName: 'Federal Equipment Time Sheet',
    abbreviation: 'FED',
    filePrefix: 'OF297',
    prefixFirst: false  // OF297 prefix goes after date
  }
};

// Enhanced ExportInfo interface with form type support
export interface ExportInfo {
  date: string;
  crewNumber?: string;
  fireName?: string;
  fireNumber?: string;
  incidentName?: string;
  incidentNumber?: string;
  contractorAgencyName?: string;
  type: 'PDF' | 'Excel' | 'CSV';
  formType: FormType;
  isSigned?: boolean;
}

// Legacy ExportInfo interface for backward compatibility
export interface LegacyExportInfo {
  date: string;
  crewNumber: string;
  fireName: string;
  fireNumber: string;
  type: 'PDF' | 'Excel' | 'CSV';
}

/**
 * Generates a filename for PDF exports with form type identification
 */
export function generateExportFilename(info: ExportInfo): string {
  const { 
    date, 
    incidentName, 
    incidentNumber, 
    contractorAgencyName,
    type, 
    formType, 
    isSigned = false 
  } = info;
  
  // Get form type information
  const formInfo = FORM_TYPE_INFO[FormType.FEDERAL];
  
  // Format date to YYYY-MM-DD if it's not already
  const formattedDate = date.includes('-') ? date : new Date(date).toISOString().split('T')[0];
  
  // Clean up the values to be filename-safe
  const safeIncidentName = (incidentName || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const safeIncidentNumber = (incidentNumber || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  const safeContractor = (contractorAgencyName || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  
  // Build filename components based on prefix position
  let components: string[];
  
  if (formInfo.prefixFirst) {
    // For EEST and ODF: PREFIX_DATE_INCIDENT_NUMBER_CONTRACTOR
    components = [
      formInfo.filePrefix,
      formattedDate,
      safeIncidentName,
      safeIncidentNumber,
      safeContractor
    ].filter(Boolean); // Remove empty components
  } else {
    // For Federal: DATE_PREFIX_INCIDENT_NUMBER_CONTRACTOR
    components = [
      formattedDate,
      formInfo.filePrefix,
      safeIncidentName,
      safeIncidentNumber,
      safeContractor
    ].filter(Boolean); // Remove empty components
  }
  
  // Add signature indicator if signed
  const signatureSuffix = isSigned ? '_SIGNED' : '';
  
  // Generate the filename
  const filename = `${components.join('_')}${signatureSuffix}`;
  
  // Add appropriate extension
  switch (type) {
    case 'PDF':
      return `${filename}.pdf`;
    case 'Excel':
      return `${filename}.xlsx`;
    case 'CSV':
      return `${filename}.csv`;
    default:
      return filename;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateExportFilename with ExportInfo instead
 */
export function generateLegacyExportFilename(info: LegacyExportInfo): string {
  const { date, crewNumber, fireName, fireNumber, type } = info;
  
  // Format date to YYYY-MM-DD if it's not already
  const formattedDate = date.includes('-') ? date : new Date(date).toISOString().split('T')[0];
  
  // Clean up the values to be filename-safe
  const safeCrewNumber = crewNumber.replace(/[^a-zA-Z0-9]/g, '');
  const safeFireName = fireName.replace(/[^a-zA-Z0-9]/g, '');
  const safeFireNumber = fireNumber.replace(/[^a-zA-Z0-9]/g, '');
  
  // Generate the filename
  const filename = `${formattedDate} ${safeCrewNumber} ${safeFireName} ${safeFireNumber} ${type} CTR`;
  
  // Add appropriate extension
  switch (type) {
    case 'PDF':
      return `${filename}.pdf`;
    case 'Excel':
      return `${filename}.xlsx`;
    case 'CSV':
      return `${filename}.csv`;
    default:
      return filename;
  }
}

/**
 * Gets form type information for display purposes
 */
export function getFormTypeInfo(formType: FormType) {
  return FORM_TYPE_INFO[FormType.FEDERAL];
}

/**
 * Generates a human-readable filename description
 */
export function generateFilenameDescription(info: ExportInfo): string {
  const formInfo = FORM_TYPE_INFO[FormType.FEDERAL];
  const signatureText = info.isSigned ? ' (Signed)' : '';
  
  return `${formInfo.displayName} - ${info.incidentName || 'Unknown Incident'}${signatureText}`;
} 