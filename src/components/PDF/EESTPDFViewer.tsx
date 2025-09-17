// EEST PDF Viewer - Specialized component for EEST forms with fixed canvas sizing
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getPDF } from '../../utils/pdfStorage';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';
import { PDFToolbar } from './PDFToolbar';

export interface EESTPDFViewerProps {
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

// EEST PDF dimensions - standard letter size at 72 DPI
const EEST_PDF_WIDTH = 612;  // 8.5 inches * 72 DPI
const EEST_PDF_HEIGHT = 792; // 11 inches * 72 DPI

export const EESTPDFViewer: React.FC<EESTPDFViewerProps> = ({
  pdfId,
  onSave,
  onBeforeSign,
  className,
  style,
  readOnly = false
}) => {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Use the drawing hook
  const {
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing
  } = usePDFDrawing({
    canvasRef: drawCanvasRef,
    isDrawingMode: isDrawingMode
  });

  // Load PDF document
  const loadPDF = useCallback(async () => {
    if (!pdfId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const storedPDF = await getPDF(pdfId);
      if (!storedPDF) {
        throw new Error('PDF not found in storage');
      }

      // Load the PDF document
      const arrayBuffer = await storedPDF.pdf.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false,
        disableRange: false,
        disableStream: false
      });
      
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      
      // Render the PDF
      await renderPDF(pdf);
      
    } catch (err) {
      console.error('Error loading EEST PDF:', err);
      setError('Failed to load PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [pdfId]);

  // Render PDF to canvas with fixed EEST dimensions
  const renderPDF = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy) => {
    if (!pdfCanvasRef.current) return;

    try {
      const page = await pdf.getPage(1);
      const context = pdfCanvasRef.current.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Get the PDF's original viewport
      const originalViewport = page.getViewport({ scale: 1.0 });
      
      // Calculate scale to fit EEST dimensions while maintaining aspect ratio
      const scaleX = EEST_PDF_WIDTH / originalViewport.width;
      const scaleY = EEST_PDF_HEIGHT / originalViewport.height;
      const scale = Math.min(scaleX, scaleY); // Use smaller scale to maintain aspect ratio
      
      // Create viewport with calculated scale
      const viewport = page.getViewport({ scale });
      
      // Set canvas internal dimensions to EEST standard size
      pdfCanvasRef.current.width = EEST_PDF_WIDTH;
      pdfCanvasRef.current.height = EEST_PDF_HEIGHT;
      
      // Set canvas display size to match internal size (1:1 pixel ratio)
      pdfCanvasRef.current.style.width = `${EEST_PDF_WIDTH}px`;
      pdfCanvasRef.current.style.height = `${EEST_PDF_HEIGHT}px`;
      
      // Clear canvas with white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, EEST_PDF_WIDTH, EEST_PDF_HEIGHT);
      
      // Center the PDF content on the canvas
      const offsetX = (EEST_PDF_WIDTH - viewport.width) / 2;
      const offsetY = (EEST_PDF_HEIGHT - viewport.height) / 2;
      
      context.save();
      context.translate(offsetX, offsetY);
      
      // Render PDF page
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'display'
      });
      
      await renderTask.promise;
      context.restore();
      
      // Setup drawing canvas to match PDF canvas exactly
      setupDrawingCanvas();
      
    } catch (err) {
      console.error('Error rendering EEST PDF:', err);
      setError('Failed to render PDF');
    }
  }, []);

  // Setup drawing canvas to match PDF canvas exactly
  const setupDrawingCanvas = useCallback(() => {
    if (!drawCanvasRef.current || !pdfCanvasRef.current) return;

    // Set drawing canvas to match PDF canvas exactly
    drawCanvasRef.current.width = EEST_PDF_WIDTH;
    drawCanvasRef.current.height = EEST_PDF_HEIGHT;
    
    // Set display size to match PDF canvas
    drawCanvasRef.current.style.width = `${EEST_PDF_WIDTH}px`;
    drawCanvasRef.current.style.height = `${EEST_PDF_HEIGHT}px`;
    
    // Position drawing canvas on top of PDF canvas
    drawCanvasRef.current.style.position = 'absolute';
    drawCanvasRef.current.style.top = '0';
    drawCanvasRef.current.style.left = '0';
    drawCanvasRef.current.style.zIndex = '10';
    
    // Setup drawing context
    const drawCtx = drawCanvasRef.current.getContext('2d');
    if (drawCtx) {
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      drawCtx.lineWidth = 2;
      drawCtx.strokeStyle = '#000000';
      drawCtx.globalCompositeOperation = 'source-over';
    }
    
    console.log('🎯 EEST Canvas Setup:', {
      pdfCanvas: { width: pdfCanvasRef.current.width, height: pdfCanvasRef.current.height },
      drawCanvas: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height },
      displaySize: { width: drawCanvasRef.current.style.width, height: drawCanvasRef.current.style.height },
      isAligned: drawCanvasRef.current.width === pdfCanvasRef.current.width && 
                 drawCanvasRef.current.height === pdfCanvasRef.current.height
    });
  }, []);

  // Toggle drawing mode
  const toggleDrawingMode = useCallback(async () => {
    if (onBeforeSign) {
      await onBeforeSign();
    }
    setIsDrawingMode(prev => !prev);
  }, [onBeforeSign]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!pdfCanvasRef.current || !drawCanvasRef.current) return;

    try {
      // Create a new canvas for the final PDF
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = EEST_PDF_WIDTH;
      finalCanvas.height = EEST_PDF_HEIGHT;
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) return;

      // Draw PDF canvas first
      finalCtx.drawImage(pdfCanvasRef.current, 0, 0);
      
      // Draw signature canvas on top
      finalCtx.drawImage(drawCanvasRef.current, 0, 0);
      
      // Convert to blob
      finalCanvas.toBlob((blob) => {
        if (blob && onSave) {
          // Create preview image
          const previewCanvas = document.createElement('canvas');
          const previewCtx = previewCanvas.getContext('2d');
          if (previewCtx) {
            // Create a smaller preview
            const previewScale = 0.3;
            previewCanvas.width = EEST_PDF_WIDTH * previewScale;
            previewCanvas.height = EEST_PDF_HEIGHT * previewScale;
            previewCtx.drawImage(finalCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
            
            previewCanvas.toBlob((previewBlob) => {
              if (previewBlob) {
                onSave(blob, previewBlob);
              }
            });
          }
        }
      }, 'application/pdf');
      
    } catch (err) {
      console.error('Error saving EEST PDF:', err);
    }
  }, [onSave]);

  // Load PDF on mount
  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfDoc]);

  // Event handlers for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    startDrawing(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    draw(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
      startDrawing(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
      draw(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  if (isLoading) {
    return (
      <div className={`eest-pdf-viewer ${className || ''}`} style={style}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          fontSize: '16px',
          color: '#666'
        }}>
          Loading EEST PDF...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`eest-pdf-viewer ${className || ''}`} style={style}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          fontSize: '16px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`eest-pdf-viewer ${className || ''}`} style={style}>
      {!readOnly && (
        <PDFToolbar
          isDrawingMode={isDrawingMode}
          onToggleDrawing={toggleDrawingMode}
          onSave={onSave ? handleSave : undefined}
          onClear={clearDrawing}
          readOnly={readOnly}
        />
      )}
      
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          border: '1px solid #ccc',
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* PDF Canvas */}
        <canvas
          ref={pdfCanvasRef}
          className="pdf-canvas"
          style={{
            display: 'block',
            backgroundColor: 'white'
          }}
        />
        
        {/* Drawing Canvas */}
        <canvas
          ref={drawCanvasRef}
          className="draw-canvas"
          style={{
            pointerEvents: isDrawingMode ? 'auto' : 'none',
            cursor: isDrawingMode ? 'crosshair' : 'default',
            touchAction: isDrawingMode ? 'none' : 'auto',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />
        
        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            EEST Drawing Mode - Draw your signature
          </div>
        )}
        
        {/* Canvas Info */}
        {isDrawingMode && (
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '10px',
            background: 'rgba(0, 255, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            Canvas: {EEST_PDF_WIDTH}x{EEST_PDF_HEIGHT} (Fixed EEST Size)
          </div>
        )}
      </div>
    </div>
  );
};

export default EESTPDFViewer;
