// React component for the enhanced PDF viewer with signature integration
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import '../styles/EnhancedPDFViewer.css';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Configure PDF.js options for small PDFs
const pdfOptions = {
  disableAutoFetch: true,     // Disable fetching of external resources for small PDFs
  disableStream: true,        // Disable streaming for small PDFs
  disableFontFace: false,     // Allow using system fonts
  useSystemFonts: true,       // Prefer system fonts when available
  enableXfa: true,            // Enable XFA form support
  isEvalSupported: false,     // Disable eval for security
  maxImageSize: 4096 * 4096,  // Set maximum image size
  cMapUrl: undefined,         // Don't try to load external character maps
  standardFontDataUrl: undefined  // Don't try to load external fonts
};

// Defines properties for the EnhancedPDFViewer component
interface EnhancedPDFViewerProps {
  // PDF blob data
  pdfBlob?: Blob;
  // Callback function for saving the PDF
  onSave?: (pdfData: Blob, previewImage: Blob) => void;
  // Callback function called before signing (for sneaky save)
  onBeforeSign?: () => Promise<void>;
  // Class name for the component
  className?: string;
  // Style for the component
  style?: React.CSSProperties;
  // Read only state - whether the component is read only
  readOnly?: boolean;
  crewInfo?: {
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  date?: string;
}

// 
const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  //
  pdfBlob,
  //
  onSave,
  //
  onBeforeSign,
  //
  className,
  style,
  readOnly = false,
  crewInfo,
  date
}) => {
  //
  const canvasRef = useRef<HTMLCanvasElement>(null);
  //
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  //
  const containerRef = useRef<HTMLDivElement>(null);
  //
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  //
  const [isLoading, setIsLoading] = useState(true);
  //
  const [error, setError] = useState<string | null>(null);
  //
  const [isDrawing, setIsDrawing] = useState(false);
  //
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  //
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  //
  const renderPDF = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    //
    if (!canvasRef.current || !drawCanvasRef.current) return;

    //
    try {
      setIsLoading(true);
      //
      const page = await pdfDoc.getPage(1); // Always render first page
      
      //
      const canvas = canvasRef.current;
      //
      const context = canvas.getContext('2d', {
        //
        alpha: false,  // Optimize for non-transparent content
        //
        willReadFrequently: false  // Optimize for write-only operations
      });
      
      //
      const drawCanvas = drawCanvasRef.current;
      //
      const drawContext = drawCanvas.getContext('2d', {
        //
        alpha: true,
        willReadFrequently: true  // Drawing needs read operations
      });

      //
      if (!context || !drawContext) return;

      // Get the PDF's original dimensions
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Calculate optimal scale based on container size
      const container = containerRef.current;
      if (container) {
        //
        const containerWidth = container.clientWidth;
        //
        const containerHeight = container.clientHeight;
        //
        const scale = Math.min(
          //
          containerWidth / viewport.width,
          //
          containerHeight / viewport.height
        );
        viewport.scale = scale;
      }
      
      // Set canvas sizes to match viewport
      canvas.height = viewport.height;
      //
      canvas.width = viewport.width;
      //
      drawCanvas.height = viewport.height;
      //
      drawCanvas.width = viewport.width;

      // Clear both canvases
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

      // Render PDF page with optimized settings
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      setIsLoading(false);
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page. Please try again.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add touch event listeners with passive: false
    const options = { passive: false };
    
    const preventDefault = (e: TouchEvent) => {
      // Only prevent default if we're drawing on the canvas
      if (isDrawingMode && e.target === drawCanvasRef.current) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefault, options);
    container.addEventListener('touchmove', preventDefault, options);
    container.addEventListener('touchend', preventDefault, options);

    return () => {
      container.removeEventListener('touchstart', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
      container.removeEventListener('touchend', preventDefault);
    };
  }, [isDrawingMode]);

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    const touch = e.touches[0];
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  };

  // starts the drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current || !isDrawingMode) return;
    
    let pos;
    if ('touches' in e) {
      pos = getTouchPos(e as React.TouchEvent<HTMLCanvasElement>);
    } else {
      const rect = drawCanvasRef.current.getBoundingClientRect();
      const scaleX = drawCanvasRef.current.width / rect.width;
      const scaleY = drawCanvasRef.current.height / rect.height;
      pos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
    lastPosRef.current = pos;
    setIsDrawing(true);
  };

  // draws the signature
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawCanvasRef.current || !lastPosRef.current || !isDrawingMode) return;
    
    let currentPos;
    if ('touches' in e) {
      currentPos = getTouchPos(e as React.TouchEvent<HTMLCanvasElement>);
    } else {
      const rect = drawCanvasRef.current.getBoundingClientRect();
      const scaleX = drawCanvasRef.current.width / rect.width;
      const scaleY = drawCanvasRef.current.height / rect.height;
      currentPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = '#000000'; // Default black color
    ctx.lineWidth = 2; // Default line width
    ctx.lineCap = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  // stops the drawing
  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  // clears the drawing
  const clearDrawing = () => {
    setIsDrawingMode(false);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Handles the saving of the PDF with the signature
  const handleSave = async () => {
    setIsDrawingMode(false);
    if (!canvasRef.current || !drawCanvasRef.current || !onSave || !pdfDocRef.current) return;

    try {
      // Get both canvases
      const baseCanvas = canvasRef.current;
      const drawCanvas = drawCanvasRef.current;

      // Create a temporary canvas to combine both layers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = baseCanvas.width;
      tempCanvas.height = baseCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;

      // Draw the base PDF
      tempCtx.drawImage(baseCanvas, 0, 0);
      // Draw the annotations on top
      tempCtx.drawImage(drawCanvas, 0, 0);

      // Get the combined preview as PNG
      const previewImage = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Get the drawing canvas content as a PNG for annotations
      const annotationImage = await new Promise<Blob>((resolve) => {
        drawCanvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Convert the original PDF to Uint8Array
      const pdfBytes = await pdfDocRef.current.getData();
      
      // Load the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Convert PNG blob to Uint8Array
      const annotationBytes = new Uint8Array(await annotationImage.arrayBuffer());
      
      // Embed the PNG image
      const annotationPngImage = await pdfDoc.embedPng(annotationBytes);
      
      // Get page dimensions
      const { width, height } = firstPage.getSize();
      
      // Draw the annotation image on top of the PDF
      firstPage.drawImage(annotationPngImage, {
        x: 0,
        y: 0,
        width,
        height,
        opacity: 1,
      });

      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const modifiedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      
      // Store the signed PDF blob
      
      // Save the PDF
      onSave(modifiedPdfBlob, previewImage);

      // Create a URL for the PDF blob and trigger download
      const url = URL.createObjectURL(modifiedPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename using crew info if available
      if (crewInfo && date) {
        link.download = `federal_equipment_shift_ticket_${date}_${crewInfo.crewNumber}.pdf`;
      } else {
        link.download = 'signed_federal_document.pdf';
      }
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error saving PDF:', err);
      setError('Failed to save PDF with annotations.');
    }
  };





  const toggleDrawingMode = async () => {
    // If we're about to enable drawing mode and there's a sneaky save callback, call it
    if (!isDrawingMode && onBeforeSign) {
      try {
        await onBeforeSign();
      } catch (error) {
        console.error('Error during sneaky save before signing:', error);
        // Continue with signing even if sneaky save fails
      }
    }
    
    setIsDrawingMode(prev => !prev);
    // Clear any existing drawing when toggling mode
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      }
    }
    // Reset drawing state
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  useEffect(() => {
    let mounted = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPDF = async () => {
      if (!pdfBlob) return;

      try {
        setIsLoading(true);
        setError(null);
        
        // Convert blob to array buffer
        const arrayBuffer = await pdfBlob.arrayBuffer();
        if (!mounted) return;

        // Create loading task
        const loadingTask = pdfjsLib.getDocument({ 
          data: arrayBuffer,
          ...pdfOptions
        });
        
        const pdf = await loadingTask.promise;
        
        if (!mounted) {
          pdf.destroy();
          return;
        }

        // Clean up previous PDF document
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }

        currentPdf = pdf;
        pdfDocRef.current = pdf;

        await renderPDF(pdf);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (mounted) {
          setError('Failed to load PDF. Please try again.');
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
      if (currentPdf) {
        currentPdf.destroy();
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfBlob, renderPDF]);

  return (
    <div className={`enhanced-pdf-viewer ${className || ''}`} style={style} ref={containerRef}>
      <div className="canvas-container">
        {error && <div className="error-message">{error}</div>}
        {isLoading && <div className="loading">Loading PDF...</div>}
        <canvas ref={canvasRef} className="pdf-canvas" />
        {!readOnly && (
          <>
            <canvas
              ref={drawCanvasRef}
              className="draw-canvas"
              style={{ pointerEvents: isDrawingMode ? 'auto' : 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="toolbar">
              <button
                onClick={toggleDrawingMode}
                className={`draw-btn ${isDrawingMode ? 'active' : ''}`}
                title="Sign"
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                Sign
              </button>
              <button onClick={handleSave} className="save-btn" title="Finished">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                </svg>
                Finished
              </button>
              <button onClick={clearDrawing} className="clear-btn" title="Undo">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
                </svg>
                Undo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedPDFViewer; 