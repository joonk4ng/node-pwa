// Time Calculations and Propagation Utilities
// Handles calculation of total hours and date propagation for equipment and personnel entries

import type { FederalEquipmentEntry, FederalPersonnelEntry } from './engineTimeDB';
import type { EESTTimeEntry } from './engineTimeDB';

// Time calculation result interface
export interface TimeCalculationResult {
  totalHours: number;
  formattedTotal: string;
  isValid: boolean;
  error?: string;
}

// Date propagation result interface
export interface DatePropagationResult {
  propagatedDate: string;
  isValid: boolean;
  error?: string;
}

/**
 * Converts time string (HH:MM or HHMM) to minutes since midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '') {
    return 0;
  }

  // Remove any spaces and normalize format
  const cleanTime = timeStr.replace(/\s/g, '');
  
  // Handle different time formats
  let hours: number, minutes: number;
  
  if (cleanTime.includes(':')) {
    // Format: HH:MM
    const [h, m] = cleanTime.split(':');
    hours = parseInt(h, 10) || 0;
    minutes = parseInt(m, 10) || 0;
  } else if (cleanTime.length === 3) {
    // Format: HMM (e.g., 800 = 8:00)
    hours = parseInt(cleanTime[0], 10) || 0;
    minutes = parseInt(cleanTime.slice(1), 10) || 0;
  } else if (cleanTime.length === 4) {
    // Format: HHMM (e.g., 0800 = 8:00)
    hours = parseInt(cleanTime.slice(0, 2), 10) || 0;
    minutes = parseInt(cleanTime.slice(2), 10) || 0;
  } else {
    // Try to parse as a number
    const num = parseInt(cleanTime, 10);
    if (isNaN(num)) {
      return 0;
    }
    
    if (num < 100) {
      // Single or double digit - treat as hours
      hours = num;
      minutes = 0;
    } else if (num < 1000) {
      // Three digits - HMM format
      hours = Math.floor(num / 100);
      minutes = num % 100;
    } else {
      // Four digits - HHMM format
      hours = Math.floor(num / 100);
      minutes = num % 100;
    }
  }

  // Validate hours and minutes
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0;
  }

  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to formatted time string (HH:MM)
 */
