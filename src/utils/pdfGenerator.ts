/// <reference types="vite/client" />
// PDF Generation for the Emergency Equipment Shift Ticket
// This file is used to generate the Emergency Equipment Shift Ticket PDF
// It is used to generate the PDF from the time entries and crew info
// It is also used to download the PDF
// It is also used to preview the PDF
// It is also used to debug the PDF generation
// It is also used to generate the filename

import { PDFDocument } from 'pdf-lib';
import type { TimeEntry, CrewInfo } from './pdfFieldMapper';
import { mapToPDFFields } from './pdfFieldMapper';
import { mapEESTToPDFFields, debugPDFFields } from './eestFieldMapper';
import type { EESTFormData, EESTTimeEntry } from './engineTimeDB';

interface PDFGenerationOptions {
  downloadImmediately?: boolean;
  returnBlob?: boolean;
  debugMode?: boolean;
  fontSize?: number; // Font size for text fields (default: 8)
}

// PDF Generation Result
interface PDFGenerationResult {
  // PDF Blob
  blob?: Blob;
  // Filename
  filename: string;
  // PDF ID
  pdfId?: string;
  // Debug Info
  debugInfo?: {
    // Available Fields
    availableFields: Array<{ name: string; type: string }>;
    // Mapped Fields
    mappedFields: Record<string, string>;
    // Filled Fields
    filledFields: Array<{ name: string; value: string; success: boolean }>;
    // Preview URL
  };
  previewUrl?: string;
}

