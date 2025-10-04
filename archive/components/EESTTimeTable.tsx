//
import React, { useState, useEffect, useRef } from 'react';
import type { EESTFormData, EESTTimeEntry } from '../utils/engineTimeDB';
import { FormType } from '../utils/engineTimeDB';
import {
  saveEESTFormData,
  loadEESTFormData,
  saveEESTTimeEntry,
  loadAllEESTTimeEntries
} from '../utils/engineTimeDB';
import { handleEESTTimeEntryChange, DEFAULT_PROPAGATION_CONFIG } from '../utils/entryPropagation';
import { EESTPDFViewer } from './PDF';
import { getPDF, storePDFWithId, clearPDF } from '../utils/pdfStorage';
import { mapEESTToPDFFields, validateEESTFormData } from '../utils/fieldmapper/eestFieldMapper';
import { debugEESTDatabase, testEESTDataPersistence } from '../utils/eestDBDebug';
import * as PDFLib from 'pdf-lib';


//
const EMPTY_TIME_ENTRY: EESTTimeEntry = {
  date: '',
  start: '',
  stop: '',
  work: '',
  special: '',
};

//
const EMPTY_FORM_DATA: EESTFormData = {
  formType: FormType.EEST,
  agreementNumber: '',
  resourceOrderNumber: '',
  contractorAgencyName: '',
  incidentName: '',
  incidentNumber: '',
  operatorName: '',
  equipmentMake: '',
  equipmentModel: '',
  serialNumber: '',
  licenseNumber: '',
  equipmentStatus: 'Inspected and under agreement', // Default to inspected status
  invoicePostedBy: '',
  dateSigned: '',
  remarks: '',
  remarksOptions: [],
  customRemarks: [],
  specialSelections: {},

};

