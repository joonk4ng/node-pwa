/// <reference types="vite/client" />

import { PDFDocument } from 'pdf-lib';
import type { TimeEntry, CrewInfo } from './pdfFieldMapper';
import { mapToPDFFields } from './pdfFieldMapper';

interface PDFGenerationOptions {
  downloadImmediately?: boolean;
  returnBlob?: boolean;
  debugMode?: boolean;
}

interface PDFGenerationResult {
  blob?: Blob;
  filename: string;
  pdfId?: string;
  debugInfo?: {
    availableFields: Array<{ name: string; type: string }>;
    mappedFields: Record<string, string>;
    filledFields: Array<{ name: string; value: string; success: boolean }>;
  };
  previewUrl?: string;
}

// Fills the Emergency Equipment Shift Ticket PDF and either triggers a download or returns the PDF data
export async function generateEquipmentPDF(
  timeEntries: TimeEntry[], 
  crewInfo: CrewInfo,
  options: PDFGenerationOptions = { debugMode: true, returnBlob: true },
  pdfUrl = '/eest-fill.pdf'
): Promise<PDFGenerationResult> {
  try {
    if (options.debugMode) {
      console.group('PDF Generation Debug Info');
      console.log('Input Data:', { timeEntries, crewInfo });
    }

    // Ensure the PDF URL is absolute and includes base path
    const basePath = import.meta.env.BASE_URL || '/';
    const absolutePdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${basePath}${pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl}`;
    
    if (options.debugMode) {
      console.log('Loading PDF template from:', absolutePdfUrl);
    }
    
    // Add cache-busting query parameter and force network fetch
    const urlWithCacheBust = `${absolutePdfUrl}?t=${Date.now()}`;
    
    const response = await fetch(urlWithCacheBust, {
      cache: 'no-store', // Force network fetch
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('PDF fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Map the data to PDF fields
    const fields = mapToPDFFields(timeEntries, crewInfo);

    // Get all available fields from the PDF
    const pdfFields = form.getFields();
    const availableFields = pdfFields.map(f => ({ 
      name: f.getName(),
      type: f.constructor.name,
      isReadOnly: f.isReadOnly(),
      isRequired: f.isRequired(),
    }));

    // Create a map of field names for quick lookup
    const availableFieldNames = new Set(pdfFields.map(f => f.getName()));
    
    if (options.debugMode) {
      console.group('PDF Form Fields');
      console.log('Available Fields:', availableFields);
      console.table(availableFields);
      console.log('Field names in PDF:', Array.from(availableFieldNames).sort());
      console.log('Fields we are trying to fill:', Object.keys(fields).sort());
      
      // Find any mismatched field names
      const mismatches = Object.keys(fields).filter(name => !availableFieldNames.has(name));
      if (mismatches.length > 0) {
        console.warn('Fields not found in PDF:', mismatches);
      }
      
      console.groupEnd();
    }

    // Track which fields were successfully filled
    const filledFields: Array<{ 
      name: string; 
      value: string; 
      success: boolean;
      type: string;
      error?: string;
    }> = [];

    // Fill fields
    Object.entries(fields).forEach(([fieldName, value]) => {
      try {
        // Skip if field doesn't exist in PDF
        if (!availableFieldNames.has(fieldName)) {
          filledFields.push({ 
            name: fieldName, 
            value: value.toString(), 
            success: false,
            type: 'Not Found',
            error: 'Field name not found in PDF'
          });
          return;
        }

        const field = form.getField(fieldName);
        const fieldType = field.constructor.name;

        // Handle different field types
        if (fieldType === 'PDFCheckBox' || fieldType === 'PDFCheckBox2') {
          const checkbox = form.getCheckBox(fieldName);
          const checkValue = typeof value === 'boolean' ? value : value.toLowerCase() === 'yes' || value === 'true';
          if (checkValue) {
            checkbox.check();
          } else {
            checkbox.uncheck();
          }
          if (options.debugMode) {
            console.log(`✓ Set checkbox ${fieldName} to ${checkValue}`);
          }
          filledFields.push({ 
            name: fieldName, 
            value: checkValue.toString(), 
            success: true,
            type: fieldType
          });
        } else if (fieldType === 'PDFTextField' || fieldType === 'PDFTextField2') {
          const textField = form.getTextField(fieldName);
          textField.setText(value.toString());
          if (options.debugMode) {
            console.log(`✓ Set text field ${fieldName} to ${value}`);
          }
          filledFields.push({ 
            name: fieldName, 
            value: value.toString(), 
            success: true,
            type: fieldType
          });
        } else {
          if (options.debugMode) {
            console.warn(`Unsupported field type ${fieldType} for field ${fieldName}`);
          }
          filledFields.push({ 
            name: fieldName, 
            value: value.toString(), 
            success: false,
            type: fieldType,
            error: 'Unsupported field type'
          });
        }
      } catch (e) {
        console.error(`Error filling field ${fieldName}:`, e);
        filledFields.push({ 
          name: fieldName, 
          value: value.toString(), 
          success: false,
          type: 'Error',
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    });

    if (options.debugMode) {
      console.group('Field Fill Results');
      console.log('Successfully filled fields:', filledFields.filter(f => f.success).length);
      console.log('Failed fields:', filledFields.filter(f => !f.success).length);
      console.table(filledFields);
      
      // Show any fields we didn't try to fill
      const unusedFields = Array.from(availableFieldNames)
        .filter(name => !Object.keys(fields).includes(name));
      if (unusedFields.length > 0) {
        console.log('Fields in PDF that we did not try to fill:', unusedFields);
      }
      
      console.groupEnd();
    }

    // Save PDF
    const filledPdfBytes = await pdfDoc.save();
    const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
    
    // Create preview URL and generate filename
    const previewUrl = URL.createObjectURL(blob);
    const generatedFilename = generateFilename(crewInfo);
    
    // Handle immediate download if requested
    if (options.downloadImmediately) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = generatedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Don't revoke URL here as we're using it for preview
    }

    if (options.debugMode) {
      console.groupEnd(); // End main debug group
    }

    // Return result with preview URL
    return {
      blob: options.returnBlob ? blob : undefined,
      filename: generatedFilename,
      previewUrl,
      debugInfo: options.debugMode ? {
        availableFields,
        mappedFields: fields,
        filledFields
      } : undefined
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    throw error instanceof Error ? error : new Error('Failed to generate PDF');
  }
}

// Helper function to generate a filename based on crew info
function generateFilename(crewInfo: CrewInfo): string {
  const date = new Date().toISOString().split('T')[0];
  const incidentName = crewInfo.incidentName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
  const incidentNumber = crewInfo.incidentNumber?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
  
  return `equipment-shift-ticket_${date}_${incidentName}_${incidentNumber}.pdf`;
}

// Export the download function for convenience
export async function downloadEquipmentPDF(
  timeEntries: TimeEntry[],
  crewInfo: CrewInfo
): Promise<void> {
  const result = await generateEquipmentPDF(timeEntries, crewInfo, { 
    downloadImmediately: true,
    debugMode: true
  });

  // Clean up preview URL after download
  if (result.previewUrl) {
    URL.revokeObjectURL(result.previewUrl);
  }
} 