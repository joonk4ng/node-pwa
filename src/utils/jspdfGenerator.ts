// jsPDF-based PDF Generator for EEST
// This provides better font size control than pdf-lib

import jsPDF from 'jspdf';
import type { EESTFormData, EESTTimeEntry } from './engineTimeDB';

interface PDFGenerationOptions {
  downloadImmediately?: boolean;
  returnBlob?: boolean;
  debugMode?: boolean;
  fontSize?: number;
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

export async function generateEESTPDFWithJsPDF(
  formData: EESTFormData & { equipmentUse?: string },
  timeEntries: EESTTimeEntry[],
  options: PDFGenerationOptions = { debugMode: true, returnBlob: true, fontSize: 8 }
): Promise<PDFGenerationResult> {
  try {
    if (options.debugMode) {
      console.group('jsPDF EEST PDF Generation');
      console.log('Form Data:', formData);
      console.log('Time Entries:', timeEntries);
      console.log('Options:', options);
    }

    // Create a new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Set font size
    const fontSize = options.fontSize || 8;
    pdf.setFontSize(fontSize);
    
    // Set font
    pdf.setFont('helvetica', 'normal');

    // Helper function to add text with position
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (!text) return;
      
      // Truncate text if maxWidth is specified
      let displayText = text;
      if (maxWidth) {
        const charWidth = fontSize * 0.2; // Approximate character width
        const maxChars = Math.floor(maxWidth / charWidth);
        if (text.length > maxChars) {
          displayText = text.substring(0, maxChars);
        }
      }
      
      pdf.text(displayText, x, y);
    };

    // Helper function to add checkbox
    const addCheckbox = (x: number, y: number, checked: boolean) => {
      if (checked) {
        pdf.rect(x, y, 3, 3, 'F'); // Filled rectangle for checked
      } else {
        pdf.rect(x, y, 3, 3, 'S'); // Stroke rectangle for unchecked
      }
    };

    // Page setup
    const pageWidth = 210; // A4 width in mm
    const margin = 20;
    
    let yPosition = 30; // Start position

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Emergency Equipment Shift Ticket', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');

    // Form fields
    const fieldSpacing = 8;
    const labelWidth = 60;
    const fieldWidth = 80;
    const fieldX = margin + labelWidth + 5;

    // 1. Agreement Number
    addText('1. AGREEMENT NUMBER:', margin, yPosition);
    addText(formData.agreementNumber || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // 2. Contractor Name
    addText('2. CONTRACTOR (name):', margin, yPosition);
    addText(formData.contractorAgencyName || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // 3. Incident Name
    addText('3. INCIDENT OR PROJECT NAME:', margin, yPosition);
    addText(formData.incidentName || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // 4. Incident Number
    addText('4. INCIDENT NUMBER:', margin, yPosition);
    addText(formData.incidentNumber || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // 5. Operator Name
    addText('5. OPERATOR (name):', margin, yPosition);
    addText(formData.operatorName || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // Equipment section
    yPosition += 5;
    addText('6. EQUIPMENT MAKE:', margin, yPosition);
    addText(formData.equipmentMake || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    addText('7. EQUIPMENT MODEL:', margin, yPosition);
    addText(formData.equipmentModel || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    addText('9. SERIAL NUMBER:', margin, yPosition);
    addText(formData.serialNumber || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    addText('10. LICENSE NUMBER:', margin, yPosition);
    addText(formData.licenseNumber || '', fieldX, yPosition, fieldWidth);
    yPosition += fieldSpacing;

    // Operator Furnished By
    yPosition += 5;
    addText('8. OPERATOR FURNISHED BY:', margin, yPosition);
    addCheckbox(fieldX, yPosition - 2, formData.equipmentStatus === 'Contractor');
    addText('Contractor', fieldX + 8, yPosition);
    yPosition += fieldSpacing;

    // Operating Supplies Furnished By
    addText('11. OPERATING SUPPLIES FURNISHED BY:', margin, yPosition);
    addCheckbox(fieldX, yPosition - 2, formData.equipmentStatus === 'Contractor');
    addText('Contractor', fieldX + 8, yPosition);
    yPosition += fieldSpacing;

    // Equipment Use
    yPosition += 5;
    addText('13. EQUIPMENT USE:', margin, yPosition);
    addCheckbox(fieldX, yPosition - 2, formData.equipmentUse === 'HOURS');
    addText('HRS', fieldX + 8, yPosition);
    yPosition += fieldSpacing;

    // Time entries table
    yPosition += 10;
    pdf.setFont('helvetica', 'bold');
    addText('12. TIME ENTRIES', margin, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');

    // Table headers
    const tableX = margin;
    const dateWidth = 25;
    const timeWidth = 20;
    const workWidth = 40;
    const specialWidth = 40;
    
    addText('DATE', tableX, yPosition);
    addText('START', tableX + dateWidth, yPosition);
    addText('STOP', tableX + dateWidth + timeWidth, yPosition);
    addText('WORK', tableX + dateWidth + timeWidth * 2, yPosition);
    addText('SPECIAL', tableX + dateWidth + timeWidth * 2 + workWidth, yPosition);
    yPosition += 5;

    // Table data
    timeEntries.forEach((entry, index) => {
      if (index < 4) { // Limit to 4 rows
        addText(entry.date || '', tableX, yPosition, dateWidth);
        addText(entry.start || '', tableX + dateWidth, yPosition, timeWidth);
        addText(entry.stop || '', tableX + dateWidth + timeWidth, yPosition, timeWidth);
        addText(entry.work || '', tableX + dateWidth + timeWidth * 2, yPosition, workWidth);
        addText(entry.special || '', tableX + dateWidth + timeWidth * 2 + workWidth, yPosition, specialWidth);
        yPosition += 5;
      }
    });

    // Remarks section
    yPosition += 10;
    pdf.setFont('helvetica', 'bold');
    addText('14. REMARKS', margin, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');

    // Remarks checkboxes
    if (formData.remarksOptions) {
      formData.remarksOptions.forEach(remark => {
        addCheckbox(margin, yPosition - 2, true);
        addText(remark, margin + 8, yPosition);
        yPosition += 4;
      });
    }

    // Custom remarks
    if (formData.customRemarks) {
      formData.customRemarks.forEach(remark => {
        addCheckbox(margin, yPosition - 2, true);
        addText(remark, margin + 8, yPosition);
        yPosition += 4;
      });
    }

    // Generate filename
    const filename = `EEST_${formData.incidentName || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Convert to blob
    const pdfBlob = pdf.output('blob');
    const previewUrl = URL.createObjectURL(pdfBlob);

    const result: PDFGenerationResult = {
      blob: options.returnBlob ? pdfBlob : undefined,
      filename,
      previewUrl,
      debugInfo: {
        availableFields: [],
        mappedFields: {},
        filledFields: []
      }
    };

    if (options.debugMode) {
      console.log('jsPDF Generation Result:', result);
      console.groupEnd();
    }

    return result;
  } catch (error) {
    console.error('Error generating EEST PDF with jsPDF:', error);
    throw error;
  }
}
