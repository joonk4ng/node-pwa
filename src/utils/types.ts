// Type definitions for the Engine Time Report application
import { FormType } from './engineTimeDB';

// PDF Generation Metadata
export interface PDFGenerationMetadata {
  id?: number;
  formType: FormType;
  incidentName: string;
  incidentNumber: string;
  contractorAgencyName: string;
  dateGenerated: string;
  filename: string;
  fileSize: number;
  isSigned: boolean;
  createdAt: number;
}
