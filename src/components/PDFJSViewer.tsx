import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getPDF } from '../utils/pdfStorage';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFJSViewerProps {
  pdfId: string;
  onLoad?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const PDFJSViewer: React.FC<PDFJSViewerProps> = ({ pdfId, onLoad, className, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(2.0); // Fixed zoom level
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Load PDF with PDF.js
        const arrayBuffer = await pdfData.pdf.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        
        console.log('PDF.js loaded successfully:', pdfId);
        onLoad?.();
        
      } catch (err) {
        console.error('Error loading PDF with PDF.js:', err);
        setError('Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfId, onLoad]);

  // Render current page - bottom portion only
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;

      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale });
        
        // Calculate dimensions to show only bottom portion
        const containerHeight = 400; // Fixed height for signature area
        const containerWidth = 600; // Fixed width
        
        canvas.height = containerHeight;
        canvas.width = containerWidth;

        // Calculate the portion of the PDF to show (bottom half)
        const pdfHeight = viewport.height;
        const pdfWidth = viewport.width;
        
        // Show bottom 40% of the PDF
        const cropHeight = pdfHeight * 0.4;
        const cropY = pdfHeight - cropHeight;
        
        // Center the crop area horizontally
        const cropX = (pdfWidth - containerWidth) / 2;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: [1, 0, 0, 1, -cropX, -cropY], // Transform to show bottom portion
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, scale]);

  // Simple page navigation only
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

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
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Simple Controls */}
      <div style={{
        padding: '8px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        fontSize: '12px',
        justifyContent: 'center'
      }}>
        <button 
          onClick={prevPage} 
          disabled={currentPage <= 1}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: currentPage <= 1 ? '#f5f5f5' : '#fff',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Previous Page
        </button>
        <span style={{ fontWeight: '500' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={nextPage} 
          disabled={currentPage >= totalPages}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: currentPage >= totalPages ? '#f5f5f5' : '#fff',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next Page →
        </button>
      </div>

      {/* Loading */}
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
      
      {/* PDF Canvas - Signature Area */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          padding: '20px'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            border: '1px solid #ddd'
          }}
        />
      </div>
    </div>
  );
};

export default PDFJSViewer;
