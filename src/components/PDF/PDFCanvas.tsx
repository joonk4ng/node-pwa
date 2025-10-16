// PDF Canvas component for rendering PDF content
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPDFDocument } from '../../utils/PDF/pdfRendering';
import { getPDF } from '../../utils/pdfStorage';
import { PDF_PAGE_SIZE, calculateFitZoom } from '../../utils/PDF/pdfConstants';

export interface PDFCanvasProps {
  pdfId?: string;
  className?: string;
  style?: React.CSSProperties;
  onPDFLoaded?: (pdfDoc: pdfjsLib.PDFDocumentProxy) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  zoomLevel?: number;
  fitType?: 'width' | 'height' | 'page';
}

export interface PDFCanvasRef {
  canvas: HTMLCanvasElement | null;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  renderPDF: () => Promise<void>;
  destroy: () => void;
  getCurrentZoom: () => number;
  setZoom: (zoomLevel: number) => Promise<void>;
  getCanvasDimensions: () => { width: number; height: number; zoom: number };
}

export const PDFCanvas = forwardRef<PDFCanvasRef, PDFCanvasProps>(({
  pdfId,
  className,
  style,
  onPDFLoaded,
  onError,
  onLoadingChange,
  zoomLevel = 1.0,
  fitType = 'page'
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const currentZoomRef = useRef<number>(zoomLevel);

  // Render PDF to canvas with precise sizing using known page dimensions
  const renderPDF = useCallback(async () => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    try {
      const canvas = canvasRef.current;
      const pdfDoc = pdfDocRef.current;
      const currentZoom = currentZoomRef.current;
      
      console.log('🔍 PDFCanvas: Rendering PDF with known page size', {
        pageSize: { width: PDF_PAGE_SIZE.widthPixels, height: PDF_PAGE_SIZE.heightPixels },
        zoomLevel: currentZoom,
        fitType
      });

      // Get the page
      const page = await pdfDoc.getPage(1);
      const context = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false
      });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Get container for responsive sizing
      const container = canvas.parentElement;
      if (!container) {
        throw new Error('Canvas must have a parent container for responsive sizing');
      }

      // Calculate final zoom level
      let finalZoom = currentZoom;
      if (currentZoom === 0) {
        // Auto-fit mode - calculate zoom to fit container
        finalZoom = calculateFitZoom(container.clientWidth, container.clientHeight, fitType);
        console.log('🔍 PDFCanvas: Auto-fit zoom calculated:', finalZoom, {
          containerSize: { width: container.clientWidth, height: container.clientHeight },
          fitType
        });
      } else {
        console.log('🔍 PDFCanvas: Using provided zoom level:', finalZoom);
      }

       // Calculate responsive canvas dimensions
       const devicePixelRatio = window.devicePixelRatio || 1;
       const baseWidth = PDF_PAGE_SIZE.widthPixels;
       const baseHeight = PDF_PAGE_SIZE.heightPixels;
       
       // Calculate display dimensions that fit the container
       // Use full container dimensions - the container already has padding
       const maxDisplayWidth = container.clientWidth;
       const maxDisplayHeight = container.clientHeight;
       
       // Calculate scale to fit container while maintaining aspect ratio
       const scaleX = maxDisplayWidth / (baseWidth * finalZoom);
       const scaleY = maxDisplayHeight / (baseHeight * finalZoom);
       const containerScale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%
       
       // Final display dimensions
       const displayWidth = Math.round(baseWidth * finalZoom * containerScale);
       const displayHeight = Math.round(baseHeight * finalZoom * containerScale);
      
      // Canvas internal dimensions (for high-DPI)
      const canvasWidth = Math.round(displayWidth * devicePixelRatio);
      const canvasHeight = Math.round(displayHeight * devicePixelRatio);
      
      console.log('🔍 PDFCanvas: Responsive dimensions calculated', {
        baseSize: { width: baseWidth, height: baseHeight },
        zoom: finalZoom,
        containerSize: { width: container.clientWidth, height: container.clientHeight },
        maxDisplaySize: { width: maxDisplayWidth, height: maxDisplayHeight },
        containerScale,
        finalDisplaySize: { width: displayWidth, height: displayHeight },
        canvasSize: { width: canvasWidth, height: canvasHeight }
      });

      // Set canvas internal dimensions
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Set canvas display dimensions
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Add responsive constraints
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';

      // Clear canvas with white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Create viewport with responsive scaling
      const viewport = page.getViewport({ scale: finalZoom * containerScale * devicePixelRatio });
      
      // Render PDF page
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'display'
      });
      
      await renderTask.promise;
      
      // Update current zoom reference
      currentZoomRef.current = finalZoom;
      
      console.log('🔍 PDFCanvas: PDF rendered successfully', {
        finalZoom,
        canvasSize: { width: canvas.width, height: canvas.height },
        displaySize: { width: canvas.style.width, height: canvas.style.height },
        viewport: { width: viewport.width, height: viewport.height },
        pageSize: { width: PDF_PAGE_SIZE.widthPixels, height: PDF_PAGE_SIZE.heightPixels },
        containerScale,
        devicePixelRatio
      });
      
    } catch (error) {
      console.error('Error rendering PDF:', error);
      onError?.('Failed to render PDF');
    }
  }, [onError, fitType]);

  // Set zoom level and re-render
  const setZoom = useCallback(async (newZoomLevel: number) => {
    currentZoomRef.current = newZoomLevel;
    await renderPDF();
  }, [renderPDF]);

  // Get current zoom level
  const getCurrentZoom = useCallback(() => {
    return currentZoomRef.current;
  }, []);

  // Get current canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: 0, zoom: 0 };
    
    return {
      width: canvas.width,
      height: canvas.height,
      zoom: currentZoomRef.current
    };
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    pdfDoc: pdfDocRef.current,
    renderPDF,
    destroy: () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    },
    getCurrentZoom,
    setZoom,
    getCanvasDimensions
  }));

  // Load PDF effect
  useEffect(() => {
    let mounted = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPDF = async () => {
      if (!pdfId) return;

      try {
        onLoadingChange?.(true);
        
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

        await renderPDF();
        onPDFLoaded?.(pdf);
        onLoadingChange?.(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (mounted) {
          onError?.('Failed to load PDF. Please try again.');
          onLoadingChange?.(false);
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
  }, [pdfId, renderPDF, onPDFLoaded, onError, onLoadingChange]);

  // Re-render when needed
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPDF();
    }
  }, [renderPDF]);

  // Handle zoom level changes
  useEffect(() => {
    currentZoomRef.current = zoomLevel;
    if (pdfDocRef.current) {
      renderPDF();
    }
  }, [zoomLevel, renderPDF]);

  // Handle container resize for responsive behavior
  useEffect(() => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      setTimeout(() => {
        if (pdfDocRef.current) {
          renderPDF();
        }
      }, 100);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderPDF]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{
        ...style
      }}
    />
  );
});
