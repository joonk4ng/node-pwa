import React, { useState } from 'react';

interface PDFDebuggerProps {
  onTestPDF: () => Promise<void>;
}

const PDFDebugger: React.FC<PDFDebuggerProps> = ({ onTestPDF }) => {
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
      
      // Also test the actual PDF generation
      setDebugInfo(prev => prev + '\nTesting PDF generation...\n');
      await onTestPDF();
      setDebugInfo(prev => prev + '✓ PDF generation test completed\n');
      
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
      maxWidth: '400px',
      zIndex: 1000,
      fontSize: '12px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>PDF Debugger</h4>
      <button 
        onClick={testPDFLoading} 
        disabled={isLoading}
        style={{ marginBottom: '10px' }}
      >
        {isLoading ? 'Testing...' : 'Test PDF Loading'}
      </button>
      <div style={{ 
        background: '#fff', 
        padding: '8px', 
        border: '1px solid #ddd',
        borderRadius: '2px',
        maxHeight: '200px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace'
      }}>
        {debugInfo || 'Click "Test PDF Loading" to debug PDF issues...'}
      </div>
    </div>
  );
};

export default PDFDebugger;
