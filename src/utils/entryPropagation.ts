// Entry Propagation Utilities
// Handles auto-filling of dates and calculations for equipment and personnel entries

import type { FederalEquipmentEntry, FederalPersonnelEntry } from './engineTimeDB';
import type { EESTTimeEntry } from './engineTimeDB';
import {
  propagateDateToEntries,
  propagateFirstValidDate,
  autoCalculateFederalEquipmentTotals,
  autoCalculateFederalPersonnelTotals,
  autoCalculateEESTTimeTotals,
  validateAndFormatDate,
  calculateFederalEquipmentTotal,
  calculateFederalPersonnelTotal,
  calculateEESTTimeTotal,
  getCurrentDateFormatted
} from './timeCalculations';

// Propagation configuration
export interface PropagationConfig {
  autoCalculateTotals: boolean;
  autoPropagateDates: boolean;
  propagateFromFirst: boolean;
  validateDates: boolean;
}

// Default propagation configuration
export const DEFAULT_PROPAGATION_CONFIG: PropagationConfig = {
  autoCalculateTotals: true,
  autoPropagateDates: true,
  propagateFromFirst: true,
  validateDates: true
};

/**
 * Handles Federal equipment entry changes with propagation
 */
export function handleFederalEquipmentEntryChange(
  entries: FederalEquipmentEntry[],
  index: number,
  field: keyof FederalEquipmentEntry,
  value: string,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): FederalEquipmentEntry[] {
  let updatedEntries = [...entries];
  
  // Update the specific entry
  updatedEntries[index] = { ...updatedEntries[index], [field]: value };
  
  // Handle date propagation
  if (field === 'date' && config.autoPropagateDates) {
    if (config.propagateFromFirst && index === 0) {
      // Propagate from first entry to all others
      updatedEntries = propagateDateToEntries(updatedEntries, 0);
    } else if (!config.propagateFromFirst) {
      // Propagate from first valid date
      updatedEntries = propagateFirstValidDate(updatedEntries);
    }
  }
  
  // Handle time calculation
  if ((field === 'start' || field === 'stop') && config.autoCalculateTotals) {
    const entry = updatedEntries[index];
    const calculation = calculateFederalEquipmentTotal(entry);
    if (calculation.isValid) {
      updatedEntries[index] = { ...entry, total: calculation.formattedTotal };
    }
  }
  
  return updatedEntries;
}

/**
 * Handles Federal personnel entry changes with propagation
 */
export function handleFederalPersonnelEntryChange(
  entries: FederalPersonnelEntry[],
  index: number,
  field: keyof FederalPersonnelEntry,
  value: string,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): FederalPersonnelEntry[] {
  let updatedEntries = [...entries];
  
  // Update the specific entry
  updatedEntries[index] = { ...updatedEntries[index], [field]: value };
  
  // Handle date propagation - only propagate to entries with names
  if (field === 'date' && config.autoPropagateDates) {
    if (config.propagateFromFirst && index === 0) {
      // Propagate from first entry to all others that have names
      updatedEntries = propagateDateToPersonnelEntriesWithNames(updatedEntries, 0);
    } else if (!config.propagateFromFirst) {
      // Propagate from first valid date to entries with names
      updatedEntries = propagateFirstValidDateToPersonnelEntriesWithNames(updatedEntries);
    }
  }
  
  // Handle name field changes - if a name is added, propagate date to that entry
  if (field === 'name' && config.autoPropagateDates) {
    const entryWithName = updatedEntries[index];
    if (entryWithName.name && entryWithName.name.trim() !== '') {
      // This entry now has a name, so it should get the propagated date
      const firstValidDate = getFirstValidDate(updatedEntries);
      if (firstValidDate) {
        updatedEntries[index] = { ...entryWithName, date: firstValidDate };
      }
    }
  }
  
  // Handle time calculation
  if ((field === 'start1' || field === 'stop1' || field === 'start2' || field === 'stop2') && config.autoCalculateTotals) {
    const entry = updatedEntries[index];
    const calculation = calculateFederalPersonnelTotal(entry);
    if (calculation.isValid) {
      updatedEntries[index] = { ...entry, total: calculation.formattedTotal };
    }
  }
  
  return updatedEntries;
}

