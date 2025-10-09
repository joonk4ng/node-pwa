// Engine Time Database for the Emergency Equipment Shift Ticket
// This file is used to store the engine time data in IndexedDB
// It is used to store the engine time data in IndexedDB
// It is used to retrieve the engine time data from IndexedDB
// It is used to delete the engine time data from IndexedDB
// It is used to list all the engine time data in IndexedDB
// It is used to clear all the engine time data in IndexedDB
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { PDFGenerationMetadata } from './types';

// Form Type Enumeration for PDF Generation and Database Tracking
export const FormType = {
  EEST: 'EEST',           // Emergency Equipment Shift Ticket
  FEDERAL: 'FEDERAL',     // Federal Equipment Time Sheet (OF297-24)
  ODF: 'ODF'              // ODF Time Sheet (to be implemented)
} as const;

export type FormType = typeof FormType[keyof typeof FormType];


// Engine Time Row
export interface EngineTimeRow {
  // ID
  id?: number;
  // Date
  date: string;
  // Equipment Use
  equipmentUse: 'HOURS' | 'MILES' | 'DAYS';
  // Equipment Begin
  equipBegin: string;
  // Equipment End
  equipEnd: string;
  // Name
  name: string;
  // Job
  job: string;
  // Time Begin
  timeBegin: string;
  // Time End
  timeEnd: string;
}

// Engine Time Form
export interface EngineTimeForm {
  // ID
  id?: number;
  // DIV/UNIT
  divUnit: string;
  // SHIFT
  shift: string;
  // OWNER/CONTRACTOR NAME
  ownerContractor: string;
  // CONTRACT/AGREEMENT NUMBER
  contractNumber: string;
  // RESOURCE REQ NO
  resourceReqNo: string;
  // RESOURCE TYPE
  resourceType: string;
  // DOUBLE SHIFTED
  doubleShifted: string;
  // INCIDENT NAME
  incidentName: string;
  // INCIDENT NUMBER
  incidentNumber: string;
  // EQUIPMENT TYPE
  equipmentType: string;
  // EQUIPMENT MAKE/MODEL
  equipmentMakeModel: string;
  // REMARKS
  remarks: string;
  // REMARKS OPTIONS
  remarksOptions: string[];
  // CUSTOM REMARKS
  customRemarks: string[];
  // OWNER ID NUMBER
  ownerIdNumber: string;
  // LICENSE VIN OR SERIAL
  licenseVinSerial: string;
}

// Federal Equipment Entry
export interface FederalEquipmentEntry {
  // ID
  id?: number;
  // DATE
  date: string;
  // START (legacy field for backward compatibility)
  start: string;
  // STOP (legacy field for backward compatibility)
  stop: string;
  // START1
  start1: string;
  // STOP1
  stop1: string;
  // START2
  start2: string;
  // STOP2
  stop2: string;
  // TOTAL
  total: string;
  // QUANTITY
  quantity: string;
  // TYPE
  type: string;
  // REMARKS
  remarks: string;
}

// Federal Personnel Entry
export interface FederalPersonnelEntry {
  // ID
  id?: number;
  // DATE
  date: string;
  // NAME
  name: string;
  // START1
  start1: string;
  // STOP1
  stop1: string;
  // START2
  start2: string;
  // STOP2
  stop2: string;
  // TOTAL
  total: string;
  // REMARKS
  remarks: string;
}

// Federal Form Data
export interface FederalFormData {
  // ID
  id?: number;
  // FORM TYPE (for database tracking) - optional for backward compatibility
  formType?: typeof FormType.FEDERAL;
  // AGREEMENT NUMBER
  agreementNumber: string;
  // CONTRACTOR AGENCY NAME
  contractorAgencyName: string;
  // RESOURCE ORDER NUMBER
  resourceOrderNumber: string;
  // INCIDENT NAME
  incidentName: string;
  // INCIDENT NUMBER
  incidentNumber: string;
  // FINANCIAL CODE
  financialCode: string;
  // EQUIPMENT MAKE/MODEL
  equipmentMakeModel: string;
  // EQUIPMENT TYPE
  equipmentType: string;
  // SERIAL VIN NUMBER
  serialVinNumber: string;
  // LICENSE ID NUMBER
  licenseIdNumber: string;
  // TRANSPORT RETAINED
  transportRetained: string;
  // IS FIRST LAST TICKET
  isFirstLastTicket: string;
  // RATE TYPE
  rateType: string;
  // AGENCY REPRESENTATIVE
  agencyRepresentative: string;
  // INCIDENT SUPERVISOR
  incidentSupervisor: string;
  // REMARKS
  remarks: string;
}

