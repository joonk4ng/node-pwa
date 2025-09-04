import React, { useState, useEffect } from 'react';
import '../styles/components/TimeEntryTable.css';
import type { EngineTimeRow, EngineTimeForm } from '../utils/engineTimeDB';
import {
  saveEngineTimeRow,
  loadAllEngineTimeRows,
  saveEngineTimeForm,
  loadEngineTimeForm
} from '../utils/engineTimeDB';

// DEMO USAGE: PDFViewer
import PDFDrawingViewer from './PDFDrawingViewer';
import { generateEquipmentPDF } from '../utils/pdfGenerator';
import type { TimeEntry, CrewInfo } from '../utils/pdfFieldMapper';
import SignatureModal from './SignatureModal';
import { storeDrawing, getDrawing } from '../utils/drawingStorage';
import { type DrawingData } from './DrawingOverlay';

import { FederalTimeTable } from './FederalTimeTable';
import { storePDF } from '../utils/pdfStorage';

// initial empty row
const EMPTY_ROW: EngineTimeRow = {
  date: '',
  equipmentUse: 'HOURS',
  equipBegin: '',
  equipEnd: '',
  name: '',
  job: '',
  timeBegin: '',
  timeEnd: '',
};

// number of rows
const NUM_ROWS = 6;

// interface for the time entry table
interface TimeEntryTableProps {
  tableType?: 'equipment' | 'personnel';
}