export const EESTTimeTable: React.FC = () => {
  // Track if we're in initial loading state
  const isInitialLoad = useRef(true);
  
  // Main form state
  const [formData, setFormData] = useState<EESTFormData>(EMPTY_FORM_DATA);

  // Remarks section state
  const [checkboxStates, setCheckboxStates] = useState({
    hotline: false,
    noMealsLodging: false,
    noMeals: false,
    travel: false,
    noLunch: false,
  });
  const [customEntries, setCustomEntries] = useState<string[]>([]);


  // Time entries state - start with four rows
  const [timeEntries, setTimeEntries] = useState<EESTTimeEntry[]>([
    { ...EMPTY_TIME_ENTRY },
    { ...EMPTY_TIME_ENTRY },
    { ...EMPTY_TIME_ENTRY },
    { ...EMPTY_TIME_ENTRY }
  ]);

  // Equipment use selector
  const [equipmentUse, setEquipmentUse] = useState<'HOURS'>('HOURS');

  // Custom remarks state
  const [showCustomRemarkModal, setShowCustomRemarkModal] = useState(false);
  const [customRemarkInput, setCustomRemarkInput] = useState('');

  // Special dropdown state
  const [specialDropdownOpen, setSpecialDropdownOpen] = useState<number | null>(null);
  const [specialSelections, setSpecialSelections] = useState<{ [key: number]: string[] }>({});
  const [customSpecialInput, setCustomSpecialInput] = useState('');

  // PDF state
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfId] = useState<string>('eest-form');
  const [pdfRefreshKey, setPdfRefreshKey] = useState(0);






  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialDropdownOpen !== null) {
        const target = event.target as Element;
        // Check if the click is inside the dropdown or the button
        const isInsideDropdown = target.closest('[data-dropdown="special"]');
        const isInsideButton = target.closest('[data-special-button]');
        
        if (!isInsideDropdown && !isInsideButton) {
          setSpecialDropdownOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [specialDropdownOpen]);

  // Load EEST data from IndexedDB on mount
  useEffect(() => {
    console.log('EEST: Loading data from IndexedDB...');
    
    loadEESTFormData().then((saved) => {
      console.log('EEST: Form data loaded:', saved);
      if (saved) {
        setFormData(saved);
        setCheckboxStates({
          hotline: saved.remarksOptions?.includes('HOTLINE') || false,
          noMealsLodging: saved.remarksOptions?.includes('Self Sufficient - No Meals Provided') || false,
          noMeals: saved.remarksOptions?.includes('Self Sufficient - No Lodging Provided') || false,
          travel: saved.remarksOptions?.includes('Travel') || false,
          noLunch: saved.remarksOptions?.includes('No Lunch Taken due to Uncontrolled Fire') || false,
        });
        setCustomEntries(saved.customRemarks || []);
        setSpecialSelections(saved.specialSelections || {});
      } else {
        console.log('EEST: No saved form data found');
      }
      // Mark initial load as complete
      isInitialLoad.current = false;
    }).catch(error => {
      console.error('EEST: Error loading form data:', error);
      // Mark initial load as complete even on error
      isInitialLoad.current = false;
    });

    loadAllEESTTimeEntries().then((entries) => {
      console.log('EEST: Time entries loaded:', entries);
      if (entries.length > 0) {
        // Ensure we always have exactly 4 rows
        const paddedEntries = [...entries];
        while (paddedEntries.length < 4) {
          paddedEntries.push({ ...EMPTY_TIME_ENTRY });
        }
        setTimeEntries(paddedEntries.slice(0, 4));
      } else {
        console.log('EEST: No saved time entries found, using default empty entries');
        // Set default empty entries when no saved entries exist
        setTimeEntries([
          { ...EMPTY_TIME_ENTRY },
          { ...EMPTY_TIME_ENTRY },
          { ...EMPTY_TIME_ENTRY },
          { ...EMPTY_TIME_ENTRY }
        ]);
      }
    }).catch(error => {
      console.error('EEST: Error loading time entries:', error);
      // Set default empty entries on error
      setTimeEntries([
        { ...EMPTY_TIME_ENTRY },
        { ...EMPTY_TIME_ENTRY },
        { ...EMPTY_TIME_ENTRY },
        { ...EMPTY_TIME_ENTRY }
      ]);
    });
  }, []);

  // Initialize EEST PDF in storage
  useEffect(() => {
    const initializeEESTPDF = async () => {
      try {
        // Clear any existing PDF to ensure we load the correct one
        console.log('EEST: Clearing any existing PDF to ensure correct file is loaded...');
        await clearPDF('eest-form');
        
        console.log('EEST: Loading eest-fill.pdf...');
        // Load the EEST PDF from public folder
        const response = await fetch('/eest-fill.pdf');
        console.log('EEST: Fetch response status:', response.status, response.ok);
        if (response.ok) {
          const pdfBlob = await response.blob();
          console.log('EEST: PDF blob size:', pdfBlob.size, 'bytes');
          // Store with a fixed ID for the EEST form
          await storePDFWithId('eest-form', pdfBlob, null, {
            filename: 'eest-fill.pdf',
            date: new Date().toISOString(),
            crewNumber: 'N/A',
            fireName: 'N/A',
            fireNumber: 'N/A'
          });
          console.log('EEST PDF initialized in storage with eest-fill.pdf');
        } else {
          console.error('EEST: Failed to fetch eest-fill.pdf, status:', response.status);
        }
      } catch (error) {
        console.error('Error initializing EEST PDF:', error);
      }
    };

    initializeEESTPDF();
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    // Skip saving during initial load
    if (isInitialLoad.current) {
      console.log('EEST: Skipping save - still in initial load phase');
      return;
    }

    const remarksOptions = [
      ...(checkboxStates.hotline ? ['HOTLINE'] : []),
      ...(checkboxStates.noMealsLodging ? ['Self Sufficient - No Meals Provided'] : []),
      ...(checkboxStates.noMeals ? ['Self Sufficient - No Lodging Provided'] : []),
      ...(checkboxStates.travel ? ['Travel'] : []),
      ...(checkboxStates.noLunch ? ['No Lunch Taken due to Uncontrolled Fire'] : []),
    ];
    const updatedFormData = {
      ...formData,
      remarksOptions,
      customRemarks: customEntries,
      specialSelections,
    };
    console.log('EEST: Saving form data:', updatedFormData);
    saveEESTFormData(updatedFormData).then(() => {
      console.log('EEST: Form data saved successfully');
    }).catch(error => {
      console.error('EEST: Error saving form data:', error);
    });
  }, [formData, checkboxStates, customEntries, specialSelections]);



  // Save time entries whenever they change
  useEffect(() => {
    const saveEntries = async () => {
      const updatedEntries = await Promise.all(
        timeEntries.map(async (entry) => {
          if (entry.id) {
            await saveEESTTimeEntry(entry);
            return entry;
          } else if (entry.date || entry.start || entry.stop || entry.work || entry.special) {
            const id = await saveEESTTimeEntry(entry);
            return { ...entry, id };
          }
          return entry;
        })
      );
      
      // Only update state if IDs have changed
      const hasNewIds = updatedEntries.some((entry, index) => 
        entry.id !== timeEntries[index]?.id
      );
      
      if (hasNewIds) {
        setTimeEntries(updatedEntries);
      }
    };
    
    saveEntries();
  }, [timeEntries]);

  const handleFormChange = (field: keyof EESTFormData, value: string) => {
    console.log(`EEST: Form field changed - ${field}: "${value}"`);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      console.log('EEST: Updated form data:', updated);
      return updated;
    });
  };



  const handleRemoveCustomEntry = (entry: string) => {
    setCustomEntries(prev => prev.filter(e => e !== entry));
  };


  // Special dropdown options
  const specialOptions = [
    'HOTLINE',
    'Self Sufficient - No Meals Provided',
    'Self Sufficient - No Lodging Provided',
    'Travel',
    'No Lunch Taken due to Uncontrolled Fire'
  ];

  const handleSpecialSelection = (rowIndex: number, option: string) => {
    setSpecialSelections(prev => {
      const currentSelections = prev[rowIndex] || [];
      const newSelections = currentSelections.includes(option)
        ? currentSelections.filter(s => s !== option)
        : [...currentSelections, option];
      
      return {
        ...prev,
        [rowIndex]: newSelections
      };
    });
  };

  const handleAddCustomSpecial = (rowIndex: number) => {
    if (customSpecialInput.trim()) {
      setSpecialSelections(prev => ({
        ...prev,
        [rowIndex]: [...(prev[rowIndex] || []), customSpecialInput.trim()]
      }));
      setCustomSpecialInput('');
    }
  };

  const handleRemoveSpecialSelection = (rowIndex: number, selection: string) => {
    setSpecialSelections(prev => ({
      ...prev,
      [rowIndex]: (prev[rowIndex] || []).filter(s => s !== selection)
    }));
  };







  const handleTimeEntryChange = (index: number, field: keyof EESTTimeEntry, value: string) => {
    setTimeEntries(prev => {
      const updated = handleEESTTimeEntryChange(prev, index, field, value, DEFAULT_PROPAGATION_CONFIG);
      return updated;
    });
  };

  // PDF handlers
  const handleViewPDF = async () => {
    try {
      console.log('EEST: Starting PDF fill and sign process...');
      
      // Validate form data
      const validation = validateEESTFormData(formData, timeEntries);
      if (!validation.isValid) {
        console.error('EEST: Form validation failed:', validation.errors);
        alert('Please fill in required fields before signing: ' + validation.errors.join(', '));
        return;
      }

    // Map form data to PDF fields
    console.log('EEST: Form data being mapped:', {
      formData,
      timeEntries,
      customEntries,
      specialSelections
    });
    const pdfFields = mapEESTToPDFFields(formData, timeEntries);
    console.log('EEST: Mapped PDF fields:', pdfFields);
    
    // Debug: Show which fields contain crew member data
    Object.entries(pdfFields).forEach(([fieldName, value]) => {
      if (typeof value === 'string' && value.includes('Big Boss')) {
        console.log(`🔍 EEST Debug: Field "${fieldName}" contains crew member data: "${value}"`);
      }
    });

      // Get the stored PDF
      const storedPDF = await getPDF('eest-form');
      if (!storedPDF) {
        console.error('EEST: No PDF found in storage');
        alert('PDF not found. Please try again.');
        return;
      }
      
      console.log('EEST: Using PDF from storage:', {
        filename: storedPDF.metadata?.filename,
        size: storedPDF.pdf.size,
        date: storedPDF.metadata?.date
      });
      
      // Debug: Verify we're using the correct PDF
      if (storedPDF.metadata?.filename !== 'eest-fill.pdf') {
        console.error('❌ EEST ERROR: Wrong PDF loaded! Expected eest-fill.pdf but got:', storedPDF.metadata?.filename);
        alert('Error: Wrong PDF loaded. Please refresh the page and try again.');
        return;
      } else {
        console.log('✅ EEST: Correct PDF confirmed - eest-fill.pdf');
      }

      // Create a new PDF with filled fields
      const pdfDoc = await PDFLib.PDFDocument.load(await storedPDF.pdf.arrayBuffer());
      
      // Get the form
      const form = pdfDoc.getForm();
      
      // Debug: Log all available fields in the PDF
      console.log('EEST: Available PDF fields:');
      const allFields = form.getFields();
      allFields.forEach((field, index) => {
        console.log(`${index + 1}. "${field.getName()}" (${field.constructor.name})`);
      });
      
      // Fill the form fields
      let filledFieldsCount = 0;
      let attemptedFieldsCount = 0;
      Object.entries(pdfFields).forEach(([fieldName, value]) => {
        attemptedFieldsCount++;
        
        try {
          const field = form.getField(fieldName);
          if (field) {
            // Use robust field type detection like Federal implementation
            const hasSetText = typeof (field as any).setText === 'function';
            const hasCheck = typeof (field as any).check === 'function';
            const hasSelect = typeof (field as any).select === 'function';
            const hasSetValue = typeof (field as any).setValue === 'function';
            
            console.log(`EEST: Field ${fieldName} - setText: ${hasSetText}, check: ${hasCheck}, select: ${hasSelect}, setValue: ${hasSetValue}`);
            
            if (hasSetText) {
              // Text field
              const textField = field as any;
              textField.setText(value);
              
              // Set smaller font size for remarks fields and crew member fields to fit more text
              if (fieldName.includes('REMARKS') || fieldName.includes('remarks') || 
                  fieldName.includes('Text6') || fieldName.includes('Text7') ||
                  fieldName.includes('operatorFurnishedBy') || fieldName.includes('operatingSuppliesFurnishedBy')) {
                try {
                  textField.updateAppearances();
                  // Try to set a smaller font size
                  const fontSize = 6; // Even smaller font size for remarks to fit more text
                  textField.setFontSize(fontSize);
                  console.log(`EEST: Set font size ${fontSize} for remarks field: ${fieldName}`);
                } catch (fontError) {
                  console.warn(`EEST: Could not set font size for field ${fieldName}:`, fontError);
                }
              }
              
              filledFieldsCount++;
              console.log(`EEST: Filled text field ${fieldName} with: "${value}"`);
            } else if (hasCheck) {
              // Checkbox field
              if (value === 'Yes' || value === 'On' || value === 'YES') {
                (field as any).check();
                filledFieldsCount++;
                console.log(`EEST: Checked checkbox ${fieldName}`);
              } else {
                (field as any).uncheck();
                filledFieldsCount++;
                console.log(`EEST: Unchecked checkbox ${fieldName}`);
              }
            } else if (hasSelect) {
              // Dropdown field
              (field as any).select(value);
              filledFieldsCount++;
              console.log(`EEST: Selected dropdown ${fieldName} with: "${value}"`);
            } else if (hasSetValue) {
              // Generic field with setValue method
              (field as any).setValue(value);
              filledFieldsCount++;
              console.log(`EEST: Filled field ${fieldName} with: "${value}" using setValue`);
            } else {
              // Try to set the field value directly
              try {
                (field as any).value = value;
                filledFieldsCount++;
                console.log(`EEST: Filled field ${fieldName} with: "${value}" using direct assignment`);
              } catch (directError) {
                console.warn(`EEST: Field ${fieldName} found but no suitable method available. Available methods: ${Object.getOwnPropertyNames(field).join(', ')}`);
              }
            }
          } else {
            console.warn(`EEST: Field ${fieldName} not found in PDF`);
          }
        } catch (error) {
          console.error(`EEST: Error filling field ${fieldName}:`, error);
        }
      });
      
      console.log(`EEST: Successfully filled ${filledFieldsCount} fields out of ${attemptedFieldsCount} attempted`);

      // Save the filled PDF
      const pdfBytes = await pdfDoc.save();
      const filledPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Store the filled PDF back to the same key (this is correct for the preview system)
      await storePDFWithId('eest-form', filledPdfBlob, null, {
        filename: 'eest-fill-filled.pdf',
        date: new Date().toISOString(),
        crewNumber: formData.agreementNumber || 'N/A',
        fireName: formData.incidentName || 'N/A',
        fireNumber: formData.incidentNumber || 'N/A'
      });
      
      console.log('EEST: Filled PDF stored, size:', filledPdfBlob.size, 'bytes');

      console.log('EEST: PDF filled successfully, opening viewer...');
      
      // Force PDF viewer to refresh with the new filled PDF first
      setPdfRefreshKey(prev => prev + 1);
      
      // Then show the PDF viewer after a brief delay to ensure refresh is processed
      setTimeout(() => {
        console.log('EEST: Opening PDF viewer with refreshed PDF...');
        setShowPDFViewer(true);
      }, 200); // Brief delay to ensure refresh is processed
      
    } catch (error) {
      console.error('EEST: Error filling PDF:', error);
      alert('Error filling PDF. Please check the console for details.');
    }
  };

  const handleClosePDF = () => {
    setShowPDFViewer(false);
  };

  const handleSavePDF = (pdfData: Blob, _previewImage: Blob) => {
    console.log('EEST PDF saved:', pdfData.size, 'bytes');
    
    // Use the new naming schema with EEST form type
    const saveOptions = {
      formType: FormType.EEST,
      incidentName: formData.incidentName,
      incidentNumber: formData.incidentNumber,
      contractorAgencyName: formData.contractorAgencyName,
      date: new Date().toISOString().split('T')[0],
      isSigned: true
    };
    
    // The PDF save handler will automatically use the new naming schema
    // and save metadata to the database
    console.log('EEST: PDF will be saved with options:', saveOptions);
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
        maxWidth: '600px',
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
            Emergency Equipment Shift Ticket
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '14px',
            opacity: 0.9,
            lineHeight: '1.4'
          }}>
            The responsible Government Officer will update this form each day of shift and make initial and final equipment inspections.
          </p>
        </div>

        {/* Form Content Container */}
        <div style={{
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Resource Order Number and Agreement Number Row */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
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
                RESOURCE ORDER NUMBER
              </label>
              <input
                type="text"
                value={formData.resourceOrderNumber}
                onChange={(e) => handleFormChange('resourceOrderNumber', e.target.value)}
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
                1. AGREEMENT NUMBER
              </label>
              <input
                type="text"
                value={formData.agreementNumber}
                onChange={(e) => handleFormChange('agreementNumber', e.target.value)}
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
          </div>
          
          {/* Contractor Row */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
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
                2. CONTRACTOR (name)
              </label>
              <input
                type="text"
                value={formData.contractorAgencyName}
                onChange={(e) => handleFormChange('contractorAgencyName', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter contractor name"
              />
            </div>
          </div>
          
          {/* Incident Name, Incident Number, and Operator Row */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
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
                3. INCIDENT OR PROJECT NAME
              </label>
              <input
                type="text"
                value={formData.incidentName}
                onChange={(e) => handleFormChange('incidentName', e.target.value)}
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
                4. INCIDENT NUMBER
              </label>
              <input
                type="text"
                value={formData.incidentNumber}
                onChange={(e) => handleFormChange('incidentNumber', e.target.value)}
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
                5. OPERATOR (name)
              </label>
              <input
                type="text"
                value={formData.operatorName}
                onChange={(e) => handleFormChange('operatorName', e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter operator name"
              />
            </div>
          </div>
          
          {/* Equipment Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Equipment Make and Model Row */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
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
                  6. EQUIPMENT MAKE
                </label>
                <input
                  type="text"
                  value={formData.equipmentMake}
                  onChange={(e) => handleFormChange('equipmentMake', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter equipment make"
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
                  7. EQUIPMENT MODEL
                </label>
                <input
                  type="text"
                  value={formData.equipmentModel}
                  onChange={(e) => handleFormChange('equipmentModel', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter equipment model"
                />
              </div>
            </div>
            
            {/* Operator Furnished By */}
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
                8. OPERATOR FURNISHED BY
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                <input
                  type="radio"
                  id="operator-contractor"
                  name="operator-furnished"
                  value="Contractor"
                  checked={formData.equipmentStatus === 'Contractor'}
                  onChange={(e) => handleFormChange('equipmentStatus', e.target.value)}
                  style={{
                    width: '18px',
                    height: '18px'
                  }}
                />
                <label htmlFor="operator-contractor" style={{
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer'
                }}>
                  Contractor
                </label>
              </div>
            </div>
            
            {/* Serial Number and License Number Row */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
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
                  9. SERIAL NUMBER
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => handleFormChange('serialNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter serial number"
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
                  10. LICENSE NUMBER
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    backgroundColor: '#fff',
                    color: '#333'
                  }}
                  placeholder="Enter license number"
                />
              </div>
            </div>
            
            {/* Operating Supplies Furnished By */}
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
                11. OPERATING SUPPLIES FURNISHED BY
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                <input
                  type="radio"
                  id="supplies-contractor"
                  name="supplies-furnished"
                  value="Contractor"
                  checked={formData.equipmentStatus === 'Contractor'}
                  onChange={(e) => handleFormChange('equipmentStatus', e.target.value)}
                  style={{
                    width: '18px',
                    height: '18px'
                  }}
                />
                <label htmlFor="supplies-contractor" style={{
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer'
                }}>
                  Contractor
                </label>
              </div>
            </div>
            
            {/* Invoice Posted By */}
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
                16. INVOICE POSTED BY (Recorder's Initials)
              </label>
              <input
                type="text"
                value={formData.invoicePostedBy}
                onChange={(e) => handleFormChange('invoicePostedBy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter recorder's initials"
              />
            </div>
            
            {/* Date Signed */}
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
                19. DATE SIGNED
              </label>
              <input
                type="text"
                value={formData.dateSigned}
                onChange={(e) => handleFormChange('dateSigned', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
                placeholder="Enter date signed"
              />
            </div>
          </div>
          
          {/* Time Entries Table Section */}
          <div style={{
            marginBottom: '20px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{
              border: '2px solid #000',
              backgroundColor: '#000',
              overflow: 'hidden',
              borderRadius: '6px',
              width: 'fit-content',
              minWidth: '360px'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(70px, 80px) minmax(40px, 50px) minmax(40px, 50px) minmax(80px, 90px) minmax(80px, 90px)',
                backgroundColor: '#fff'
              }}>
                {/* Date Header */}
                <div style={{
                  border: '1px solid #000',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60px'
                }}>
                  <div>12. DATE</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>MO/DA/YR</div>
                </div>
                
                {/* Start Header */}
                <div style={{
                  border: '1px solid #000',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60px'
                }}>
                  START
                </div>
                
                {/* Stop Header */}
                <div style={{
                  border: '1px solid #000',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60px'
                }}>
                  STOP
                </div>
                
                {/* Work Header */}
                <div style={{
                  border: '1px solid #000',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60px'
                }}>
                  WORK
                </div>
                
                {/* Special Header */}
                <div style={{
                  border: '1px solid #000',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60px'
                }}>
                  SPECIAL
                </div>
              </div>
              
              {/* Data Entry Rows */}
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div key={rowIndex} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(70px, 80px) minmax(40px, 50px) minmax(40px, 50px) minmax(80px, 90px) minmax(80px, 90px)',
                  backgroundColor: '#fff'
                }}>
                  {/* Date Cell */}
                  <div style={{
                    border: '1px solid #000',
                    padding: '6px 6px',
                    backgroundColor: '#E6F3FF',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <input
                      type="text"
                      value={timeEntries[rowIndex]?.date || ''}
                      onChange={(e) => handleTimeEntryChange(rowIndex, 'date', e.target.value)}
                      placeholder="MM/DD/YY"
                                              style={{
                          width: '100%',
                          padding: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '10px',
                          color: '#333',
                          textAlign: 'center'
                        }}
                    />
                  </div>
                  
                  {/* Start Cell */}
                  <div style={{
                    border: '1px solid #000',
                    padding: '6px 6px',
                    backgroundColor: '#E6F3FF',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <input
                      type="text"
                      value={timeEntries[rowIndex]?.start || ''}
                      onChange={(e) => handleTimeEntryChange(rowIndex, 'start', e.target.value)}
                      placeholder="0800"
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '10px',
                        color: '#333',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                  
                  {/* Stop Cell */}
                  <div style={{
                    border: '1px solid #000',
                    padding: '6px 6px',
                    backgroundColor: '#E6F3FF',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <input
                      type="text"
                      value={timeEntries[rowIndex]?.stop || ''}
                      onChange={(e) => handleTimeEntryChange(rowIndex, 'stop', e.target.value)}
                      placeholder="1700"
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '10px',
                        color: '#333',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                  
                  {/* Work Cell */}
                  <div style={{
                    border: '1px solid #000',
                    padding: '6px 6px',
                    backgroundColor: '#E6F3FF',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <input
                      type="text"
                      value={timeEntries[rowIndex]?.work || ''}
                      onChange={(e) => handleTimeEntryChange(rowIndex, 'work', e.target.value)}
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '10px',
                        color: '#333',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                  
                  {/* Special Cell */}
                  <div style={{
                    border: '1px solid #000',
                    padding: '6px 6px',
                    backgroundColor: '#E6F3FF',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <button
                      data-special-button
                      onClick={() => setSpecialDropdownOpen(specialDropdownOpen === rowIndex ? null : rowIndex)}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '10px',
                        color: '#333',
                        textAlign: 'center',
                        cursor: 'pointer',
                        minHeight: '20px'
                      }}
                    >
                      {(specialSelections[rowIndex] || []).length > 0 
                        ? `${(specialSelections[rowIndex] || []).length} selected`
                        : 'Select...'
                      }
                    </button>
                    
                    {specialDropdownOpen === rowIndex && (
                      <div 
                        data-dropdown="special"
                        style={{
                          position: 'absolute',
                          top: rowIndex <= 1 ? '100%' : 'auto',
                          bottom: rowIndex >= 2 ? '100%' : 'auto',
                          right: '0',
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          minWidth: '200px',
                          maxWidth: '250px'
                        }}
                      >
                        {specialOptions.map((option, optionIndex) => (
                          <div key={optionIndex} style={{
                            padding: '6px 8px',
                            borderBottom: '1px solid #eee',
                            cursor: 'pointer',
                            fontSize: '10px',
                            backgroundColor: (specialSelections[rowIndex] || []).includes(option) ? '#e3f2fd' : 'transparent'
                          }}
                          onClick={() => handleSpecialSelection(rowIndex, option)}
                          >
                            <input
                              type="checkbox"
                              checked={(specialSelections[rowIndex] || []).includes(option)}
                              readOnly
                              style={{
                                marginRight: '6px',
                                width: '12px',
                                height: '12px'
                              }}
                            />
                            {option}
                          </div>
                        ))}
                        
                        {/* Custom input */}
                        <div style={{
                          padding: '6px 8px',
                          borderTop: '1px solid #eee'
                        }}>
                          <input
                            type="text"
                            value={customSpecialInput}
                            onChange={(e) => setCustomSpecialInput(e.target.value)}
                            placeholder="Custom entry..."
                            style={{
                              width: '100%',
                              padding: '4px',
                              border: '1px solid #ddd',
                              borderRadius: '2px',
                              fontSize: '10px'
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddCustomSpecial(rowIndex);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddCustomSpecial(rowIndex)}
                            style={{
                              marginTop: '4px',
                              padding: '2px 6px',
                              border: '1px solid #007bff',
                              borderRadius: '2px',
                              fontSize: '8px',
                              backgroundColor: '#007bff',
                              color: '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Display selected items */}
                    {(specialSelections[rowIndex] || []).length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        right: '2px',
                        fontSize: '8px',
                        color: '#666',
                        pointerEvents: 'none'
                      }}>
                        {(specialSelections[rowIndex] || []).map((selection, selIndex) => (
                          <div key={selIndex} style={{
                            display: 'inline-block',
                            backgroundColor: '#fff',
                            padding: '1px 3px',
                            margin: '1px',
                            borderRadius: '2px',
                            border: '1px solid #ddd',
                            fontSize: '7px',
                            maxWidth: '60px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {selection}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSpecialSelection(rowIndex, selection);
                              }}
                              style={{
                                marginLeft: '2px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#999',
                                cursor: 'pointer',
                                fontSize: '6px',
                                padding: '0 2px'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Equipment Use Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '20px',
            width: 'fit-content'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              13. EQUIPMENT USE
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff',
              width: 'fit-content'
            }}>
              <input
                type="checkbox"
                id="equipment-hours"
                checked={equipmentUse === 'HOURS'}
                onChange={() => setEquipmentUse('HOURS')}
                style={{
                  width: '18px',
                  height: '18px'
                }}
              />
              <label htmlFor="equipment-hours" style={{
                fontSize: '16px',
                color: '#333',
                cursor: 'pointer'
              }}>
                HRS
              </label>
            </div>
          </div>
          
          {/* Crew Members Section */}
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
              14. CREW MEMBERS
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}>
              {/* Custom Crew Members */}
              {customEntries.length > 0 && (
                <>
                  {customEntries.map((member, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        fontSize: '16px',
                        color: '#333',
                        flex: '1',
                        padding: '4px 0'
                      }}>
                        {member}
                      </div>
                      <button
                        onClick={() => handleRemoveCustomEntry(member)}
                        style={{
                          padding: '2px 6px',
                          border: '1px solid #dc3545',
                          borderRadius: '3px',
                          fontSize: '12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minWidth: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove crew member"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
              
              <button
                onClick={() => {
                  setShowCustomRemarkModal(true);
                }}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #007bff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                + Add Crew Members
              </button>
            </div>
          </div>

        
                  {/* Equipment Status Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '20px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              15. EQUIPMENT STATUS
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}>
              <input
                type="radio"
                id="equipment-status-inspected"
                name="equipment-status"
                value="Inspected and under agreement"
                checked={formData.equipmentStatus === 'Inspected and under agreement'}
                onChange={(e) => handleFormChange('equipmentStatus', e.target.value)}
                style={{
                  width: '18px',
                  height: '18px'
                }}
              />
              <label htmlFor="equipment-status-inspected" style={{
                fontSize: '16px',
                color: '#333',
                cursor: 'pointer'
              }}>
                Inspected and under agreement
              </label>
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
            flexDirection: 'column',
            gap: '12px'
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
            
            <button
              onClick={async () => {
                console.log('🔍 EEST Debug: Testing data persistence...');
                await debugEESTDatabase();
                const testResult = await testEESTDataPersistence();
                console.log('🔍 EEST Debug: Persistence test result:', testResult);
                alert(`Data persistence test: ${testResult ? 'PASSED' : 'FAILED'}. Check console for details.`);
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              🔍 Debug Persistence
            </button>
          </div>
        </div>
      </div>



      {/* Custom Remark Modal */}
      {showCustomRemarkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Add Crew Member
            </h3>
            
            <textarea
              value={customRemarkInput}
              onChange={(e) => setCustomRemarkInput(e.target.value)}
              placeholder="Enter crew member name..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '16px'
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCustomRemarkModal(false);
                  setCustomRemarkInput('');
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customRemarkInput.trim()) {
                    // Add the crew member to the list
                    const newCrewMember = customRemarkInput.trim();
                    setCustomEntries(prev => [...prev, newCrewMember]);
                    setCustomRemarkInput('');
                    setShowCustomRemarkModal(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #007bff',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
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
          justifyContent: 'center'
        }}>
          <div style={{
            width: '95vw',
            height: '95vh',
            backgroundColor: 'white',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
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
                zIndex: 1001,
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <EESTPDFViewer
              pdfId={pdfId}
              refreshKey={pdfRefreshKey}
              onSave={handleSavePDF}
              crewInfo={{
                crewNumber: formData.agreementNumber || 'N/A',
                fireName: formData.incidentName || 'N/A',
                fireNumber: formData.incidentNumber || 'N/A'
              }}
              date={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default EESTTimeTable; 