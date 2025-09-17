// PDF Save Handler utility for saving and downloading PDFs
import * as pdfjsLib from 'pdfjs-dist';
import { flattenPDFToImage, createFlattenedPDF, hasSignature, canvasToBlob } from './pdfFlattening';
import { generateExportFilename, generateFilenameDescription, type ExportInfo } from '../filenameGenerator';
import { FormType, savePDFMetadata } from '../engineTimeDB';
import type { PDFGenerationMetadata } from '../types';

export interface CrewInfo {
  crewNumber: string;
  fireName: string;
  fireNumber: string;
}

export interface SaveOptions {
  crewInfo?: CrewInfo;
  date?: string;
  filename?: string;
  formType?: FormType;
  incidentName?: string;
  incidentNumber?: string;
  contractorAgencyName?: string;
  isSigned?: boolean;
}

/**
 * Handles saving a PDF with signature (flattened)
 */
export async function savePDFWithSignature(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  baseCanvas: HTMLCanvasElement,
  drawCanvas: HTMLCanvasElement,
  onSave: (pdfData: Blob, previewImage: Blob) => void,
  options: SaveOptions = {},
  pdfId?: string
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
    }) as CanvasRenderingContext2D;
    
    if (!highResCtx) throw new Error('Failed to get high-res canvas context');
    
    // Draw the high-resolution PDF image
    highResCtx.drawImage(flattenedPdfImage, 0, 0);
    
    // If there's a signature, scale and draw it on the high-res canvas
    if (hasSig) {
      console.log('🔍 PDFSaveHandler: Scaling signature to high resolution...');
      
      // Get the actual internal dimensions of both canvases
      const baseCanvasInternalWidth = baseCanvas.width;
      const baseCanvasInternalHeight = baseCanvas.height;
      const drawCanvasInternalWidth = drawCanvas.width;
      const drawCanvasInternalHeight = drawCanvas.height;
      
      console.log('🔍 PDFSaveHandler: Canvas internal dimensions:', {
        baseCanvas: { width: baseCanvasInternalWidth, height: baseCanvasInternalHeight },
        drawCanvas: { width: drawCanvasInternalWidth, height: drawCanvasInternalHeight },
        flattenedPdf: { width: flattenedPdfImage.width, height: flattenedPdfImage.height }
      });
      
      // Check if the canvas dimensions match
      const dimensionsMatch = baseCanvasInternalWidth === drawCanvasInternalWidth && 
                             baseCanvasInternalHeight === drawCanvasInternalHeight;
      console.log('🔍 PDFSaveHandler: Canvas dimensions match:', dimensionsMatch);
      
      if (!dimensionsMatch) {
        console.warn('🔍 PDFSaveHandler: Canvas dimension mismatch detected!', {
          baseCanvas: { width: baseCanvasInternalWidth, height: baseCanvasInternalHeight },
          drawCanvas: { width: drawCanvasInternalWidth, height: drawCanvasInternalHeight }
        });
      }
      
      // Calculate scale factors from base canvas internal size to flattened PDF size
      const scaleX = flattenedPdfImage.width / baseCanvasInternalWidth;
      const scaleY = flattenedPdfImage.height / baseCanvasInternalHeight;
      
      console.log('🔍 PDFSaveHandler: Signature scale factors:', { scaleX, scaleY });
      
      // Debug: Check the signature content on the drawing canvas
      const drawCtx = drawCanvas.getContext('2d');
      let minX = drawCanvas.width, maxX = 0, minY = drawCanvas.height, maxY = 0;
      
      if (drawCtx) {
        const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        const data = imageData.data;
        
        // Find the bounds of the signature
        for (let y = 0; y < drawCanvas.height; y++) {
          for (let x = 0; x < drawCanvas.width; x++) {
            const index = (y * drawCanvas.width + x) * 4;
            if (data[index + 3] > 0) { // Alpha channel > 0
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        console.log('🔍 PDFSaveHandler: Signature bounds on drawing canvas:', {
          minX, maxX, minY, maxY,
          width: maxX - minX,
          height: maxY - minY,
          canvasWidth: drawCanvas.width,
          canvasHeight: drawCanvas.height
        });
      }
      
      // Draw the signature using its internal dimensions, scaled to match the flattened PDF
      // Instead of drawing the entire canvas, only draw the signature area
      if (minX !== drawCanvas.width && maxX !== 0 && minY !== drawCanvas.height && maxY !== 0) {
        // Calculate the signature bounds in the high-resolution coordinate system
        const sigWidth = maxX - minX;
        const sigHeight = maxY - minY;
        const scaleX = flattenedPdfImage.width / baseCanvasInternalWidth;
        const scaleY = flattenedPdfImage.height / baseCanvasInternalHeight;
        
        // Detect mobile devices and iPads for coordinate adjustment
        const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIPad = /iPad/.test(navigator.userAgent);
        
        // Apply mobile-specific X-axis adjustment
        let adjustedMinX = minX;
        if (isMobile) {
          let adjustment;
          
          if (isIPad) {
            // iPad-specific adjustment (easily changeable)
            adjustment = -45;
          } else {
            // General mobile device adjustment
            adjustment = -185;
          }
          
          adjustedMinX = Math.max(0, minX - adjustment);
          
          console.log('🔍 PDFSaveHandler: Mobile device detected, applying X-axis adjustment:', {
            isIPad,
            originalMinX: minX,
            adjustedMinX: adjustedMinX,
            adjustment: adjustment
          });
        }
        
        const scaledMinX = adjustedMinX * scaleX;
        const scaledMinY = minY * scaleY;
        const scaledSigWidth = sigWidth * scaleX;
        const scaledSigHeight = sigHeight * scaleY;
        
        console.log('🔍 PDFSaveHandler: Drawing signature at scaled position:', {
          isIPad,
          originalBounds: { minX, minY, width: sigWidth, height: sigHeight },
          adjustedBounds: { minX: adjustedMinX, minY, width: sigWidth, height: sigHeight },
          scaledBounds: { x: scaledMinX, y: scaledMinY, width: scaledSigWidth, height: scaledSigHeight },
          scaleFactors: { scaleX, scaleY }
        });
        
        // Draw only the signature area, scaled to high resolution
        highResCtx.drawImage(
          drawCanvas,
          minX, minY, sigWidth, sigHeight,  // Source: signature area only (use original bounds)
          scaledMinX, scaledMinY, scaledSigWidth, scaledSigHeight  // Destination: adjusted scaled signature area
        );
      } else {
        // Fallback: draw the entire canvas if bounds detection failed
        console.warn('🔍 PDFSaveHandler: Signature bounds detection failed, drawing entire canvas');
        highResCtx.drawImage(
          drawCanvas, 
          0, 0, drawCanvasInternalWidth, drawCanvasInternalHeight,  // Source: full internal canvas
          0, 0, flattenedPdfImage.width, flattenedPdfImage.height  // Destination: full flattened PDF size
        );
      }
    }
    
    // Use the high-resolution combined canvas for the flattened PDF
    console.log('🔍 PDFSaveHandler: Using high-resolution combined canvas for flattened PDF...');
    const flattenedPdfBytes = await createFlattenedPDF(highResCanvas, null, null);
    const flattenedPdfBlob = new Blob([flattenedPdfBytes], { type: 'application/pdf' });
    
    console.log('🔍 PDFSaveHandler: Flattened PDF created successfully');

    // Save the flattened PDF
    onSave(flattenedPdfBlob, previewImage);

    // Auto-detect form type from PDF ID if not provided
    const enhancedOptions = { ...options };
    if (!enhancedOptions.formType && pdfId) {
      if (pdfId === 'eest-form') {
        enhancedOptions.formType = FormType.EEST;
      } else if (pdfId === 'federal-form') {
        enhancedOptions.formType = FormType.FEDERAL;
      } else if (pdfId === 'odf-form') {
        enhancedOptions.formType = FormType.ODF;
      }
    }

    // Generate filename using new naming schema
    const filename = generateFilename(enhancedOptions, true);
    
    // Save PDF metadata to database
    await savePDFMetadataToDatabase(enhancedOptions, filename, flattenedPdfBlob.size, true);

    // Download the flattened PDF
    await downloadPDF(flattenedPdfBlob, {
      ...enhancedOptions,
      filename
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
    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // Generate filename using new naming schema
    const filename = generateFilename(options, false);
    
    console.log('🔍 PDFSaveHandler: Downloading PDF with filename:', filename);
    console.log('🔍 PDFSaveHandler: Device info:', { isIOS, isSafari, userAgent: navigator.userAgent });
    
    if (isIOS && isSafari) {
      // iOS Safari specific handling
      console.log('🔍 PDFSaveHandler: Using iOS Safari download method');
      
      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      
      // For iOS Safari, we need to open in a new window/tab
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        // Set the window title to the filename
        newWindow.document.title = filename;
        
        // Clean up the URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        // Fallback: create a link and try to download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        // Add to DOM temporarily
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
    } else {
      // Standard download method for other browsers
      console.log('🔍 PDFSaveHandler: Using standard download method');
      
      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    }
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
    
    // Generate filename using new naming schema
    const filename = generateFilename(options, false);
    
    // Save PDF metadata to database
    await savePDFMetadataToDatabase(options, filename, pdfBlob.size, false);

    await downloadPDF(pdfBlob, {
      ...options,
      filename
    });
  } catch (error) {
    console.error('Error downloading original PDF:', error);
    throw new Error('Failed to download original PDF');
  }
}

/**
 * Generates a filename using the new naming schema
 */
function generateFilename(options: SaveOptions, isSigned: boolean): string {
  // If a custom filename is provided, use it
  if (options.filename) {
    return options.filename;
  }

  // Use new naming schema if form type is specified
  if (options.formType) {
    const exportInfo: ExportInfo = {
      date: options.date || new Date().toISOString().split('T')[0],
      incidentName: options.incidentName,
      incidentNumber: options.incidentNumber,
      contractorAgencyName: options.contractorAgencyName,
      type: 'PDF',
      formType: options.formType,
      isSigned
    };
    
    return generateExportFilename(exportInfo);
  }

  // Fallback to legacy naming for backward compatibility
  if (options.crewInfo && options.date) {
    const legacyInfo = {
      crewNumber: options.crewInfo.crewNumber,
      fireName: options.crewInfo.fireName,
      fireNumber: options.crewInfo.fireNumber,
      date: options.date,
      type: 'PDF' as const
    };
    
    return generateExportFilename({
      ...legacyInfo,
      formType: FormType.FEDERAL, // Default to Federal for legacy
      isSigned
    });
  }

  // Final fallback
  return isSigned ? 'signed_document.pdf' : 'document.pdf';
}

/**
 * Saves PDF generation metadata to the database
 */
async function savePDFMetadataToDatabase(
  options: SaveOptions, 
  filename: string, 
  fileSize: number, 
  isSigned: boolean
): Promise<void> {
  try {
    if (!options.formType) {
      console.warn('PDFSaveHandler: No form type specified, skipping metadata save');
      return;
    }

    const metadata: PDFGenerationMetadata = {
      formType: options.formType,
      incidentName: options.incidentName || 'Unknown',
      incidentNumber: options.incidentNumber || 'Unknown',
      contractorAgencyName: options.contractorAgencyName || 'Unknown',
      dateGenerated: options.date || new Date().toISOString().split('T')[0],
      filename,
      fileSize,
      isSigned,
      createdAt: Date.now()
    };

    await savePDFMetadata(metadata);
    console.log('PDFSaveHandler: PDF metadata saved to database:', metadata);
  } catch (error) {
    console.error('PDFSaveHandler: Error saving PDF metadata:', error);
    // Don't throw error - metadata saving failure shouldn't prevent PDF download
  }
}
