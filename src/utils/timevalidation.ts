// Time Validation Utility
// Validates and formats 24-hour time input for equipment and personnel entries

export interface TimeValidationResult {
  isValid: boolean;
  formattedTime: string;
  error?: string;
}

/**
 * Validates if a time string is in valid 24-hour format
 * @param timeString - The time string to validate (e.g., "0800", "14:30", "23:59")
 * @returns TimeValidationResult with validation status and formatted time
 */
export function validate24HourTime(timeString: string): TimeValidationResult {
  if (!timeString || timeString.trim() === '') {
    return {
      isValid: true,
      formattedTime: '',
      error: undefined
    };
  }

  // Remove any non-digit characters except colons
  const cleanTime = timeString.replace(/[^\d:]/g, '');
  
  // Handle different input formats
  let hours: number;
  let minutes: number;
  
  if (cleanTime.includes(':')) {
    // Format: HH:MM or H:MM
    const parts = cleanTime.split(':');
    if (parts.length !== 2) {
      return {
        isValid: false,
        formattedTime: '',
        error: 'Invalid time format. Use HH:MM or HHMM'
      };
    }
    
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    // Format: HHMM or HMM
    if (cleanTime.length < 3 || cleanTime.length > 4) {
      return {
        isValid: false,
        formattedTime: '',
        error: 'Invalid time format. Use HH:MM or HHMM'
      };
    }
    
    if (cleanTime.length === 3) {
      // HMM format - first digit is hour, last two are minutes
      hours = parseInt(cleanTime[0], 10);
      minutes = parseInt(cleanTime.slice(1), 10);
    } else {
      // HHMM format - first two digits are hour, last two are minutes
      hours = parseInt(cleanTime.slice(0, 2), 10);
      minutes = parseInt(cleanTime.slice(2), 10);
    }
  }
  
  // Validate hours (0-23)
  if (isNaN(hours) || hours < 0 || hours > 23) {
    return {
      isValid: false,
      formattedTime: '',
      error: 'Hours must be between 00 and 23'
    };
  }
  
  // Validate minutes (0-59)
  if (isNaN(minutes) || minutes < 0 || minutes > 59) {
    return {
      isValid: false,
      formattedTime: '',
      error: 'Minutes must be between 00 and 59'
    };
  }
  
  // Format the time as HH:MM
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return {
    isValid: true,
    formattedTime,
    error: undefined
  };
}

/**
 * Validates time input character by character as user types
 * Simplified validation rules:
 * - 1st digit: 0-2
 * - 2nd digit: 0-9 if 1st is 0-1, else 0-3
 * - 3rd digit: 0-5
 * - 4th digit: 0-9
 * @param currentValue - Current input value
 * @param newChar - New character being typed
 * @returns Object with validation result and suggested value
 */
export function validateTimeInput(
  currentValue: string, 
  newChar: string
): { isValid: boolean; newValue: string; error?: string } {
  
  // Allow backspace, delete, and arrow keys
  if (newChar === '' || newChar.length === 0) {
    return { isValid: true, newValue: currentValue };
  }
  
  // Only allow digits and colons
  if (!/[\d:]/.test(newChar)) {
    return { 
      isValid: false, 
      newValue: currentValue, 
      error: 'Only numbers and colons are allowed' 
    };
  }
  
  // Remove any existing colons and non-digits
  const cleanCurrent = currentValue.replace(/[^\d]/g, '');
  const cleanNew = newChar.replace(/[^\d]/g, '');
  
  // Combine current value with new character
  let newValue = cleanCurrent + cleanNew;
  
  // Limit to 4 digits maximum
  if (newValue.length > 4) {
    return { 
      isValid: false, 
      newValue: currentValue, 
      error: 'Time cannot exceed 4 digits' 
    };
  }
  
  // Validate based on position and length
  if (newValue.length === 1) {
    // First digit: 0-2
    const firstDigit = parseInt(newValue[0], 10);
    if (firstDigit > 2) {
      return { 
        isValid: false, 
        newValue: currentValue, 
        error: 'First digit must be 0, 1, or 2' 
      };
    }
  } else if (newValue.length === 2) {
    // Second digit: 0-9 if first is 0-1, else 0-3
    const firstDigit = parseInt(newValue[0], 10);
    const secondDigit = parseInt(newValue[1], 10);
    
    if (firstDigit === 0 || firstDigit === 1) {
      // If first digit is 0 or 1, second digit can be 0-9
      if (secondDigit > 9) {
        return { 
          isValid: false, 
          newValue: currentValue, 
          error: 'Second digit must be 0-9 when first digit is 0 or 1' 
        };
      }
    } else if (firstDigit === 2) {
      // If first digit is 2, second digit can only be 0-3
      if (secondDigit > 3) {
        return { 
          isValid: false, 
          newValue: currentValue, 
          error: 'Second digit must be 0-3 when first digit is 2' 
        };
      }
    }
  } else if (newValue.length === 3) {
    // Third digit: 0-5
    const thirdDigit = parseInt(newValue[2], 10);
    if (thirdDigit > 5) {
      return { 
        isValid: false, 
        newValue: currentValue, 
        error: 'Third digit must be 0-5' 
      };
    }
  } else if (newValue.length === 4) {
    // Fourth digit: 0-9
    const fourthDigit = parseInt(newValue[3], 10);
    if (fourthDigit > 9) {
      return { 
        isValid: false, 
        newValue: currentValue, 
        error: 'Fourth digit must be 0-9' 
      };
    }
  }
  
  // Format with colon if we have 2 or more digits
  if (newValue.length >= 2) {
    newValue = newValue.slice(0, 2) + ':' + newValue.slice(2);
  }
  
  return { 
    isValid: true, 
    newValue, 
    error: undefined 
  };
}

/**
 * Formats a time string to HH:MM format
 * @param timeString - Time string to format
 * @returns Formatted time string
 */
export function formatTime(timeString: string): string {
  const validation = validate24HourTime(timeString);
  return validation.formattedTime;
}

/**
 * Calculates the difference between two times in minutes
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Difference in minutes, or null if invalid
 */
export function calculateTimeDifference(startTime: string, endTime: string): number | null {
  const startValidation = validate24HourTime(startTime);
  const endValidation = validate24HourTime(endTime);
  
  if (!startValidation.isValid || !endValidation.isValid) {
    return null;
  }
  
  const [startHours, startMinutes] = startValidation.formattedTime.split(':').map(Number);
  const [endHours, endMinutes] = endValidation.formattedTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight shifts (end time is next day)
  if (endTotalMinutes < startTotalMinutes) {
    return (24 * 60) - startTotalMinutes + endTotalMinutes;
  }
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Converts minutes to HH:MM format
 * @param minutes - Number of minutes
 * @returns Time string in HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Auto-calculates total time when start and stop times are provided
 * @param startTime - Start time
 * @param stopTime - Stop time
 * @returns Total time in HH:MM format, or empty string if invalid
 */
export function autoCalculateTotal(startTime: string, stopTime: string): string {
  const difference = calculateTimeDifference(startTime, stopTime);
  if (difference === null) {
    return '';
  }
  return minutesToTime(difference);
}
