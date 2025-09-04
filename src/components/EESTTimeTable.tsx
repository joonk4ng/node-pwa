//
import React, { useState, useEffect } from 'react';
import type { EESTFormData, EESTTimeEntry } from '../utils/engineTimeDB';
import {
  saveEESTFormData,
  loadEESTFormData,
  saveEESTTimeEntry,
  loadAllEESTTimeEntries
} from '../utils/engineTimeDB';
import { generateEESTPDF } from '../utils/pdfGenerator';
import PDFDebugger from './PDFDebugger';
import PDFDrawingViewer from './PDFDrawingViewer';
import { storePDF } from '../utils/pdfStorage';
import { storeDrawing, getDrawing } from '../utils/drawingStorage';
import { type DrawingData } from './DrawingOverlay';


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
  equipmentStatus: 'Contractor', // Default to Contractor to check the boxes by default
  invoicePostedBy: '',
  dateSigned: '',
  remarks: '',
  remarksOptions: [],
  customRemarks: [],

};

export const EESTTimeTable: React.FC = () => {
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

  // PDF and drawing state
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null);





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
      } else {
        console.log('EEST: No saved form data found');
      }
    }).catch(error => {
      console.error('EEST: Error loading form data:', error);
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
        console.log('EEST: No saved time entries found');
      }
    }).catch(error => {
      console.error('EEST: Error loading time entries:', error);
    });
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
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
    };
    console.log('EEST: Saving form data:', updatedFormData);
    saveEESTFormData(updatedFormData).then(() => {
      console.log('EEST: Form data saved successfully');
    }).catch(error => {
      console.error('EEST: Error saving form data:', error);
    });
  }, [formData, checkboxStates, customEntries]);



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
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const handleRemoveCustomEntry = (entry: string) => {
    setCustomEntries(prev => prev.filter(e => e !== entry));
  };

  // Handle drawing data changes and save to storage
  const handleDrawingChange = async (newDrawingData: DrawingData) => {
    setDrawingData(newDrawingData);
    if (pdfId) {
      try {
        await storeDrawing(pdfId, newDrawingData);
      } catch (error) {
        console.error('Failed to save drawing data:', error);
      }
    }
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
    setTimeEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };



  const handleGeneratePDF = async () => {
    try {
      console.log('Starting PDF generation for drawing...');
      console.log('Form data:', formData);
      console.log('Time entries:', timeEntries);
      console.log('Equipment use:', equipmentUse);
      console.log('Special selections:', specialSelections);
      
      // Clear previous PDF
      setPdfId(null);

      // Create enhanced form data that includes equipment use and crew members
      const enhancedFormData = {
        ...formData,
        equipmentUse: equipmentUse,
        remarks: customEntries.join('\n'), // Add crew members to remarks
      };
      
      // Create enhanced time entries with special selections
      const enhancedTimeEntries = timeEntries.map((entry, index) => ({
        ...entry,
        special: (specialSelections[index] || []).join('\n') || entry.special
      }));
      
      console.log('Enhanced form data:', enhancedFormData);
      console.log('Enhanced time entries:', enhancedTimeEntries);
      
      // Use the original EEST-specific PDF generator with actual form data
      const pdfResult = await generateEESTPDF(enhancedFormData, enhancedTimeEntries, {
        debugMode: true,
        returnBlob: true,
        fontSize: 6 // Adjust this value to control text size (6 = very small, 8 = small, 10 = medium, 12 = large)
      });
      console.log('PDF generation result:', pdfResult);
      
      if (pdfResult.blob) {
        // Generate a unique ID for this PDF
        const newPdfId = `eest_${Date.now()}`;
        
        // Store the PDF in IndexedDB
        await storePDF(newPdfId, pdfResult.blob);
        
        // Set the PDF ID for viewing (opens for drawing)
        setPdfId(newPdfId);
        
        // Load existing drawing data for this PDF
        try {
          const existingDrawing = await getDrawing(newPdfId);
          if (existingDrawing) {
            setDrawingData(existingDrawing);
          }
        } catch (error) {
          console.warn('Could not load existing drawing data:', error);
        }
        
        console.log('PDF opened for drawing:', newPdfId);
      } else {
        console.error('No blob returned from PDF generation');
        alert('Failed to generate PDF. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      console.log('Starting PDF generation and download...');
      console.log('Form data:', formData);
      console.log('Time entries:', timeEntries);
      console.log('Equipment use:', equipmentUse);
      console.log('Special selections:', specialSelections);
      
      // Create enhanced form data that includes equipment use and crew members
      const enhancedFormData = {
        ...formData,
        equipmentUse: equipmentUse,
        remarks: customEntries.join('\n'), // Add crew members to remarks
      };
      
      // Create enhanced time entries with special selections
      const enhancedTimeEntries = timeEntries.map((entry, index) => ({
        ...entry,
        special: (specialSelections[index] || []).join('\n') || entry.special
      }));
      
      console.log('Enhanced form data:', enhancedFormData);
      console.log('Enhanced time entries:', enhancedTimeEntries);
      
      // Use the original EEST-specific PDF generator with actual form data
      const pdfResult = await generateEESTPDF(enhancedFormData, enhancedTimeEntries, {
        debugMode: true,
        returnBlob: true,
        fontSize: 6 // Adjust this value to control text size (6 = very small, 8 = small, 10 = medium, 12 = large)
      });
      console.log('PDF generation result:', pdfResult);
      
      if (pdfResult.blob) {
        // Generate filename based on form data
        const incidentName = formData.incidentName || 'Incident';
        const resourceNumber = formData.resourceOrderNumber || 'Resource';
        const operatorName = formData.operatorName || 'Operator';
        
        // Get the first date from time entries
        let firstDate = '';
        for (const entry of timeEntries) {
          if (entry.date && entry.date.trim()) {
            firstDate = entry.date.trim();
            break;
          }
        }
        
        // Clean up the date format if needed
        const cleanDate = firstDate.replace(/[^0-9\/]/g, ''); // Keep only numbers and slashes
        
        // Create filename
        const filename = `${incidentName}_${resourceNumber}_${cleanDate}_${operatorName}.pdf`;
        
        // Create download link
        const url = window.URL.createObjectURL(pdfResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('PDF downloaded successfully:', filename);
      } else {
        console.error('No blob returned from PDF generation');
        alert('Failed to generate PDF. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
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
                value="Inspected"
                checked={true}
                readOnly
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
              onClick={handleGeneratePDF}
              style={{
                padding: '14px 20px',
                backgroundColor: '#28a745',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              📝 Generate & Draw PDF
            </button>
            

          </div>
        </div>
      </div>

      {/* PDF Drawing Container */}
      {pdfId && (
        <div style={{
          marginTop: '20px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          background: 'white'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              PDF Drawing Mode
            </h3>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={handleDownloadPDF}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📄 Download Original PDF
              </button>
              <button 
                onClick={() => {
                  // This will trigger the export from PDFDrawingViewer
                  const exportEvent = new CustomEvent('export-pdf-with-drawings');
                  window.dispatchEvent(exportEvent);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: '1px solid #28a745',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#218838';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#28a745';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                ✏️ Download PDF with Drawings
              </button>
            </div>
          </div>
          <div style={{
            height: '600px',
            width: '100%'
          }}>
            <PDFDrawingViewer 
              pdfId={pdfId} 
              className="no-export-button"
              onDrawingChange={handleDrawingChange}
              initialDrawingData={drawingData || undefined}
              onExport={(pdfBlob) => {
                // Generate filename based on form data
                const incidentName = formData.incidentName || 'Incident';
                const resourceNumber = formData.resourceOrderNumber || 'Resource';
                const operatorName = formData.operatorName || 'Operator';
                
                // Get the first date from time entries
                let firstDate = '';
                for (const entry of timeEntries) {
                  if (entry.date && entry.date.trim()) {
                    firstDate = entry.date.trim();
                    break;
                  }
                }
                
                // Clean up the date format if needed
                const cleanDate = firstDate.replace(/[^0-9\/]/g, ''); // Keep only numbers and slashes
                
                // Create filename
                const filename = `${incidentName}_${resourceNumber}_${cleanDate}_${operatorName}_with_drawings.pdf`;
                
                // Create download link
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        </div>
      )}

      {/* PDF Preview Container */}


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
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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

      {/* PDF Debugger - Only show in development or when debugging */}
      {import.meta.env.DEV && (
        <PDFDebugger 
          onTestPDF={async () => {
            try {
              const testFormData = {
                ...formData,
                equipmentUse: equipmentUse,
                remarks: customEntries.join('\n'),
              };
              const testTimeEntries = timeEntries.map((entry, index) => ({
                ...entry,
                special: (specialSelections[index] || []).join('\n') || entry.special
              }));
              
              await generateEESTPDF(testFormData, testTimeEntries, {
                debugMode: true,
                returnBlob: true,
                fontSize: 6
              });
            } catch (error) {
              console.error('PDF generation test failed:', error);
              throw error;
            }
          }}
        />
      )}

    </div>
  );
};

export default EESTTimeTable; 