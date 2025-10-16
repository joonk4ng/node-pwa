// Test component to verify mobile fit functionality
import React, { useRef, useState } from 'react';
import { EnhancedPDFViewer, type EnhancedPDFViewerRef } from './EnhancedPDFViewer';

export const MobileFitTest: React.FC = () => {
  const pdfViewerRef = useRef<EnhancedPDFViewerRef>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testFitFunctions = () => {
    addTestResult('Testing fit functions...');
    
    // Test zoom functionality
    setTimeout(() => {
      pdfViewerRef.current?.setZoom(1.5);
      addTestResult('Zoom set to 150%');
    }, 500);
    
    // Test another zoom level
    setTimeout(() => {
      pdfViewerRef.current?.setZoom(2.0);
      addTestResult('Zoom set to 200%');
    }, 1000);
    
    // Test current zoom
    setTimeout(() => {
      const currentZoom = pdfViewerRef.current?.getCurrentZoom() || 0;
      addTestResult(`Current zoom: ${Math.round(currentZoom * 100)}%`);
    }, 1500);
  };

  const testMobileSpecific = () => {
    const isMobile = window.innerWidth <= 768;
    addTestResult(`Device: ${isMobile ? 'Mobile' : 'Desktop'} (${window.innerWidth}x${window.innerHeight})`);
    
    // Test mobile-specific zoom
    if (isMobile) {
      pdfViewerRef.current?.setZoom(0.8);
      addTestResult('Set mobile-friendly zoom: 80%');
    } else {
      pdfViewerRef.current?.setZoom(1.2);
      addTestResult('Set desktop zoom: 120%');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>📱 Mobile Fit Function Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Device Info:</h3>
        <p>Screen: {window.innerWidth} × {window.innerHeight}</p>
        <p>Device: {window.innerWidth <= 768 ? 'Mobile' : 'Desktop'}</p>
        <p>User Agent: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={testFitFunctions} style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Test Fit Functions
        </button>
        <button onClick={testMobileSpecific} style={{ padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
          Test Mobile Specific
        </button>
        <button onClick={clearResults} style={{ padding: '10px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Clear Results
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Results:</h3>
        <div style={{ 
          background: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px', 
          padding: '10px',
          maxHeight: '200px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {testResults.length === 0 ? (
            <p style={{ color: '#6c757d', margin: 0 }}>No tests run yet. Click a test button above.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '5px', fontFamily: 'monospace' }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
        <EnhancedPDFViewer
          ref={pdfViewerRef}
          pdfId="test-pdf"
          showZoomControls={true}
          style={{ minHeight: '400px' }}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e9ecef', borderRadius: '8px' }}>
        <h4>Expected Behavior:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>Desktop:</strong> Fit functions should use container dimensions</li>
          <li><strong>Mobile:</strong> Fit functions should use viewport dimensions minus UI space</li>
          <li><strong>All devices:</strong> PDF should scale to fit without cropping</li>
          <li><strong>Fixed Zoom:</strong> 200% zoom for optimal viewing and signing</li>
          <li><strong>Console:</strong> Check browser console for detailed fit calculations</li>
        </ul>
      </div>
    </div>
  );
};

export default MobileFitTest;