// EEST Form Data
export interface EESTFormData {
  // ID
  id?: number;
  // FORM TYPE (for database tracking)
  formType: typeof FormType.EEST;
  // AGREEMENT NUMBER
  agreementNumber: string;
  // CONTRACTOR AGENCY NAME
  contractorAgencyName: string;
  // RESOURCE ORDER NUMBER
  resourceOrderNumber: string;
  // INCIDENT NAME
  incidentName: string;
  // INCIDENT NUMBER
  incidentNumber: string;
  // OPERATOR NAME
  operatorName: string;
  // EQUIPMENT MAKE
  equipmentMake: string;
  // EQUIPMENT MODEL
  equipmentModel: string;
  // SERIAL NUMBER
  serialNumber: string;
  // LICENSE NUMBER
  licenseNumber: string;
  // EQUIPMENT STATUS
  equipmentStatus: string;
  // INVOICE POSTED BY
  invoicePostedBy: string;
  // DATE SIGNED
  dateSigned: string;
  // REMARKS
  remarks: string;
  // REMARKS OPTIONS
  remarksOptions: string[];
  // CUSTOM REMARKS
  customRemarks: string[];
  // SPECIAL SELECTIONS (for time entry rows)
  specialSelections?: { [key: number]: string[] };
  // CONTRACTOR SIGNATURE
  contractorSignature?: string;
  // GOVERNMENT SIGNATURE
  governmentSignature?: string;
}

// EEST Time Entry
export interface EESTTimeEntry {
  // ID
  id?: number;
  // DATE
  date: string;
  // START
  start: string;
  // STOP
  stop: string;
  // WORK
  work: string;
  // SPECIAL
  special: string;
}

// ODF Form Data (to be implemented)
export interface ODFFormData {
  // ID
  id?: number;
  // FORM TYPE (for database tracking)
  formType: typeof FormType.ODF;
  // DIV/UNIT
  divUnit: string;
  // SHIFT
  shift: string;
  // OWNER/CONTRACTOR NAME
  ownerContractor: string;
  // CONTRACT/AGREEMENT NUMBER
  contractNumber: string;
  // RESOURCE REQ NO
  resourceReqNo: string;
  // RESOURCE TYPE
  resourceType: string;
  // DOUBLE SHIFTED
  doubleShifted: string;
  // AGREEMENT NUMBER
  agreementNumber: string;
  // CONTRACTOR AGENCY NAME
  contractorAgencyName: string;
  // RESOURCE ORDER NUMBER
  resourceOrderNumber: string;
  // INCIDENT NAME
  incidentName: string;
  // INCIDENT NUMBER
  incidentNumber: string;
  // EQUIPMENT TYPE
  equipmentType: string;
  // EQUIPMENT MAKE/MODEL
  equipmentMakeModel: string;
  // OWNER ID NUMBER
  ownerIdNumber: string;
  // LICENSE VIN OR SERIAL
  licenseVinSerial: string;
  // REMARKS
  remarks: string;
  // REMARKS OPTIONS
  remarksOptions: string[];
  // CUSTOM REMARKS
  customRemarks: string[];
}

// ODF Time Entry (to be implemented)
export interface ODFTimeEntry {
  // ID
  id?: number;
  // DATE
  date: string;
  // Additional ODF-specific time entry fields will be added here
  // when the ODF form is implemented
}