/**
 * Handles EEST time entry changes with propagation
 */
export function handleEESTTimeEntryChange(
  entries: EESTTimeEntry[],
  index: number,
  field: keyof EESTTimeEntry,
  value: string,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): EESTTimeEntry[] {
  let updatedEntries = [...entries];
  
  // Update the specific entry
  updatedEntries[index] = { ...updatedEntries[index], [field]: value };
  
  // Handle date propagation
  if (field === 'date' && config.autoPropagateDates) {
    if (config.propagateFromFirst && index === 0) {
      // Propagate from first entry to all others
      updatedEntries = propagateDateToEntries(updatedEntries, 0);
    } else if (!config.propagateFromFirst) {
      // Propagate from first valid date
      updatedEntries = propagateFirstValidDate(updatedEntries);
    }
  }
  
  // Handle time calculation
  if ((field === 'start' || field === 'stop') && config.autoCalculateTotals) {
    const entry = updatedEntries[index];
    const calculation = calculateEESTTimeTotal(entry);
    if (calculation.isValid) {
      // Store calculated hours in work field
      updatedEntries[index] = { ...entry, work: calculation.formattedTotal };
    }
  }
  
  return updatedEntries;
}

/**
 * Initializes entries with current date if empty
 */
export function initializeEntriesWithCurrentDate<T extends { date: string }>(
  entries: T[],
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): T[] {
  if (!config.autoPropagateDates) {
    return entries;
  }
  
  const currentDate = getCurrentDateFormatted();
  
  return entries.map(entry => ({
    ...entry,
    date: entry.date || currentDate
  }));
}

/**
 * Validates all entries and returns validation results
 */
