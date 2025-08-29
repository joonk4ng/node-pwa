import React, { useState } from 'react';
import { generateEESTPDF } from '../utils/pdfGenerator';

interface PDFDebuggerProps {
  onTestPDF: () => Promise<void>;
}

const PDFDebugger: React.FC<PDFDebuggerProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const testPDFLoading = async () => {
    setIsLoading(true);
    setDebugInfo('Testing PDF loading...\n');
    
    try {
      // Test different PDF loading methods
      const tests = [
        {
          name: 'Direct fetch with base path',
          test: async () => {
            const basePath = import.meta.env.BASE_URL || '/';
            const url = `${basePath}eest-fill.pdf?t=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            return { success: response.ok, status: response.status, url };
          }
        },
        {
          name: 'Public path fetch',
          test: async () => {
            const response = await fetch('/eest-fill.pdf', { cache: 'no-store' });
            return { success: response.ok, status: response.status, url: '/eest-fill.pdf' };
          }
        },
        {
          name: 'Module import',
          test: async () => {
            try {
              const pdfModule = await import('/eest-fill.pdf?url');
              const response = await fetch(pdfModule.default);
              return { success: response.ok, status: response.status, url: pdfModule.default };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              return { success: false, status: 0, url: 'module import failed', error: errorMessage };
            }
          }
        }
      ];

      let results = '';
      for (const test of tests) {
        try {
          const result = await test.test();
          results += `${test.name}: ${result.success ? '✓ SUCCESS' : '✗ FAILED'} (${result.status})\n`;
          if (!result.success) {
            results += `  URL: ${result.url}\n`;
            if ('error' in result && result.error) {
              results += `  Error: ${result.error}\n`;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results += `${test.name}: ✗ ERROR - ${errorMessage}\n`;
        }
      }

      setDebugInfo(prev => prev + '\n' + results);
      
      // Test the actual PDF generation with detailed logging
      setDebugInfo(prev => prev + '\nTesting PDF generation with field mapping...\n');
      
      // Create test data
      const testFormData = {
        agreementNumber: 'TEST-AGREEMENT-123',
        resourceOrderNumber: 'RO-456',
        contractorAgencyName: 'Test Contractor',
        incidentName: 'Test Incident',
        incidentNumber: 'INC-789',
        operatorName: 'John Doe',
        equipmentMake: 'Test Make',
        equipmentModel: 'Test Model',
        serialNumber: 'SN-123456',
        licenseNumber: 'LIC-789',
        equipmentStatus: 'Contractor',
        invoicePostedBy: 'Test User',
        dateSigned: '01/01/2024',
        remarks: 'Test remarks',
        remarksOptions: ['HOTLINE'],
        customRemarks: [],
        equipmentUse: 'HOURS'
      };
      
      const testTimeEntries = [
        {
          date: '01/01/2024',
          start: '0800',
          stop: '1700',
          work: 'Fire suppression',
          special: 'Test special'
        }
      ];
      
      const result = await generateEESTPDF(testFormData, testTimeEntries, {
        debugMode: true,
        returnBlob: true,
        fontSize: 6
      });
      
      if (result.debugInfo) {
        setDebugInfo(prev => prev + `\n✓ PDF generation completed\n`);
        setDebugInfo(prev => prev + `Available fields: ${result.debugInfo?.availableFields?.length || 0}\n`);
        setDebugInfo(prev => prev + `Mapped fields: ${Object.keys(result.debugInfo?.mappedFields || {}).length}\n`);
        setDebugInfo(prev => prev + `Filled fields: ${result.debugInfo?.filledFields?.length || 0}\n`);
        
        // Show successful vs failed fields
        const successful = result.debugInfo?.filledFields?.filter(f => f.success) || [];
        const failed = result.debugInfo?.filledFields?.filter(f => !f.success) || [];
        
        setDebugInfo(prev => prev + `\nSuccessful fills: ${successful.length}\n`);
        setDebugInfo(prev => prev + `Failed fills: ${failed.length}\n`);
        
        if (failed.length > 0) {
          setDebugInfo(prev => prev + `\nFailed fields:\n`);
          failed.forEach(field => {
            const errorMessage = 'error' in field ? field.error : 'Unknown error';
            setDebugInfo(prev => prev + `  ${field.name}: ${errorMessage}\n`);
          });
        }
        
        if (successful.length > 0) {
          setDebugInfo(prev => prev + `\nSuccessful fields (first 5):\n`);
          successful.slice(0, 5).forEach(field => {
            setDebugInfo(prev => prev + `  ${field.name}: "${field.value}"\n`);
          });
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDebugInfo(prev => prev + `✗ PDF generation failed: ${errorMessage}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '10px', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      maxWidth: '500px',
      zIndex: 1000,
      fontSize: '12px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>PDF Debugger</h4>
      <button 
        onClick={testPDFLoading} 
        disabled={isLoading}
        style={{ marginBottom: '10px' }}
      >
        {isLoading ? 'Testing...' : 'Test PDF Loading & Field Mapping'}
      </button>
      <div style={{ 
        background: '#fff', 
        padding: '8px', 
        border: '1px solid #ddd',
        borderRadius: '2px',
        maxHeight: '300px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace'
      }}>
        {debugInfo || 'Click "Test PDF Loading & Field Mapping" to debug PDF issues...'}
      </div>
    </div>
  );
};

export default PDFDebugger;