// Engine Time Change Log
export interface EngineTimeChangeLog {
  // ID
  id?: number;
  // ROW ID
  rowId: number;
  // CHANGE TYPE
  changeType: 'create' | 'update' | 'delete';
  // TIMESTAMP
  timestamp: number;
  // DATA
  data: Partial<EngineTimeRow>;
}

// Engine Time Database
class EngineTimeDB extends Dexie {
  // Rows
  rows!: Table<EngineTimeRow, number>;
  // Form
  form!: Table<EngineTimeForm, number>;
  // Federal Equipment
  federalEquipment!: Table<FederalEquipmentEntry, number>;
  // Federal Personnel
  federalPersonnel!: Table<FederalPersonnelEntry, number>;
  // Federal Form
  federalForm!: Table<FederalFormData, number>;
  // EEST Form
  eestForm!: Table<EESTFormData, number>;
  // EEST Time Entries
  eestTimeEntries!: Table<EESTTimeEntry, number>;
  // ODF Form (to be implemented)
  odfForm!: Table<ODFFormData, number>;
  // ODF Time Entries (to be implemented)
  odfTimeEntries!: Table<ODFTimeEntry, number>;
  // PDF Generation Metadata
  pdfMetadata!: Table<PDFGenerationMetadata, number>;
  // Change Log
  changeLog!: Table<EngineTimeChangeLog, number>;

  // Constructor for the Engine Time Database
  constructor() {
    // Initialize the Engine Time Database
    super('EngineTimeDB');
    // Define the stores for the Engine Time Database
    this.version(5).stores({
      // Rows
      rows: '++id, date, name',
      // Form
      form: 'id',
      // Federal Equipment
      federalEquipment: '++id, date',
      // Federal Personnel
      federalPersonnel: '++id, date, name',
      // Federal Form
      federalForm: 'id',
      // EEST Form
      eestForm: 'id',
      // EEST Time Entries
      eestTimeEntries: '++id, date',
      // ODF Form (to be implemented)
      odfForm: 'id',
      // ODF Time Entries (to be implemented)
      odfTimeEntries: '++id, date',
      // PDF Generation Metadata
      pdfMetadata: '++id, formType, incidentName, incidentNumber, dateGenerated, createdAt',
      // Change Log
      changeLog: '++id, rowId, timestamp'
    });
  }
}

// Export the Engine Time Database
export const engineTimeDB = new EngineTimeDB();

// Save an Engine Time Row
export async function saveEngineTimeRow(row: EngineTimeRow) {
  // Save the Engine Time Row
  const id = await engineTimeDB.rows.put(row);
  // Add a change log entry
  await engineTimeDB.changeLog.add({
    // Row ID
    rowId: id,
    // Change Type
    changeType: row.id ? 'update' : 'create',
    // Timestamp
    timestamp: Date.now(),
    // Data
    data: row,
  });
  return id;
}

// Load all Engine Time Rows
export async function loadAllEngineTimeRows(): Promise<EngineTimeRow[]> {
  return engineTimeDB.rows.toArray();
}

// Load an Engine Time Row
export async function loadEngineTimeRow(id: number): Promise<EngineTimeRow | undefined> {
  return engineTimeDB.rows.get(id);
}

// Save an Engine Time Form
export async function saveEngineTimeForm(form: EngineTimeForm) {
  await engineTimeDB.form.put({ ...form, id: 1 }); // singleton
}

// Load an Engine Time Form
export async function loadEngineTimeForm(): Promise<EngineTimeForm | undefined> {
  return engineTimeDB.form.get(1);
}

// Federal Equipment Entry functions
export async function saveFederalEquipmentEntry(entry: FederalEquipmentEntry) {
  return await engineTimeDB.federalEquipment.put(entry);
}

// Load all Federal Equipment Entries
export async function loadAllFederalEquipmentEntries(): Promise<FederalEquipmentEntry[]> {
  return engineTimeDB.federalEquipment.toArray();
}

// Delete a Federal Equipment Entry
export async function deleteFederalEquipmentEntry(id: number) {
  return await engineTimeDB.federalEquipment.delete(id);
}

