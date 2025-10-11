// Payload System for URL-based form pre-filling
// This system allows URLs to automatically fill form fields

export interface FederalPayload {
  // Form fields
  agreementNumber?: string;
  contractorAgencyName?: string;
  resourceOrderNumber?: string;
  incidentName?: string;
  incidentNumber?: string;
  financialCode?: string;
  equipmentMakeModel?: string;
  equipmentType?: string;
  serialVinNumber?: string;
  licenseIdNumber?: string;
  transportRetained?: string;
  isFirstLastTicket?: string;
  rateType?: string;
  agencyRepresentative?: string;
  incidentSupervisor?: string;
  remarks?: string;
  
  // Checkbox states
  noMealsLodging?: boolean;
  noMeals?: boolean;
  travel?: boolean;
  noLunch?: boolean;
  hotline?: boolean;
  
  // Date
  date?: string;
  
  // Equipment entries (simplified for URL)
  equipmentEntries?: Array<{
    date?: string;
    start?: string;
    stop?: string;
    start1?: string;
    stop1?: string;
    start2?: string;
    stop2?: string;
    total?: string;
    quantity?: string;
    type?: string;
    remarks?: string;
  }>;
  
  // Personnel entries (simplified for URL)
  personnelEntries?: Array<{
    date?: string;
    name?: string;
    start1?: string;
    stop1?: string;
    start2?: string;
    stop2?: string;
    total?: string;
    remarks?: string;
  }>;
}

/**
 * Parses URL parameters and returns a payload object
 */
export function parsePayloadFromURL(): FederalPayload {
  const urlParams = new URLSearchParams(window.location.search);
  const payload: FederalPayload = {};
  
  console.log('Parsing URL parameters:', window.location.search);
  console.log('URL params object:', Object.fromEntries(urlParams.entries()));
  
  // Parse form fields
  const formFields = [
    'agreementNumber', 'contractorAgencyName', 'resourceOrderNumber',
    'incidentName', 'incidentNumber', 'financialCode', 'equipmentMakeModel',
    'equipmentType', 'serialVinNumber', 'licenseIdNumber', 'transportRetained',
    'isFirstLastTicket', 'rateType', 'agencyRepresentative', 'incidentSupervisor',
    'remarks', 'date'
  ];
  
  formFields.forEach(field => {
    const value = urlParams.get(field);
    if (value !== null) {
      (payload as any)[field] = decodeURIComponent(value);
    }
  });
  
  // Parse checkbox states
  const checkboxFields = ['noMealsLodging', 'noMeals', 'travel', 'noLunch', 'hotline'];
  checkboxFields.forEach(field => {
    const value = urlParams.get(field);
    if (value !== null) {
      (payload as any)[field] = value === 'true';
    }
  });
  
  // Parse equipment entries
  const equipmentCount = parseInt(urlParams.get('equipmentCount') || '0');
  if (equipmentCount > 0) {
    payload.equipmentEntries = [];
    for (let i = 0; i < equipmentCount; i++) {
      const entry: any = {};
      const equipmentFields = ['date', 'start', 'stop', 'start1', 'stop1', 'start2', 'stop2', 'total', 'quantity', 'type', 'remarks'];
      equipmentFields.forEach(field => {
        const value = urlParams.get(`equipment_${i}_${field}`);
        if (value !== null) {
          entry[field] = decodeURIComponent(value);
        }
      });
      if (Object.keys(entry).length > 0) {
        payload.equipmentEntries!.push(entry);
      }
    }
  }
  
  // Parse personnel entries
  const personnelCount = parseInt(urlParams.get('personnelCount') || '0');
  if (personnelCount > 0) {
    payload.personnelEntries = [];
    for (let i = 0; i < personnelCount; i++) {
      const entry: any = {};
      const personnelFields = ['date', 'name', 'start1', 'stop1', 'start2', 'stop2', 'total', 'remarks'];
      personnelFields.forEach(field => {
        const value = urlParams.get(`personnel_${i}_${field}`);
        if (value !== null) {
          entry[field] = decodeURIComponent(value);
        }
      });
      if (Object.keys(entry).length > 0) {
        payload.personnelEntries!.push(entry);
      }
    }
  }
  
  console.log('Final payload object:', payload);
  return payload;
}

