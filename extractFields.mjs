import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function extractFieldNamesFromFile(inputPath, outputPath) {
  try {
    // Read the local PDF file
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Get field names and types
    const fieldInfo = fields.map((field) => ({
      name: field.getName(),
      type: field.constructor.name
    }));

    // Create CSV content with field names and types
    const csvContent = fieldInfo
      .map(field => `${field.name},${field.type}`)
      .join('\n');

    fs.writeFileSync(outputPath, csvContent);
    console.log(`Field names exported to ${outputPath}`);
    
    // Also log to console for debugging
    console.log('\nExtracted fields:');
    fieldInfo.forEach(field => {
      console.log(`${field.name} (${field.type})`);
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
  }
}

// Get input and output paths from command line arguments
const inputPath = process.argv[2];
const outputPath = process.argv[3] || './pdf_fields.csv';

if (!inputPath) {
  console.error('Please provide a PDF file path');
  process.exit(1);
}

extractFieldNamesFromFile(inputPath, outputPath);
