import Dexie from 'dexie';

interface PDFData {
  id: string;
  pdf: Blob;
  timestamp: number;
}

// Create or open the PDF storage database
const pdfDB = new Dexie('PDFStorage');
pdfDB.version(1).stores({
  pdfs: 'id'
});

// Store a PDF in IndexedDB
export const storePDF = async (id: string, pdfBlob: Blob): Promise<void> => {
  await pdfDB.table('pdfs').put({
    id,
    pdf: pdfBlob,
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