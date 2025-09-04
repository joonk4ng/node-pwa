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
import SignaturePage from './SignaturePage';
import { storePDF } from '../utils/pdfStorage';
import PDFViewer from './PDFViewer';

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
    remarks: '',
  });

  // Equipment entries state
  const [equipmentEntries, setEquipmentEntries] = useState<FederalEquipmentEntry[]>([]);

  // Personnel entries state
  const [personnelEntries, setPersonnelEntries] = useState<FederalPersonnelEntry[]>([]);

  // PDF preview state
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [showSignaturePage, setShowSignaturePage] = useState(false);

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState<{
    type: 'equipment' | 'personnel';
    index: number;
  } | null>(null);

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

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfId) {
        // No need to revokeObjectURL for IndexedDB blobs
      }
    };
  }, [pdfId]);

  // Handle Federal form data changes and autosave
  const handleFederalFormChange = (field: keyof FederalFormData, value: string) => {
    setFederalFormData(prev => {
      const updated = { ...prev, [field]: value };
      saveFederalFormData(updated);
      return updated;
    });
  };

  // Handle equipment entry changes and autosave
  const handleEquipmentEntryChange = (index: number, field: keyof FederalEquipmentEntry, value: string) => {
    setEquipmentEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      saveFederalEquipmentEntry(updated[index]);
      return updated;
    });
  };

  // Handle personnel entry changes and autosave
  const handlePersonnelEntryChange = (index: number, field: keyof FederalPersonnelEntry, value: string) => {
    setPersonnelEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      saveFederalPersonnelEntry(updated[index]);
      return updated;
    });
  };

  // Calendar handlers
  const handleCalendarOpen = (type: 'equipment' | 'personnel', index: number) => {
    setCalendarOpen({ type, index });
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
    } else {
      return personnelEntries[calendarOpen.index]?.date || '';
    }
  };

  const handleSignatureCapture = () => {
    setShowSignaturePage(true);
  };
  
  const handleSignatureSave = (signature: string) => {
    setShowSignaturePage(false);
    console.log('Signature saved:', signature);
  };
  
  const handleSignatureCancel = () => {
    setShowSignaturePage(false);
  };

  const handleGeneratePDF = async () => {
    try {
      setPdfId(null);
      const response = await fetch('/OF297-24.pdf');
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const pdfBlob = await response.blob();
      const newPdfId = `federal_${Date.now()}`;
      await storePDF(newPdfId, pdfBlob);
      setPdfId(newPdfId);
      console.log('PDF loaded and stored successfully:', newPdfId);
      
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
                Agreement Number
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
                Contractor/Agency Name
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
                Resource Order Number
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
                Incident Name
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
                Incident Number
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
                Financial Code
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
                Equipment Make/Model
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
                Equipment Type
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
                Serial/VIN Number
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
                License/ID Number
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
                Transport Retained?
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
                First/Last Ticket?
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
                Rate Type
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
              {Array.from({ length: 4 }, (_, idx) => {
                const entry = equipmentEntries[idx] || { date: '', start: '', stop: '', total: '', quantity: '', type: '', remarks: '' };
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
                          Equipment Entry #{idx + 1}
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
                          Start
                        </label>
                        <input
                          type="text"
                          value={entry.start}
                          onChange={e => handleEquipmentEntryChange(idx, 'start', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="HH:MM"
                        />
                      </div>
                      
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          marginBottom: '4px',
                          display: 'block'
                        }}>
                          Stop
                        </label>
                        <input
                          type="text"
                          value={entry.stop}
                          onChange={e => handleEquipmentEntryChange(idx, 'stop', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#fff',
                            color: '#333'
                          }}
                          placeholder="HH:MM"
                        />
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
                      </div>
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
                            Start
                          </label>
                          <input
                            type="text"
                            value={entry.start1}
                            onChange={e => handlePersonnelEntryChange(idx, 'start1', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM"
                          />
                        </div>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Stop
                          </label>
                          <input
                            type="text"
                            value={entry.stop1}
                            onChange={e => handlePersonnelEntryChange(idx, 'stop1', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM"
                          />
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
                            Start
                          </label>
                          <input
                            type="text"
                            value={entry.start2}
                            onChange={e => handlePersonnelEntryChange(idx, 'start2', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM"
                          />
                        </div>
                        <div>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#6c757d',
                            marginBottom: '4px',
                            display: 'block'
                          }}>
                            Stop
                          </label>
                          <input
                            type="text"
                            value={entry.stop2}
                            onChange={e => handlePersonnelEntryChange(idx, 'stop2', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '16px',
                              backgroundColor: '#fff',
                              color: '#333'
                            }}
                            placeholder="HH:MM"
                          />
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
            justifyContent: 'flex-end'
          }}>
            <button 
              onClick={handleSignatureCapture}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Add Signature
            </button>
            <button 
              onClick={handleGeneratePDF}
              style={{
                padding: '12px 20px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              Preview PDF
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview */}
      {pdfId && (
        <div style={{ 
          marginTop: '20px',
          maxWidth: '800px',
          margin: '20px auto 0',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            PDF Preview
          </div>
          <div style={{ height: '600px', border: '1px solid #e9ecef' }}>
            <PDFViewer
              pdfId={pdfId}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignaturePage && (
        <SignaturePage
          onSave={handleSignatureSave}
          onCancel={handleSignatureCancel}
        />
      )}

             {/* Calendar Modal */}
       {calendarOpen && (
         <CalendarPicker
           isOpen={!!calendarOpen}
           onClose={handleCalendarClose}
           onSelectDate={handleDateSelect}
           currentDate={getCurrentDate()}
         />
       )}
    </div>
  );
}; 