/**
 * Generates a URL with payload parameters
 */
export function generatePayloadURL(baseURL: string, payload: FederalPayload): string {
  const url = new URL(baseURL);
  const params = new URLSearchParams();
  
  // Add form fields
  const formFields = [
    'agreementNumber', 'contractorAgencyName', 'resourceOrderNumber',
    'incidentName', 'incidentNumber', 'financialCode', 'equipmentMakeModel',
    'equipmentType', 'serialVinNumber', 'licenseIdNumber', 'transportRetained',
    'isFirstLastTicket', 'rateType', 'agencyRepresentative', 'incidentSupervisor',
    'remarks', 'date'
  ];
  
  formFields.forEach(field => {
    const value = (payload as any)[field];
    if (value !== undefined && value !== null && value !== '') {
      params.set(field, encodeURIComponent(value));
    }
  });
  
  // Add checkbox states
  const checkboxFields = ['noMealsLodging', 'noMeals', 'travel', 'noLunch', 'hotline'];
  checkboxFields.forEach(field => {
    const value = (payload as any)[field];
    if (value !== undefined && value !== null) {
      params.set(field, value.toString());
    }
  });
  
  // Add equipment entries
  if (payload.equipmentEntries && payload.equipmentEntries.length > 0) {
    params.set('equipmentCount', payload.equipmentEntries.length.toString());
    payload.equipmentEntries.forEach((entry, index) => {
      const equipmentFields = ['date', 'start', 'stop', 'start1', 'stop1', 'start2', 'stop2', 'total', 'quantity', 'type', 'remarks'];
      equipmentFields.forEach(field => {
        const value = (entry as any)[field];
        if (value !== undefined && value !== null && value !== '') {
          params.set(`equipment_${index}_${field}`, encodeURIComponent(value));
        }
      });
    });
  }
  
  // Add personnel entries
  if (payload.personnelEntries && payload.personnelEntries.length > 0) {
    params.set('personnelCount', payload.personnelEntries.length.toString());
    payload.personnelEntries.forEach((entry, index) => {
      const personnelFields = ['date', 'name', 'start1', 'stop1', 'start2', 'stop2', 'total', 'remarks'];
      personnelFields.forEach(field => {
        const value = (entry as any)[field];
        if (value !== undefined && value !== null && value !== '') {
          params.set(`personnel_${index}_${field}`, encodeURIComponent(value));
        }
      });
    });
  }
  
  // Add parameters to URL
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  
  return url.toString();
}

/**
 * Creates a shareable link with current form data
 */
export function createShareableLink(
  baseURL: string,
  formData: any,
  checkboxStates: any,
  equipmentEntries: any[],
  personnelEntries: any[],
  selectedDate?: string
): string {
  const payload: FederalPayload = {
    ...formData,
    ...checkboxStates,
    date: selectedDate,
    equipmentEntries: equipmentEntries.length > 0 ? equipmentEntries : undefined,
    personnelEntries: personnelEntries.length > 0 ? personnelEntries : undefined
  };
  
  return generatePayloadURL(baseURL, payload);
}

/**
 * Validates payload data
 */
export function validatePayload(payload: FederalPayload): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation - check for required fields if needed
  if (!payload.agreementNumber) {
    errors.push('Agreement number is required');
  }
  
  if (!payload.contractorAgencyName) {
    errors.push('Contractor/Agency name is required');
  }
  
  if (!payload.date) {
    errors.push('Date is required');
  }
  
  // Validate date format (MM/DD/YY)
  if (payload.date && !/^\d{2}\/\d{2}\/\d{2}$/.test(payload.date)) {
    errors.push('Date must be in MM/DD/YY format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Clears URL parameters (useful after applying payload)
 */
export function clearURLParameters(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, document.title, url.toString());
}
