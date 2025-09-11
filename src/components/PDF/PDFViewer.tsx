// Refactored PDF Viewer component using smaller, focused components
import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFCanvas, type PDFCanvasRef } from './PDFCanvas';
import { DrawingCanvas, type DrawingCanvasRef } from './DrawingCanvas';
import { savePDFWithSignature, downloadOriginalPDF } from '../../utils/PDF/pdfSaveHandler';
import '../../styles/components/PDFViewer.css';

export interface PDFViewerProps {
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
}

export interface PDFViewerRef {
  handleSave: () => void;
  handleDownload: () => void;
  isDrawingMode: boolean;
  toggleDrawingMode: () => void;
  clearDrawing: () => void;
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({
  pdfId,
  onSave,
  onBeforeSign,
  className,
  style,
  readOnly = false,
  crewInfo,
  date
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<PDFCanvasRef>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  
  
  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);


  // Handle PDF loading
  const handlePDFLoaded = useCallback((loadedPdfDoc: pdfjsLib.PDFDocumentProxy) => {
    setPdfDoc(loadedPdfDoc);
    setIsLoading(false);
    setError(null);
  }, []);

  const handlePDFError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);


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
      await savePDFWithSignature(
        pdfDoc,
        pdfCanvasRef.current.canvas,
        drawingCanvasRef.current.canvas,
        onSave,
        { crewInfo, date }
      );
    } catch (error) {
      console.error('Error saving PDF:', error);
      setError('Failed to save PDF with signature.');
    }
  }, [pdfDoc, onSave, crewInfo, date]);

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
    clearDrawing
  }));

  return (
    <div 
      className={`enhanced-pdf-viewer ${className || ''}`} 
      style={{
        ...style,
        overflow: isDrawingMode ? 'hidden' : 'auto'
      }} 
      ref={containerRef}
    >
      <div className="canvas-container">
        {error && <div className="error-message">{error}</div>}
        {isLoading && <div className="loading">Loading PDF...</div>}
        
        <PDFCanvas
          ref={pdfCanvasRef}
          pdfId={pdfId}
          className="pdf-canvas"
          onPDFLoaded={handlePDFLoaded}
          onError={handlePDFError}
          onLoadingChange={handleLoadingChange}
        />
        
        {!readOnly && (
          <>
            <DrawingCanvas
              ref={drawingCanvasRef}
              isDrawingMode={isDrawingMode}
              className="draw-canvas"
              pdfCanvasRef={pdfCanvasRef}
            />
          </>
        )}
      </div>
    </div>
  );
});
