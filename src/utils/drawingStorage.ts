import Dexie from 'dexie';
import type { Table } from 'dexie';
import { type DrawingData } from '../components/DrawingOverlay';

class DrawingStorageDatabase extends Dexie {
  drawings!: Table<{
    key: string;
    pdfId: string;
    drawingData: DrawingData;
    timestamp: number;
  }>;

  constructor() {
    super('DrawingStorage');
    this.version(1).stores({
      drawings: 'key'
    });
  }
}

const db = new DrawingStorageDatabase();

export interface StoredDrawing {
  pdfId: string;
  drawingData: DrawingData;
  timestamp: number;
}

/**
 * Store drawing data for a specific PDF
 */
export async function storeDrawing(pdfId: string, drawingData: DrawingData): Promise<void> {
  try {
    const key = `drawing_${pdfId}`;
    await db.drawings.put({
      key,
      pdfId,
      drawingData,
      timestamp: Date.now()
    });
    console.log('Drawing data stored successfully:', pdfId);
  } catch (error) {
    console.error('Error storing drawing data:', error);
    throw error;
  }
}

/**
 * Retrieve drawing data for a specific PDF
 */
export async function getDrawing(pdfId: string): Promise<DrawingData | null> {
  try {
    const key = `drawing_${pdfId}`;
    const result = await db.drawings.get(key);
    
    if (result) {
      console.log('Drawing data retrieved successfully:', pdfId);
      return result.drawingData;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving drawing data:', error);
    return null;
  }
}

/**
 * Delete drawing data for a specific PDF
 */
export async function deleteDrawing(pdfId: string): Promise<void> {
  try {
    const key = `drawing_${pdfId}`;
    await db.drawings.delete(key);
    console.log('Drawing data deleted successfully:', pdfId);
  } catch (error) {
    console.error('Error deleting drawing data:', error);
    throw error;
  }
}

/**
 * Get all stored drawings
 */
export async function getAllDrawings(): Promise<StoredDrawing[]> {
  try {
    const results = await db.drawings.toArray();
    
    return results.map(result => ({
      pdfId: result.pdfId,
      drawingData: result.drawingData,
      timestamp: result.timestamp
    }));
  } catch (error) {
    console.error('Error retrieving all drawings:', error);
    return [];
  }
}

/**
 * Clear all drawing data
 */
export async function clearAllDrawings(): Promise<void> {
  try {
    await db.drawings.clear();
    console.log('All drawing data cleared successfully');
  } catch (error) {
    console.error('Error clearing all drawings:', error);
    throw error;
  }
}

/**
 * Export drawing data as JSON
 */
export async function exportDrawingData(pdfId: string): Promise<string> {
  try {
    const drawingData = await getDrawing(pdfId);
    if (!drawingData) {
      throw new Error('No drawing data found for this PDF');
    }
    
    const exportData = {
      pdfId,
      drawingData,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting drawing data:', error);
    throw error;
  }
}

/**
 * Import drawing data from JSON
 */
export async function importDrawingData(jsonData: string): Promise<void> {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.pdfId || !importData.drawingData) {
      throw new Error('Invalid drawing data format');
    }
    
    await storeDrawing(importData.pdfId, importData.drawingData);
    console.log('Drawing data imported successfully:', importData.pdfId);
  } catch (error) {
    console.error('Error importing drawing data:', error);
    throw error;
  }
}
