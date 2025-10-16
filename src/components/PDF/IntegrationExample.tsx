// Example of how to integrate the improved PDF viewer with zoom and signing fidelity
import React from 'react';
import { ZoomSigningDemo } from './ZoomSigningDemo';

export const IntegrationExample: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Enhanced PDF Viewer Integration Example</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>How to Use the Enhanced PDF Viewer</h2>
        <p>
          The new EnhancedPDFViewer component provides a fixed 200% zoom for optimal viewing 
          and signing with precise coordinate mapping. Here's how to integrate it:
        </p>
        
        <pre style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          overflow: 'auto',
          fontSize: '14px'
        }}>
{`import { EnhancedPDFViewer } from './components/PDF/EnhancedPDFViewer';

function MyComponent() {
  const pdfViewerRef = useRef<EnhancedPDFViewerRef>(null);
  
  const handleSave = (pdfData: Blob, previewImage: Blob) => {
    // Handle the saved PDF with improved signature fidelity
    console.log('PDF saved with precise coordinate mapping');
  };
  
  return (
    <EnhancedPDFViewer
      ref={pdfViewerRef}
      pdfId="your-pdf-id"
      onSave={handleSave}
      initialZoom={1.0}
      showZoomControls={true}
      style={{ minHeight: '600px' }}
    />
  );
}`}
        </pre>
      </div>

      {/* Live Demo */}
      <div>
        <h2>Live Demo</h2>
        <p>
          Try the enhanced PDF viewer below. Notice the improved:
        </p>
        <ul>
          <li><strong>Zoom Controls:</strong> Precise zoom levels with consistent behavior</li>
          <li><strong>Signature Quality:</strong> Pixel-perfect coordinate mapping</li>
          <li><strong>Mobile Support:</strong> Better touch handling and responsiveness</li>
          <li><strong>Performance:</strong> Simplified scaling calculations</li>
        </ul>
        
        <ZoomSigningDemo 
          pdfId="demo-pdf" // Replace with actual PDF ID
          style={{ marginTop: '20px' }}
        />
      </div>
    </div>
  );
};

export default IntegrationExample;
