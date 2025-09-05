// PDF Viewer component for displaying PDF documents
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';
import { renderPDFToCanvas, loadPDFDocument } from '../../utils/PDF/pdfRendering';
import { flattenPDFToImage, createFlattenedPDF, hasSignature, canvasToBlob } from '../../utils/PDF/pdfFlattening';
import { getPDF } from '../../utils/pdfStorage';
import { generateExportFilename } from '../../utils/filenameGenerator';
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
  currentZoom: number;
  setZoom: (zoom: number) => void;
  availableZooms: number[];
  isRotated: boolean;
  toggleRotation: () => void;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Zoom system state
  const [currentZoom, setCurrentZoom] = useState(1.0);
  const [zoomLevels, setZoomLevels] = useState<Record<number, Blob>>({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Different zoom levels for mobile vs desktop
  const availableZooms = isMobile ? [1.0, 1.5, 2.0, 2.5, 3.0] : [1.0, 1.25, 1.5];
  
  // Mobile rotation state
  const [isRotated, setIsRotated] = useState(false);

  // Detect mobile device and enable rotation
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      
      // Auto-enable rotation and better zoom on mobile
      if (isMobileDevice && !isRotated) {
        setIsRotated(true);
        // Auto-set to a higher zoom level for better mobile viewing
        setTimeout(() => {
          setCurrentZoom(2.5); // Increased to 2.5x zoom for better landscape utilization
        }, 1000); // Delay to ensure PDF is loaded
        console.log('📱 PDFViewer: Mobile device detected, auto-enabling landscape rotation and 2.5x zoom');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isRotated]);

  // Generate zoom level images
  const generateZoomLevels = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    console.log('🔍 PDFViewer: Generating zoom levels...');
    const zoomImages: Record<number, Blob> = {};
    
    for (const zoom of availableZooms) {
      try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: zoom });
        
        // Create temporary canvas for this zoom level
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) continue;
        
        // Clear with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Render PDF at this zoom level
        await page.render({
          canvasContext: tempCtx,
          viewport: viewport
        }).promise;
        
        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          tempCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
        
        zoomImages[zoom] = blob;
        console.log(`🔍 PDFViewer: Generated zoom level ${zoom}x (${blob.size} bytes)`);
      } catch (err) {
        console.error(`Error generating zoom level ${zoom}:`, err);
      }
    }
    
    setZoomLevels(zoomImages);
    console.log('🔍 PDFViewer: All zoom levels generated');
  }, [availableZooms, isMobile]);

  // Switch to a different zoom level
  const setZoom = useCallback((newZoom: number) => {
    if (zoomLevels[newZoom] && newZoom !== currentZoom) {
      console.log(`🔍 PDFViewer: Switching to zoom level ${newZoom}x (mobile: ${isMobile})`);
      setCurrentZoom(newZoom);
      
      // Update the PDF canvas with the new zoom level image
      if (canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            // Set canvas size to actual image size for better mobile zoom
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            canvasRef.current.style.width = `${img.width}px`;
            canvasRef.current.style.height = `${img.height}px`;
            ctx.drawImage(img, 0, 0);
            
            // Sync draw canvas size
            if (drawCanvasRef.current) {
              drawCanvasRef.current.width = img.width;
              drawCanvasRef.current.height = img.height;
              drawCanvasRef.current.style.width = `${img.width}px`;
              drawCanvasRef.current.style.height = `${img.height}px`;
              
              // Set up drawing context
              const drawCtx = drawCanvasRef.current.getContext('2d');
              if (drawCtx) {
                drawCtx.strokeStyle = '#000000';
                drawCtx.lineWidth = 2;
                drawCtx.lineCap = 'round';
                drawCtx.lineJoin = 'round';
              }
            }
          }
        };
        img.src = URL.createObjectURL(zoomLevels[newZoom]);
      }
    }
  }, [zoomLevels, currentZoom]);

  // Use the drawing hook
  const {
    isDrawingMode,
    drawCanvasRef,
    startDrawing,
    draw,
    stopDrawing,
    toggleDrawingMode,
    clearDrawing
  } = usePDFDrawing({ onBeforeSign, readOnly });

  // Render PDF to canvas
  const renderPDF = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    if (!canvasRef.current || !drawCanvasRef.current) return;

    try {
      setIsLoading(true);
      await renderPDFToCanvas(pdfDoc, canvasRef.current, containerRef.current || undefined);
      
      // Sync draw canvas size with main canvas
      if (drawCanvasRef.current && canvasRef.current) {
        drawCanvasRef.current.height = canvasRef.current.height;
        drawCanvasRef.current.width = canvasRef.current.width;
        
        // Set up the drawing canvas context
        const drawCtx = drawCanvasRef.current.getContext('2d');
        if (drawCtx) {
          drawCtx.strokeStyle = '#000000';
          drawCtx.lineWidth = 2;
          drawCtx.lineCap = 'round';
          drawCtx.lineJoin = 'round';
        }
        
        console.log('🔍 PDFViewer: Draw canvas synced with PDF canvas', {
          pdfCanvas: { 
            width: canvasRef.current.width, 
            height: canvasRef.current.height,
            offsetWidth: canvasRef.current.offsetWidth,
            offsetHeight: canvasRef.current.offsetHeight,
            getBoundingClientRect: canvasRef.current.getBoundingClientRect()
          },
          drawCanvas: { 
            width: drawCanvasRef.current.width, 
            height: drawCanvasRef.current.height,
            offsetWidth: drawCanvasRef.current.offsetWidth,
            offsetHeight: drawCanvasRef.current.offsetHeight,
            getBoundingClientRect: drawCanvasRef.current.getBoundingClientRect()
          },
          pdfCanvasStyle: { width: canvasRef.current.style.width, height: canvasRef.current.style.height },
          drawCanvasStyle: { width: drawCanvasRef.current.style.width, height: drawCanvasRef.current.style.height }
        });
      }
      
      // Generate zoom levels after initial render
      await generateZoomLevels(pdfDoc);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page. Please try again.');
      setIsLoading(false);
    }
  }, [drawCanvasRef]);

  // Toggle rotation function
  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSave,
    handleDownload,
    isDrawingMode,
    toggleDrawingMode,
    clearDrawing,
    currentZoom,
    setZoom,
    availableZooms,
    isRotated,
    toggleRotation
  }));

  // Handle saving the PDF with signature (flattened)
  const handleSave = async () => {
    if (!canvasRef.current || !drawCanvasRef.current || !onSave || !pdfDocRef.current) return;

    try {
      console.log('🔍 PDFViewer: Starting PDF flattening process...');

      // Get both canvases
      const baseCanvas = canvasRef.current;
      const drawCanvas = drawCanvasRef.current;

      // Debug canvas dimensions
      console.log('🔍 PDFViewer: Base canvas dimensions:', baseCanvas.width, 'x', baseCanvas.height);
      console.log('🔍 PDFViewer: Draw canvas dimensions:', drawCanvas.width, 'x', drawCanvas.height);
      console.log('🔍 PDFViewer: Base canvas style dimensions:', baseCanvas.style.width, 'x', baseCanvas.style.height);
      console.log('🔍 PDFViewer: Draw canvas style dimensions:', drawCanvas.style.width, 'x', drawCanvas.style.height);

      // Create a temporary canvas to combine both layers for preview
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
      const previewImage = await canvasToBlob(tempCanvas);

      // Check if there's a signature to flatten
      let signatureImageBlob: Blob | null = null;
      if (hasSignature(drawCanvas)) {
        signatureImageBlob = await canvasToBlob(drawCanvas);
        console.log('🔍 PDFViewer: Signature detected, will be flattened');
      } else {
        console.log('🔍 PDFViewer: No signature detected, flattening PDF only');
      }

      // Flatten the PDF to an image
      console.log('🔍 PDFViewer: Flattening PDF content to image...');
      const flattenedPdfImage = await flattenPDFToImage(pdfDocRef.current);

      // Create the flattened PDF
      console.log('🔍 PDFViewer: Creating flattened PDF...');
      const flattenedPdfBytes = await createFlattenedPDF(flattenedPdfImage, signatureImageBlob);
      const flattenedPdfBlob = new Blob([flattenedPdfBytes], { type: 'application/pdf' });
      
      console.log('🔍 PDFViewer: Flattened PDF created successfully');

      // PDF flattened successfully
      
      // Save the flattened PDF
      onSave(flattenedPdfBlob, previewImage);

      // Create a URL for the flattened PDF blob and trigger download
      const url = URL.createObjectURL(flattenedPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename using crew info if available
      if (crewInfo && date) {
        link.download = generateExportFilename({
          date,
          crewNumber: crewInfo.crewNumber,
          fireName: crewInfo.fireName,
          fireNumber: crewInfo.fireNumber,
          type: 'PDF'
        });
      } else {
        link.download = 'signed_document_flattened.pdf';
      }
      
      console.log('🔍 PDFViewer: Downloading flattened PDF with filename:', link.download);
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error saving flattened PDF:', err);
      setError('Failed to save flattened PDF with signature.');
    }
  };

  const handleDownload = async () => {
    if (!pdfDocRef.current) return;

    try {
      // Get the current PDF data
      const pdfBytes = await pdfDocRef.current.getData();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename using crew info if available
      if (crewInfo && date) {
        link.download = generateExportFilename({
          date,
          crewNumber: crewInfo.crewNumber,
          fireName: crewInfo.fireName,
          fireNumber: crewInfo.fireNumber,
          type: 'PDF'
        });
      } else {
        link.download = 'signed_document.pdf';
      }
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF.');
    }
  };


  // Load PDF effect
  useEffect(() => {
    let mounted = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPDF = async () => {
      if (!pdfId) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const storedPDF = await getPDF(pdfId);
        if (!storedPDF || !mounted) return;

        // Load the PDF document
        const pdf = await loadPDFDocument(storedPDF.pdf);
        
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
  }, [pdfId, renderPDF]);

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
        <canvas 
          ref={canvasRef} 
          className="pdf-canvas" 
          style={{
            transform: isRotated ? 'rotate(90deg)' : 'none',
            transformOrigin: 'center center',
            transition: 'transform 0.3s ease-in-out'
          }}
        />
        {!readOnly && (
          <>
            <canvas
              ref={drawCanvasRef}
              className="draw-canvas"
              style={{ 
                pointerEvents: isDrawingMode ? 'auto' : 'none',
                cursor: isDrawingMode ? 'crosshair' : 'default',
                transform: isRotated ? 'rotate(90deg)' : 'none',
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease-in-out'
              }}
              onMouseDown={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                startDrawing(e);
              }}
              onMouseMove={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                draw(e);
              }}
              onMouseUp={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                stopDrawing();
              }}
              onMouseLeave={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                stopDrawing();
              }}
              onTouchStart={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                startDrawing(e);
              }}
              onTouchMove={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                draw(e);
              }}
              onTouchEnd={(e) => {
                if (isDrawingMode) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                stopDrawing();
              }}
            />
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
                Drawing Mode Active - Draw your signature
              </div>
            )}
            {isDrawingMode && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '10px',
                background: 'rgba(255, 0, 0, 0.7)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 20
              }}>
                Canvas: {drawCanvasRef.current ? `${drawCanvasRef.current.width}x${drawCanvasRef.current.height}` : 'Not found'}
              </div>
            )}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 20
            }}>
              Zoom: {Math.round(currentZoom * 100)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
});