// time entry table component
const TimeEntryTable: React.FC<TimeEntryTableProps> = ({ tableType = 'equipment' }) => {
  // Use the prop to determine which table to show
  const [activeTable] = useState<'equipment' | 'personnel'>(tableType);

  // Main form state
  const [formData, setFormData] = useState({
    divUnit: '',
    shift: '',
    ownerContractor: '',
    contractNumber: '',
    resourceReqNo: '',
    resourceType: 'GOVERNMENT',
    doubleShifted: 'NO',
    incidentName: '',
    incidentNumber: '',
    equipmentType: '',
    equipmentMakeModel: '',
    remarks: '',
    ownerIdNumber: '',
    licenseVinSerial: '',
    equipmentUse: 'HOURS',
  });

  // Remarks section state
  const [checkboxStates, setCheckboxStates] = useState({
    hotline: false,
    noMealsLodging: false,
    noMeals: false,
    travel: false,
    noLunch: false,
  });
  const [customEntries, setCustomEntries] = useState<string[]>([]);
  const [customEntryInput, setCustomEntryInput] = useState('');
  const [remarksOpen, setRemarksOpen] = useState(false);

  // Equipment Use selector (global for all rows)
  const [equipmentUse, setEquipmentUse] = useState<'HOURS' | 'MILES' | 'DAYS'>('HOURS');

  // Engine Time Table State
  const [rows, setRows] = useState<EngineTimeRow[]>(Array(NUM_ROWS).fill(null).map(() => ({ ...EMPTY_ROW })));

  // Load from IndexedDB on mount
  useEffect(() => {
    // Load time entry rows
    loadAllEngineTimeRows().then(dbRows => {
      const filled = Array(NUM_ROWS)
        .fill(null)
        .map((_, i) => dbRows[i] ? dbRows[i] : { ...EMPTY_ROW });
      setRows(filled);
    });
    // Load main form and remarks
    loadEngineTimeForm().then((saved) => {
      if (saved) {
        setFormData({
          divUnit: saved.divUnit,
          shift: saved.shift,
          ownerContractor: saved.ownerContractor,
          contractNumber: saved.contractNumber,
          resourceReqNo: saved.resourceReqNo,
          resourceType: saved.resourceType,
          doubleShifted: saved.doubleShifted,
          incidentName: saved.incidentName,
          incidentNumber: saved.incidentNumber,
          equipmentType: saved.equipmentType,
          equipmentMakeModel: saved.equipmentMakeModel,
          remarks: saved.remarks,
          ownerIdNumber: saved.ownerIdNumber,
          licenseVinSerial: saved.licenseVinSerial,
          equipmentUse: 'HOURS', // fallback, not in EngineTimeForm
        });
        setCheckboxStates({
          hotline: saved.remarksOptions.includes('HOTLINE'),
          noMealsLodging: saved.remarksOptions.includes('Self Sufficient - No Meals Provided'),
          noMeals: saved.remarksOptions.includes('Self Sufficient - No Lodging Provided'),
          travel: saved.remarksOptions.includes('Travel'),
          noLunch: saved.remarksOptions.includes('No Lunch Taken due to Uncontrolled Fire'),
        });
        setCustomEntries(saved.customRemarks || []);
        // If you want to persist equipmentUse, you can add it to EngineTimeForm and handle here
      }
    });
  }, []);

  // Autosave main form and remarks
  useEffect(() => {
    const remarksOptions = [
      ...(checkboxStates.hotline ? ['HOTLINE'] : []),
      ...(checkboxStates.noMealsLodging ? ['Self Sufficient - No Meals Provided'] : []),
      ...(checkboxStates.noMeals ? ['Self Sufficient - No Lodging Provided'] : []),
      ...(checkboxStates.travel ? ['Travel'] : []),
      ...(checkboxStates.noLunch ? ['No Lunch Taken due to Uncontrolled Fire'] : []),
    ];
    const form: EngineTimeForm = {
      ...formData,
      remarksOptions,
      customRemarks: customEntries,
    };
    saveEngineTimeForm(form);
  }, [formData, checkboxStates, customEntries]);

  // Handle cell change and autosave
  const handleCellChange = (rowIdx: number, field: keyof EngineTimeRow, value: string) => {
    setRows(prevRows => {
      const updatedRows = [...prevRows];
      updatedRows[rowIdx] = { ...updatedRows[rowIdx], [field]: value };
      saveEngineTimeRow(updatedRows[rowIdx]);
      return updatedRows;
    });
  };
  // handle checkbox change
  const handleCheckboxChange = (key: keyof typeof checkboxStates) => {
    setCheckboxStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // handle remove custom entry
  const handleRemoveCustomEntry = (entry: string) => {
    setCustomEntries(prev => prev.filter(e => e !== entry));
  };

  // handle add custom entry
  const handleAddCustomEntry = () => {
    if (customEntryInput.trim() && !customEntries.includes(customEntryInput.trim())) {
      setCustomEntries(prev => [...prev, customEntryInput.trim()]);
      setCustomEntryInput('');
    }
  };

  // Remarks summary logic
  const remarksOptions = [
    { key: 'hotline', label: 'HOTLINE' },
    { key: 'noMealsLodging', label: 'Self Sufficient - No Meals Provided' },
    { key: 'noMeals', label: 'Self Sufficient - No Lodging Provided' },
    { key: 'travel', label: 'Travel' },
    { key: 'noLunch', label: 'No Lunch Taken due to Uncontrolled Fire' },
  ];
  const checkedRemarks = remarksOptions
    .filter(opt => checkboxStates[opt.key as keyof typeof checkboxStates])
    .map(opt => opt.label)
    .concat(customEntries);

  // Add state for PDF preview
  const [pdfId, setPdfId] = useState<string | null>(null);

  // Add state for signature modal and data
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Add state for drawing data
  const [drawingData, setDrawingData] = useState<DrawingData | null>(null);

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


  const handleSignatureCapture = () => {
    setIsSignatureModalOpen(true);
  };

  const handleSignatureSave = () => {
    setIsSignatureModalOpen(false);
  };

    const handleGeneratePDF = async () => {
    try {
      // Clear previous PDF
      setPdfId(null);

      // Transform the rows into TimeEntry format
      const timeEntries: TimeEntry[] = rows
        .filter(row => row.date || row.name || row.job) // Only include rows with data
        .map(row => ({
          date: row.date,
          equipmentUse: equipmentUse,
          equipBegin: row.equipBegin,
          equipEnd: row.equipEnd,
          name: row.name,
          job: row.job,
          timeBegin: row.timeBegin,
          timeEnd: row.timeEnd
        }));

      // Transform form data into CrewInfo format
      const crewInfo: CrewInfo = {
        divUnit: formData.divUnit,
        shift: formData.shift,
        ownerContractor: formData.ownerContractor,
        contractNumber: formData.contractNumber,
        resourceReqNo: formData.resourceReqNo,
        resourceType: formData.resourceType as 'GOVERNMENT' | 'CONTRACT' | 'PRIVATE',
        doubleShifted: formData.doubleShifted as 'YES' | 'NO',
        incidentName: formData.incidentName,
        incidentNumber: formData.incidentNumber,
        equipmentType: formData.equipmentType,
        equipmentMakeModel: formData.equipmentMakeModel,
        licenseVinSerial: formData.licenseVinSerial,
        ownerIdNumber: formData.ownerIdNumber,
        checkboxStates: {
          hotline: checkboxStates.hotline,
          travel: checkboxStates.travel,
          noMealsLodging: checkboxStates.noMealsLodging,
          noMeals: checkboxStates.noMeals,
          noLunch: checkboxStates.noLunch
        },
        customEntries: customEntries
      };

      // Generate PDF and store in IndexedDB
      const result = await generateEquipmentPDF(timeEntries, crewInfo, {
        debugMode: true,
        returnBlob: true,
        downloadImmediately: false
      });
      
      if (result.blob) {
        // Generate a unique ID for this PDF
        const newPdfId = `odf_${Date.now()}`;
        
        // Store the PDF in IndexedDB
        await storePDF(newPdfId, result.blob);
        
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
      }

      console.log('PDF Generation Results:', {
        availableFields: result.debugInfo?.availableFields.length,
        mappedFields: Object.keys(result.debugInfo?.mappedFields || {}).length,
        successfulFields: result.debugInfo?.filledFields.filter(f => f.success).length,
        failedFields: result.debugInfo?.filledFields.filter(f => !f.success).length
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const timeEntries: TimeEntry[] = rows
        .filter(row => row.date || row.name || row.job)
        .map(row => ({
          date: row.date,
          equipmentUse: equipmentUse,
          equipBegin: row.equipBegin,
          equipEnd: row.equipEnd,
          name: row.name,
          job: row.job,
          timeBegin: row.timeBegin,
          timeEnd: row.timeEnd
        }));

      const crewInfo: CrewInfo = {
        divUnit: formData.divUnit,
        shift: formData.shift,
        ownerContractor: formData.ownerContractor,
        contractNumber: formData.contractNumber,
        resourceReqNo: formData.resourceReqNo,
        resourceType: formData.resourceType as 'GOVERNMENT' | 'CONTRACT' | 'PRIVATE',
        doubleShifted: formData.doubleShifted as 'YES' | 'NO',
        incidentName: formData.incidentName,
        incidentNumber: formData.incidentNumber,
        equipmentType: formData.equipmentType,
        equipmentMakeModel: formData.equipmentMakeModel,
        licenseVinSerial: formData.licenseVinSerial,
        ownerIdNumber: formData.ownerIdNumber,
        checkboxStates: {
          hotline: checkboxStates.hotline,
          travel: checkboxStates.travel,
          noMealsLodging: checkboxStates.noMealsLodging,
          noMeals: checkboxStates.noMeals,
          noLunch: checkboxStates.noLunch
        },
        customEntries: customEntries
      };

      await generateEquipmentPDF(timeEntries, crewInfo, {
        debugMode: true,
        downloadImmediately: true
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please check the console for details.');
    }
  };

  return (
    <div className="time-entry-container">
      {activeTable === 'equipment' ? (
        // Equipment Time Table
        <>
          <div className="form-card">
            <div className="form-card-header">
              <h3> ODF EMERGENCY EQUIPMENT SHIFT TICKET</h3>
            </div>
            
            <div className="form-content">
            {/* Individual form fields stacked vertically */}
            <div className="form-group">
              <label>1. DIV/UNIT</label>
              <input
                type="text"
                value={formData.divUnit}
                onChange={e => setFormData(prev => ({ ...prev, divUnit: e.target.value }))}
                placeholder="Enter division/unit"
              />
            </div>
            
            <div className="form-group">
              <label>2. SHIFT</label>
              <input
                type="text"
                value={formData.shift}
                onChange={e => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                placeholder="Enter shift"
              />
            </div>
            
            <div className="form-group">
              <label>Owner/Contractor</label>
              <input
                type="text"
                value={formData.ownerContractor}
                onChange={e => setFormData(prev => ({ ...prev, ownerContractor: e.target.value }))}
                placeholder="Enter owner/contractor"
              />
            </div>
            
            <div className="form-group">
              <label>Contract/Agreement Number</label>
              <input
                type="text"
                value={formData.contractNumber}
                onChange={e => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                placeholder="Enter contract number"
              />
            </div>
            
            <div className="form-group">
              <label>Resource Req. No.</label>
              <input
                type="text"
                value={formData.resourceReqNo}
                onChange={e => setFormData(prev => ({ ...prev, resourceReqNo: e.target.value }))}
                placeholder="Enter resource request number"
              />
            </div>
            
            <div className="form-group">
              <label>Resource Type</label>
              <select
                value={formData.resourceType}
                onChange={e => setFormData(prev => ({ ...prev, resourceType: e.target.value as 'GOVERNMENT' | 'CONTRACT' | 'PRIVATE' }))}
              >
                <option value="GOVERNMENT">GOVERNMENT</option>
                <option value="CONTRACT">CONTRACT</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Double Shifted</label>
              <select
                value={formData.doubleShifted}
                onChange={e => setFormData(prev => ({ ...prev, doubleShifted: e.target.value as 'YES' | 'NO' }))}
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Incident Name</label>
              <input
                type="text"
                value={formData.incidentName}
                onChange={e => setFormData(prev => ({ ...prev, incidentName: e.target.value }))}
                placeholder="Enter incident name"
              />
            </div>
            
            <div className="form-group">
              <label>Incident Number</label>
              <input
                type="text"
                value={formData.incidentNumber}
                onChange={e => setFormData(prev => ({ ...prev, incidentNumber: e.target.value }))}
                placeholder="Enter incident number"
              />
            </div>
            <div className="form-group">
              <label>Equipment Type</label>
              <input
                type="text"
                value={formData.equipmentType}
                onChange={e => setFormData(prev => ({ ...prev, equipmentType: e.target.value }))}
                placeholder="Enter equipment type"
              />
            </div>
            
            <div className="form-group">
              <label>Make/Model</label>
              <input
                type="text"
                value={formData.equipmentMakeModel}
                onChange={e => setFormData(prev => ({ ...prev, equipmentMakeModel: e.target.value }))}
                placeholder="Enter make/model"
              />
            </div>
            
            <div className="form-group">
              <label>Owner ID Number</label>
              <input
                type="text"
                value={formData.ownerIdNumber}
                onChange={e => setFormData(prev => ({ ...prev, ownerIdNumber: e.target.value }))}
                placeholder="Enter owner ID number"
              />
            </div>
            
            <div className="form-group">
              <label>LIC/VIN/SERIAL</label>
              <input
                type="text"
                value={formData.licenseVinSerial}
                onChange={e => setFormData(prev => ({ ...prev, licenseVinSerial: e.target.value }))}
                placeholder="Enter license/VIN/serial"
              />
            </div>
            
            {/* Remarks Section */}
            <div className="form-group full-width">
              <div className="remarks-header-row">
                <label>Remarks</label>
                <button
                  type="button"
                  className="remarks-dropdown-toggle"
                  onClick={() => setRemarksOpen((open) => !open)}
                  aria-expanded={remarksOpen}
                >
                  {remarksOpen ? '▲' : '▼'}
                </button>
              </div>
              {remarksOpen ? (
                <div className="remarks-dropdown-content">
                  <div className="checkbox-options scrollable">
                    <div className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={checkboxStates.hotline}
                        onChange={() => handleCheckboxChange('hotline')}
                        id="hotline-checkbox"
                      />
                      <label htmlFor="hotline-checkbox">HOTLINE</label>
                    </div>
                    <div className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={checkboxStates.noMealsLodging}
                        onChange={() => handleCheckboxChange('noMealsLodging')}
                        id="no-meals-lodging-checkbox"
                      />
                      <label htmlFor="no-meals-lodging-checkbox">Self Sufficient - No Meals Provided</label>
                    </div>
                    <div className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={checkboxStates.noMeals}
                        onChange={() => handleCheckboxChange('noMeals')}
                        id="no-meals-checkbox"
                      />
                      <label htmlFor="no-meals-checkbox">Self Sufficient - No Lodging Provided</label>
                    </div>
                    <div className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={checkboxStates.travel}
                        onChange={() => handleCheckboxChange('travel')}
                        id="travel-checkbox"
                      />
                      <label htmlFor="travel-checkbox">Travel</label>
                    </div>
                    <div className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={checkboxStates.noLunch}
                        onChange={() => handleCheckboxChange('noLunch')}
                        id="no-lunch-checkbox"
                      />
                      <label htmlFor="no-lunch-checkbox">No Lunch Taken due to Uncontrolled Fire</label>
                    </div>
                    {customEntries.map((entry, index) => (
                      <div key={index} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          id={`custom-entry-${index}`}
                        />
                        <label htmlFor={`custom-entry-${index}`}>{entry}</label>
                        <button
                          className="remove-entry"
                          onClick={() => handleRemoveCustomEntry(entry)}
                          aria-label="Remove entry"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="custom-entry-row">
                    <input
                      type="text"
                      value={customEntryInput}
                      onChange={e => setCustomEntryInput(e.target.value)}
                      placeholder="Add custom remark"
                      className="custom-entry-input"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEntry(); } }}
                    />
                    <button
                      type="button"
                      className="add-entry-btn"
                      onClick={handleAddCustomEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="remarks-summary">
                  {checkedRemarks.length === 0 ? (
                    <span className="remarks-placeholder">No remarks selected</span>
                  ) : (
                    <ul className="remarks-list">
                      {checkedRemarks.map((remark, idx) => (
                        <li key={idx}>{remark}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

                <div className="time-entries-section">
          <div className="time-entries-header">
            <h3>Time Entries</h3>
            <div className="equipment-use-selector">
              <label>Equipment Use:</label>
              <select
                value={equipmentUse}
                onChange={e => setEquipmentUse(e.target.value as 'HOURS' | 'MILES' | 'DAYS')}
              >
                <option value="HOURS">HOURS</option>
                <option value="MILES">MILES</option>
                <option value="DAYS">DAYS</option>
              </select>
            </div>
          </div>
          
          <div className="time-entries-table">
            <table>
              <thead>
                <tr>
                  <th>Date<br/>MO/DAY/YR</th>
                  <th>Eq Start</th>
                  <th>Eq End</th>
                  <th>Name(s)</th>
                  <th>Job</th>
                  <th>Time<br/>Start</th>
                  <th>Time<br/>End</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td>
                      <input
                        type="text"
                        value={row.date}
                        onChange={e => handleCellChange(rowIdx, 'date', e.target.value)}
                        placeholder="Date"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.equipBegin}
                        onChange={e => handleCellChange(rowIdx, 'equipBegin', e.target.value)}
                        placeholder="Begin"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.equipEnd}
                        onChange={e => handleCellChange(rowIdx, 'equipEnd', e.target.value)}
                        placeholder="End"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.name}
                        onChange={e => handleCellChange(rowIdx, 'name', e.target.value)}
                        placeholder="Name(s)"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.job}
                        onChange={e => handleCellChange(rowIdx, 'job', e.target.value)}
                        placeholder="Job"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.timeBegin}
                        onChange={e => handleCellChange(rowIdx, 'timeBegin', e.target.value)}
                        placeholder="Begin"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.timeEnd}
                        onChange={e => handleCellChange(rowIdx, 'timeEnd', e.target.value)}
                        placeholder="End"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      ) : (
        // Federal Equipment Time Table
        <FederalTimeTable />
      )}

      {activeTable === 'equipment' && (
        <div className="pdf-controls">
          <button onClick={handleSignatureCapture}>
            ✍️ Add Signature
          </button>
          <button onClick={handleGeneratePDF}>
            📝 Generate & Draw PDF
          </button>
          <button onClick={handleDownloadPDF}>
            📥 Download PDF
          </button>
        </div>
      )}

      {activeTable === 'equipment' && pdfId && (
        <div className="pdf-preview-container">
          <div className="pdf-drawing-header">
            <h3>PDF Drawing Mode</h3>
            <div className="pdf-drawing-actions">
              <button 
                onClick={handleDownloadPDF}
                className="download-pdf-btn"
              >
                📄 Download Original PDF
              </button>
              <button 
                onClick={() => {
                  // This will trigger the export from PDFDrawingViewer
                  const exportEvent = new CustomEvent('export-pdf-with-drawings');
                  window.dispatchEvent(exportEvent);
                }}
                className="download-with-drawings-btn"
              >
                ✏️ Download PDF with Drawings
              </button>
            </div>
          </div>
          <PDFDrawingViewer 
            pdfId={pdfId} 
            className="no-export-button"
            onDrawingChange={handleDrawingChange}
            initialDrawingData={drawingData || undefined}
            onExport={(pdfBlob) => {
              // Create download link
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `equipment-time-report-with-drawings.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          />
        </div>
      )}

      {activeTable === 'equipment' && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={handleSignatureSave}
          title="Signature"
        />
      )}
    </div>
  );
};

// Example usage at the bottom of the file (for demonstration)
// Note: This demo would need a PDF stored in IndexedDB with the given ID
export const PDFDrawingViewerDemo = () => (
  <div style={{ width: '100%', height: 600 }}>
    <PDFDrawingViewer pdfId={'demo-pdf'} />
  </div>
);

export default TimeEntryTable; 