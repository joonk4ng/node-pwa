// PDF Storage for the Emergency Equipment Shift Ticket
// This file is used to store the PDF in IndexedDB
// It is used to store the PDF in IndexedDB
// It is used to retrieve the PDF from IndexedDB
// It is used to delete the PDF from IndexedDB
// It is used to list all the PDFs in IndexedDB
// It is used to clear all the PDFs in IndexedDB
import Dexie from 'dexie';

// PDF Data
interface PDFData {
  // ID
  id: string;
  // PDF Blob
  pdf: Blob;
  // Timestamp
  timestamp: number;
}

// Create or open the PDF storage database
const pdfDB = new Dexie('PDFStorage');
pdfDB.version(1).stores({
  pdfs: 'id'
});

// Store a PDF in IndexedDB
export const storePDF = async (id: string, pdfBlob: Blob): Promise<void> => {
  // Store the PDF in IndexedDB
  await pdfDB.table('pdfs').put({
    // ID
    id,
    // PDF Blob
    pdf: pdfBlob,
    // Timestamp
    timestamp: Date.now(),
  });
};

// Retrieve a PDF from IndexedDB
export const getPDF = async (id: string): Promise<PDFData | undefined> => {
  return await pdfDB.table('pdfs').get(id);
};

// Delete a PDF from IndexedDB
export const deletePDF = async (id: string): Promise<void> => {
  await pdfDB.table('pdfs').delete(id);
};

// List all stored PDFs
export const listPDFs = async (): Promise<PDFData[]> => {
  return await pdfDB.table('pdfs').toArray();
};

// Clear all stored PDFs
export const clearAllPDFs = async (): Promise<void> => {
  await pdfDB.table('pdfs').clear();
}; 