// Example component demonstrating how to use the EEST save handler
import React, { useState } from 'react';
import { EESTPDFViewer } from './EESTPDFViewer';
import { type EESTSaveOptions } from '../../utils/PDF/eestSaveHandler';
import { type EESTFormData, type EESTTimeEntry, FormType } from '../../utils/engineTimeDB';

export const EESTSaveExample: React.FC = () => {
  const [saveOptions, setSaveOptions] = useState<EESTSaveOptions>({
    date: new Date().toISOString().split('T')[0],
    incidentName: 'Example Fire',
    incidentNumber: 'FIRE-2024-001',
    contractorAgencyName: 'Example Contracting Co.',
    isSigned: false
  });

  // Example EEST form data
  const exampleFormData: EESTFormData = {
    formType: FormType.EEST,
    agreementNumber: 'AG-2024-001',
    resourceOrderNumber: 'RO-2024-001',
    contractorAgencyName: 'Example Contracting Co.',
    incidentName: 'Example Fire',
    incidentNumber: 'FIRE-2024-001',
    operatorName: 'John Doe',
    equipmentMake: 'Caterpillar',
    equipmentModel: 'D6T',
    serialNumber: 'CAT123456',
    licenseNumber: 'LIC789',
    equipmentStatus: 'Contractor',
    invoicePostedBy: 'JD',
    dateSigned: new Date().toISOString().split('T')[0],
    remarks: 'Equipment in good working condition',
    remarksOptions: ['HOTLINE', 'Self Sufficient - No Meals Provided'],
    customRemarks: ['Custom remark 1', 'Custom remark 2']
  };

  // Example time entries
  const exampleTimeEntries: EESTTimeEntry[] = [
    {
      id: 1,
      date: '2024-01-15',
      start: '0800',
      stop: '1700',
      work: '9.0',
      special: 'None'
    },
    {
      id: 2,
      date: '2024-01-16',
      start: '0800',
      stop: '1600',
      work: '8.0',
      special: 'Travel'
    }
  ];

  const handleSave = (pdfData: Blob, previewImage: Blob) => {
    console.log('EEST PDF saved:', {
      pdfSize: pdfData.size,
      previewSize: previewImage.size,
      saveOptions
    });
    
    // You can handle the saved PDF data here
    // For example, upload to server, store in database, etc.
  };

  const handleBeforeSign = async () => {
    console.log('About to sign EEST PDF...');
    // You can perform any pre-signing operations here
    // For example, validate form data, show confirmation dialog, etc.
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>EEST Save Handler Example</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Save Options:</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label>
            Incident Name:
            <input
              type="text"
              value={saveOptions.incidentName || ''}
              onChange={(e) => setSaveOptions(prev => ({ ...prev, incidentName: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
          
          <label>
            Incident Number:
            <input
              type="text"
              value={saveOptions.incidentNumber || ''}
              onChange={(e) => setSaveOptions(prev => ({ ...prev, incidentNumber: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
          
          <label>
            Contractor Agency Name:
            <input
              type="text"
              value={saveOptions.contractorAgencyName || ''}
              onChange={(e) => setSaveOptions(prev => ({ ...prev, contractorAgencyName: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '8px' }}>
        <h3>EEST PDF Viewer with Save Handler:</h3>
        <EESTPDFViewer
          pdfId="eest-form"
          onSave={handleSave}
          onBeforeSign={handleBeforeSign}
          eestSaveOptions={{
            ...saveOptions,
            formData: exampleFormData,
            timeEntries: exampleTimeEntries
          }}
          style={{ maxWidth: '100%' }}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h4>Features of the EEST Save Handler:</h4>
        <ul>
          <li>✅ EEST-specific signature positioning adjustments</li>
          <li>✅ Form data validation before saving</li>
          <li>✅ Automatic field mapping using EEST field mapper</li>
          <li>✅ EEST-specific filename generation</li>
          <li>✅ Metadata saving to database</li>
          <li>✅ Fallback to simple save if needed</li>
          <li>✅ Mobile and iPad-specific adjustments</li>
        </ul>
      </div>
    </div>
  );
};

export default EESTSaveExample;
