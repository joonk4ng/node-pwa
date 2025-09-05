// PDF rendering utilities for displaying PDFs on canvas
import * as pdfjsLib from 'pdfjs-dist';
import { pdfOptions } from './pdfFlattening';

/**
 * Renders a PDF page to a canvas with optimal scaling
 */
export const renderPDFToCanvas = async (
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  canvas: HTMLCanvasElement,
  container?: HTMLElement
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
  const viewport = page.getViewport({ scale: 1.0 });
  
  // Calculate optimal scale based on container size
  if (container) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(
      containerWidth / viewport.width,
      containerHeight / viewport.height
    );
    viewport.scale = scale;
  }
  
  // Set canvas sizes to match viewport
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Clear canvas with white background
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Render PDF page with optimized settings
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
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
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
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
