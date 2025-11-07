// Federal Time Table
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FederalEquipmentEntry, FederalPersonnelEntry, FederalFormData } from '../utils/engineTimeDB';
import {
  saveFederalEquipmentEntry,
  loadAllFederalEquipmentEntries,
  deleteFederalEquipmentEntry,
  saveFederalPersonnelEntry,
  loadAllFederalPersonnelEntries,
  deleteFederalPersonnelEntry,
  saveFederalFormData,
  loadFederalFormData,
  clearCorruptedData
} from '../utils/engineTimeDB';
import { getPDF, storePDFWithId, listPDFs } from '../utils/pdfStorage';
import { mapFederalToPDFFields, validateFederalFormData, getFederalPDFFieldName } from '../utils/fieldmapper/federalFieldMapper';
import { handleFederalEquipmentEntryChange, handleFederalPersonnelEntryChange, DEFAULT_PROPAGATION_CONFIG } from '../utils/entryPropagation';
import { DateCalendar } from './DateCalendar';
import { validateTimeInput, autoCalculateTotal } from '../utils/timevalidation';
import '../styles/components/ResponsivePDFViewer.css';
import { parsePayloadFromURL, createShareableLink, clearURLParameters, type FederalPayload } from '../utils/payloadSystem';
import * as PDFLib from 'pdf-lib';