// Federal Personnel Entry functions
export async function saveFederalPersonnelEntry(entry: FederalPersonnelEntry) {
  return await engineTimeDB.federalPersonnel.put(entry);
}

// Load all Federal Personnel Entries
export async function loadAllFederalPersonnelEntries(): Promise<FederalPersonnelEntry[]> {
  return engineTimeDB.federalPersonnel.toArray();
}

// Delete a Federal Personnel Entry
export async function deleteFederalPersonnelEntry(id: number) {
  return await engineTimeDB.federalPersonnel.delete(id);
}

// Federal Form Data functions
export async function saveFederalFormData(form: FederalFormData) {
  await engineTimeDB.federalForm.put({ ...form, id: 1 }); // singleton
}

// Load a Federal Form Data
export async function loadFederalFormData(): Promise<FederalFormData | undefined> {
  return await engineTimeDB.federalForm.get(1);
}

// EEST Form Data functions
export async function saveEESTFormData(form: EESTFormData) {
  // Save the EEST Form Data
  form.id = 1;
  console.log('DB: Saving EEST form data:', form);
  await engineTimeDB.eestForm.put(form);
  console.log('DB: EEST form data saved successfully');
}

// Load an EEST Form Data
export async function loadEESTFormData(): Promise<EESTFormData | undefined> {
  console.log('DB: Loading EEST form data...');
  const result = await engineTimeDB.eestForm.get(1);
  console.log('DB: EEST form data loaded:', result);
  return result;
}

// EEST Time Entry functions
export async function saveEESTTimeEntry(entry: EESTTimeEntry): Promise<number> {
  // Save the EEST Time Entry
  if (entry.id) {
    // Update the EEST Time Entry
    await engineTimeDB.eestTimeEntries.update(entry.id, entry);
    return entry.id;
  } else {
    // Add the EEST Time Entry
    const id = await engineTimeDB.eestTimeEntries.add(entry);
    return id;
  }
}

// Load all EEST Time Entries
export async function loadAllEESTTimeEntries(): Promise<EESTTimeEntry[]> {
  return await engineTimeDB.eestTimeEntries.toArray();
}

// Delete an EEST Time Entry
export async function deleteEESTTimeEntry(id: number) {
  await engineTimeDB.eestTimeEntries.delete(id);
}

// ODF Form Data functions (to be implemented)
export async function saveODFFormData(form: ODFFormData) {
  await engineTimeDB.odfForm.put({ ...form, id: 1 }); // singleton
}

// Load an ODF Form Data
export async function loadODFFormData(): Promise<ODFFormData | undefined> {
  return await engineTimeDB.odfForm.get(1);
}

// ODF Time Entry functions (to be implemented)
export async function saveODFTimeEntry(entry: ODFTimeEntry): Promise<number> {
  if (entry.id) {
    await engineTimeDB.odfTimeEntries.update(entry.id, entry);
    return entry.id;
  } else {
    const id = await engineTimeDB.odfTimeEntries.add(entry);
    return id;
  }
}

// Load all ODF Time Entries
export async function loadAllODFTimeEntries(): Promise<ODFTimeEntry[]> {
  return await engineTimeDB.odfTimeEntries.toArray();
}

// Delete an ODF Time Entry
export async function deleteODFTimeEntry(id: number) {
  await engineTimeDB.odfTimeEntries.delete(id);
}

// PDF Generation Metadata functions
export async function savePDFMetadata(metadata: PDFGenerationMetadata): Promise<number> {
  return await engineTimeDB.pdfMetadata.add(metadata);
}

// Load all PDF Metadata
export async function loadAllPDFMetadata(): Promise<PDFGenerationMetadata[]> {
  const results = await engineTimeDB.pdfMetadata.toArray();
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Load PDF Metadata by form type
export async function loadPDFMetadataByFormType(formType: FormType): Promise<PDFGenerationMetadata[]> {
  const results = await engineTimeDB.pdfMetadata.where('formType').equals(formType).toArray();
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Delete PDF Metadata
export async function deletePDFMetadata(id: number) {
  await engineTimeDB.pdfMetadata.delete(id);
} 