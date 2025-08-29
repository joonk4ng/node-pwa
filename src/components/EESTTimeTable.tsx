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
import { storePDF, getPDF } from '../utils/pdfStorage';
import PDFViewer from './PDFViewer';
import SignatureModal from './SignatureModal';

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
  contractorSignature: undefined,
  governmentSignature: undefined,
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

  // PDF preview state
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [showLegacyViewer, setShowLegacyViewer] = useState(false);

  // New signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureType, setSignatureType] = useState<'contractor' | 'government' | null>(null);
  const [contractorSignature, setContractorSignature] = useState<string | undefined>(undefined);
  const [governmentSignature, setGovernmentSignature] = useState<string | undefined>(undefined);

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

  const handleCheckboxChange = (key: keyof typeof checkboxStates) => {
    setCheckboxStates(prev => ({ ...prev, [key]: !prev[key] }));
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
    setTimeEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };



  const handleContractorSignature = () => {
    setSignatureType('contractor');
    setShowSignatureModal(true);
  };

  const handleGovernmentSignature = () => {
    setSignatureType('government');
    setShowSignatureModal(true);
  };

  const handleSignatureSave = (signatureData: string) => {
    if (signatureType === 'contractor') {
      setContractorSignature(signatureData);
      console.log('Contractor signature saved');
    } else if (signatureType === 'government') {
      setGovernmentSignature(signatureData);
      console.log('Government signature saved');
    }
    setShowSignatureModal(false);
    setSignatureType(null);
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
    setSignatureType(null);
  };

  const handleGeneratePDF = async () => {
    try {
      console.log('Starting PDF generation...');
      console.log('Form data:', formData);
      console.log('Time entries:', timeEntries);
      console.log('Equipment use:', equipmentUse);
      console.log('Special selections:', specialSelections);
      console.log('Signatures:', { contractorSignature, governmentSignature });
      
      // Create enhanced form data that includes equipment use and crew members
      const enhancedFormData = {
        ...formData,
        equipmentUse: equipmentUse,
        remarks: customEntries.join('\n'), // Add crew members to remarks
        contractorSignature,
        governmentSignature
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
        const pdfId = `eest_${Date.now()}`;
        console.log('Storing PDF with ID:', pdfId);
        await storePDF(pdfId, pdfResult.blob);
        setPdfId(pdfId);
        console.log('PDF stored successfully');
      } else {
        console.error('No blob returned from PDF generation');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  const handleDownloadPDF = async () => {
    if (pdfId) {
      try {
        const pdfData = await getPDF(pdfId);
        if (pdfData && pdfData.pdf) {
          const url = window.URL.createObjectURL(pdfData.pdf);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'EEST_Time_Report.pdf';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          console.error('PDF data not found or invalid');
        }
      } catch (error) {
        console.error('Error downloading PDF:', error);
      }
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
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Generate PDF
            </button>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              width: '100%'
            }}>
              <button 
                onClick={handleContractorSignature}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#007bff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                  position: 'relative'
                }}
              >
                Contractor Signature
                {contractorSignature && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#28a745',
                    borderRadius: '50%'
                  }} />
                )}
              </button>
              
              <button 
                onClick={handleGovernmentSignature}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  flex: 1,
                  position: 'relative'
                }}
              >
                Government Signature
                {governmentSignature && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#28a745',
                    borderRadius: '50%'
                  }} />
                )}
              </button>
            </div>
            
            {pdfId && (
              <button 
                onClick={handleDownloadPDF}
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
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Preview Container */}
      {pdfId && (
        <div style={{
          maxWidth: '600px',
          margin: '20px auto 0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '16px 20px',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              PDF Preview
            </h3>
          </div>
          <div style={{
            padding: '20px',
            height: '600px',
            position: 'relative'
          }}>
            <PDFViewer pdfId={pdfId} />
          </div>
        </div>
      )}



      {/* Legacy Browser PDF Viewer - Collapsible */}
      <div style={{
        maxWidth: '600px',
        margin: '20px auto 0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setShowLegacyViewer(!showLegacyViewer)}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#f8f9fa',
            border: 'none',
            borderBottom: showLegacyViewer ? '1px solid #e9ecef' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#6c757d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>Legacy Browser PDF Viewer (Fallback)</span>
          <span>{showLegacyViewer ? '▼' : '▶'}</span>
        </button>
        
        {showLegacyViewer && pdfId && (
          <div style={{
            height: '400px',
            position: 'relative'
          }}>
            <PDFViewer pdfId={pdfId} />
          </div>
        )}
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

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={handleSignatureCancel}
        onSave={handleSignatureSave}
        title={signatureType === 'contractor' ? 'Contractor Signature' : 'Government Signature'}
      />


    </div>
  );
};

export default EESTTimeTable; 