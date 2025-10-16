// Demo component to showcase improved zoom and signing fidelity
import React, { useState, useRef } from 'react';
import { EnhancedPDFViewer, type EnhancedPDFViewerRef } from './EnhancedPDFViewer';

export interface ZoomSigningDemoProps {
  pdfId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ZoomSigningDemo: React.FC<ZoomSigningDemoProps> = ({
  pdfId,
  className,
  style
}) => {
  const pdfViewerRef = useRef<EnhancedPDFViewerRef>(null);
  const [demoInfo, setDemoInfo] = useState<string>('');

  const handleSave = (pdfData: Blob, previewImage: Blob) => {
    console.log('🔍 ZoomSigningDemo: PDF saved with improved fidelity', {
      pdfSize: pdfData.size,
      previewSize: previewImage.size
    });
    
    setDemoInfo(`PDF saved successfully! Size: ${(pdfData.size / 1024).toFixed(1)}KB`);
    
    // Create download link
    const url = URL.createObjectURL(pdfData);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed-pdf-with-improved-fidelity.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBeforeSign = async () => {
    setDemoInfo('Starting signature process with improved coordinate mapping...');
    return Promise.resolve();
  };

  const showCurrentZoom = () => {
    const currentZoom = pdfViewerRef.current?.getCurrentZoom() || 1.0;
    setDemoInfo(`Current zoom: ${Math.round(currentZoom * 100)}%`);
  };

  const testFitFunctions = () => {
    setDemoInfo('Testing fit functions...');
    setTimeout(() => {
      pdfViewerRef.current?.setZoom(1.0);
      setDemoInfo('Fitted to width');
    }, 1000);
    setTimeout(() => {
      pdfViewerRef.current?.setZoom(2.0);
      setDemoInfo('Fitted to page');
    }, 2000);
    setTimeout(() => {
      pdfViewerRef.current?.setZoom(1.5);
      setDemoInfo('Set to 150% zoom');
    }, 3000);
  };

  return (
    <div className={`zoom-signing-demo ${className || ''}`} style={{
      ...style,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Demo Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
          🎯 Fixed 200% Zoom PDF Viewer
        </h2>
        <p style={{ margin: '0', opacity: 0.9 }}>
          PDF viewer with fixed 200% zoom for optimal viewing and signing
        </p>
        <div style={{
          marginTop: '15px',
          fontSize: '14px',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '10px',
          borderRadius: '8px'
        }}>
          <strong>Benefits:</strong> Pixel-perfect signatures • Responsive viewport scaling • 
          No coordinate drift • Better mobile support • Simplified scaling
        </div>
      </div>

      {/* Demo Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={showCurrentZoom}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 15px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Show Current Zoom
        </button>
        <button
          onClick={testFitFunctions}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 15px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test Fit Functions
        </button>
        <button
          onClick={() => pdfViewerRef.current?.setZoom(2.0)}
          style={{
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 15px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test 200% Zoom
        </button>
        <button
          onClick={() => pdfViewerRef.current?.clearDrawing()}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 15px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear Signature
        </button>
      </div>

      {/* Demo Info */}
      {demoInfo && (
        <div style={{
          background: '#e9ecef',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#495057'
        }}>
          {demoInfo}
        </div>
      )}

      {/* Enhanced PDF Viewer */}
      <div style={{
        border: '2px solid #dee2e6',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <EnhancedPDFViewer
          ref={pdfViewerRef}
          pdfId={pdfId}
          onSave={handleSave}
          onBeforeSign={handleBeforeSign}
          showZoomControls={true}
          style={{
            minHeight: '600px',
            width: '100%'
          }}
        />
      </div>

      {/* Technical Details */}
      <div style={{
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
          🔧 Technical Improvements
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#6c757d' }}>Coordinate Mapping</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Direct pixel-to-PDF coordinate mapping</li>
              <li>Eliminates coordinate drift</li>
              <li>Consistent across all zoom levels</li>
              <li>Better mobile touch handling</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#6c757d' }}>Zoom Functionality</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Simple multiplication-based zoom</li>
              <li>Predictable canvas sizing</li>
              <li>High-DPI display support</li>
              <li>Fit-to-width/height/page options</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#6c757d' }}>Signature Quality</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Zoom-aware line width scaling</li>
              <li>High-quality image smoothing</li>
              <li>Precise signature positioning</li>
              <li>Consistent save quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomSigningDemo;