export function validateAllEntries<T extends { date: string }>(
  entries: T[],
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.validateDates) {
    return { isValid: true, errors: [] };
  }
  
  entries.forEach((entry, index) => {
    if (entry.date) {
      const validation = validateAndFormatDate(entry.date);
      if (!validation.isValid) {
        errors.push(`Entry ${index + 1}: ${validation.error}`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Batch processes entries with all propagation features
 */
export function batchProcessEntries<T extends { date: string }>(
  entries: T[],
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): T[] {
  let processedEntries = [...entries];
  
  // Initialize with current date if needed
  if (config.autoPropagateDates) {
    processedEntries = initializeEntriesWithCurrentDate(processedEntries, config);
  }
  
  // Propagate dates
  if (config.autoPropagateDates && config.propagateFromFirst) {
    processedEntries = propagateFirstValidDate(processedEntries);
  }
  
  return processedEntries;
}

/**
 * Creates a new entry with propagated date
 */
export function createEntryWithPropagatedDate<T extends { date: string }>(
  template: T,
  sourceEntries: T[],
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): T {
  if (!config.autoPropagateDates) {
    return { ...template };
  }
  
  const firstValidDate = getFirstValidDate(sourceEntries);
  const dateToUse = firstValidDate || getCurrentDateFormatted();
  
  return {
    ...template,
    date: dateToUse
  };
}

/**
 * Gets the first valid date from entries (helper function)
 */
function getFirstValidDate<T extends { date: string }>(entries: T[]): string {
  for (const entry of entries) {
    if (entry.date) {
      const validation = validateAndFormatDate(entry.date);
      if (validation.isValid) {
        return validation.propagatedDate;
      }
    }
  }
  return '';
}

/**
 * Propagates date from source entry to personnel entries that have names
 */
function propagateDateToPersonnelEntriesWithNames(
  entries: FederalPersonnelEntry[],
  sourceIndex: number = 0
): FederalPersonnelEntry[] {
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
    } else if (entry.name && entry.name.trim() !== '') {
      // Only propagate to entries that have names
      return { ...entry, date: propagatedDate };
    } else {
      // Don't propagate to entries without names
      return entry;
    }
  });
}

/**
 * Propagates the first valid date to personnel entries that have names
 */
function propagateFirstValidDateToPersonnelEntriesWithNames(
  entries: FederalPersonnelEntry[]
): FederalPersonnelEntry[] {
  const firstValidDate = getFirstValidDate(entries);
  
  if (!firstValidDate) {
    return entries; // No valid date to propagate
  }

  return entries.map(entry => {
    if (entry.name && entry.name.trim() !== '') {
      // Only propagate to entries that have names
      return { ...entry, date: firstValidDate };
    } else {
      // Don't propagate to entries without names
      return entry;
    }
  });
}

/**
 * Hook-like function for React components to handle entry changes
 */
export function useEntryPropagation<T extends { date: string }>(
  entries: T[],
  setEntries: (entries: T[]) => void,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
) {
  const handleEntryChange = (
    index: number,
    field: keyof T,
    value: string
  ) => {
    let updatedEntries: T[];
    
    if (isFederalEquipmentEntry(entries[index])) {
      updatedEntries = handleFederalEquipmentEntryChange(
        entries as FederalEquipmentEntry[],
        index,
        field as keyof FederalEquipmentEntry,
        value,
        config
      ) as T[];
    } else if (isFederalPersonnelEntry(entries[index])) {
      updatedEntries = handleFederalPersonnelEntryChange(
        entries as FederalPersonnelEntry[],
        index,
        field as keyof FederalPersonnelEntry,
        value,
        config
      ) as T[];
    } else if (isEESTTimeEntry(entries[index])) {
      updatedEntries = handleEESTTimeEntryChange(
        entries as EESTTimeEntry[],
        index,
        field as keyof EESTTimeEntry,
        value,
        config
      ) as T[];
    } else {
      // Generic handling
      updatedEntries = [...entries];
      updatedEntries[index] = { ...updatedEntries[index], [field]: value };
      
      // Handle date propagation for generic entries
      if (field === 'date' && config.autoPropagateDates) {
        if (config.propagateFromFirst && index === 0) {
          updatedEntries = propagateDateToEntries(updatedEntries, 0);
        } else if (!config.propagateFromFirst) {
          updatedEntries = propagateFirstValidDate(updatedEntries);
        }
      }
    }
    
    setEntries(updatedEntries);
  };
  
  return { handleEntryChange };
}

/**
 * Type guards for entry types
 */
function isFederalEquipmentEntry(entry: any): entry is FederalEquipmentEntry {
  return entry && typeof entry === 'object' && 'start' in entry && 'stop' in entry && 'total' in entry;
}

function isFederalPersonnelEntry(entry: any): entry is FederalPersonnelEntry {
  return entry && typeof entry === 'object' && 'start1' in entry && 'stop1' in entry && 'name' in entry;
}

function isEESTTimeEntry(entry: any): entry is EESTTimeEntry {
  return entry && typeof entry === 'object' && 'start' in entry && 'stop' in entry && 'work' in entry;
}

/**
 * Utility to get propagation status for debugging
 */
export function getPropagationStatus<T extends { date: string }>(
  entries: T[],
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): {
  hasValidDates: boolean;
  firstValidDate: string;
  totalEntries: number;
  entriesWithDates: number;
  config: PropagationConfig;
} {
  const firstValidDate = getFirstValidDate(entries);
  const entriesWithDates = entries.filter(entry => entry.date && entry.date.trim() !== '').length;
  
  return {
    hasValidDates: !!firstValidDate,
    firstValidDate,
    totalEntries: entries.length,
    entriesWithDates,
    config
  };
}
