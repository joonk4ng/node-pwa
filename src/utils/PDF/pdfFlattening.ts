// PDF flattening utilities for creating non-editable PDFs with signatures
import * as pdfjsLib from 'pdfjs-dist';
import * as PDFLib from 'pdf-lib';

// PDF rendering options
export const pdfOptions = {
  scale: 2.0, // Higher scale for better quality
  renderInteractiveForms: false, // Disable form rendering for flattening
  disableAutoFetch: true,
  disableStream: true,
  disableRange: true,
  disableFontFace: false, // Enable font face loading to fix font warnings
  useSystemFonts: true, // Use system fonts as fallback
  standardFontDataUrl: undefined, // Let PDF.js handle font loading
};

/**
 * Checks if a canvas has a signature (non-transparent pixels)
 */
export function hasSignature(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Check for any non-transparent pixels
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) { // Alpha channel > 0 means non-transparent
      return true;
    }
  }
  
  return false;
}

/**
 * Converts a canvas to a Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
}

/**
 * Flattens a PDF document to an image
 */
export async function flattenPDFToImage(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<HTMLCanvasElement> {
  const numPages = pdfDoc.numPages;
  
  // Create a canvas for the flattened PDF
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Calculate total height needed for all pages
  let totalHeight = 0;
  const pageWidths: number[] = [];
  const pageHeights: number[] = [];
  
  // First pass: get dimensions
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: pdfOptions.scale });
    pageWidths.push(viewport.width);
    pageHeights.push(viewport.height);
    totalHeight += viewport.height;
  }
  
  // Set canvas dimensions
  const maxWidth = Math.max(...pageWidths);
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Second pass: render pages
  let currentY = 0;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: pdfOptions.scale });
    
    // Center the page horizontally if it's narrower than the max width
    const xOffset = (maxWidth - viewport.width) / 2;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      transform: [1, 0, 0, 1, xOffset, currentY],
    };
    
    await page.render(renderContext).promise;
    currentY += viewport.height;
  }
  
  return canvas;
}

/**
 * Creates a flattened PDF from an image and optional signature
 */
export async function createFlattenedPDF(
  pdfImage: HTMLCanvasElement,
  signatureImage?: Blob | null
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFLib.PDFDocument.create();
  
  // Convert the PDF image to PNG
  const pdfImageBlob = await canvasToBlob(pdfImage);
  const pdfImageBytes = await pdfImageBlob.arrayBuffer();
  const pdfImagePng = await pdfDoc.embedPng(pdfImageBytes);
  
  // Get the image dimensions
  const { width: imageWidth, height: imageHeight } = pdfImagePng;
  
  // Create a page with the same dimensions as the image
  const page = pdfDoc.addPage([imageWidth, imageHeight]);
  
  // Draw the PDF image
  page.drawImage(pdfImagePng, {
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight,
  });
  
  // Add signature if provided
  if (signatureImage) {
    try {
      const signatureBytes = await signatureImage.arrayBuffer();
      const signaturePng = await pdfDoc.embedPng(signatureBytes);
      
      // Draw signature on top (you might want to adjust positioning)
      page.drawImage(signaturePng, {
        x: 0,
        y: 0,
        width: signaturePng.width,
        height: signaturePng.height,
      });
    } catch (error) {
      console.warn('Failed to embed signature:', error);
    }
  }
  
  // Return the PDF bytes
  return await pdfDoc.save();
}

/**
 * Flattens a PDF by removing form fields (makes it non-editable)
 */
export async function flattenPDFForm(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
  
  // Get the form and flatten it
  const form = pdfDoc.getForm();
  form.flatten();
  
  return await pdfDoc.save();
}
