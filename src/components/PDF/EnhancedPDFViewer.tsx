// Enhanced PDF Viewer with improved zoom and signing fidelity - Fixed JSX Structure
import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFCanvas, type PDFCanvasRef } from './PDFCanvas';
import { DrawingCanvas, type DrawingCanvasRef } from './DrawingCanvas';
import { savePDFWithSignature, downloadOriginalPDF } from '../../utils/PDF/pdfSaveHandler';
import { PDF_PAGE_SIZE } from '../../utils/PDF/pdfConstants';
import '../../styles/components/PDFViewer.css';
import '../../styles/components/ResponsivePDFViewer.css';

export interface EnhancedPDFViewerProps {
  pdfId?: string;
  onSave?: (pdfData: Blob, previewImage: Blob) => void;
  onBeforeSign?: () => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  crewInfo?: {
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  date?: string;
  showZoomControls?: boolean;
}

export interface EnhancedPDFViewerRef {
  handleSave: () => void;
  handleDownload: () => void;
  isDrawingMode: boolean;
  toggleDrawingMode: () => void;
  clearDrawing: () => void;
  setZoom: (zoomLevel: number) => void;
  getCurrentZoom: () => number;
}

export const EnhancedPDFViewer = forwardRef<EnhancedPDFViewerRef, EnhancedPDFViewerProps>(({
  pdfId,
  onSave,
  onBeforeSign,
  className,
  style,
  readOnly = false,
  crewInfo,
  date,
  showZoomControls = false // Hide zoom controls
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<PDFCanvasRef>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(2.0); // Fixed at 200%
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Handle PDF loading
  const handlePDFLoaded = useCallback((loadedPdfDoc: pdfjsLib.PDFDocumentProxy) => {
    setPdfDoc(loadedPdfDoc);
    setIsLoading(false);
    setError(null);
    
    console.log('🔍 EnhancedPDFViewer: PDF loaded with known page size', {
      pageSize: { width: PDF_PAGE_SIZE.widthPixels, height: PDF_PAGE_SIZE.heightPixels },
      currentZoom
    });
  }, [currentZoom]);

  const handlePDFError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Zoom control functions
  const setZoom = useCallback(async (zoomLevel: number) => {
    console.log('🔍 EnhancedPDFViewer: Setting zoom to', zoomLevel);
    setCurrentZoom(zoomLevel);
    await pdfCanvasRef.current?.setZoom(zoomLevel);
  }, []);


  const getCurrentZoom = useCallback(() => {
    return pdfCanvasRef.current?.getCurrentZoom() || currentZoom;
  }, [currentZoom]);

  // Toggle drawing mode
  const toggleDrawingMode = useCallback(async () => {
    if (onBeforeSign && !isDrawingMode) {
      try {
        await onBeforeSign();
      } catch (error) {
        console.error('Error in onBeforeSign:', error);
        return;
      }
    }
    setIsDrawingMode(!isDrawingMode);
  }, [isDrawingMode, onBeforeSign]);

  // Clear drawing
  const clearDrawing = useCallback(() => {
    drawingCanvasRef.current?.clearDrawing();
  }, []);

  // Handle saving the PDF with signature (flattened)
  const handleSave = useCallback(async () => {
    if (!pdfCanvasRef.current?.canvas || !drawingCanvasRef.current?.canvas || !onSave || !pdfDoc) return;

    try {
      console.log('🔍 EnhancedPDFViewer: Saving PDF with improved signature scaling', {
        currentZoom,
        pageSize: { width: PDF_PAGE_SIZE.widthPixels, height: PDF_PAGE_SIZE.heightPixels }
      });

      await savePDFWithSignature(
        pdfDoc,
        pdfCanvasRef.current.canvas,
        drawingCanvasRef.current.canvas,
        onSave,
        { crewInfo, date },
        pdfId
      );
    } catch (error) {
      console.error('Error saving PDF:', error);
      setError('Failed to save PDF with signature.');
    }
  }, [pdfDoc, onSave, crewInfo, date, pdfId, currentZoom]);

  // Handle downloading the original PDF
  const handleDownload = useCallback(async () => {
    if (!pdfDoc) return;

    try {
      await downloadOriginalPDF(pdfDoc, { crewInfo, date });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF.');
    }
  }, [pdfDoc, crewInfo, date]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSave,
    handleDownload,
    isDrawingMode,
    toggleDrawingMode,
    clearDrawing,
    setZoom,
    getCurrentZoom
  }));

  return (
    <div 
      className={`enhanced-pdf-viewer-wrapper ${className || ''}`} 
      style={{
        ...style,
        width: '100%',
        height: 'auto',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Zoom Controls - Outside Container */}
      {showZoomControls && !readOnly && (
        <div className="zoom-controls-external" style={{
          width: '100%',
          maxWidth: '800px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            textAlign: 'center',
            fontSize: '16px'
          }}>
            Zoom: {Math.round(currentZoom * 100)}%
          </div>
          
          {/* Zoom Level Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setZoom(0.5)}
              style={{
                background: currentZoom === 0.5 ? '#007bff' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              50%
            </button>
            <button
              onClick={() => setZoom(1.0)}
              style={{
                background: currentZoom === 1.0 ? '#007bff' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              100%
            </button>
            <button
              onClick={() => setZoom(1.5)}
              style={{
                background: currentZoom === 1.5 ? '#007bff' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              150%
            </button>
            <button
              onClick={() => setZoom(2.0)}
              style={{
                background: currentZoom === 2.0 ? '#007bff' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              200%
            </button>
          </div>
          
        </div>
      )}


      {/* PDF Container */}
      <div 
        className={`enhanced-pdf-viewer`} 
        style={{
          overflow: isDrawingMode ? 'hidden' : 'auto',
          width: '100%',
          height: 'auto',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
        ref={containerRef}
      >
        <div 
          className="canvas-container"
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          {error && <div className="error-message">{error}</div>}
          {isLoading && <div className="loading">Loading PDF...</div>}
          
          <PDFCanvas
            ref={pdfCanvasRef}
            pdfId={pdfId}
            className="pdf-canvas"
            onPDFLoaded={handlePDFLoaded}
            onError={handlePDFError}
            onLoadingChange={handleLoadingChange}
            zoomLevel={2.0}
            fitType="page"
          />
          
          {!readOnly && (
              <DrawingCanvas
                ref={drawingCanvasRef}
                isDrawingMode={isDrawingMode}
                className="draw-canvas"
                pdfCanvasRef={pdfCanvasRef}
                zoomLevel={2.0}
              />
          )}
        </div>
      </div>

      {/* Action Buttons - Outside Container */}
      {!readOnly && (
        <div className="action-buttons-external" style={{
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          gap: '10px',
          marginTop: '10px',
          padding: '0 10px'
        }}>
          {/* Sign Button */}
          <button
            onClick={toggleDrawingMode}
            style={{
              flex: 1,
              background: isDrawingMode ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.opacity = '0.9'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.opacity = '1'}
          >
            <span>✏️</span>
            <span>{isDrawingMode ? 'Exit Sign' : 'Sign'}</span>
          </button>
          
          {/* Save Button */}
          {onSave && (
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.opacity = '0.9'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.opacity = '1'}
            >
              <span>💾</span>
              <span>Save</span>
            </button>
          )}
          
          {/* Undo Button */}
          <button
            onClick={clearDrawing}
            style={{
              flex: 1,
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.opacity = '0.9'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.opacity = '1'}
          >
            <span>↶</span>
            <span>Undo</span>
          </button>
        </div>
      )}
    </div>
  );
});

EnhancedPDFViewer.displayName = 'EnhancedPDFViewer';

// Export as default for backward compatibility
export default EnhancedPDFViewer;