export function minutesToTimeString(minutes: number): string {
  if (minutes < 0) {
    return '00:00';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculates total hours between start and stop times
 */
export function calculateTimeDifference(startTime: string, stopTime: string): TimeCalculationResult {
  const startMinutes = timeStringToMinutes(startTime);
  const stopMinutes = timeStringToMinutes(stopTime);

  if (startMinutes === 0 && stopMinutes === 0) {
    return {
      totalHours: 0,
      formattedTotal: '0.00',
      isValid: false,
      error: 'Both start and stop times are required'
    };
  }

  if (startMinutes === 0) {
    return {
      totalHours: 0,
      formattedTotal: '0.00',
      isValid: false,
      error: 'Start time is required'
    };
  }

  if (stopMinutes === 0) {
    return {
      totalHours: 0,
      formattedTotal: '0.00',
      isValid: false,
      error: 'Stop time is required'
    };
  }

  // Handle overnight shifts (stop time is next day)
  let totalMinutes = stopMinutes - startMinutes;
  if (totalMinutes < 0) {
    // Add 24 hours (1440 minutes) for overnight shift
    totalMinutes += 1440;
  }

  const totalHours = totalMinutes / 60;
  const formattedTotal = totalHours.toFixed(2);

  return {
    totalHours,
    formattedTotal,
    isValid: true
  };
}

/**
 * Calculates total hours for Federal equipment entry
 */
export function calculateFederalEquipmentTotal(entry: FederalEquipmentEntry): TimeCalculationResult {
  return calculateTimeDifference(entry.start, entry.stop);
}

/**
 * Calculates total hours for Federal personnel entry (handles two time periods)
 */
export function calculateFederalPersonnelTotal(entry: FederalPersonnelEntry): TimeCalculationResult {
  const period1 = calculateTimeDifference(entry.start1, entry.stop1);
  const period2 = calculateTimeDifference(entry.start2, entry.stop2);

  // If both periods are invalid, return error
  if (!period1.isValid && !period2.isValid) {
    return {
      totalHours: 0,
      formattedTotal: '0.00',
      isValid: false,
      error: 'At least one valid time period is required'
    };
  }

  // Calculate total from valid periods
  let totalHours = 0;
  let errors: string[] = [];

  if (period1.isValid) {
    totalHours += period1.totalHours;
  } else if (entry.start1 || entry.stop1) {
    errors.push('Period 1: ' + (period1.error || 'Invalid time'));
  }

  if (period2.isValid) {
    totalHours += period2.totalHours;
  } else if (entry.start2 || entry.stop2) {
    errors.push('Period 2: ' + (period2.error || 'Invalid time'));
  }

  const formattedTotal = totalHours.toFixed(2);

  return {
    totalHours,
    formattedTotal,
    isValid: totalHours > 0,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

/**
 * Calculates total hours for EEST time entry
 */
export function calculateEESTTimeTotal(entry: EESTTimeEntry): TimeCalculationResult {
  return calculateTimeDifference(entry.start, entry.stop);
}

/**
 * Validates and formats date string (MM/DD/YY format)
 */
export function validateAndFormatDate(dateStr: string): DatePropagationResult {
  if (!dateStr || dateStr.trim() === '') {
    return {
      propagatedDate: '',
      isValid: false,
      error: 'Date is required'
    };
  }

  // Remove any spaces
  const cleanDate = dateStr.replace(/\s/g, '');
  
  // Handle different date formats
  let month: number, day: number, year: number;
  
  if (cleanDate.includes('/')) {
    // Format: MM/DD/YY or MM/DD/YYYY
    const parts = cleanDate.split('/');
    if (parts.length !== 3) {
      return {
        propagatedDate: '',
        isValid: false,
        error: 'Invalid date format. Use MM/DD/YY'
      };
    }
    
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000; // Assume 21st century
    }
  } else if (cleanDate.length === 6) {
    // Format: MMDDYY
    month = parseInt(cleanDate.slice(0, 2), 10);
    day = parseInt(cleanDate.slice(2, 4), 10);
    year = parseInt(cleanDate.slice(4, 6), 10) + 2000;
  } else if (cleanDate.length === 8) {
    // Format: MMDDYYYY
    month = parseInt(cleanDate.slice(0, 2), 10);
    day = parseInt(cleanDate.slice(2, 4), 10);
    year = parseInt(cleanDate.slice(4, 8), 10);
  } else {
    return {
      propagatedDate: '',
      isValid: false,
      error: 'Invalid date format. Use MM/DD/YY'
    };
  }

  // Validate date
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2099) {
    return {
      propagatedDate: '',
      isValid: false,
      error: 'Invalid date values'
    };
  }

  // Check if date is valid (handles leap years, etc.)
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return {
      propagatedDate: '',
      isValid: false,
      error: 'Invalid date (e.g., February 30th)'
    };
  }

  // Format as MM/DD/YY
  const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  
  return {
    propagatedDate: formattedDate,
    isValid: true
  };
}

/**
 * Propagates date from first entry to subsequent entries
 */
export function propagateDateToEntries<T extends { date: string }>(
  entries: T[],
  sourceIndex: number = 0
): T[] {
  if (entries.length === 0 || sourceIndex < 0 || sourceIndex >= entries.length) {
    return entries;
  }

  const sourceEntry = entries[sourceIndex];
  const dateValidation = validateAndFormatDate(sourceEntry.date);
  
  if (!dateValidation.isValid) {
    return entries; // Don't propagate invalid dates
  }

  const propagatedDate = dateValidation.propagatedDate;
  
  return entries.map((entry, index) => {
    if (index === sourceIndex) {
      // Update the source entry with the formatted date
      return { ...entry, date: propagatedDate };
    } else {
      // Propagate the date to other entries
      return { ...entry, date: propagatedDate };
    }
  });
}

/**
 * Auto-calculates totals for Federal equipment entries
 */
export function autoCalculateFederalEquipmentTotals(entries: FederalEquipmentEntry[]): FederalEquipmentEntry[] {
  return entries.map(entry => {
    const calculation = calculateFederalEquipmentTotal(entry);
    return {
      ...entry,
      total: calculation.isValid ? calculation.formattedTotal : entry.total
    };
  });
}

/**
 * Auto-calculates totals for Federal personnel entries
 */
export function autoCalculateFederalPersonnelTotals(entries: FederalPersonnelEntry[]): FederalPersonnelEntry[] {
  return entries.map(entry => {
    const calculation = calculateFederalPersonnelTotal(entry);
    return {
      ...entry,
      total: calculation.isValid ? calculation.formattedTotal : entry.total
    };
  });
}

/**
 * Auto-calculates totals for EEST time entries
 */
export function autoCalculateEESTTimeTotals(entries: EESTTimeEntry[]): EESTTimeEntry[] {
  return entries.map(entry => {
    const calculation = calculateEESTTimeTotal(entry);
    // EEST doesn't have a total field, but we can add work hours calculation
    const workHours = calculation.isValid ? calculation.formattedTotal : '0.00';
    return {
      ...entry,
      work: workHours // Store calculated hours in work field
    };
  });
}

/**
 * Gets the first valid date from an array of entries
 */
export function getFirstValidDate<T extends { date: string }>(entries: T[]): string {
  for (const entry of entries) {
    const validation = validateAndFormatDate(entry.date);
    if (validation.isValid) {
      return validation.propagatedDate;
    }
  }
  return '';
}

/**
 * Propagates the first valid date to all entries
 */
export function propagateFirstValidDate<T extends { date: string }>(entries: T[]): T[] {
  const firstValidDate = getFirstValidDate(entries);
  
  if (!firstValidDate) {
    return entries; // No valid date to propagate
  }

  return entries.map(entry => ({
    ...entry,
    date: firstValidDate
  }));
}

/**
 * Utility function to format time for display
 */
export function formatTimeForDisplay(timeStr: string): string {
  const minutes = timeStringToMinutes(timeStr);
  return minutesToTimeString(minutes);
}

/**
 * Utility function to get current date in MM/DD/YY format
 */
export function getCurrentDateFormatted(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}
