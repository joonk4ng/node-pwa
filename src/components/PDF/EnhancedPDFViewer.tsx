// Enhanced PDF Viewer - Main component that combines PDF viewing with signature functionality
import React, { useRef, useState } from 'react';
import { PDFViewer } from './PDFViewer';
import { PDFToolbar } from './PDFToolbar';

export interface EnhancedPDFViewerProps {
  pdfId?: string;
  onSave?: (pdfData: Blob, previewImage: Blob) => void;
  onBeforeSign?: () => Promise<void>;
  className?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
  crewInfo?: {
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  date?: string;
}

export const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = (props) => {
  const {
    onSave,
    readOnly = false
  } = props;

  const pdfViewerRef = useRef<{ 
    handleSave: () => void; 
    handleDownload: () => void; 
    handlePrint: () => void;
    isDrawingMode: boolean;
    toggleDrawingMode: () => void;
    clearDrawing: () => void;
    currentZoom: number;
    setZoom: (zoom: number) => void;
    availableZooms: number[];
  }>(null);

  // Local state for toolbar
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Handle save action
  const handleSave = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.handleSave();
    }
  };

  // Handle download action
  const handleDownload = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.handleDownload();
    }
  };

  // Handle print action
  const handlePrint = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.handlePrint();
    }
  };

  // Handle toggle drawing mode
  const handleToggleDrawing = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.toggleDrawingMode();
      setIsDrawingMode(pdfViewerRef.current.isDrawingMode);
    }
  };

  // Handle clear drawing
  const handleClearDrawing = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.clearDrawing();
    }
  };

  // Handle zoom change
  const handleZoomChange = (newZoom: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.setZoom(newZoom);
    }
  };

  // Get current zoom and available zooms
  const getCurrentZoom = () => pdfViewerRef.current?.currentZoom || 1.0;
  const getAvailableZooms = () => pdfViewerRef.current?.availableZooms || [1.0, 1.25, 1.5];

  return (
    <div className="enhanced-pdf-container">
      <PDFViewer ref={pdfViewerRef} {...props} />
      {!readOnly && (
        <PDFToolbar
          isDrawingMode={isDrawingMode}
          onToggleDrawing={handleToggleDrawing}
          onSave={onSave ? handleSave : undefined}
          onClear={handleClearDrawing}
          onDownload={handleDownload}
          onPrint={handlePrint}
          readOnly={readOnly}
          currentZoom={getCurrentZoom()}
          availableZooms={getAvailableZooms()}
          onZoomChange={handleZoomChange}
        />
      )}
    </div>
  );
};

export default EnhancedPDFViewer;