// PDF flattening utilities for converting PDFs to images and creating flattened PDFs
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js options for small PDFs
export const pdfOptions = {
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

/**
 * Flattens PDF content to a high-quality image
 */
export const flattenPDFToImage = async (pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<Blob> => {
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 3.0 }); // Higher scale for better quality
  
  // Create a temporary canvas for flattening
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = viewport.width;
  tempCanvas.height = viewport.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Could not get canvas context for flattening');
  }

  // Fill with white background
  tempCtx.fillStyle = 'white';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Render PDF page to the temporary canvas
  await page.render({
    canvasContext: tempCtx,
    viewport: viewport
  }).promise;

  // Convert canvas to blob with high quality
  return new Promise<Blob>((resolve, reject) => {
    tempCanvas.toBlob((blob) => {
      if (blob) {
        console.log('🔍 PDF Flattening: PDF flattened to image, size:', blob.size, 'bytes');
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png', 1.0);
  });
};

/**
 * Creates a flattened PDF from images (PDF image + signature image)
 */
export const createFlattenedPDF = async (
  pdfImageBlob: Blob, 
  signatureImageBlob: Blob | null
): Promise<Uint8Array> => {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Convert image blobs to Uint8Array
  const pdfImageBytes = new Uint8Array(await pdfImageBlob.arrayBuffer());
  const pdfImage = await pdfDoc.embedPng(pdfImageBytes);
  
  // Create a page with the same dimensions as the PDF image
  const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
  
  // Draw the flattened PDF image
  page.drawImage(pdfImage, {
    x: 0,
    y: 0,
    width: pdfImage.width,
    height: pdfImage.height,
  });

  // If there's a signature, overlay it
  if (signatureImageBlob) {
    const signatureImageBytes = new Uint8Array(await signatureImageBlob.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    
    // Scale signature to match page dimensions
    page.drawImage(signatureImage, {
      x: 0,
      y: 0,
      width: pdfImage.width,
      height: pdfImage.height,
    });
  }

  // Save the flattened PDF
  return await pdfDoc.save();
};

/**
 * Checks if a canvas has any non-transparent pixels (indicating a signature)
 */
export const hasSignature = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if there are any non-transparent pixels (alpha > 0)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.log('🔍 PDF Flattening: Error checking signature pixels, assuming no signature:', e);
    return false;
  }
};

/**
 * Converts a canvas to a PNG blob
 */
export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
};
