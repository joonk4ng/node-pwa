import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface EngineTimeRow {
  id?: number;
  date: string;
  equipmentUse: 'HOURS' | 'MILES' | 'DAYS';
  equipBegin: string;
  equipEnd: string;
  name: string;
  job: string;
  timeBegin: string;
  timeEnd: string;
}

export interface EngineTimeForm {
  id?: number;
  divUnit: string;
  shift: string;
  ownerContractor: string;
  contractNumber: string;
  resourceReqNo: string;
  resourceType: string;
  doubleShifted: string;
  incidentName: string;
  incidentNumber: string;
  equipmentType: string;
  equipmentMakeModel: string;
  remarks: string;
  remarksOptions: string[];
  customRemarks: string[];
  ownerIdNumber: string;
  licenseVinSerial: string;
}

export interface FederalEquipmentEntry {
  id?: number;
  date: string;
  start: string;
  stop: string;
  total: string;
  quantity: string;
  type: string;
  remarks: string;
}

export interface FederalPersonnelEntry {
  id?: number;
  date: string;
  name: string;
  start1: string;
  stop1: string;
  start2: string;
  stop2: string;
  total: string;
  remarks: string;
}

export interface FederalFormData {
  id?: number;
  agreementNumber: string;
  contractorAgencyName: string;
  resourceOrderNumber: string;
  incidentName: string;
  incidentNumber: string;
  financialCode: string;
  equipmentMakeModel: string;
  equipmentType: string;
  serialVinNumber: string;
  licenseIdNumber: string;
  transportRetained: string;
  isFirstLastTicket: string;
  rateType: string;
}

export interface EESTFormData {
  id?: number;
  agreementNumber: string;
  resourceOrderNumber: string;
  contractorName: string;
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

export interface EESTTimeEntry {
  id?: number;
  date: string;
  start: string;
  stop: string;
  work: string;
  special: string;
}

export interface EngineTimeChangeLog {
  id?: number;
  rowId: number;
  changeType: 'create' | 'update' | 'delete';
  timestamp: number;
  data: Partial<EngineTimeRow>;
}

class EngineTimeDB extends Dexie {
  rows!: Table<EngineTimeRow, number>;
  form!: Table<EngineTimeForm, number>;
  federalEquipment!: Table<FederalEquipmentEntry, number>;
  federalPersonnel!: Table<FederalPersonnelEntry, number>;
  federalForm!: Table<FederalFormData, number>;
  eestForm!: Table<EESTFormData, number>;
  eestTimeEntries!: Table<EESTTimeEntry, number>;
  changeLog!: Table<EngineTimeChangeLog, number>;

  constructor() {
    super('EngineTimeDB');
    this.version(4).stores({
      rows: '++id, date, name',
      form: 'id',
      federalEquipment: '++id, date',
      federalPersonnel: '++id, date, name',
      federalForm: 'id',
      eestForm: 'id',
      eestTimeEntries: '++id, date',
      changeLog: '++id, rowId, timestamp'
    });
  }
}

export const engineTimeDB = new EngineTimeDB();

export async function saveEngineTimeRow(row: EngineTimeRow) {
  const id = await engineTimeDB.rows.put(row);
  await engineTimeDB.changeLog.add({
    rowId: id,
    changeType: row.id ? 'update' : 'create',
    timestamp: Date.now(),
    data: row,
  });
  return id;
}

export async function loadAllEngineTimeRows(): Promise<EngineTimeRow[]> {
  return engineTimeDB.rows.toArray();
}

export async function loadEngineTimeRow(id: number): Promise<EngineTimeRow | undefined> {
  return engineTimeDB.rows.get(id);
}

export async function saveEngineTimeForm(form: EngineTimeForm) {
  await engineTimeDB.form.put({ ...form, id: 1 }); // singleton
}

export async function loadEngineTimeForm(): Promise<EngineTimeForm | undefined> {
  return engineTimeDB.form.get(1);
}

// Federal Equipment Entry functions
export async function saveFederalEquipmentEntry(entry: FederalEquipmentEntry) {
  return await engineTimeDB.federalEquipment.put(entry);
}

export async function loadAllFederalEquipmentEntries(): Promise<FederalEquipmentEntry[]> {
  return engineTimeDB.federalEquipment.toArray();
}

export async function deleteFederalEquipmentEntry(id: number) {
  return await engineTimeDB.federalEquipment.delete(id);
}

// Federal Personnel Entry functions
export async function saveFederalPersonnelEntry(entry: FederalPersonnelEntry) {
  return await engineTimeDB.federalPersonnel.put(entry);
}

export async function loadAllFederalPersonnelEntries(): Promise<FederalPersonnelEntry[]> {
  return engineTimeDB.federalPersonnel.toArray();
}

export async function deleteFederalPersonnelEntry(id: number) {
  return await engineTimeDB.federalPersonnel.delete(id);
}

// Federal Form Data functions
export async function saveFederalFormData(form: FederalFormData) {
  await engineTimeDB.federalForm.put({ ...form, id: 1 }); // singleton
}

export async function loadFederalFormData(): Promise<FederalFormData | undefined> {
  return await engineTimeDB.federalForm.get(1);
}

// EEST Form Data functions
export async function saveEESTFormData(form: EESTFormData) {
  form.id = 1;
  await engineTimeDB.eestForm.put(form);
}

export async function loadEESTFormData(): Promise<EESTFormData | undefined> {
  return await engineTimeDB.eestForm.get(1);
}

// EEST Time Entry functions
export async function saveEESTTimeEntry(entry: EESTTimeEntry) {
  if (entry.id) {
    await engineTimeDB.eestTimeEntries.update(entry.id, entry);
  } else {
    await engineTimeDB.eestTimeEntries.add(entry);
  }
}

export async function loadAllEESTTimeEntries(): Promise<EESTTimeEntry[]> {
  return await engineTimeDB.eestTimeEntries.toArray();
}

export async function deleteEESTTimeEntry(id: number) {
  await engineTimeDB.eestTimeEntries.delete(id);
} 