// Simple Calendar Component
const CalendarPicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentDate?: string;
}> = ({ isOpen, onClose, onSelectDate, currentDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (currentDate) {
      const date = new Date(currentDate);
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date);
      }
    }
  }, [currentDate]);

  // Handle click outside to close calendar
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!currentDate) return false;
    const selectedDate = new Date(currentDate);
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date: Date) => {
    onSelectDate(formatDate(date));
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getDaysInMonth(currentMonth);

  return (
    <div 
      ref={calendarRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e9ecef',
        zIndex: 1000,
        marginTop: '4px'
      }} 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <button
          onClick={goToPreviousMonth}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            color: '#2c3e50'
          }}
        >
          ‹
        </button>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50'
        }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={goToNextMonth}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            color: '#2c3e50'
          }}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '8px'
      }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: '600',
            color: '#6c757d',
            padding: '4px 2px'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px'
      }}>
        {days.map((date, index) => (
          <div key={index} style={{
            textAlign: 'center',
            padding: '6px 2px',
            fontSize: '12px',
            cursor: date ? 'pointer' : 'default',
            backgroundColor: date && isSelected(date) ? '#007bff' : 
                           date && isToday(date) ? '#e3f2fd' : 'transparent',
            color: date && isSelected(date) ? '#fff' : 
                   date && isToday(date) ? '#007bff' : '#333',
            borderRadius: '4px',
            fontWeight: date && (isSelected(date) || isToday(date)) ? '600' : '400'
          }} onClick={() => date && handleDateClick(date)}>
            {date ? date.getDate() : ''}
          </div>
        ))}
      </div>

      {/* Today button */}
      <div style={{
        marginTop: '12px',
        textAlign: 'center'
      }}>
        <button
          onClick={() => {
            onSelectDate(formatDate(new Date()));
            onClose();
          }}
          style={{
            background: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
};

export const FederalTimeTable: React.FC = () => {
  const navigate = useNavigate();
  
  // Federal form data state
  const [federalFormData, setFederalFormData] = useState<FederalFormData>({
    agreementNumber: '',
    contractorAgencyName: '',
    resourceOrderNumber: '',
    incidentName: '',
    incidentNumber: '',
    financialCode: '',
    equipmentMakeModel: '',
    equipmentType: '',
    serialVinNumber: '',
    licenseIdNumber: '',
    transportRetained: '',
    isFirstLastTicket: '',
    rateType: '',
    agencyRepresentative: '',
    incidentSupervisor: '',
    remarks: '',
    checkboxStates: {
      noMealsLodging: false,
      noMeals: false,
      travel: false,
      noLunch: false,
      hotline: true  // Default to true
    }
  });

  // Equipment entries state
  const [equipmentEntries, setEquipmentEntries] = useState<FederalEquipmentEntry[]>([]);

  // Personnel entries state
  const [personnelEntries, setPersonnelEntries] = useState<FederalPersonnelEntry[]>([]);


  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState<{
    type: 'equipment' | 'personnel';
    index: number;
  } | null>(null);


  // Main calendar state
  const [showMainCalendar, setShowMainCalendar] = useState(false);
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string>('');
  const [savedDates, setSavedDates] = useState<string[]>([]);

  // Time validation state
  const [timeValidationErrors, setTimeValidationErrors] = useState<Record<string, string>>({});

  // Add state for collapsible sections
  const [checkboxStates, setCheckboxStates] = useState({
    noMealsLodging: false,
    noMeals: false,
    travel: false,
    noLunch: false,
    hotline: true  // Default to true
  });

  // Add state for unsaved changes and saving status
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // Add state for stored PDFs and preview
  const [storedPDFs, setStoredPDFs] = useState<any[]>([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [previewPDF, setPreviewPDF] = useState<{ pdf: Blob; preview: Blob | null; metadata: any } | null>(null);

  // Utility function to convert YYYY-MM-DD to MM/DD/YY format
  const convertYYYYMMDDToMMDDYY = (dateStr: string): string => {
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-');
      const shortYear = year.slice(-2);
      return `${month}/${day}/${shortYear}`;
    }
    return dateStr; // Already in MM/DD/YY format
  };

  // Utility function to generate remarks text from checkbox states
  const generateRemarksFromCheckboxes = (states: typeof checkboxStates): string[] => {
    const remarks = [];
    if (states.noMealsLodging) remarks.push('No Meals/Lodging');
    if (states.noMeals) remarks.push('No Meals');
    if (states.travel) remarks.push('Travel');
    if (states.noLunch) remarks.push('No Lunch');
    if (states.hotline) remarks.push('Hotline');
    return remarks;
  };


  // Migration function to convert old date formats to new format
  const migrateDateFormats = async () => {
    try {
      // Load all entries
      const allEquipmentEntries = await loadAllFederalEquipmentEntries();
      const allPersonnelEntries = await loadAllFederalPersonnelEntries();
      
      let hasChanges = false;
      
      // Check and convert equipment entries
      for (const entry of allEquipmentEntries) {
        if (entry.date && entry.date.includes('-') && entry.date.length === 10) {
          const newDate = convertYYYYMMDDToMMDDYY(entry.date);
          if (newDate !== entry.date) {
            await saveFederalEquipmentEntry({ ...entry, date: newDate });
            hasChanges = true;
          }
        }
      }
      
      // Check and convert personnel entries
      for (const entry of allPersonnelEntries) {
        if (entry.date && entry.date.includes('-') && entry.date.length === 10) {
          const newDate = convertYYYYMMDDToMMDDYY(entry.date);
          if (newDate !== entry.date) {
            await saveFederalPersonnelEntry({ ...entry, date: newDate });
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        console.log('Migrated old date formats to MM/DD/YY format');
      }
    } catch (error) {
      console.error('Error migrating date formats:', error);
    }
  };

  // Load Federal data from IndexedDB on mount
  useEffect(() => {
    const initializeData = async () => {
      // First, clear any corrupted data from previous database issues
      await clearCorruptedData();
      
      // Then, migrate any old date formats
      await migrateDateFormats();
      
      // Load form data
      const saved = await loadFederalFormData();
      if (saved) {
        setFederalFormData(saved);
        
        // Initialize checkbox states from saved data or defaults
        if (saved.checkboxStates) {
          // Use saved checkbox states from IndexedDB
          setCheckboxStates(saved.checkboxStates);
          console.log('Loaded checkbox states from IndexedDB:', saved.checkboxStates);
        } else {
          // Fallback: Initialize checkbox states based on existing remarks (legacy support)
        if (saved.remarks) {
          const remarks = saved.remarks.split(', ');
            const legacyCheckboxStates = {
            noMealsLodging: remarks.includes('No Meals/Lodging'),
            noMeals: remarks.includes('No Meals'),
            travel: remarks.includes('Travel'),
            noLunch: remarks.includes('No Lunch'),
            hotline: remarks.includes('Hotline')
            };
            setCheckboxStates(legacyCheckboxStates);
            console.log('Loaded checkbox states from legacy remarks:', legacyCheckboxStates);
        } else {
            // If no saved data, use default state (Hotline = true)
            const defaultCheckboxStates = {
            noMealsLodging: false,
            noMeals: false,
            travel: false,
            noLunch: false,
            hotline: true  // Default to true
            };
            setCheckboxStates(defaultCheckboxStates);
            console.log('Using default checkbox states:', defaultCheckboxStates);
          }
        }
      }
      
      // Check for payload in URL parameters and apply after form data is loaded
      const payload = parsePayloadFromURL();
      if (Object.keys(payload).length > 0) {
        console.log('Payload found in URL, applying to form after data load...');
        await applyPayloadToForm(payload);
        
        // Clear URL parameters after applying payload
        setTimeout(() => {
          clearURLParameters();
        }, 1000);
      }
      
      // Set today's date as default if no date is selected
      if (!currentSelectedDate) {
        const today = formatToMMDDYY(new Date());
        setCurrentSelectedDate(today);
        await loadDataForDate(today);
      }
      
      // Update saved dates list
      await refreshSavedDates();
    };
    
    initializeData();
  }, []);

  // Function to update selected date based on entry dates
  const updateSelectedDateFromEntries = useCallback(() => {
    // Only update the selected date if there's no current selected date
    // This prevents overriding the user's current date selection
    if (currentSelectedDate) {
      return; // Don't update if user has already selected a date
    }
    
    // Check equipment entries for dates
    const equipmentDates = equipmentEntries
      .filter(entry => entry.date && entry.date.trim() !== '')
      .map(entry => entry.date);
    
    // Check personnel entries for dates
    const personnelDates = personnelEntries
      .filter(entry => entry.date && entry.date.trim() !== '')
      .map(entry => entry.date);
    
    // Get all unique dates
    const allDates = [...new Set([...equipmentDates, ...personnelDates])];
    
    if (allDates.length > 0) {
      // If there's only one date, use it
      if (allDates.length === 1) {
        const singleDate = allDates[0];
        setCurrentSelectedDate(singleDate);
        console.log('Updated selected date to single entry date:', singleDate);
      } else {
        // If there are multiple dates, use the most recent one
        const sortedDates = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const mostRecentDate = sortedDates[0];
        setCurrentSelectedDate(mostRecentDate);
        console.log('Updated selected date to most recent entry date:', mostRecentDate);
      }
    }
  }, [equipmentEntries, personnelEntries, currentSelectedDate]);

  // Watch for date changes in entries and update selected date
  useEffect(() => {
    updateSelectedDateFromEntries();
  }, [updateSelectedDateFromEntries]);

  // Function to handle manual date selection in entries
  const handleEntryDateSelect = useCallback((selectedDate: string) => {
    if (selectedDate && selectedDate !== currentSelectedDate) {
      setCurrentSelectedDate(selectedDate);
      console.log('Manually updated selected date from entry:', selectedDate);
    }
  }, [currentSelectedDate]);

  // Initialize federal PDF in storage
  useEffect(() => {
    const initializeFederalPDF = async () => {
      try {
        // Check if federal PDF already exists
        const existingPDF = await getPDF('federal-form');
        if (!existingPDF) {
          // Load the federal PDF from public folder
          const response = await fetch('/OF297-24.pdf');
          if (response.ok) {
            const pdfBlob = await response.blob();
            // Store with a fixed ID for the federal form
            await storePDFWithId('federal-form', pdfBlob, null, {
              filename: 'OF297-24.pdf',
              date: new Date().toISOString(),
              crewNumber: 'N/A',
              fireName: 'N/A',
              fireNumber: 'N/A'
            });
            console.log('Federal PDF initialized in storage');
          }
        }
      } catch (error) {
        console.error('Error initializing federal PDF:', error);
      }
    };

    initializeFederalPDF();
    
    // Load stored PDFs
    loadStoredPDFs();
  }, []);

  // Reload stored PDFs when the selected date changes
  useEffect(() => {
    if (currentSelectedDate) {
      loadStoredPDFs();
    }
  }, [currentSelectedDate]);

  // Reload stored PDFs when component becomes visible (e.g., returning from PDF signing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentSelectedDate) {
        console.log('🔍 Component became visible, refreshing stored PDFs...');
        loadStoredPDFs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when window gains focus (alternative to visibility change)
    const handleFocus = () => {
      if (currentSelectedDate) {
        console.log('🔍 Window gained focus, refreshing stored PDFs...');
        loadStoredPDFs();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentSelectedDate]);

  // Handle Federal form data changes and autosave
  const handleFederalFormChange = (field: keyof FederalFormData, value: string) => {
    setFederalFormData(prev => {
      let updated = { ...prev, [field]: value };
      
      // Special handling for remarks field - only store manual remarks in UI
      if (field === 'remarks') {
        // For the UI, only store the manual text (what the user typed)
        // Checkbox remarks will be added separately for PDF generation
        updated.remarks = value;
        console.log('Form change - Manual remarks only:', updated.remarks);
      }
      
      saveFederalFormData(updated);
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Handle checkbox changes for remarks section
  const handleCheckboxChange = async (option: keyof typeof checkboxStates) => {
    // Calculate new checkbox states
    const newStates = { ...checkboxStates };

      // If turning on travel, automatically uncheck hotline
      if (option === 'travel') {
      if (!checkboxStates.travel) {
          newStates.hotline = false;
        }
      newStates.travel = !checkboxStates.travel;
      } else if (option === 'hotline') {
        // If turning on hotline, automatically uncheck travel
      if (!checkboxStates.hotline) {
          newStates.travel = false;
        }
      newStates.hotline = !checkboxStates.hotline;
      } else {
        // For other checkboxes, toggle the state
      newStates[option] = !checkboxStates[option];
      }

    // Set the checkbox states in UI
    setCheckboxStates(newStates);

      // Don't update the form data remarks field - keep UI clean
      // Checkbox remarks will be added during PDF generation
      const selectedRemarks = generateRemarksFromCheckboxes(newStates);
      console.log('Checkbox change - Selected remarks (for PDF only):', selectedRemarks);

    // Save checkbox states to IndexedDB immediately
    try {
      setIsSaving(true);
      
      // Update form data with new checkbox states
      const updatedFormData = {
        ...federalFormData,
        checkboxStates: newStates
      };
      
      await saveFederalFormData(updatedFormData);
      setFederalFormData(updatedFormData);
      console.log('Checkbox states saved to IndexedDB:', newStates);

      // Get the full date range
      const fullDateRange = currentSelectedDate || formatToMMDDYY(new Date());

      // Save the record
      await saveDataForDate();

      // If the save is complete, set the has unsaved changes to false, set the last saved to the current time, and log the save completed
      setHasUnsavedChanges(false);
      setLastSaved(Date.now());
      console.log('Save completed:', { dateRange: fullDateRange });
    } catch (error) {
      // If there's an error, show a notification
      console.error('Save error:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle equipment entry changes and autosave with propagation
  const handleEquipmentEntryChange = (index: number, field: keyof FederalEquipmentEntry, value: string) => {
    setEquipmentEntries(prev => {
      const updated = handleFederalEquipmentEntryChange(prev, index, field, value, DEFAULT_PROPAGATION_CONFIG);
      saveFederalEquipmentEntry(updated[index]);
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Simplified time input handler - only allows exactly 4 digits
  const handleTimeInput = (
    index: number, 
    field: 'start' | 'stop' | 'start1' | 'stop1' | 'start2' | 'stop2',
    value: string,
    type: 'equipment' | 'personnel'
  ) => {
    const fieldKey = `${type}-${index}-${field}`;
    
    // Remove any non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '');
    
    // Only allow exactly 4 digits
    if (cleanValue.length > 4) {
      return; // Don't update if more than 4 digits
    }
    
    // Validate each character as it's typed using the simplified validation
    let isValid = true;
    let errorMessage = '';
    
    for (let i = 0; i < cleanValue.length; i++) {
      const char = cleanValue[i];
      const validation = validateTimeInput(cleanValue.slice(0, i), char);
      
      if (!validation.isValid) {
        isValid = false;
        errorMessage = validation.error || 'Invalid input';
        break;
      }
    }
    
    if (isValid && cleanValue.length === 4) {
      // Clear any existing error
      setTimeValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
      
      // Format as HH:MM
      const formattedTime = `${cleanValue.slice(0, 2)}:${cleanValue.slice(2)}`;
      
      // Update the entry with formatted time
      if (type === 'equipment') {
        handleEquipmentEntryChange(index, field as keyof FederalEquipmentEntry, formattedTime);
        
        // Auto-calculate total if both start and stop are provided
        if (field === 'stop1') {
          const entry = equipmentEntries[index];
          if (entry.start1 && formattedTime) {
            const total = autoCalculateTotal(entry.start1, formattedTime);
            if (total) {
              handleEquipmentEntryChange(index, 'total', total);
            }
          }
        } else if (field === 'stop2') {
          const entry = equipmentEntries[index];
          if (entry.start2 && formattedTime) {
            const total = autoCalculateTotal(entry.start2, formattedTime);
            if (total) {
              // For equipment, we might want to combine both periods or use the second period
              // For now, just update the total field with the second period
              handleEquipmentEntryChange(index, 'total', total);
            }
          }
        }
      } else {
        handlePersonnelEntryChange(index, field as keyof FederalPersonnelEntry, formattedTime);
        
        // Auto-calculate total for personnel entries
        if (field === 'stop1' || field === 'stop2') {
          const entry = personnelEntries[index];
          if (field === 'stop1' && entry.start1 && formattedTime) {
            const total1 = autoCalculateTotal(entry.start1, formattedTime);
            if (total1) {
              // For now, just update the total field (you might want to sum both periods)
              handlePersonnelEntryChange(index, 'total', total1);
            }
          } else if (field === 'stop2' && entry.start2 && formattedTime) {
            const total2 = autoCalculateTotal(entry.start2, formattedTime);
            if (total2) {
              // Calculate combined total if both periods are filled
              const total1 = entry.start1 && entry.stop1 ? autoCalculateTotal(entry.start1, entry.stop1) : '';
              const combinedTotal = total1 && total2 ? 
                autoCalculateTotal('00:00', autoCalculateTotal(total1, total2)) : total2;
              if (combinedTotal) {
                handlePersonnelEntryChange(index, 'total', combinedTotal);
              }
            }
          }
        }
      }
    } else if (!isValid) {
      // Set validation error
      setTimeValidationErrors(prev => ({
        ...prev,
        [fieldKey]: errorMessage
      }));
    }
    
    // Always update the input value (even if invalid) so user can see what they're typing
    if (type === 'equipment') {
      handleEquipmentEntryChange(index, field as keyof FederalEquipmentEntry, cleanValue);
    } else {
      handlePersonnelEntryChange(index, field as keyof FederalPersonnelEntry, cleanValue);
    }
  };

  // Handle personnel entry changes and autosave with propagation
  const handlePersonnelEntryChange = (index: number, field: keyof FederalPersonnelEntry, value: string) => {
    setPersonnelEntries(prev => {
      let updated = handleFederalPersonnelEntryChange(prev, index, field, value, DEFAULT_PROPAGATION_CONFIG);
      
      // Auto-fill Job Title for first personnel entry
      if (index === 0 && !updated[index].remarks) {
        updated[index] = { ...updated[index], remarks: 'ENGB' };
      }
      
      // Auto-fill from equipment entry when name is entered
      if (field === 'name' && value && value.trim() !== '') {
        const equipmentEntry = equipmentEntries[0]; // Use first equipment entry as source
        if (equipmentEntry && (equipmentEntry.date || equipmentEntry.start || equipmentEntry.stop)) {
          console.log('Auto-filling personnel entry from equipment data:', {
            personnelIndex: index,
            equipmentData: {
              date: equipmentEntry.date,
              start: equipmentEntry.start,
              stop: equipmentEntry.stop
            }
          });
          
          // Auto-fill date from equipment entry if personnel entry doesn't have one
          if (!updated[index].date && equipmentEntry.date) {
            updated[index] = { ...updated[index], date: equipmentEntry.date };
          }
          
          // Auto-fill start time from equipment entry if personnel entry doesn't have one
          if (!updated[index].start1 && equipmentEntry.start) {
            updated[index] = { ...updated[index], start1: equipmentEntry.start };
          }
          
          // Auto-fill stop time from equipment entry if personnel entry doesn't have one
          if (!updated[index].stop1 && equipmentEntry.stop) {
            updated[index] = { ...updated[index], stop1: equipmentEntry.stop };
          }
          
          // Auto-calculate total if we now have both start and stop times
          if (updated[index].start1 && updated[index].stop1) {
            const total = autoCalculateTotal(updated[index].start1, updated[index].stop1);
            if (total) {
              updated[index] = { ...updated[index], total: total };
            }
          }
        }
      }
      
      saveFederalPersonnelEntry(updated[index]);
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Clear equipment entry
  const handleClearEquipmentEntry = (index: number) => {
    setEquipmentEntries(prev => {
      const updated = [...prev];
      updated[index] = { date: '', start: '', stop: '', start1: '', stop1: '', start2: '', stop2: '', total: '', quantity: '', type: '', remarks: '' };
      saveFederalEquipmentEntry(updated[index]);
      return updated;
    });
  };

  // Clear personnel entry
  const handleClearPersonnelEntry = (index: number) => {
    setPersonnelEntries(prev => {
      const updated = [...prev];
      updated[index] = { date: '', name: '', start1: '', stop1: '', start2: '', stop2: '', total: '', remarks: '' };
      saveFederalPersonnelEntry(updated[index]);
      return updated;
    });
  };

  // Calendar handlers
  const handleCalendarOpen = (type: 'equipment' | 'personnel', index: number) => {
    // Only allow calendar for equipment entries or first personnel entry
    if (type === 'equipment' || (type === 'personnel' && index === 0)) {
      setCalendarOpen({ type, index });
    }
  };

  const handleCalendarClose = () => {
    setCalendarOpen(null);
  };

  const handleDateSelect = (date: string) => {
    if (calendarOpen) {
      if (calendarOpen.type === 'equipment') {
        handleEquipmentEntryChange(calendarOpen.index, 'date', date);
      } else {
        handlePersonnelEntryChange(calendarOpen.index, 'date', date);
      }
      
      // Update the main selected date when a date is selected in an entry
      handleEntryDateSelect(date);
    }
  };

  // Get the current date from the calendar open
  const getCurrentDate = () => {
    if (!calendarOpen) return '';
    
    if (calendarOpen.type === 'equipment') {
      return equipmentEntries[calendarOpen.index]?.date || '';
    } else if (calendarOpen.type === 'personnel' && calendarOpen.index === 0) {
      // Only first personnel entry can have calendar
      return personnelEntries[calendarOpen.index]?.date || '';
    }
    return '';
  };

  // PDF handlers
  const handleViewPDF = async () => {
    try {
      console.log('Federal: Starting PDF fill and sign process...');
      
      // Validate form data
      const validation = validateFederalFormData(federalFormData, equipmentEntries, personnelEntries);
      if (!validation.isValid) {
        console.error('Federal: Form validation failed:', validation.errors);
        alert('Please fill in required fields before signing: ' + validation.errors.join(', '));
        return;
      }

      // Map form data to PDF fields
      console.log('🔍 DEBUG: Equipment entries being mapped:', equipmentEntries);
      console.log('🔍 DEBUG: Personnel entries being mapped:', personnelEntries);
      const pdfFields = mapFederalToPDFFields(federalFormData, equipmentEntries, personnelEntries, checkboxStates);
      console.log('Federal: Mapped PDF fields:', pdfFields);
      
      // Debug time-related fields specifically
      const timeFields = Object.entries(pdfFields).filter(([key]) => 
        key.includes('DateRow') || key.includes('StartRow') || key.includes('StopRow') || key.includes('TotalRow')
      );
      console.log('🔍 DEBUG: Time-related fields being mapped:', timeFields);
      console.log('Federal: Current form data remarks:', federalFormData.remarks);
      console.log('Federal: Checkbox states:', checkboxStates);
      console.log('Federal: PDF remarks field value:', pdfFields[getFederalPDFFieldName('remarks')]);

      // Get the stored PDF
      const storedPDF = await getPDF('federal-form');
      if (!storedPDF) {
        console.error('Federal: No PDF found in storage');
        alert('PDF not found. Please try again.');
        return;
      }

      // Create a new PDF with filled fields
      const pdfDoc = await PDFLib.PDFDocument.load(await storedPDF.pdf.arrayBuffer());
      
      // Get the form
      const form = pdfDoc.getForm();
      
      // DEBUG: Extract all field names from the PDF
      console.log('🔍 DEBUG: Extracting all field names from Federal PDF...');
      const fields = form.getFields();
      console.log('🔍 DEBUG: Total fields found:', fields.length);
      console.log('🔍 DEBUG: All field names:');
      fields.forEach((field, index) => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        console.log(`${index + 1}. "${fieldName}" (${fieldType})`);
      });
      
      // Look for specific fields we're trying to map
      console.log('🔍 DEBUG: Looking for specific fields...');
      const searchTerms = ['Agreement', 'Contractor', 'Resource', 'Incident', 'Equipment', 'Serial', 'License', 'Agency', 'Supervisor', 'Remarks'];
      const matchingFields = fields.filter(field => {
        const fieldName = field.getName();
        return searchTerms.some(term => fieldName.includes(term));
      });
      
      if (matchingFields.length > 0) {
        console.log('🔍 DEBUG: Fields matching search terms:');
        matchingFields.forEach(field => {
          console.log(`- "${field.getName()}" (${field.constructor.name})`);
        });
      } else {
        console.log('🔍 DEBUG: No fields found matching search terms');
      }
      
      // Fill the form fields
      let filledFieldsCount = 0;
      let attemptedFieldsCount = 0;
      console.log('🔍 DEBUG: Attempting to fill fields...');
      Object.entries(pdfFields).forEach(([fieldName, value]) => {
        attemptedFieldsCount++;
        console.log(`🔍 DEBUG: Attempting field "${fieldName}" with value "${value}"`);
        
        // Special debugging for time-related fields
        if (fieldName.includes('DateRow') || fieldName.includes('StartRow') || fieldName.includes('StopRow') || fieldName.includes('TotalRow')) {
          console.log(`🔍 DEBUG: TIME FIELD - ${fieldName} = "${value}"`);
        }
        
        try {
          const field = form.getField(fieldName);
          if (field) {
            console.log(`🔍 DEBUG: Field "${fieldName}" found, type: ${field.constructor.name}`);
            // More robust field type detection that works in production builds
            const hasSetText = typeof (field as any).setText === 'function';
            const hasCheck = typeof (field as any).check === 'function';
            const hasSelect = typeof (field as any).select === 'function';
            const hasSetValue = typeof (field as any).setValue === 'function';
            
            if (hasSetText) {
              // Text field
              (field as any).setText(value);
              filledFieldsCount++;
              console.log(`Federal: Filled text field ${fieldName} with value: ${value}`);
            } else if (hasCheck) {
              // Checkbox field
              if (value === 'Yes' || value === 'On' || value === 'YES' || value === 'HOURS') {
                (field as any).check();
              } else {
                (field as any).uncheck();
              }
              filledFieldsCount++;
              console.log(`Federal: Filled checkbox ${fieldName} with value: ${value}`);
            } else if (hasSelect) {
              // Dropdown field
              (field as any).select(value);
              filledFieldsCount++;
              console.log(`Federal: Filled dropdown ${fieldName} with value: ${value}`);
            } else if (hasSetValue) {
              // Generic field with setValue method
              (field as any).setValue(value);
              filledFieldsCount++;
              console.log(`Federal: Filled field ${fieldName} with value: ${value} using setValue`);
            } else {
              // Try to set the field value directly
              try {
                (field as any).value = value;
                filledFieldsCount++;
                console.log(`Federal: Filled field ${fieldName} with value: ${value} using direct assignment`);
              } catch (directError) {
                console.warn(`Federal: Field ${fieldName} found but no suitable method available. Available methods: ${Object.getOwnPropertyNames(field).join(', ')}`);
              }
            }
          } else {
            console.warn(`Federal: Field ${fieldName} not found in PDF`);
            // Special debugging for missing fields
            if (fieldName.includes('Agency_Representative') || fieldName.includes('Incident_Supervisor')) {
              console.error(`Federal: DEBUG - Field ${fieldName} NOT FOUND in PDF! This field may not exist.`);
            }
          }
        } catch (error) {
          console.error(`Federal: Error filling field ${fieldName}:`, error);
        }
      });
      
      console.log(`Federal: Successfully filled ${filledFieldsCount} fields out of ${attemptedFieldsCount} attempted`);

      // Note: Removed form.flatten() due to PDF-lib compatibility issues
      // The form will remain editable, which is fine for our use case

      // Save the filled PDF
      const pdfBytes = await pdfDoc.save();
      const filledPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Store the filled PDF
      await storePDFWithId('federal-form', filledPdfBlob, null, {
        filename: 'OF297-24-filled.pdf',
        date: new Date().toISOString(),
        crewNumber: federalFormData.agreementNumber || 'N/A',
        fireName: federalFormData.incidentName || 'N/A',
        fireNumber: federalFormData.incidentNumber || 'N/A'
      });

      console.log('Federal: PDF filled successfully, navigating to signing page...');
      
      // Navigate to PDF signing page with parameters
      const params = new URLSearchParams({
        pdfId: 'federal-form',
        crewNumber: federalFormData.agreementNumber || 'N/A',
        fireName: federalFormData.incidentName || 'N/A',
        fireNumber: federalFormData.incidentNumber || 'N/A',
        date: currentSelectedDate || formatToMMDDYY(new Date())
      });
      
      navigate(`/pdf-signing?${params.toString()}`);
      
    } catch (error) {
      console.error('Federal: Error filling PDF:', error);
      alert('Error filling PDF. Please check the console for details.');
    }
  };


  // Load stored PDFs from IndexedDB (filtered by current date)
  const loadStoredPDFs = async () => {
    try {
      console.log('🔍 Loading stored PDFs...');
      const pdfs = await listPDFs();
      console.log('🔍 All PDFs from IndexedDB:', pdfs);
      
      // Filter for Federal PDFs only
      const federalPDFs = pdfs.filter(pdf => pdf.id.startsWith('federal-signed-'));
      console.log('🔍 Federal PDFs:', federalPDFs);
      
      // Get current selected date
      const currentDate = currentSelectedDate || formatToMMDDYY(new Date());
      console.log('🔍 Current selected date:', currentDate);
      
      // Filter PDFs by current date
      const dateFilteredPDFs = federalPDFs.filter(pdf => {
        console.log('🔍 Comparing PDF date:', pdf.metadata.date, 'with current date:', currentDate);
        // Check if the PDF's date matches the current selected date
        return pdf.metadata.date === currentDate;
      });
      
      console.log('🔍 Date filtered PDFs:', dateFilteredPDFs);
      setStoredPDFs(dateFilteredPDFs);
      console.log(`Loaded stored Federal PDFs for date ${currentDate}:`, dateFilteredPDFs.length);
    } catch (error) {
      console.error('Error loading stored PDFs:', error);
    }
  };

  // Handle PDF preview
  const handlePreviewPDF = async (pdfId: string) => {
    try {
      const pdfData = await getPDF(pdfId);
      if (pdfData) {
        setPreviewPDF(pdfData);
        setShowPDFPreview(true);
      } else {
        alert('PDF not found in storage.');
      }
    } catch (error) {
      console.error('Error loading PDF for preview:', error);
      alert('Error loading PDF for preview.');
    }
  };

  // Close PDF preview
  const handleClosePDFPreview = () => {
    setShowPDFPreview(false);
    setPreviewPDF(null);
  };

  // Apply payload data to form
  const applyPayloadToForm = async (payload: FederalPayload) => {
    console.log('Applying payload to form:', payload);
    
    // Apply form data with individual state updates to ensure they take effect
    if (payload.agreementNumber) {
      console.log('Setting agreementNumber:', payload.agreementNumber);
      setFederalFormData(prev => ({ ...prev, agreementNumber: payload.agreementNumber! }));
    }
    if (payload.contractorAgencyName) {
      console.log('Setting contractorAgencyName:', payload.contractorAgencyName);
      setFederalFormData(prev => ({ ...prev, contractorAgencyName: payload.contractorAgencyName! }));
    }
    if (payload.resourceOrderNumber) {
      console.log('Setting resourceOrderNumber:', payload.resourceOrderNumber);
      setFederalFormData(prev => ({ ...prev, resourceOrderNumber: payload.resourceOrderNumber! }));
    }
    if (payload.incidentName) {
      console.log('Setting incidentName:', payload.incidentName);
      setFederalFormData(prev => ({ ...prev, incidentName: payload.incidentName! }));
    }
    if (payload.incidentNumber) {
      console.log('Setting incidentNumber:', payload.incidentNumber);
      setFederalFormData(prev => ({ ...prev, incidentNumber: payload.incidentNumber! }));
    }
    if (payload.financialCode) {
      console.log('Setting financialCode:', payload.financialCode);
      setFederalFormData(prev => ({ ...prev, financialCode: payload.financialCode! }));
    }
    if (payload.equipmentMakeModel) {
      console.log('Setting equipmentMakeModel:', payload.equipmentMakeModel);
      setFederalFormData(prev => ({ ...prev, equipmentMakeModel: payload.equipmentMakeModel! }));
    }
    if (payload.equipmentType) {
      console.log('Setting equipmentType:', payload.equipmentType);
      setFederalFormData(prev => ({ ...prev, equipmentType: payload.equipmentType! }));
    }
    if (payload.serialVinNumber) {
      console.log('Setting serialVinNumber:', payload.serialVinNumber);
      setFederalFormData(prev => ({ ...prev, serialVinNumber: payload.serialVinNumber! }));
    }
    if (payload.licenseIdNumber) {
      console.log('Setting licenseIdNumber:', payload.licenseIdNumber);
      setFederalFormData(prev => ({ ...prev, licenseIdNumber: payload.licenseIdNumber! }));
    }
    if (payload.transportRetained) {
      console.log('Setting transportRetained:', payload.transportRetained);
      setFederalFormData(prev => ({ ...prev, transportRetained: payload.transportRetained! }));
    }
    if (payload.isFirstLastTicket) {
      console.log('Setting isFirstLastTicket:', payload.isFirstLastTicket);
      setFederalFormData(prev => ({ ...prev, isFirstLastTicket: payload.isFirstLastTicket! }));
    }
    if (payload.rateType) {
      console.log('Setting rateType:', payload.rateType);
      setFederalFormData(prev => ({ ...prev, rateType: payload.rateType! }));
    }
    if (payload.agencyRepresentative) {
      console.log('Setting agencyRepresentative:', payload.agencyRepresentative);
      setFederalFormData(prev => ({ ...prev, agencyRepresentative: payload.agencyRepresentative! }));
    }
    if (payload.incidentSupervisor) {
      console.log('Setting incidentSupervisor:', payload.incidentSupervisor);
      setFederalFormData(prev => ({ ...prev, incidentSupervisor: payload.incidentSupervisor! }));
    }
    if (payload.remarks) {
      console.log('Setting remarks:', payload.remarks);
      setFederalFormData(prev => ({ ...prev, remarks: payload.remarks! }));
    }
    
    // Apply checkbox states
    if (payload.noMealsLodging !== undefined) {
      console.log('Setting noMealsLodging:', payload.noMealsLodging);
      setCheckboxStates(prev => ({ ...prev, noMealsLodging: payload.noMealsLodging! }));
    }
    if (payload.noMeals !== undefined) {
      console.log('Setting noMeals:', payload.noMeals);
      setCheckboxStates(prev => ({ ...prev, noMeals: payload.noMeals! }));
    }
    if (payload.travel !== undefined) {
      console.log('Setting travel:', payload.travel);
      setCheckboxStates(prev => ({ ...prev, travel: payload.travel! }));
    }
    if (payload.noLunch !== undefined) {
      console.log('Setting noLunch:', payload.noLunch);
      setCheckboxStates(prev => ({ ...prev, noLunch: payload.noLunch! }));
    }
    if (payload.hotline !== undefined) {
      console.log('Setting hotline:', payload.hotline);
      setCheckboxStates(prev => ({ ...prev, hotline: payload.hotline! }));
    }
    
    // Apply date
    if (payload.date) {
      console.log('Setting date:', payload.date);
      setCurrentSelectedDate(payload.date);
    }
    
    // Apply equipment entries
    if (payload.equipmentEntries && payload.equipmentEntries.length > 0) {
      console.log('Setting equipment entries:', payload.equipmentEntries);
      const equipmentEntries = payload.equipmentEntries.map(entry => ({
        date: entry.date || '',
        start: entry.start || '',
        stop: entry.stop || '',
        start1: entry.start1 || '',
        stop1: entry.stop1 || '',
        start2: entry.start2 || '',
        stop2: entry.stop2 || '',
        total: entry.total || '',
        quantity: entry.quantity || '',
        type: entry.type || '',
        remarks: entry.remarks || ''
      }));
      console.log('Mapped equipment entries:', equipmentEntries);
      setEquipmentEntries(equipmentEntries);
    }
    
    // Apply personnel entries
    if (payload.personnelEntries && payload.personnelEntries.length > 0) {
      console.log('Setting personnel entries:', payload.personnelEntries);
      const personnelEntries = payload.personnelEntries.map(entry => ({
        date: entry.date || '',
        name: entry.name || '',
        start1: entry.start1 || '',
        stop1: entry.stop1 || '',
        start2: entry.start2 || '',
        stop2: entry.stop2 || '',
        total: entry.total || '',
        remarks: entry.remarks || ''
      }));
      console.log('Mapped personnel entries:', personnelEntries);
      setPersonnelEntries(personnelEntries);
      
      // Save personnel entries to IndexedDB
      for (const entry of personnelEntries) {
        await saveFederalPersonnelEntry(entry);
      }
    }
    
    // Save equipment entries to IndexedDB
    if (payload.equipmentEntries && payload.equipmentEntries.length > 0) {
      const equipmentEntries = payload.equipmentEntries.map(entry => ({
        date: entry.date || '',
        start: entry.start || '',
        stop: entry.stop || '',
        start1: entry.start1 || '',
        stop1: entry.stop1 || '',
        start2: entry.start2 || '',
        stop2: entry.stop2 || '',
        total: entry.total || '',
        quantity: entry.quantity || '',
        type: entry.type || '',
        remarks: entry.remarks || ''
      }));
      
      for (const entry of equipmentEntries) {
        await saveFederalEquipmentEntry(entry);
      }
    }
    
    console.log('Payload applied successfully');
  };

  // Debug function to check original PDF from public folder
  const debugOriginalPDF = async () => {
    try {
      console.log('🔍 DEBUG: Checking original PDF from public folder...');
      const response = await fetch('/OF297-24.pdf');
      if (!response.ok) {
        console.error('Failed to fetch original PDF:', response.status);
        alert('Failed to fetch original PDF from public folder.');
        return;
      }

      const pdfBlob = await response.blob();
      console.log('🔍 DEBUG: Original PDF fetched:', {
        size: pdfBlob.size,
        type: pdfBlob.type
      });

      const pdfDoc = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
      console.log('🔍 DEBUG: Original PDF loaded:', {
        pageCount: pdfDoc.getPageCount(),
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor()
      });

      const form = pdfDoc.getForm();
      
      // Check if this is an XFA form
      try {
        const formType = (form as any).getFormType?.();
        console.log('🔍 DEBUG: Original PDF form type:', formType);
        if (formType === 'XFA') {
          console.log('🔍 DEBUG: Original PDF is also XFA format!');
          alert('The original PDF is also in XFA format.\n\nYou need to convert it to AcroForm format in Adobe Acrobat:\n1. Open PDF in Acrobat\n2. Tools → Prepare Form\n3. More → Convert to AcroForm\n4. Save the PDF');
          return;
        }
      } catch (error) {
        console.log('🔍 DEBUG: Could not determine original PDF form type:', error);
      }
      
      const fields = form.getFields();
      console.log('🔍 DEBUG: Original PDF fields found:', fields.length);
      if (fields.length > 0) {
        console.log('🔍 DEBUG: Original PDF field names:');
        fields.forEach((field, index) => {
          const fieldName = field.getName();
          const fieldType = field.constructor.name;
          console.log(`${index + 1}. "${fieldName}" (${fieldType})`);
        });
        alert(`Original PDF has ${fields.length} form fields!\n\nThis means your resized PDF lost its form fields.\nCheck console for field names.`);
      } else {
        alert('Original PDF also has no form fields. This is unexpected.');
      }
      
    } catch (error) {
      console.error('Error checking original PDF:', error);
      alert('Error checking original PDF. Check console for details.');
    }
  };

  // Debug function to extract PDF field names
  const debugPDFFields = async () => {
    try {
      console.log('🔍 DEBUG: Starting PDF field extraction...');
      const storedPDF = await getPDF('federal-form');
      if (!storedPDF) {
        console.error('Federal: No PDF found in storage');
        alert('PDF not found. Please try again.');
        return;
      }

      console.log('🔍 DEBUG: PDF found in storage:', {
        id: storedPDF.id,
        filename: storedPDF.metadata.filename,
        size: storedPDF.pdf.size,
        type: storedPDF.pdf.type
      });

      const pdfDoc = await PDFLib.PDFDocument.load(await storedPDF.pdf.arrayBuffer());
      console.log('🔍 DEBUG: PDF loaded successfully:', {
        pageCount: pdfDoc.getPageCount(),
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject()
      });

      const form = pdfDoc.getForm();
      console.log('🔍 DEBUG: Form object created:', form);
      
      // Check if this is an XFA form
      try {
        const formType = (form as any).getFormType?.();
        console.log('🔍 DEBUG: Form type:', formType);
        if (formType === 'XFA') {
          console.log('🔍 DEBUG: This is an XFA form! PDF-lib cannot handle XFA forms.');
          alert('This PDF is in XFA format, which PDF-lib cannot handle.\n\nYou need to convert it to AcroForm format in Adobe Acrobat:\n1. Open PDF in Acrobat\n2. Tools → Prepare Form\n3. More → Convert to AcroForm\n4. Save the PDF');
          return;
        }
      } catch (error) {
        console.log('🔍 DEBUG: Could not determine form type:', error);
      }
      
      const fields = form.getFields();
      console.log('🔍 DEBUG: Fields array:', fields);
      console.log('🔍 DEBUG: Total fields found:', fields.length);
      
      if (fields.length === 0) {
        console.log('🔍 DEBUG: No form fields found. This could mean:');
        console.log('1. The PDF has no form fields (static PDF)');
        console.log('2. The PDF was flattened during resizing');
        console.log('3. The PDF is corrupted');
        
        // Try to get more info about the PDF structure
        const pages = pdfDoc.getPages();
        console.log('🔍 DEBUG: PDF pages:', pages.length);
        pages.forEach((page, index) => {
          console.log(`Page ${index + 1}:`, {
            width: page.getWidth(),
            height: page.getHeight(),
            rotation: page.getRotation()
          });
        });
        
        alert(`No form fields found in PDF!\n\nThis usually means:\n1. PDF has no form fields (static PDF)\n2. PDF was flattened during resizing\n3. PDF is corrupted\n\nCheck console for more details.`);
        return;
      }
      
      console.log('🔍 DEBUG: All field names:');
      fields.forEach((field, index) => {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        console.log(`${index + 1}. "${fieldName}" (${fieldType})`);
      });
      
      // Also log to alert for easy copying
      const fieldNames = fields.map(field => field.getName()).join('\n');
      alert(`Found ${fields.length} fields. Check console for details.\n\nFirst 10 fields:\n${fieldNames.split('\n').slice(0, 10).join('\n')}`);
      
    } catch (error) {
      console.error('Error extracting PDF fields:', error);
      alert('Error extracting PDF fields. Check console for details.');
    }
  };

  // Generate shareable link
  const generateShareableLink = () => {
    const baseURL = window.location.origin + window.location.pathname;
    const shareableLink = createShareableLink(
      baseURL,
      federalFormData,
      checkboxStates,
      equipmentEntries,
      personnelEntries,
      currentSelectedDate
    );
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert('Shareable link copied to clipboard!');
    }).catch(() => {
      // Fallback: show the link in a prompt
      prompt('Shareable link (copy this):', shareableLink);
    });
  };


  // Main calendar handlers
  const handleMainCalendarOpen = () => {
    setShowMainCalendar(true);
  };

  const handleMainCalendarClose = () => {
    setShowMainCalendar(false);
  };

  const handleMainDateSelect = async (dateRange: string) => {
    // First, save the current data before switching dates
    if (currentSelectedDate && currentSelectedDate !== dateRange) {
      await saveDataForDate();
    }
    
    setCurrentSelectedDate(dateRange);
    setShowMainCalendar(false);
    // Load data for the selected date
    await loadDataForDate(dateRange);
  };

  // Utility function to convert MM/DD/YY to Date object
  const parseMMDDYY = (dateStr: string): Date => {
    const [month, day, year] = dateStr.split('/');
    const fullYear = 2000 + parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  };

  // Utility function to convert Date to MM/DD/YY format
  const formatToMMDDYY = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  // Next Day handlers
  const handleNextDay = async () => {
    try {
      // Get the current date from the selected date or first equipment entry, or use today's date
      let currentDate = new Date();
      if (currentSelectedDate) {
        // Check if currentSelectedDate is in MM/DD/YY format
        if (currentSelectedDate.includes('/')) {
          currentDate = parseMMDDYY(currentSelectedDate);
        } else {
          currentDate = new Date(currentSelectedDate);
        }
      } else if (equipmentEntries.length > 0 && equipmentEntries[0].date) {
        if (equipmentEntries[0].date.includes('/')) {
          currentDate = parseMMDDYY(equipmentEntries[0].date);
        } else {
          currentDate = new Date(equipmentEntries[0].date);
        }
      }
      
      // Add one day
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Convert to MM/DD/YY format to maintain consistency
      const nextDateString = formatToMMDDYY(nextDate);
      
      // First, save the current data for the current selected date
      await saveDataForDate();
      
      // Copy all current data to the next day
      await copyDataToNextDay(nextDateString);
      
      // Set the new date as current and load it
      setCurrentSelectedDate(nextDateString);
      await loadDataForDate(nextDateString);
      
      console.log('Data saved for current date and copied to next day:', nextDateString);
    } catch (error) {
      console.error('Error creating next day:', error);
    }
  };

  const copyDataToNextDay = async (nextDateString: string) => {
    try {
      // Copy form data (it's a singleton, so we keep the same form data)
      // The form data doesn't need to be copied as it's shared across dates
      
      // Get all existing entries for the next day to clear them first
      const allEquipmentEntries = await loadAllFederalEquipmentEntries();
      const allPersonnelEntries = await loadAllFederalPersonnelEntries();
      
      // Clear existing entries for the next day
      const existingEquipmentForNextDay = allEquipmentEntries.filter(entry => entry.date === nextDateString);
      const existingPersonnelForNextDay = allPersonnelEntries.filter(entry => entry.date === nextDateString);
      
      // Delete existing entries for the next day
      for (const entry of existingEquipmentForNextDay) {
        if (entry.id) {
          await deleteFederalEquipmentEntry(entry.id);
        }
      }
      
      for (const entry of existingPersonnelForNextDay) {
        if (entry.id) {
          await deleteFederalPersonnelEntry(entry.id);
        }
      }
      
      // Copy equipment entries with one-to-one mapping
      const newEquipmentEntries = equipmentEntries.map(entry => ({
        ...entry,
        id: undefined, // Remove ID so it creates a new entry
        date: nextDateString
      }));
      
      // Copy personnel entries with one-to-one mapping
      const newPersonnelEntries = personnelEntries.map(entry => ({
        ...entry,
        id: undefined, // Remove ID so it creates a new entry
        date: nextDateString
      }));
      
      // Save the new entries in order (maintaining one-to-one mapping)
      for (const entry of newEquipmentEntries) {
        if (entry.date || entry.start || entry.stop || entry.total || entry.quantity || entry.type || entry.remarks) {
          await saveFederalEquipmentEntry(entry);
        }
      }
      
      for (const entry of newPersonnelEntries) {
        if (entry.date || entry.name || entry.start1 || entry.stop1 || entry.start2 || entry.stop2 || entry.total || entry.remarks) {
          await saveFederalPersonnelEntry(entry);
        }
      }
      
      // Refresh the saved dates list
      await refreshSavedDates();
      
      console.log('Data copied to next day with one-to-one mapping successfully');
    } catch (error) {
      console.error('Error copying data to next day:', error);
    }
  };

  const loadDataForDate = async (dateRange: string) => {
    try {
      console.log('🔍 Loading data for date range:', dateRange);
      
      // Load form data (singleton)
      const formData = await loadFederalFormData();
      if (formData) {
        setFederalFormData(formData);
        
        // Load checkbox states from form data
        if (formData.checkboxStates) {
          setCheckboxStates(formData.checkboxStates);
          console.log('Loaded checkbox states for date:', dateRange, formData.checkboxStates);
        }
      }

      // Load equipment entries for the specific date
      const allEquipmentEntries = await loadAllFederalEquipmentEntries();
      console.log('🔍 All equipment entries from IndexedDB:', allEquipmentEntries);
      const dateEquipmentEntries = allEquipmentEntries.filter(entry => entry.date === dateRange);
      console.log('🔍 Filtered equipment entries for date', dateRange, ':', dateEquipmentEntries);
      
      // If no equipment entries exist for this date, create a default entry with preset times
      if (dateEquipmentEntries.length === 0) {
        const defaultEquipmentEntry: FederalEquipmentEntry = {
          date: dateRange,
          start: '', // Legacy field
          stop: '', // Legacy field
          start1: '0700', // Default start time 1
          stop1: '1200',  // Default stop time 1
          start2: '1230', // Default start time 2
          stop2: '1900',  // Default stop time 2
          total: '', // Will be calculated automatically
          quantity: '',
          type: '',
          remarks: ''
        };
        console.log('🔍 Created default equipment entry with preset times:', defaultEquipmentEntry);
        setEquipmentEntries([defaultEquipmentEntry]);
      } else {
        setEquipmentEntries(dateEquipmentEntries);
      }

      // Load personnel entries for the specific date
      const allPersonnelEntries = await loadAllFederalPersonnelEntries();
      console.log('🔍 All personnel entries from IndexedDB:', allPersonnelEntries);
      const datePersonnelEntries = allPersonnelEntries.filter(entry => entry.date === dateRange);
      console.log('🔍 Filtered personnel entries for date', dateRange, ':', datePersonnelEntries);
      
      // If no personnel entries exist for this date, create a default entry with preset times
      if (datePersonnelEntries.length === 0) {
        const defaultPersonnelEntry: FederalPersonnelEntry = {
          date: dateRange,
          name: '',
          start1: '0700', // Default start time 1
          stop1: '1200',  // Default stop time 1
          start2: '1230', // Default start time 2
          stop2: '1900',  // Default stop time 2
          total: '', // Will be calculated automatically
          remarks: ''
        };
        console.log('🔍 Created default personnel entry with preset times:', defaultPersonnelEntry);
        setPersonnelEntries([defaultPersonnelEntry]);
      } else {
        setPersonnelEntries(datePersonnelEntries);
      }
    } catch (error) {
      console.error('Error loading data for date:', error);
    }
  };

  const refreshSavedDates = async () => {
    try {
      // Load all equipment and personnel entries to get all dates
      const allEquipmentEntries = await loadAllFederalEquipmentEntries();
      const allPersonnelEntries = await loadAllFederalPersonnelEntries();
      
      // Collect all unique dates
      const allDates = new Set<string>();
      allEquipmentEntries.forEach(entry => entry.date && allDates.add(entry.date));
      allPersonnelEntries.forEach(entry => entry.date && allDates.add(entry.date));
      
      setSavedDates(Array.from(allDates));
      console.log('Refreshed saved dates:', Array.from(allDates));
    } catch (error) {
      console.error('Error refreshing saved dates:', error);
    }
  };

  const saveDataForDate = async () => {
    try {
      // Ensure we have a date to save to
      const dateToSave = currentSelectedDate || formatToMMDDYY(new Date());
      
      console.log('Saving data for date:', dateToSave);
      console.log('Equipment entries to save:', equipmentEntries.length);
      console.log('Personnel entries to save:', personnelEntries.length);
      console.log('Current selected date:', currentSelectedDate);
      console.log('Equipment entries:', equipmentEntries);
      console.log('Personnel entries:', personnelEntries);
      
      // Save current form data
      await saveFederalFormData(federalFormData);
      
      // Save equipment entries - only save entries that belong to the current date
      for (const entry of equipmentEntries) {
        // Only save entries that match the current selected date
        if (entry.date === dateToSave) {
          await saveFederalEquipmentEntry(entry);
          console.log('Saved equipment entry for date:', dateToSave, 'with content:', {
            start: entry.start,
            stop: entry.stop,
            total: entry.total,
            quantity: entry.quantity,
            type: entry.type,
            remarks: entry.remarks
          });
        } else {
          console.log('Skipped equipment entry - different date:', entry.date, 'vs', dateToSave);
        }
      }
      
      // Save personnel entries - only save entries that belong to the current date
      for (const entry of personnelEntries) {
        // Only save entries that match the current selected date
        if (entry.date === dateToSave) {
          await saveFederalPersonnelEntry(entry);
          console.log('Saved personnel entry for date:', dateToSave, 'with content:', {
            name: entry.name,
            start1: entry.start1,
            stop1: entry.stop1,
            start2: entry.start2,
            stop2: entry.stop2,
            total: entry.total,
            remarks: entry.remarks
          });
        } else {
          console.log('Skipped personnel entry - different date:', entry.date, 'vs', dateToSave);
        }
      }
      
      // Refresh the saved dates list
      await refreshSavedDates();
      
      console.log('Data saved for date:', dateToSave);
    } catch (error) {
      console.error('Error saving data for date:', error);
    }
  };

  return (
    <>
      <style>{`
        .preview-overlay {
          opacity: 0 !important;
        }
        div:hover .preview-overlay {
          opacity: 1 !important;
        }
      `}</style>

    <div style={{ 
      width: '100vw',
      maxWidth: '100vw',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '16px',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)'
    }}>
      {/* Main Container */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: '#ffffff',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            lineHeight: '1.2'
          }}>
            Federal - Emergency Equipment Shift Ticket
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            opacity: 0.9,
            lineHeight: '1.4'
          }}>
            OF-297 (Rev. 10/24) - Emergency Equipment Shift Ticket
          </p>
        </div>

        {/* Calendar Header */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px 20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={handleMainCalendarOpen}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              📅 Previous Tickets
            </button>
            
            <button
              onClick={handleNextDay}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              ➡️ Next Day
            </button>
            
            {currentSelectedDate && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #bbdefb'
              }}>
                Selected: {currentSelectedDate}
              </div>
            )}
          </div>
          
        </div>

        {/* Form Content Container */}
        <div style={{
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          
          {/* Basic Information Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px'
          }}>            
            {/* Row 1: Agreement Number & Contractor/Agency Name */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50% 50%',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  1. Agreement Number
                </label>
                <input
                  type="text"
                  value={federalFormData.agreementNumber}
                  onChange={e => handleFederalFormChange('agreementNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter agreement number"
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  2. Contractor/Agency Name
                </label>
                <input
                  type="text"
                  value={federalFormData.contractorAgencyName}
                  onChange={e => handleFederalFormChange('contractorAgencyName', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter contractor/agency name"
                />
              </div>
            </div>

            {/* Row 2: E-Number & Incident Name */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50% 50%',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  3. E-Number
                </label>
                <input
                  type="text"
                  value={federalFormData.resourceOrderNumber}
                  onChange={e => handleFederalFormChange('resourceOrderNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter resource order number"
                />
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  4. Incident Name
                </label>
                <input
                  type="text"
                  value={federalFormData.incidentName}
                  onChange={e => handleFederalFormChange('incidentName', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter incident name"
                />
              </div>
            </div>
            
            {/* Row 3: Incident Number (full width) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                5. Incident Number
              </label>
              <input
                type="text"
                value={federalFormData.incidentNumber}
                onChange={e => handleFederalFormChange('incidentNumber', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter incident number"
              />
            </div>
            
            {/* Financial Code */}
            <div style={{
              display: 'none',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                6. Financial Code
              </label>
              <input
                type="text"
                value={federalFormData.financialCode}
                onChange={e => handleFederalFormChange('financialCode', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter financial code"
              />
            </div>
          </div>

          {/* Equipment Information Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Row 1: Equipment Make/Model & Equipment Type */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50% 50%',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  7. Equipment Model
                </label>
                <input
                  type="text"
                  value={federalFormData.equipmentMakeModel}
                  onChange={e => handleFederalFormChange('equipmentMakeModel', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter make/model"
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  8. Equipment Type
                </label>
                <input
                  type="text"
                  value={federalFormData.equipmentType}
                  onChange={e => handleFederalFormChange('equipmentType', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter equipment type"
                />
              </div>
            </div>
            
            {/* Row 2: Serial/VIN Number & License Plate */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50% 50%',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  9. VIN Number
                </label>
                <input
                  type="text"
                  value={federalFormData.serialVinNumber}
                  onChange={e => handleFederalFormChange('serialVinNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter serial/VIN"
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  10. License Plate
                </label>
                <input
                  type="text"
                  value={federalFormData.licenseIdNumber}
                  onChange={e => handleFederalFormChange('licenseIdNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter license/ID"
                />
              </div>
            </div>

            {/* Transport Retained */}
            <div style={{
              display: 'none',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                12. Transport Retained?
              </label>
              <select
                value={federalFormData.transportRetained}
                onChange={e => handleFederalFormChange('transportRetained', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
              >
                <option value="">Select...</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </div>
            
            {/* First/Last Ticket */}
            <div style={{
              display: 'none',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                13. First/Last Ticket?
              </label>
              <select
                value={federalFormData.isFirstLastTicket}
                onChange={e => handleFederalFormChange('isFirstLastTicket', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
              >
                <option value="Neither">Neither</option>
                <option value="Mobilization">Mobilization</option>
                <option value="Demobilization">Demobilization</option>
              </select>
            </div>
            {/* Rate Type */}
            <div style={{
              display: 'none',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                14. Rate Type
              </label>
              <select
                value={federalFormData.rateType}
                onChange={e => handleFederalFormChange('rateType', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
              >
                <option value="HOURS">Hours</option>
              </select>
            </div>
            {/* Agency Representative */}
            <div style={{
              display: 'none',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                31. Contractor/Agency Representative
              </label>
              <input
                type="text"
                value={federalFormData.agencyRepresentative}
                onChange={e => handleFederalFormChange('agencyRepresentative', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter agency representative name"
              />
            </div>
            {/* Incident Supervisor */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                33. Incident Supervisor
              </label>
              <input
                type="text"
                value={federalFormData.incidentSupervisor}
                onChange={e => handleFederalFormChange('incidentSupervisor', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter incident supervisor name"
              />
            </div>
          </div>

          {/* Equipment Time Entries Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '8px'
            }}>
              Equipment Time Entries
            </h3>
            
            {/* Equipment Table - Mobile Friendly */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {Array.from({ length: 1 }, (_, idx) => {
                const entry = equipmentEntries[idx] || { date: '', start: '', stop: '', start1: '', stop1: '', start2: '', stop2: '', total: '', quantity: '', type: '', remarks: '' };
                const rowColors = ['#e3f2fd'];
                return (
                  <div key={idx} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    position: 'relative'
                  }}>
                    {/* Date Badge Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      backgroundColor: rowColors[idx],
                      borderRadius: '6px',
                      border: '2px solid #e9ecef'
                    }}>
                      <div style={{
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1
                      }}>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px'
                        }}>
                          Equipment Entry
                        </label>
                                                 <div style={{
                           position: 'relative'
                         }}>
                           <div style={{
                             display: 'flex',
                             alignItems: 'center',
                             gap: '8px',
                             padding: '8px 12px',
                             border: '1px solid #ddd',
                             borderRadius: '6px',
                             backgroundColor: '#fff',
                             cursor: 'pointer'
                           }} onClick={() => handleCalendarOpen('equipment', idx)}>
                             <span style={{ fontSize: '14px', color: '#333' }}>
                               {entry.date || 'MM/DD/YY'}
                             </span>
                             <span style={{ 
                               fontSize: '16px', 
                               color: '#6c757d',
                               marginLeft: 'auto'
                             }}>
                               📅
                             </span>
                           </div>
                           {calendarOpen?.type === 'equipment' && calendarOpen?.index === idx && (
                             <CalendarPicker
                               isOpen={true}
                               onClose={handleCalendarClose}
                               onSelectDate={handleDateSelect}
                               currentDate={entry.date}
                             />
                           )}
                         </div>
                      </div>
                      
                      {/* Clear Button */}
                      <button
                        onClick={() => handleClearEquipmentEntry(idx)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          minWidth: '60px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                        title="Clear this equipment entry"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Time Fields */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          Start Time 1
                        </label>
                        <input
                          type="text"
                          value={entry.start1}
                          onChange={e => handleTimeInput(idx, 'start1', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-start1`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="0700"
                        />
                        {timeValidationErrors[`equipment-${idx}-start1`] && (
                          <div style={{
                            fontSize: '12px',
                            color: '#dc3545',
                            marginTop: '4px'
                          }}>
                            {timeValidationErrors[`equipment-${idx}-start1`]}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          Stop Time 1
                        </label>
                        <input
                          type="text"
                          value={entry.stop1}
                          onChange={e => handleTimeInput(idx, 'stop1', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-stop1`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="1200"
                        />
                        {timeValidationErrors[`equipment-${idx}-stop`] && (
                          <div style={{
                            fontSize: '12px',
                            color: '#dc3545',
                            marginTop: '4px'
                          }}>
                            {timeValidationErrors[`equipment-${idx}-stop`]}
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          Start Time 2
                        </label>
                        <input
                          type="text"
                          value={entry.start2}
                          onChange={e => handleTimeInput(idx, 'start2', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-start2`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="1230"
                        />
                        {timeValidationErrors[`equipment-${idx}-start`] && (
                          <div style={{
                            fontSize: '12px',
                            color: '#dc3545',
                            marginTop: '4px'
                          }}>
                            {timeValidationErrors[`equipment-${idx}-start`]}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          Stop Time 2
                        </label>
                        <input
                          type="text"
                          value={entry.stop2}
                          onChange={e => handleTimeInput(idx, 'stop2', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-stop2`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="1900"
                        />
                        {timeValidationErrors[`equipment-${idx}-stop`] && (
                          <div style={{
                            fontSize: '12px',
                            color: '#dc3545',
                            marginTop: '4px'
                          }}>
                            {timeValidationErrors[`equipment-${idx}-stop`]}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Total, Quantity, Type */}
                    <div style={{
                      display: 'none',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Total
                        </label>
                        <input
                          type="text"
                          value={entry.total}
                          onChange={e => handleEquipmentEntryChange(idx, 'total', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="Total"
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Quantity
                        </label>
                        <input
                          type="text"
                          value={entry.quantity}
                          onChange={e => handleEquipmentEntryChange(idx, 'quantity', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="Qty"
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Type
                        </label>
                        <input
                          type="text"
                          value={entry.type}
                          onChange={e => handleEquipmentEntryChange(idx, 'type', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="Type"
                        />
                      </div>
                    </div>
                    
                    {/* Remarks */}
                    <div>
                    <div style={{
                      display: 'none',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={entry.remarks}
                        onChange={e => handleEquipmentEntryChange(idx, 'remarks', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '16px',
                          backgroundColor: '#fff',
                          color: '#333'
                        }}
                        placeholder="Remarks"
                      />
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personnel Time Entries Section */}          
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {Array.from({ length: 3 }, (_, idx) => {
                const entry = personnelEntries[idx] || { date: '', name: '', start1: '', stop1: '', start2: '', stop2: '', total: '', remarks: '' };
                const rowColors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0'];
                return (
                  <div key={idx} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    position: 'relative'
                  }}>
                    {/* Date Badge Header */}
                    {}
                    <div style={{
                      display: 'none',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '8px 12px',
                      backgroundColor: rowColors[idx],
                      borderRadius: '6px',
                      border: '2px solid #e9ecef'
                    }}>
                      <div style={{
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1
                      }}>
                      
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px'
                        }}>
                        </label>
                        {idx === 0 ? (
                          // First entry - show date picker
                          
                          <div style={{
                            position: 'relative'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              backgroundColor: '#fff',
                              cursor: 'pointer'
                            }} onClick={() => handleCalendarOpen('personnel', idx)}>
                              <span style={{ fontSize: '14px', color: '#333' }}>
                                {entry.date || 'MM/DD/YY'}
                              </span>
                              <span style={{ 
                                fontSize: '16px', 
                                color: '#6c757d',
                                marginLeft: 'auto'
                              }}>
                                📅
                              </span>
                            </div>
                            {calendarOpen?.type === 'personnel' && calendarOpen?.index === idx && (
                              <CalendarPicker
                                isOpen={true}
                                onClose={handleCalendarClose}
                                onSelectDate={handleDateSelect}
                                currentDate={entry.date}
                              />
                            )}
                          </div>
                        ) : (
                          // Other entries - show read-only date (will be propagated)
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa',
                            cursor: 'default'
                          }}>
                            <span style={{ 
                              fontSize: '14px', 
                              color: entry.date ? '#333' : '#6c757d',
                              fontStyle: entry.date ? 'normal' : 'italic'
                            }}>
                              {entry.date || (entry.name && entry.name.trim() !== '' ? 'Auto-filled from first entry' : 'Enter name to auto-fill date')}
                            </span>
                            <span style={{ 
                              fontSize: '16px', 
                              color: entry.date ? '#28a745' : '#6c757d',
                              marginLeft: 'auto'
                            }}>
                              {entry.date ? '🔗' : '⏳'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Clear Button */}
                      <button
                        onClick={() => handleClearPersonnelEntry(idx)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          minWidth: '60px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                        title="Clear this personnel entry"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Name and Job Title */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr',
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={e => handlePersonnelEntryChange(idx, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={idx === 0 ? 'ENGB' : entry.remarks}
                          onChange={e => handlePersonnelEntryChange(idx, 'remarks', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: idx === 0 ? '#f8f9fa' : '#fff',
                            color: '#333'
                          }}
                          placeholder="Job Title"
                          readOnly={idx === 0}
                        />
                      </div>
                    </div>
                    
                    {/* Time Period 1 */}
                    <div style={{
                      display: 'none',
                      marginBottom: '16px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Time Period 1
                      </label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                      }}>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Start Time
                          </label>
                          <input
                            type="text"
                            value={entry.start1}
                            onChange={e => handleTimeInput(idx, 'start1', e.target.value, 'personnel')}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: `1px solid ${timeValidationErrors[`personnel-${idx}-start1`] ? '#dc3545' : '#ddd'}`,
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM (24hr)"
                          />
                          {timeValidationErrors[`personnel-${idx}-start1`] && (
                            <div style={{
                              fontSize: '12px',
                              color: '#dc3545',
                              marginTop: '4px'
                            }}>
                              {timeValidationErrors[`personnel-${idx}-start1`]}
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Stop Time
                          </label>
                          <input
                            type="text"
                            value={entry.stop1}
                            onChange={e => handleTimeInput(idx, 'stop1', e.target.value, 'personnel')}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: `1px solid ${timeValidationErrors[`personnel-${idx}-stop1`] ? '#dc3545' : '#ddd'}`,
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM (24hr)"
                          />
                          {timeValidationErrors[`personnel-${idx}-stop1`] && (
                            <div style={{
                              fontSize: '12px',
                              color: '#dc3545',
                              marginTop: '4px'
                            }}>
                              {timeValidationErrors[`personnel-${idx}-stop1`]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Period 2 */}
                    <div style={{
                      display: 'none',
                      marginBottom: '16px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2c3e50',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Time Period 2
                      </label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                      }}>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Start Time
                          </label>
                          <input
                            type="text"
                            value={entry.start2}
                            onChange={e => handleTimeInput(idx, 'start2', e.target.value, 'personnel')}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: `1px solid ${timeValidationErrors[`personnel-${idx}-start2`] ? '#dc3545' : '#ddd'}`,
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM (24hr)"
                          />
                          {timeValidationErrors[`personnel-${idx}-start2`] && (
                            <div style={{
                              fontSize: '12px',
                              color: '#dc3545',
                              marginTop: '4px'
                            }}>
                              {timeValidationErrors[`personnel-${idx}-start2`]}
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Stop Time
                          </label>
                          <input
                            type="text"
                            value={entry.stop2}
                            onChange={e => handleTimeInput(idx, 'stop2', e.target.value, 'personnel')}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: `1px solid ${timeValidationErrors[`personnel-${idx}-stop2`] ? '#dc3545' : '#ddd'}`,
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM (24hr)"
                          />
                          {timeValidationErrors[`personnel-${idx}-stop2`] && (
                            <div style={{
                              fontSize: '12px',
                              color: '#dc3545',
                              marginTop: '4px'
                            }}>
                              {timeValidationErrors[`personnel-${idx}-stop2`]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Total */}
                    <div style={{
                      display: 'none',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px'
                    }}>
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          display: 'block'
                        }}>
                          Total
                        </label>
                        <input
                          type="text"
                          value={entry.total}
                          onChange={e => handlePersonnelEntryChange(idx, 'total', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="Total"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {/* Remarks Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '8px'
            }}>
              Remarks & Status
            </h3>
            
            {/* Checkbox Options */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}>
                <input
                  type="checkbox"
                  checked={checkboxStates.noMealsLodging}
                  onChange={() => handleCheckboxChange('noMealsLodging')}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  No Meals/Lodging
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}>
                <input
                  type="checkbox"
                  checked={checkboxStates.noMeals}
                  onChange={() => handleCheckboxChange('noMeals')}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  No Meals
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}>
                <input
                  type="checkbox"
                  checked={checkboxStates.travel}
                  onChange={() => handleCheckboxChange('travel')}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  Travel
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}>
                <input
                  type="checkbox"
                  checked={checkboxStates.noLunch}
                  onChange={() => handleCheckboxChange('noLunch')}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  No Lunch
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}>
                <input
                  type="checkbox"
                  checked={checkboxStates.hotline}
                  onChange={() => handleCheckboxChange('hotline')}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>
                  Hotline
                </span>
              </label>
            </div>

            {/* General Remarks Textarea */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                General Remarks
                {/* For testing purposes, disclaimer hidden */}
                <span style={{
                  fontSize: '12px',
                  fontWeight: '400',
                  color: '#666',
                  marginLeft: '8px',
                  display: 'none'
                }}>
                  (Manual text only - checkboxes appear on PDF)
                </span>
              </label>
              <textarea
                value={federalFormData.remarks}
                onChange={e => handleFederalFormChange('remarks', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Enter any general remarks, equipment breakdown details, or other information as necessary..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Container */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e9ecef',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Status Indicator */}
          {(isSaving || hasUnsavedChanges) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: isSaving ? '#fff3cd' : '#d1ecf1',
              border: `1px solid ${isSaving ? '#ffeaa7' : '#bee5eb'}`,
              borderRadius: '6px',
              fontSize: '14px',
              color: isSaving ? '#856404' : '#0c5460'
            }}>
              {isSaving ? (
                <>
                  <span>💾</span>
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <span>⚠️</span>
                  <span>Unsaved changes</span>
                </>
              )}
            </div>
          )}
          
          {lastSaved && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#155724'
            }}>
              <span>✅</span>
              <span>Last saved: {new Date(lastSaved).toLocaleTimeString()}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleViewPDF}
              disabled={isSaving}
              style={{
                padding: '12px 24px',
                backgroundColor: isSaving ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                opacity: isSaving ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.backgroundColor = '#218838';
                }
              }}
              onMouseOut={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.backgroundColor = '#28a745';
                }
              }}
            >
              {isSaving ? '⏳ Saving...' : '✏️ Sign Ticket'}
            </button>
            
            <button
              onClick={generateShareableLink}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              🔗 Share Link
            </button>
            
             {/* Debug PDF Fields Button - temporarily visible for troubleshooting */}
             <button
               onClick={debugPDFFields}
               style={{
                 padding: '12px 24px',
                 backgroundColor: '#28a745',
                 color: 'white',
                 border: 'none',
                 borderRadius: '6px',
                 fontSize: '14px',
                 fontWeight: '600',
                 cursor: 'pointer',
                 transition: 'background-color 0.2s ease',
                 display: 'none'
               }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e7e34'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              🔍 Debug PDF Fields
            </button>
            
            {/* Debug Original PDF Button, hidden for now */}
            <button
              onClick={debugOriginalPDF}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
            >
              🔍 Check Original PDF
            </button>
          </div>

          {/* Stored PDFs Section */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                📄 Stored PDF for {currentSelectedDate || formatToMMDDYY(new Date())} ({storedPDFs.length > 0 ? '1' : '0'})
              </h3>
              <button
                onClick={loadStoredPDFs}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                🔄 Refresh
              </button>
        </div>
            
            {storedPDFs.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '12px'
              }}>
                {storedPDFs.map((pdf) => (
                  <div 
                    key={pdf.id} 
                    onClick={() => handlePreviewPDF(pdf.id)}
                    style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#007bff';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#dee2e6';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px'
                        }}>
                          {pdf.metadata.filename}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          marginBottom: '2px'
                        }}>
                          Date: {pdf.metadata.date}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6c757d'
                        }}>
                          Incident: {pdf.metadata.fireName}
                        </div>
                      </div>
                      {pdf.preview && (
                        <div style={{
                          width: '60px',
                          height: '40px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          border: '1px solid #dee2e6',
                          overflow: 'hidden',
                          marginLeft: '8px'
                        }}>
                          <img
                            src={URL.createObjectURL(pdf.preview)}
                            alt="PDF Preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Click hint overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      backgroundColor: 'rgba(0, 123, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: '0',
                      transition: 'opacity 0.2s ease',
                      pointerEvents: 'none',
                      borderRadius: '6px'
                    }}
                    className="preview-overlay"
                    >
                      <div style={{
                        backgroundColor: 'rgba(0, 123, 255, 0.9)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        👁️ Click to Preview
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  opacity: 0.5
                }}>
                  📄
                </div>
                <div style={{
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  No PDF stored for {currentSelectedDate || formatToMMDDYY(new Date())}
                </div>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.8
                }}>
                  Sign and save a PDF to see it here (will replace any existing PDF for this date)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Calendar Modal */}
       {calendarOpen && (
         <CalendarPicker
           isOpen={!!calendarOpen}
           onClose={handleCalendarClose}
           onSelectDate={handleDateSelect}
           currentDate={getCurrentDate()}
         />
       )}

       {/* Main Calendar Modal */}
       {showMainCalendar && (
         <DateCalendar
           savedDates={savedDates}
           onDateSelect={handleMainDateSelect}
           onClose={handleMainCalendarClose}
         />
       )}


      {/* PDF Preview Modal */}
      {showPDFPreview && previewPDF && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          paddingTop: '2.5vh',
          paddingRight: '2.5vw',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px 20px 20px 40px',
            width: '85vw',
            maxWidth: '85vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button
              onClick={handleClosePDFPreview}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                zIndex: 2001
              }}
            >
              ×
            </button>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              PDF Preview: {previewPDF.metadata.filename}
            </h3>
            <div style={{
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'auto',
              flex: 1,
              minHeight: '60vh',
              maxHeight: '80vh'
            }}>
              <iframe
                src={URL.createObjectURL(previewPDF.pdf)}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '60vh',
                  border: 'none'
                }}
                title="PDF Preview"
              />
    </div>
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(previewPDF.pdf);
                  link.download = previewPDF.metadata.filename;
                  link.click();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                📥 Download PDF
              </button>
              <button
                onClick={handleClosePDFPreview}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>
           </div>
         </div>
       )}
    </div>
    </>
  );
};

export default FederalTimeTable; 