import React, { useState, useEffect, useRef } from 'react';
import { getPDF } from '../utils/pdfStorage';

interface EnhancedPDFViewerProps {
  pdfId: string;
  contractorSignature?: string;
  governmentSignature?: string;
  onLoad?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({ 
  pdfId, 
  contractorSignature, 
  governmentSignature,
  onLoad, 
  className, 
  style 
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        position: 'relative',
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
        <>
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&view=FitH`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#fff'
            }}
            title="PDF Viewer"
          />
          
          {/* Signature Overlays */}
          {contractorSignature && (
            <div style={{
              position: 'absolute',
              left: '10%',
              bottom: '15%',
              width: '80px',
              height: '40px',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              <img 
                src={contractorSignature} 
                alt="Contractor Signature"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '0',
                fontSize: '10px',
                color: '#007bff',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 4px',
                borderRadius: '2px'
              }}>
                Contractor
              </div>
            </div>
          )}
          
          {governmentSignature && (
            <div style={{
              position: 'absolute',
              left: '60%',
              bottom: '15%',
              width: '80px',
              height: '40px',
              zIndex: 1000,
              pointerEvents: 'none'
            }}>
              <img 
                src={governmentSignature} 
                alt="Government Signature"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '0',
                fontSize: '10px',
                color: '#6c757d',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 4px',
                borderRadius: '2px'
              }}>
                Government
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedPDFViewer; 