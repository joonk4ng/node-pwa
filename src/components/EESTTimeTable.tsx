import React, { useState, useEffect } from 'react';
import type { EESTFormData, EESTTimeEntry } from '../utils/engineTimeDB';
import {
  saveEESTFormData,
  loadEESTFormData,
  saveEESTTimeEntry,
  loadAllEESTTimeEntries,
  deleteEESTTimeEntry
} from '../utils/engineTimeDB';
import SignaturePage from './SignaturePage';
import { generateEquipmentPDF } from '../utils/pdfGenerator';
import type { TimeEntry, CrewInfo } from '../utils/pdfFieldMapper';
import { storePDF } from '../utils/pdfStorage';
import PDFViewer from './PDFViewer';

const EMPTY_TIME_ENTRY: EESTTimeEntry = {
  date: '',
  start: '',
  stop: '',
  work: '',
  special: '',
};

const EMPTY_FORM_DATA: EESTFormData = {
  agreementNumber: '',
  resourceOrderNumber: '',
  contractorName: '',
  incidentName: '',
  incidentNumber: '',
  operatorName: '',
  equipmentMake: '',
  equipmentModel: '',
  serialNumber: '',
  licenseNumber: '',
  equipmentStatus: '',
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
  const [customEntryInput, setCustomEntryInput] = useState('');
  const [remarksOpen, setRemarksOpen] = useState(false);

  // Time entries state - start with one row
  const [timeEntries, setTimeEntries] = useState<EESTTimeEntry[]>([{ ...EMPTY_TIME_ENTRY }]);

  // PDF preview state
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [showSignaturePage, setShowSignaturePage] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Load EEST data from IndexedDB on mount
  useEffect(() => {
    loadEESTFormData().then((saved) => {
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
      }
    });

    loadAllEESTTimeEntries().then((entries) => {
      if (entries.length > 0) {
        setTimeEntries(entries);
      }
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
    saveEESTFormData(updatedFormData);
  }, [formData, checkboxStates, customEntries]);

  // Save time entries whenever they change
  useEffect(() => {
    timeEntries.forEach((entry, index) => {
      if (entry.id) {
        saveEESTTimeEntry(entry);
      } else if (entry.date || entry.start || entry.stop || entry.work || entry.special) {
        saveEESTTimeEntry(entry).then(() => {
          // The save function doesn't return an ID, so we'll handle this differently
          // For now, just save without updating the ID
        });
      }
    });
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

  const handleAddCustomEntry = () => {
    if (customEntryInput.trim()) {
      setCustomEntries(prev => [...prev, customEntryInput.trim()]);
      setCustomEntryInput('');
    }
  };

  // Compute checked remarks for display
  const checkedRemarks = [
    ...(checkboxStates.hotline ? ['HOTLINE'] : []),
    ...(checkboxStates.noMealsLodging ? ['Self Sufficient - No Meals Provided'] : []),
    ...(checkboxStates.noMeals ? ['Self Sufficient - No Lodging Provided'] : []),
    ...(checkboxStates.travel ? ['Travel'] : []),
    ...(checkboxStates.noLunch ? ['No Lunch Taken due to Uncontrolled Fire'] : []),
    ...customEntries,
  ];

  const handleTimeEntryChange = (index: number, field: keyof EESTTimeEntry, value: string) => {
    setTimeEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const addTimeEntry = () => {
    setTimeEntries(prev => [...prev, { ...EMPTY_TIME_ENTRY }]);
  };

  const removeTimeEntry = (index: number) => {
    if (timeEntries[index].id) {
      deleteEESTTimeEntry(timeEntries[index].id!);
    }
    setTimeEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignatureCapture = () => {
    setShowSignaturePage(true);
  };

  const handleSignatureSave = (signature: string) => {
    setSignatureData(signature);
    setShowSignaturePage(false);
  };

  const handleSignatureCancel = () => {
    setShowSignaturePage(false);
  };

  const handleGeneratePDF = async () => {
    try {
      // Convert EEST data to the format expected by PDF generator
      const timeEntriesForPDF: TimeEntry[] = timeEntries.map(entry => ({
        date: entry.date,
        start: entry.start,
        stop: entry.stop,
        work: entry.work,
        special: entry.special,
      }));

      const crewInfo: CrewInfo = {
        resourceReqNo: formData.resourceOrderNumber,
        ownerContractor: formData.contractorName,
        incidentName: formData.incidentName,
        incidentNumber: formData.incidentNumber,
        equipmentMakeModel: `${formData.equipmentMake} ${formData.equipmentModel}`.trim(),
        licenseVinSerial: formData.licenseNumber,
        ownerIdNumber: formData.serialNumber,
        remarks: formData.remarks,
      };

      const pdfResult = await generateEquipmentPDF(timeEntriesForPDF, crewInfo);
      if (pdfResult.blob) {
        const pdfId = `eest_${Date.now()}`;
        await storePDF(pdfId, pdfResult.blob);
        setPdfId(pdfId);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (pdfId) {
      try {
        const response = await fetch(`/api/pdf/${pdfId}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'EEST_Time_Report.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading PDF:', error);
      }
    }
  };

  return (
    <div className="eest-time-table">
      <h2>Emergency Equipment Shift Ticket</h2>
      
      {/* Main Form Section */}
      <div className="form-section">
        <table className="form-table">
          <tbody>
            <tr>
              <th className="field-label">Agreement Number</th>
              <th className="field-label">Contractor Name</th>
            </tr>
            <tr>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.agreementNumber}
                  onChange={(e) => handleFormChange('agreementNumber', e.target.value)}
                />
              </td>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.contractorName}
                  onChange={(e) => handleFormChange('contractorName', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className="form-table">
          <tbody>
            <tr>
              <th className="field-label">Incident Name</th>
              <th className="field-label">Incident Number</th>
              <th className="field-label">Operator</th>
            </tr>
            <tr>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.incidentName}
                  onChange={(e) => handleFormChange('incidentName', e.target.value)}
                />
              </td>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.incidentNumber}
                  onChange={(e) => handleFormChange('incidentNumber', e.target.value)}
                />
              </td>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.operatorName}
                  onChange={(e) => handleFormChange('operatorName', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className="form-table">
          <tbody>
            <tr>
              <th className="field-label">Equipment Make</th>
              <th className="field-label">Model</th>
              <th className="field-label">Furnished By</th>
            </tr>
            <tr>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.equipmentMake}
                  onChange={(e) => handleFormChange('equipmentMake', e.target.value)}
                />
              </td>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.equipmentModel}
                  onChange={(e) => handleFormChange('equipmentModel', e.target.value)}
                />
              </td>
              <td className="field-input">
                <select
                  value={formData.equipmentStatus}
                  onChange={(e) => handleFormChange('equipmentStatus', e.target.value)}
                >
                  <option value="Contractor">Contractor</option>
                  <option value="Government">Government</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="form-table">
          <tbody>
            <tr>
              <th className="field-label">Serial Number</th>
              <th className="field-label">License Number</th>
              <th className="field-label">Supplies Furnished By</th>
            </tr>
            <tr>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => handleFormChange('serialNumber', e.target.value)}
                />
              </td>
              <td className="field-input">
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                />
              </td>
              <td className="field-input">
                <select
                  value={formData.equipmentStatus}
                  onChange={(e) => handleFormChange('equipmentStatus', e.target.value)}
                >
                  <option value="Contractor">Contractor</option>
                  <option value="Government">Government</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        
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
                    id="eest-hotline-checkbox"
                  />
                  <label htmlFor="eest-hotline-checkbox">HOTLINE</label>
                </div>
                <div className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checkboxStates.noMealsLodging}
                    onChange={() => handleCheckboxChange('noMealsLodging')}
                    id="eest-no-meals-lodging-checkbox"
                  />
                  <label htmlFor="eest-no-meals-lodging-checkbox">Self Sufficient - No Meals Provided</label>
                </div>
                <div className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checkboxStates.noMeals}
                    onChange={() => handleCheckboxChange('noMeals')}
                    id="eest-no-meals-checkbox"
                  />
                  <label htmlFor="eest-no-meals-checkbox">Self Sufficient - No Lodging Provided</label>
                </div>
                <div className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checkboxStates.travel}
                    onChange={() => handleCheckboxChange('travel')}
                    id="eest-travel-checkbox"
                  />
                  <label htmlFor="eest-travel-checkbox">Travel</label>
                </div>
                <div className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checkboxStates.noLunch}
                    onChange={() => handleCheckboxChange('noLunch')}
                    id="eest-no-lunch-checkbox"
                  />
                  <label htmlFor="eest-no-lunch-checkbox">No Lunch Taken due to Uncontrolled Fire</label>
                </div>
                {customEntries.map((entry, index) => (
                  <div key={index} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      id={`eest-custom-entry-${index}`}
                    />
                    <label htmlFor={`eest-custom-entry-${index}`}>{entry}</label>
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

      {/* Time Entries Section */}
      <div className="time-entries-section">
        <h3>Time Entries</h3>
        <div className="table-container">
          <table className="time-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Start</th>
                <th>Stop</th>
                <th>Work</th>
                <th>Special</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleTimeEntryChange(index, 'date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={entry.start}
                      onChange={(e) => handleTimeEntryChange(index, 'start', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={entry.stop}
                      onChange={(e) => handleTimeEntryChange(index, 'stop', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.work}
                      onChange={(e) => handleTimeEntryChange(index, 'work', e.target.value)}
                      placeholder="Work description"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={entry.special}
                      onChange={(e) => handleTimeEntryChange(index, 'special', e.target.value)}
                      placeholder="Special instructions"
                    />
                  </td>
                  <td className="actions-cell">
                    {timeEntries.length > 1 && (
                      <button
                        onClick={() => removeTimeEntry(index)}
                        className="remove-btn"
                        aria-label="Remove time entry"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addTimeEntry} className="add-row-btn">
          Add Time Entry
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={handleSignatureCapture} className="signature-btn">
          Capture Signature
        </button>
        <button onClick={handleGeneratePDF} className="generate-btn">
          Generate PDF
        </button>
        {pdfId && (
          <button onClick={handleDownloadPDF} className="download-btn">
            Download PDF
          </button>
        )}
      </div>

      {/* PDF Preview */}
      {pdfId && (
        <div className="pdf-preview">
          <h3>PDF Preview</h3>
          <PDFViewer pdfId={pdfId} />
        </div>
      )}

      {/* Signature Modal */}
      {showSignaturePage && (
        <SignaturePage
          onSave={handleSignatureSave}
          onCancel={handleSignatureCancel}
        />
      )}
    </div>
  );
};

export default EESTTimeTable; 