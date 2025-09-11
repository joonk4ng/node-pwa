// Federal Time Table
import React, { useState, useEffect } from 'react';
import type { FederalEquipmentEntry, FederalPersonnelEntry, FederalFormData } from '../utils/engineTimeDB';
import {
  saveFederalEquipmentEntry,
  loadAllFederalEquipmentEntries,
  saveFederalPersonnelEntry,
  loadAllFederalPersonnelEntries,
  saveFederalFormData,
  loadFederalFormData
} from '../utils/engineTimeDB';
import { EnhancedPDFViewer } from './PDF';
import { getPDF, storePDFWithId } from '../utils/pdfStorage';
import { mapFederalToPDFFields, validateFederalFormData } from '../utils/fieldmapper/federalFieldMapper';
import { handleFederalEquipmentEntryChange, handleFederalPersonnelEntryChange, DEFAULT_PROPAGATION_CONFIG } from '../utils/entryPropagation';
import { DateCalendar } from './DateCalendar';
import { validateTimeInput, autoCalculateTotal } from '../utils/timevalidation';
import * as PDFLib from 'pdf-lib';

// Simple Calendar Component
const CalendarPicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentDate?: string;
}> = ({ isOpen, onClose, onSelectDate, currentDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    if (currentDate) {
      const date = new Date(currentDate);
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date);
      }
    }
  }, [currentDate]);

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
    <div style={{
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
    }} onClick={(e) => e.stopPropagation()}>
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

  // PDF state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfId] = useState<string>('federal-form');
  const [pdfVersion, setPdfVersion] = useState(0); // Force PDF viewer refresh

  // Main calendar state
  const [showMainCalendar, setShowMainCalendar] = useState(false);
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string>('');
  const [savedDates, setSavedDates] = useState<string[]>([]);

  // Time validation state
  const [timeValidationErrors, setTimeValidationErrors] = useState<Record<string, string>>({});

  // Load Federal data from IndexedDB on mount
  useEffect(() => {
    loadFederalFormData().then((saved) => {
      if (saved) {
        setFederalFormData(saved);
      }
    });

    loadAllFederalEquipmentEntries().then((entries) => {
      setEquipmentEntries(entries);
    });

    loadAllFederalPersonnelEntries().then((entries) => {
      setPersonnelEntries(entries);
    });
  }, []);

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
  }, []);

  // Handle Federal form data changes and autosave
  const handleFederalFormChange = (field: keyof FederalFormData, value: string) => {
    setFederalFormData(prev => {
      const updated = { ...prev, [field]: value };
      saveFederalFormData(updated);
      return updated;
    });
  };

  // Handle equipment entry changes and autosave with propagation
  const handleEquipmentEntryChange = (index: number, field: keyof FederalEquipmentEntry, value: string) => {
    setEquipmentEntries(prev => {
      const updated = handleFederalEquipmentEntryChange(prev, index, field, value, DEFAULT_PROPAGATION_CONFIG);
      saveFederalEquipmentEntry(updated[index]);
      return updated;
    });
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
        if (field === 'stop') {
          const entry = equipmentEntries[index];
          if (entry.start && formattedTime) {
            const total = autoCalculateTotal(entry.start, formattedTime);
            if (total) {
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
      const updated = handleFederalPersonnelEntryChange(prev, index, field, value, DEFAULT_PROPAGATION_CONFIG);
      saveFederalPersonnelEntry(updated[index]);
      return updated;
    });
  };

  // Clear equipment entry
  const handleClearEquipmentEntry = (index: number) => {
    setEquipmentEntries(prev => {
      const updated = [...prev];
      updated[index] = { date: '', start: '', stop: '', total: '', quantity: '', type: '', remarks: '' };
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
    }
  };

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
      const pdfFields = mapFederalToPDFFields(federalFormData, equipmentEntries, personnelEntries);
      console.log('Federal: Mapped PDF fields:', pdfFields);

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
      
      // Fill the form fields
      let filledFieldsCount = 0;
      let attemptedFieldsCount = 0;
      Object.entries(pdfFields).forEach(([fieldName, value]) => {
        attemptedFieldsCount++;
        
        // Special debugging for Agency Representative and Incident Supervisor fields
        if (fieldName.includes('Agency_Representative') || fieldName.includes('Incident_Supervisor')) {
          console.log(`Federal: DEBUG - Attempting to fill ${fieldName} with value: "${value}"`);
        }
        
        // Special debugging for Hours field
        if (fieldName.includes('_14_Hours')) {
          console.log(`Federal: DEBUG - Attempting to fill Hours field ${fieldName} with value: "${value}"`);
        }
        
        try {
          const field = form.getField(fieldName);
          if (field) {
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

      console.log('Federal: PDF filled successfully, opening for signing...');
      
      // Increment PDF version to force refresh
      setPdfVersion(prev => prev + 1);
      
      // Force a refresh of the PDF viewer by closing and reopening
      setShowPDFViewer(false);
      
      // Small delay to ensure the PDF is saved before reopening
      setTimeout(() => {
        setShowPDFViewer(true);
      }, 500);
      
    } catch (error) {
      console.error('Federal: Error filling PDF:', error);
      alert('Error filling PDF. Please check the console for details.');
    }
  };

  const handleClosePDF = () => {
    setShowPDFViewer(false);
  };


  const handleSavePDF = (pdfData: Blob, _previewImage: Blob) => {
    console.log('Federal PDF saved:', pdfData.size, 'bytes');
    // You can add additional save logic here
  };

  // Main calendar handlers
  const handleMainCalendarOpen = () => {
    setShowMainCalendar(true);
  };

  const handleMainCalendarClose = () => {
    setShowMainCalendar(false);
  };

  const handleMainDateSelect = (dateRange: string) => {
    setCurrentSelectedDate(dateRange);
    setShowMainCalendar(false);
    // Load data for the selected date
    loadDataForDate(dateRange);
  };

  const loadDataForDate = async (dateRange: string) => {
    try {
      console.log('Loading data for date range:', dateRange);
      
      // Load form data for the specific date
      const formData = await loadFederalFormData();
      if (formData) {
        setFederalFormData(formData);
      }

      // Load equipment entries for the specific date
      const equipmentEntries = await loadAllFederalEquipmentEntries();
      setEquipmentEntries(equipmentEntries);

      // Load personnel entries for the specific date
      const personnelEntries = await loadAllFederalPersonnelEntries();
      setPersonnelEntries(personnelEntries);
    } catch (error) {
      console.error('Error loading data for date:', error);
    }
  };

  const saveDataForDate = async () => {
    try {
      // Save current form data
      await saveFederalFormData(federalFormData);
      
      // Save equipment entries
      for (const entry of equipmentEntries) {
        if (entry.date || entry.start || entry.stop || entry.total || entry.quantity || entry.type || entry.remarks) {
          await saveFederalEquipmentEntry(entry);
        }
      }
      
      // Save personnel entries
      for (const entry of personnelEntries) {
        if (entry.date || entry.name || entry.start1 || entry.stop1 || entry.start2 || entry.stop2 || entry.total || entry.remarks) {
          await saveFederalPersonnelEntry(entry);
        }
      }
      
      // Update saved dates list
      if (currentSelectedDate && !savedDates.includes(currentSelectedDate)) {
        setSavedDates(prev => [...prev, currentSelectedDate]);
      }
      
      console.log('Data saved for date:', currentSelectedDate);
    } catch (error) {
      console.error('Error saving data for date:', error);
    }
  };



  return (
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
          
          {currentSelectedDate && (
            <button
              onClick={saveDataForDate}
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
              💾 Save Data
            </button>
          )}
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
            {/* Agreement Number */}
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
            
            {/* Contractor/Agency Name */}
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

            {/* Resource Order Number Row */}
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
                3. Resource Order Number
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

            {/* Incident Name */}
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
            
            {/* Incident Number */}
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
              display: 'flex',
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
            {/* Equipment Make/Model */}
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
                7. Equipment Make/Model
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
            
            {/* Equipment Type */}
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
            
            {/* Serial/VIN Number */}
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
                9. Serial/VIN Number
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
            
            {/* License/ID Number */}
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
                10. License/ID Number
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

            {/* Transport Retained */}
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
              display: 'flex',
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
              display: 'flex',
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
              display: 'flex',
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
                const entry = equipmentEntries[idx] || { date: '', start: '', stop: '', total: '', quantity: '', type: '', remarks: '' };
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
                      gridTemplateColumns: '1fr 1fr',
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
                          Start Time
                        </label>
                        <input
                          type="text"
                          value={entry.start}
                          onChange={e => handleTimeInput(idx, 'start', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-start`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="HH:MM (24hr)"
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
                          Stop Time
                        </label>
                        <input
                          type="text"
                          value={entry.stop}
                          onChange={e => handleTimeInput(idx, 'stop', e.target.value, 'equipment')}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${timeValidationErrors[`equipment-${idx}-stop`] ? '#dc3545' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="HH:MM (24hr)"
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
                      display: 'grid',
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
                );
              })}
            </div>
          </div>

          {/* Personnel Time Entries Section */}
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
              Personnel Time Entries
            </h3>
            
            {/* Personnel Table - Mobile Friendly */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {Array.from({ length: 4 }, (_, idx) => {
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
                          Personnel Entry #{idx + 1}
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
                    
                    {/* Name */}
                    <div style={{
                      marginBottom: '16px'
                    }}>
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
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '16px',
                          backgroundColor: '#fff',
                          color: '#333'
                        }}
                        placeholder="Name"
                      />
                    </div>
                    
                    {/* Time Period 1 */}
                    <div style={{
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
                              padding: '12px',
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
                              padding: '12px',
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
                              padding: '12px',
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
                              padding: '12px',
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
                    
                    {/* Total and Remarks */}
                    <div style={{
                      display: 'grid',
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
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
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
                          Remarks
                        </label>
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={e => handlePersonnelEntryChange(idx, 'remarks', e.target.value)}
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
          
          {/* Remarks Section */}
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
              Remarks
            </h3>
            
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
              </label>
              <textarea
                value={federalFormData.remarks}
                onChange={e => handleFederalFormChange('remarks', e.target.value)}
                style={{
                  padding: '12px',
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
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleViewPDF}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              ✏️ Fill & Sign PDF
            </button>
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

       {/* PDF Viewer Modal */}
       {showPDFViewer && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           backgroundColor: 'rgba(0, 0, 0, 0.8)',
           zIndex: 1000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '20px'
         }}>
           <div style={{
             position: 'fixed',
             top: '50%',
             left: '50%',
             transform: 'translate(-50%, -50%)',
             backgroundColor: 'white',
             borderRadius: '12px',
             padding: '20px',
             width: '95vw',
             height: '95vh',
             maxWidth: '1200px',
             maxHeight: '800px',
             overflow: 'auto',
             boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
           }}>
             <button
               onClick={handleClosePDF}
               style={{
                 position: 'absolute',
                 top: '10px',
                 right: '10px',
                 background: '#dc3545',
                 color: 'white',
                 border: 'none',
                 borderRadius: '50%',
                 width: '30px',
                 height: '30px',
                 cursor: 'pointer',
                 fontSize: '16px',
                 zIndex: 1001
               }}
             >
               ×
             </button>
             <EnhancedPDFViewer
               key={`viewer-${pdfVersion}`}
               pdfId={pdfId}
               onSave={handleSavePDF}
               crewInfo={{
                 crewNumber: federalFormData.agreementNumber || 'N/A',
                 fireName: federalFormData.incidentName || 'N/A',
                 fireNumber: federalFormData.incidentNumber || 'N/A'
               }}
               date={new Date().toLocaleDateString()}
             />
           </div>
         </div>
       )}
    </div>
  );
}; 