// Fills the Emergency Equipment Shift Ticket PDF and either triggers a download or returns the PDF data
export async function generateEquipmentPDF(
  // Time Entries
  timeEntries: TimeEntry[], 
  // Crew Info
  crewInfo: CrewInfo,
  // Options
  options: PDFGenerationOptions = { debugMode: true, returnBlob: true },
  // PDF URL
  pdfUrl = '/eest-fill.pdf'
): Promise<PDFGenerationResult> {
  try {
    // Debug Info
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
    
    // Fetch the PDF template
    const response = await fetch(urlWithCacheBust, {
      cache: 'no-store', // Force network fetch
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    // Check if the PDF fetch failed
    if (!response.ok) {
      console.error('PDF fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    // Load the PDF template
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form from the PDF
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
    
    // Debug Info
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

    // Flatten the form fields to make them non-editable
    if (options.debugMode) {
      console.log('Flattening PDF form fields...');
    }
    
    // Flatten all form fields to merge them into the PDF content
    form.flatten();
    
    if (options.debugMode) {
      console.log('PDF form fields flattened successfully');
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

// EEST-specific PDF generation using actual form data
export async function generateEESTPDF(
  formData: EESTFormData & { equipmentUse?: string },
  timeEntries: EESTTimeEntry[],
  options: PDFGenerationOptions = { debugMode: true, returnBlob: true },
  pdfUrl = '/eest-fill.pdf'
): Promise<PDFGenerationResult> {
  try {
    // Debug Info
    if (options.debugMode) {
      console.group('EEST PDF Generation Debug Info');
      console.log('Form Data:', formData);
      console.log('Time Entries:', timeEntries);
    }

    // Ensure the PDF URL is absolute and includes base path
    const basePath = import.meta.env.BASE_URL || '/';
    const absolutePdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${basePath}${pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl}`;
    
    if (options.debugMode) {
      console.log('Loading EEST PDF template from:', absolutePdfUrl);
    }
    
    // Add cache-busting query parameter and force network fetch
    const urlWithCacheBust = `${absolutePdfUrl}?t=${Date.now()}`;
    
    // Fetch the PDF template
    const response = await fetch(urlWithCacheBust, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('PDF fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    // Load the PDF template
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form from the PDF
    const form = pdfDoc.getForm();

    // Debug: Log all available fields to help identify correct field names
    if (options.debugMode) {
      debugPDFFields(form);
    }

    // Map EEST data to PDF fields using the new field mapper
    const fields = mapEESTToPDFFields(formData, timeEntries);

    // Get all available fields from the PDF
    const pdfFields = form.getFields();
    const availableFields = pdfFields.map(f => ({ 
      name: f.getName(),
      type: f.constructor.name,
      isReadOnly: f.isReadOnly(),
    }));

    if (options.debugMode) {
      console.log('PDF Generation Options:', options);
      console.log('Available PDF Fields:', availableFields);
      console.log('Mapped Fields:', fields);
      
      // Check if Dropdown9 field exists
      const dropdown9Field = availableFields.find(f => f.name === 'Dropdown9');
      console.log('Dropdown9 field found:', dropdown9Field);
      
      // Check if we're trying to set Dropdown9
      if (fields['Dropdown9']) {
        console.log('Attempting to set Dropdown9 to:', fields['Dropdown9']);
      }
    }

    // Fill the PDF fields
    const filledFields: Array<{ name: string; value: string; success: boolean }> = [];
    
    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        // Try to get the field and determine its type
        const field = form.getField(fieldName);
        if (!field) {
          filledFields.push({ name: fieldName, value, success: false });
          continue;
        }

        const fieldType = field.constructor.name;
        
        if (fieldType.includes('PDFCheckBox') || fieldType.includes('CheckBox')) {
          // Handle checkbox fields
          console.log(`Processing checkbox field: ${fieldName}, value: ${value}, fieldType: ${fieldType}`);
          const checkbox = form.getCheckBox(fieldName);
          if (checkbox) {
            if (value === 'Yes' || value === 'true') {
              console.log(`Checking checkbox: ${fieldName}`);
              checkbox.check();
            } else {
              console.log(`Unchecking checkbox: ${fieldName}`);
              checkbox.uncheck();
            }
            filledFields.push({ name: fieldName, value, success: true });
          } else {
            console.log(`Failed to get checkbox: ${fieldName}`);
            filledFields.push({ name: fieldName, value, success: false });
          }
        } else if (fieldType.includes('PDFDropdown') || fieldType.includes('Dropdown')) {
          // Handle dropdown fields
          console.log(`Processing dropdown field: ${fieldName}, value: ${value}, fieldType: ${fieldType}`);
          const dropdown = form.getDropdown(fieldName);
          if (dropdown) {
            try {
              // Try to select the option by value
              console.log(`Attempting to select dropdown option: ${fieldName} = ${value}`);
              dropdown.select(value);
              console.log(`Successfully selected dropdown option: ${fieldName} = ${value}`);
              filledFields.push({ name: fieldName, value, success: true });
            } catch (dropdownError) {
              console.log(`Failed to select dropdown option for ${fieldName}:`, dropdownError);
              console.log(`Dropdown options available:`, dropdown.getOptions());
              filledFields.push({ name: fieldName, value, success: false });
            }
          } else {
            console.log(`Failed to get dropdown: ${fieldName}`);
            filledFields.push({ name: fieldName, value, success: false });
          }
        } else {
          // Handle text fields
          const textField = form.getTextField(fieldName);
          if (textField) {
            // Set the text value
            textField.setText(value);
            
            // Try to control text size through field properties
            try {
              const fontSize = options.fontSize || 8;
              console.log(`Attempting to control text size for field ${fieldName}: ${fontSize}`);
              
              // Try to set font size (may fail if PDF doesn't support it)
              try {
                textField.setFontSize(fontSize);
                console.log(`Successfully set font size for field ${fieldName}`);
              } catch {
                console.log(`Font size setting not supported for ${fieldName} - trying alternative approach`);
                
                // Alternative: Try to create a default appearance for the field
                try {
                  // Get the underlying AcroField and try to set its default appearance
                  const acroField = textField.acroField;
                  if (acroField) {
                    // Create a default appearance string with the desired font size
                    const defaultAppearance = `/Helv ${fontSize} Tf 0 g`;
                    acroField.setDefaultAppearance(defaultAppearance);
                    console.log(`Set default appearance for ${fieldName}: ${defaultAppearance}`);
                  }
                } catch (appearanceError) {
                  console.log(`Could not set default appearance for ${fieldName}:`, appearanceError);
                  
                  // Last resort: Try to set alignment
                  try {
                    textField.setAlignment(1); // 0=left, 1=center, 2=right
                    console.log(`Set alignment for ${fieldName}`);
                  } catch {
                    console.log(`Alignment setting not supported for ${fieldName}`);
                  }
                }
              }
            } catch (error) {
              console.log(`Could not modify field properties for ${fieldName}:`, error);
            }
            
            filledFields.push({ name: fieldName, value, success: true });
          } else {
            filledFields.push({ name: fieldName, value, success: false });
          }
        }
      } catch (error) {
        console.warn(`Failed to fill field ${fieldName}:`, error);
        filledFields.push({ name: fieldName, value, success: false });
      }
    }

    if (options.debugMode) {
      console.log('Filled Fields:', filledFields);
    }

    // Add signatures to the PDF if provided
    if (formData.contractorSignature || formData.governmentSignature) {
      if (options.debugMode) {
        console.log('Adding signatures to PDF...');
        console.log('Contractor signature:', formData.contractorSignature ? 'Present' : 'Not provided');
        console.log('Government signature:', formData.governmentSignature ? 'Present' : 'Not provided');
      }

      try {
        // Get the first page of the PDF
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
          const page = pages[0];
          const { width, height } = page.getSize();

          // Add contractor signature if provided
          if (formData.contractorSignature) {
            try {
              // Convert base64 signature to image
              const contractorImage = await pdfDoc.embedPng(formData.contractorSignature);
              
              // Position for contractor signature (adjust coordinates as needed)
              const contractorX = width * 0.1; // 10% from left
              const contractorY = height * 0.15; // 15% from bottom
              const contractorWidth = 80; // Width in points
              const contractorHeight = 40; // Height in points
              
              page.drawImage(contractorImage, {
                x: contractorX,
                y: contractorY,
                width: contractorWidth,
                height: contractorHeight,
              });
              
              if (options.debugMode) {
                console.log('Contractor signature added at:', { x: contractorX, y: contractorY, width: contractorWidth, height: contractorHeight });
              }
            } catch (error) {
              console.warn('Failed to add contractor signature:', error);
            }
          }

          // Add government signature if provided
          if (formData.governmentSignature) {
            try {
              // Convert base64 signature to image
              const governmentImage = await pdfDoc.embedPng(formData.governmentSignature);
              
              // Position for government signature (adjust coordinates as needed)
              const governmentX = width * 0.6; // 60% from left
              const governmentY = height * 0.15; // 15% from bottom
              const governmentWidth = 80; // Width in points
              const governmentHeight = 40; // Height in points
              
              page.drawImage(governmentImage, {
                x: governmentX,
                y: governmentY,
                width: governmentWidth,
                height: governmentHeight,
              });
              
              if (options.debugMode) {
                console.log('Government signature added at:', { x: governmentX, y: governmentY, width: governmentWidth, height: governmentHeight });
              }
            } catch (error) {
              console.warn('Failed to add government signature:', error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to add signatures to PDF:', error);
      }
    }

    // Flatten the form fields to make them non-editable
    if (options.debugMode) {
      console.log('Flattening PDF form fields...');
    }
    
    // Flatten all form fields to merge them into the PDF content
    form.flatten();
    
    if (options.debugMode) {
      console.log('PDF form fields flattened successfully');
    }

    // Save the PDF
    const pdfBytes2 = await pdfDoc.save();
    const blob = new Blob([pdfBytes2], { type: 'application/pdf' });

    // Generate filename
    const filename = `EEST_${formData.incidentName || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Create preview URL
    const previewUrl = URL.createObjectURL(blob);

    const result: PDFGenerationResult = {
      blob: options.returnBlob ? blob : undefined,
      filename,
      debugInfo: {
        availableFields,
        mappedFields: fields,
        filledFields,
      },
      previewUrl,
    };

    if (options.debugMode) {
      console.log('PDF Generation Result:', result);
      console.groupEnd();
    }

    return result;
  } catch (error) {
    console.error('Error generating EEST PDF:', error);
    throw error;
  }
} 