import React, { useState, useEffect } from 'react';
import '../styles/components/TimeEntryTable.css';
import type { EngineTimeRow, ODFFormData } from '../utils/engineTimeDB';
import { FormType } from '../utils/engineTimeDB';
import {
  saveEngineTimeRow,
  loadAllEngineTimeRows,
  saveODFFormData,
  loadODFFormData
} from '../utils/engineTimeDB';

import { FederalTimeTable } from './FederalTimeTable';

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

  // Main form state - using ODF form structure
  const [formData, setFormData] = useState<ODFFormData>({
    formType: FormType.ODF,
    divUnit: '',
    shift: '',
    ownerContractor: '',
    contractNumber: '',
    resourceReqNo: '',
    resourceType: '',
    doubleShifted: '',
    agreementNumber: '',
    contractorAgencyName: '',
    resourceOrderNumber: '',
    incidentName: '',
    incidentNumber: '',
    equipmentType: '',
    equipmentMakeModel: '',
    ownerIdNumber: '',
    licenseVinSerial: '',
    remarks: '',
    remarksOptions: [],
    customRemarks: [],
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
    loadODFFormData().then((saved) => {
      if (saved) {
        setFormData({
          formType: saved.formType,
          divUnit: saved.divUnit,
          shift: saved.shift,
          ownerContractor: saved.ownerContractor,
          contractNumber: saved.contractNumber,
          resourceReqNo: saved.resourceReqNo,
          resourceType: saved.resourceType,
          doubleShifted: saved.doubleShifted,
          agreementNumber: saved.agreementNumber,
          contractorAgencyName: saved.contractorAgencyName,
          resourceOrderNumber: saved.resourceOrderNumber,
          incidentName: saved.incidentName,
          incidentNumber: saved.incidentNumber,
          equipmentType: saved.equipmentType,
          equipmentMakeModel: saved.equipmentMakeModel,
          ownerIdNumber: saved.ownerIdNumber,
          licenseVinSerial: saved.licenseVinSerial,
          remarks: saved.remarks,
          remarksOptions: saved.remarksOptions || [],
          customRemarks: saved.customRemarks || []
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
    const form: ODFFormData = {
      ...formData,
      remarksOptions,
      customRemarks: customEntries,
    };
    saveODFFormData(form);
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


    </div>
  );
};


export default TimeEntryTable; 