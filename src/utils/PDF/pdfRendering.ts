// PDF rendering utilities for displaying PDFs on canvas
import * as pdfjsLib from 'pdfjs-dist';
import { pdfOptions } from './pdfFlattening';

/**
 * Renders a PDF page to a canvas with flexible sizing
 */
export const renderPDFToCanvas = async (
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  canvas: HTMLCanvasElement,
  container?: HTMLElement,
  options?: {
    scale?: number;
    maxWidth?: number;
    maxHeight?: number;
    maintainAspectRatio?: boolean;
  }
): Promise<void> => {
  const page = await pdfDoc.getPage(1); // Always render first page
  
  const context = canvas.getContext('2d', {
    alpha: false,  // Optimize for non-transparent content
    willReadFrequently: false  // Optimize for write-only operations
  });
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  // Get the PDF's original dimensions
  const originalViewport = page.getViewport({ scale: 1.0 });
  console.log('🔍 PDF Rendering: Original PDF dimensions:', originalViewport.width, 'x', originalViewport.height);
  
  // Determine the scale to use
  let scale = options?.scale || 1.0;
  
  // If no specific scale is provided, use flexible sizing
  if (!options?.scale) {
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate scale to fit within container while maintaining aspect ratio
      const scaleX = containerWidth / originalViewport.width;
      const scaleY = containerHeight / originalViewport.height;
      
      // Use the smaller scale to ensure PDF fits within container
      scale = Math.min(scaleX, scaleY);
      
      // Apply max width/height constraints if provided
      if (options?.maxWidth) {
        const maxScaleX = options.maxWidth / originalViewport.width;
        scale = Math.min(scale, maxScaleX);
      }
      if (options?.maxHeight) {
        const maxScaleY = options.maxHeight / originalViewport.height;
        scale = Math.min(scale, maxScaleY);
      }
      
      console.log('🔍 PDF Rendering: Container-based scale calculation:', {
        containerSize: `${containerWidth}x${containerHeight}`,
        originalSize: `${originalViewport.width}x${originalViewport.height}`,
        calculatedScale: scale
      });
    } else {
      // No container - use natural size (1:1 scale)
      scale = 1.0;
      console.log('🔍 PDF Rendering: Using natural size (scale: 1.0)');
    }
  }
  
  // Create viewport with calculated scale
  const viewport = page.getViewport({ scale });
  
  // Set canvas internal dimensions to match scaled viewport
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Set canvas display size to match internal size (1:1 pixel ratio for crisp rendering)
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  
  // Remove any max-width/height constraints to allow natural sizing
  canvas.style.maxWidth = 'none';
  canvas.style.maxHeight = 'none';
  canvas.style.objectFit = 'none';

  // Clear canvas with white background
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Render PDF page with optimized settings
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport,
    intent: 'display' // Optimize for display
  });
  
  await renderTask.promise;
  
  console.log('🔍 PDF Rendering: Canvas rendered with dimensions:', canvas.width, 'x', canvas.height);
};

/**
 * Renders a PDF page at high quality for printing
 */
export const renderPDFForPrint = async (
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  canvas: HTMLCanvasElement
): Promise<void> => {
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for print quality
  
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  // Update canvas dimensions for print
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render at high quality
  const renderTask = page.render({
    canvasContext: context,
    viewport: viewport,
    intent: 'print' // Optimize for print quality
  });
  
  await renderTask.promise;
};

/**
 * Loads a PDF document from a blob
 */
export const loadPDFDocument = async (pdfBlob: Blob): Promise<pdfjsLib.PDFDocumentProxy> => {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    ...pdfOptions
  });
  
  return await loadingTask.promise;
};

/**
 * Creates print-specific CSS styles for PDF printing
 */
export const createPrintStyles = (): HTMLStyleElement => {
  const style = document.createElement('style');
  style.id = 'pdf-print-style';
  style.textContent = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      .enhanced-pdf-viewer {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      .enhanced-pdf-viewer .toolbar,
      .enhanced-pdf-viewer .draw-canvas {
        display: none !important;
      }
      .enhanced-pdf-viewer .pdf-canvas {
        visibility: visible !important;
        width: 100% !important;
        height: auto !important;
        display: block !important;
        page-break-after: avoid !important;
      }
      @page {
        size: auto;
        margin: 0mm;
      }
    }
  `;
  return style;
};
