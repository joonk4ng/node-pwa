import React, { useState, useEffect, useRef } from 'react';
import { getPDF } from '../utils/pdfStorage';

interface PDFViewerProps {
  pdfId: string;
  onLoad?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfId, onLoad, className, style }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load PDF from IndexedDB
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfId) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const pdfData = await getPDF(pdfId);
        if (!pdfData) {
          throw new Error('PDF not found in storage');
        }

        // Create object URL for iframe
        const url = URL.createObjectURL(pdfData.pdf);
        setPdfUrl(url);
        
        console.log('PDF loaded successfully:', pdfId);
        onLoad?.();
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();

    // Cleanup function
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfId, onLoad]);

  if (error) {
    return (
      <div 
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          color: 'red',
          ...style
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        ...style
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px 40px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          color: '#495057',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1001
        }}>
          Loading PDF...
        </div>
      )}
      
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#fff'
          }}
          title="PDF Viewer"
        />
      )}
    </div>
  );
};

export default PDFViewer; 