// Engine Time Database for the Emergency Equipment Shift Ticket
// This file is used to store the engine time data in IndexedDB
// It is used to store the engine time data in IndexedDB
// It is used to retrieve the engine time data from IndexedDB
// It is used to delete the engine time data from IndexedDB
// It is used to list all the engine time data in IndexedDB
// It is used to clear all the engine time data in IndexedDB
import Dexie from 'dexie';
import type { Table } from 'dexie';

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
  // START
  start: string;
  // STOP
  stop: string;
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
  // REMARKS
  remarks: string;
}

// EEST Form Data
export interface EESTFormData {
  // ID
  id?: number;
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
  // Change Log
  changeLog!: Table<EngineTimeChangeLog, number>;

  // Constructor for the Engine Time Database
  constructor() {
    // Initialize the Engine Time Database
    super('EngineTimeDB');
    // Define the stores for the Engine Time Database
    this.version(4).stores({
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