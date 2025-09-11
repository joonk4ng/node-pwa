// PDF Save Handler utility for saving and downloading PDFs
import * as pdfjsLib from 'pdfjs-dist';
import { flattenPDFToImage, createFlattenedPDF, hasSignature, canvasToBlob } from './pdfFlattening';
import { generateExportFilename } from '../filenameGenerator';

export interface CrewInfo {
  crewNumber: string;
  fireName: string;
  fireNumber: string;
}

export interface SaveOptions {
  crewInfo?: CrewInfo;
  date?: string;
  filename?: string;
}

/**
 * Handles saving a PDF with signature (flattened)
 */
export async function savePDFWithSignature(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  baseCanvas: HTMLCanvasElement,
  drawCanvas: HTMLCanvasElement,
  onSave: (pdfData: Blob, previewImage: Blob) => void,
  options: SaveOptions = {}
): Promise<void> {
  try {
    console.log('🔍 PDFSaveHandler: Starting PDF save process...');

    // Create a temporary canvas to combine both layers for preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = baseCanvas.width;
    tempCanvas.height = baseCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) throw new Error('Failed to get canvas context');

    // Draw the base PDF
    tempCtx.drawImage(baseCanvas, 0, 0);
    // Draw the annotations on top
    tempCtx.drawImage(drawCanvas, 0, 0);

    // Get the combined preview as PNG
    const previewImage = await canvasToBlob(tempCanvas);

    // Check if there's a signature to flatten
    const hasSig = hasSignature(drawCanvas);
    console.log('🔍 PDFSaveHandler: Signature check result:', hasSig);
    console.log('🔍 PDFSaveHandler: Draw canvas dimensions:', { width: drawCanvas.width, height: drawCanvas.height });
    console.log('🔍 PDFSaveHandler: Base canvas dimensions:', { width: baseCanvas.width, height: baseCanvas.height });
    console.log('🔍 PDFSaveHandler: Combined canvas dimensions:', { width: tempCanvas.width, height: tempCanvas.height });

    // Create a high-resolution combined canvas for the flattened PDF
    // First, flatten the PDF to high resolution
    console.log('🔍 PDFSaveHandler: Creating high-resolution flattened PDF image...');
    const flattenedPdfImage = await flattenPDFToImage(pdfDoc);
    console.log('🔍 PDFSaveHandler: Flattened PDF image dimensions:', { width: flattenedPdfImage.width, height: flattenedPdfImage.height });
    
    // Create a high-resolution combined canvas
    const highResCanvas = document.createElement('canvas');
    highResCanvas.width = flattenedPdfImage.width;
    highResCanvas.height = flattenedPdfImage.height;
    const highResCtx = highResCanvas.getContext('2d', {
      alpha: false, // Optimize for non-transparent content
      willReadFrequently: false, // Optimize for write-only operations
      imageSmoothingEnabled: true, // Enable image smoothing for better quality
      imageSmoothingQuality: 'high' // Use high quality smoothing
    });
    
    if (!highResCtx) throw new Error('Failed to get high-res canvas context');
    
    // Draw the high-resolution PDF image
    highResCtx.drawImage(flattenedPdfImage, 0, 0);
    
    // If there's a signature, scale and draw it on the high-res canvas
    if (hasSig) {
      console.log('🔍 PDFSaveHandler: Scaling signature to high resolution...');
      // Calculate scale factor from display canvas to high-res canvas
      const scaleX = flattenedPdfImage.width / baseCanvas.width;
      const scaleY = flattenedPdfImage.height / baseCanvas.height;
      
      console.log('🔍 PDFSaveHandler: Signature scale factors:', { scaleX, scaleY });
      
      // Draw the signature scaled to high resolution
      highResCtx.drawImage(drawCanvas, 0, 0, baseCanvas.width, baseCanvas.height, 0, 0, flattenedPdfImage.width, flattenedPdfImage.height);
    }
    
    // Use the high-resolution combined canvas for the flattened PDF
    console.log('🔍 PDFSaveHandler: Using high-resolution combined canvas for flattened PDF...');
    const flattenedPdfBytes = await createFlattenedPDF(highResCanvas, null, null);
    const flattenedPdfBlob = new Blob([flattenedPdfBytes], { type: 'application/pdf' });
    
    console.log('🔍 PDFSaveHandler: Flattened PDF created successfully');

    // Save the flattened PDF
    onSave(flattenedPdfBlob, previewImage);

    // Download the flattened PDF
    await downloadPDF(flattenedPdfBlob, {
      ...options,
      filename: options.filename || 'signed_document_flattened.pdf'
    });

  } catch (error) {
    console.error('Error saving PDF with signature:', error);
    throw new Error('Failed to save PDF with signature');
  }
}

/**
 * Handles downloading a PDF
 */
export async function downloadPDF(
  pdfBlob: Blob,
  options: SaveOptions = {}
): Promise<void> {
  try {
    // Create a URL for the PDF blob
    const url = URL.createObjectURL(pdfBlob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename using crew info if available
    if (options.crewInfo && options.date) {
      link.download = generateExportFilename({
        crewNumber: options.crewInfo.crewNumber,
        fireName: options.crewInfo.fireName,
        fireNumber: options.crewInfo.fireNumber,
        date: options.date,
        type: 'PDF'
      });
    } else {
      link.download = options.filename || 'document.pdf';
    }
    
    console.log('🔍 PDFSaveHandler: Downloading PDF with filename:', link.download);
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF');
  }
}

/**
 * Handles downloading the original PDF without flattening
 */
export async function downloadOriginalPDF(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  options: SaveOptions = {}
): Promise<void> {
  try {
    // Get the current PDF data
    const pdfBytes = await pdfDoc.getData();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    await downloadPDF(pdfBlob, {
      ...options,
      filename: options.filename || 'document_original.pdf'
    });
  } catch (error) {
    console.error('Error downloading original PDF:', error);
    throw new Error('Failed to download original PDF');
  }
}
