// Federal Time Table
import React, { useState, useEffect } from 'react';
// 

// 
import type { FederalEquipmentEntry, FederalPersonnelEntry, FederalFormData } from '../utils/engineTimeDB';
// 
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



// 
export const FederalTimeTable: React.FC = () => {


  // Federal form data state
  const [federalFormData, setFederalFormData] = useState<FederalFormData>({
    //
    agreementNumber: '',
    //
    contractorAgencyName: '',
    //
    resourceOrderNumber: '',
    //
    incidentName: '',
    //
    incidentNumber: '',
    //
    financialCode: '',
    //
    equipmentMakeModel: '',
    //
    equipmentType: '',
    //
    serialVinNumber: '',
    //
    licenseIdNumber: '',
    //
    transportRetained: '',
    //
    isFirstLastTicket: '',
    //
    rateType: '',
    //
    remarks: '',
  });

  // Equipment entries state
  const [equipmentEntries, setEquipmentEntries] = useState<FederalEquipmentEntry[]>([]);

  // Personnel entries state
  const [personnelEntries, setPersonnelEntries] = useState<FederalPersonnelEntry[]>([]);



  // PDF preview state
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [showSignaturePage, setShowSignaturePage] = useState(false);

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
      // get the updated personnel entry
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      saveFederalPersonnelEntry(updated[index]);
      return updated;
    });
  };

  const handleSignatureCapture = () => {
    setShowSignaturePage(true);
  };
  
  const handleSignatureSave = (signature: string) => {
    setShowSignaturePage(false);
    console.log('Signature saved:', signature);
    // You can add additional logic here like saving to IndexedDB or showing a success message
  };
  
  const handleSignatureCancel = () => {
    setShowSignaturePage(false);
  };

  const handleGeneratePDF = async () => {
    try {
      // Clear previous PDF
      setPdfId(null);

      // For now, just fetch the PDF directly without field mapping
      const response = await fetch('/OF297-24.pdf');
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const pdfBlob = await response.blob();
      
      // Generate a unique ID for this PDF
      const newPdfId = `federal_${Date.now()}`;
      
      // Store the PDF in IndexedDB
      await storePDF(newPdfId, pdfBlob);
      
      // Set the PDF ID for viewing
      setPdfId(newPdfId);
      
      console.log('PDF loaded and stored successfully:', newPdfId);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };



  return (
    <>
      <table className="form-table">
        <tbody>
          <tr>
            <td className="field-label" colSpan={3} style={{ 
              textAlign: 'center', 
              fontSize: '1.2rem', 
              fontWeight: 'bold',
              padding: '15px',
              backgroundColor: '#f8f9fa'
            }}>
              Federal - Emergency Equipment Shift Ticket
            </td>
          </tr>
          <tr>
            <td className="field-label" style={{ width: '33.33%' }}>
              Agreement Number
            </td>
            <td className="field-label" style={{ width: '33.33%' }}>
              Contractor/Agency Name
            </td>
            <td className="field-label" style={{ width: '33.33%' }}>
              Resource Order Number
            </td>
          </tr>
          <tr>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.agreementNumber}
                onChange={e => handleFederalFormChange('agreementNumber', e.target.value)}
                placeholder=""
              />
            </td>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.contractorAgencyName}
                onChange={e => handleFederalFormChange('contractorAgencyName', e.target.value)}
                placeholder=""
              />
            </td>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.resourceOrderNumber}
                onChange={e => handleFederalFormChange('resourceOrderNumber', e.target.value)}
                placeholder=""
              />
            </td>
          </tr>
          <tr>
            <td className="field-label" style={{ width: '33.33%' }}>
              Incident Name
            </td>
            <td className="field-label" style={{ width: '33.33%' }}>
              Incident Number
            </td>
            <td className="field-label" style={{ width: '33.33%' }}>
              Financial Code
            </td>
          </tr>
          <tr>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.incidentName}
                onChange={e => handleFederalFormChange('incidentName', e.target.value)}
                placeholder=""
              />
            </td>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.incidentNumber}
                onChange={e => handleFederalFormChange('incidentNumber', e.target.value)}
                placeholder=""
              />
            </td>
            <td className="field-input">
              <input
                type="text"
                value={federalFormData.financialCode}
                onChange={e => handleFederalFormChange('financialCode', e.target.value)}
                placeholder=""
              />
            </td>
          </tr>
          <tr>
            <td className="field-label" colSpan={3}>
              <table className="form-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                <tbody>
                  <tr>
                    <td className="field-label" style={{ width: '25%', borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
                      Equipment Make/Model
                    </td>
                    <td className="field-label" style={{ width: '25%', borderTop: 'none', borderBottom: 'none' }}>
                      Equipment Type
                    </td>
                    <td className="field-label" style={{ width: '25%', borderTop: 'none', borderBottom: 'none' }}>
                      Serial/VIN Number
                    </td>
                    <td className="field-label" style={{ width: '25%', borderTop: 'none', borderBottom: 'none', borderRight: 'none' }}>
                      License/ID Number
                    </td>
                  </tr>
                  <tr>
                    <td className="field-input" style={{ borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
                      <input
                        type="text"
                        value={federalFormData.equipmentMakeModel}
                        onChange={e => handleFederalFormChange('equipmentMakeModel', e.target.value)}
                        placeholder=""
                      />
                    </td>
                    <td className="field-input" style={{ borderTop: 'none', borderBottom: 'none' }}>
                      <input
                        type="text"
                        value={federalFormData.equipmentType}
                        onChange={e => handleFederalFormChange('equipmentType', e.target.value)}
                        placeholder=""
                      />
                    </td>
                    <td className="field-input" style={{ borderTop: 'none', borderBottom: 'none' }}>
                      <input
                        type="text"
                        value={federalFormData.serialVinNumber}
                        onChange={e => handleFederalFormChange('serialVinNumber', e.target.value)}
                        placeholder=""
                      />
                    </td>
                    <td className="field-input" style={{ borderTop: 'none', borderBottom: 'none', borderRight: 'none' }}>
                      <input
                        type="text"
                        value={federalFormData.licenseIdNumber}
                        onChange={e => handleFederalFormChange('licenseIdNumber', e.target.value)}
                        placeholder=""
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', padding: '10px' }}>
              Equipment
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', padding: '12px' }}>
              <label style={{ fontWeight: 600, marginRight: '1rem' }}>Transport Retained?</label>
              <select
                value={federalFormData.transportRetained}
                onChange={e => handleFederalFormChange('transportRetained', e.target.value)}
                style={{ padding: '0.5rem', fontSize: '1rem', minWidth: '100px' }}
              >
                <option value="">Select...</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </td>
          </tr>
          <tr>
            <td className="field-label" style={{ width: '33.33%' }}>
              Is this a First/Last Ticket?
            </td>
            <td className="field-label" style={{ width: '33.33%' }}>
              Rate Type
            </td>
            <td className="field-label" style={{ width: '33.33%' }} rowSpan={2}>
              Special Rates, indicate type and quantity (ex: 1 Day)
            </td>
          </tr>
          <tr>
            <td className="field-input">
              <select
                value={federalFormData.isFirstLastTicket}
                onChange={e => handleFederalFormChange('isFirstLastTicket', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
              >
                <option value="Neither">Neither</option>
                <option value="Mobilization">Mobilization</option>
                <option value="Demobilization">Demobilization</option>
              </select>
            </td>
            <td className="field-input">
              <select
                value={federalFormData.rateType}
                onChange={e => handleFederalFormChange('rateType', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
              >
                <option value="HOURS">Hours</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Equipment 7-column table for Date, Start, Stop, Total, Quantity, Type, Remarks */}
      <table className="form-table" style={{ margin: '24px 0' }}>
        <thead>
          <tr>
            <th style={{ width: '12%' }}>Date</th>
            <th style={{ width: '12%' }}>Start</th>
            <th style={{ width: '12%' }}>Stop</th>
            <th style={{ width: '12%' }}>Total</th>
            <th style={{ width: '12%' }}>Quantity</th>
            <th style={{ width: '12%' }}>Type</th>
            <th style={{ width: '18%' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
         {Array.from({ length: 4 }, (_, idx) => {
           const entry = equipmentEntries[idx] || { date: '', start: '', stop: '', total: '', quantity: '', type: '', remarks: '' };
           return (
            <tr key={idx}>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.date}
                 onChange={e => handleEquipmentEntryChange(idx, 'date', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.start}
                 onChange={e => handleEquipmentEntryChange(idx, 'start', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.stop}
                 onChange={e => handleEquipmentEntryChange(idx, 'stop', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.total}
                 onChange={e => handleEquipmentEntryChange(idx, 'total', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.quantity}
                 onChange={e => handleEquipmentEntryChange(idx, 'quantity', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.type}
                 onChange={e => handleEquipmentEntryChange(idx, 'type', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.remarks}
                 onChange={e => handleEquipmentEntryChange(idx, 'remarks', e.target.value)}
               />
             </td>
            </tr>
           );
         })}
        </tbody>
      </table>

      <table className="form-table" style={{ borderTop: 'none', marginBottom: 0 }}>
        <tbody>
          <tr>
            <td colSpan={8} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', padding: '0px', border: '1px solid #ddd', borderTop: 'none' }}>
              Personnel
            </td>
          </tr>
        </tbody>
      </table>

      {/* Personnel 8-column table for Date, Name, Start, Stop, Start, Stop, Total, Remarks */}
      <table className="form-table" style={{ margin: '24px 0' }}>
        <thead>
          <tr>
            <th style={{ width: '11%' }}>Date</th>
            <th style={{ width: '22%' }}>Name</th>
            <th style={{ width: '9%' }}>Start</th>
            <th style={{ width: '9%' }}>Stop</th>
            <th style={{ width: '9%' }}>Start</th>
            <th style={{ width: '8%' }}>Stop</th>
            <th style={{ width: '11%' }}>Total</th>
            <th style={{ width: '20%' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
         {Array.from({ length: 4 }, (_, idx) => {
           const entry = personnelEntries[idx] || { date: '', name: '', start1: '', stop1: '', start2: '', stop2: '', total: '', remarks: '' };
           return (
            <tr key={idx}>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.date}
                 onChange={e => handlePersonnelEntryChange(idx, 'date', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.name}
                 onChange={e => handlePersonnelEntryChange(idx, 'name', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.start1}
                 onChange={e => handlePersonnelEntryChange(idx, 'start1', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.stop1}
                 onChange={e => handlePersonnelEntryChange(idx, 'stop1', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.start2}
                 onChange={e => handlePersonnelEntryChange(idx, 'start2', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.stop2}
                 onChange={e => handlePersonnelEntryChange(idx, 'stop2', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.total}
                 onChange={e => handlePersonnelEntryChange(idx, 'total', e.target.value)}
               />
             </td>
             <td className="field-input">
               <input 
                 type="text" 
                 value={entry.remarks}
                 onChange={e => handlePersonnelEntryChange(idx, 'remarks', e.target.value)}
               />
             </td>
            </tr>
           );
         })}
        </tbody>
      </table>

      <div className="pdf-controls" style={{ marginTop: '20px', textAlign: 'right' }}>
        <button 
          onClick={handleSignatureCapture}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Add Signature
        </button>
        <button 
          onClick={handleGeneratePDF}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Preview PDF
        </button>
      </div>

      {pdfId && (
        <div style={{ marginTop: '20px', height: '800px', border: '1px solid #ccc' }}>
         <PDFViewer
           pdfId={pdfId}
           style={{ width: '100%', height: '100%' }}
         />
        </div>
      )}

      {showSignaturePage && (
        <SignaturePage
          onSave={handleSignatureSave}
          onCancel={handleSignatureCancel}
        />
      )}
    </>
  );
}; 