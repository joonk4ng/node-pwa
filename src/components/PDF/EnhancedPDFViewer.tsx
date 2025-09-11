// Enhanced PDF Viewer - Main component that combines PDF viewing with signature functionality
import React, { useRef } from 'react';
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
    isDrawingMode: boolean;
    toggleDrawingMode: () => void;
    clearDrawing: () => void;
  }>(null);

  // Handle save action (saves flattened PDF with signature only)
  const handleSave = () => {
    if (pdfViewerRef.current) {
      // Only save the flattened PDF with signature
      pdfViewerRef.current.handleSave();
    }
  };

  // Handle toggle drawing mode
  const handleToggleDrawing = async () => {
    if (pdfViewerRef.current) {
      await pdfViewerRef.current.toggleDrawingMode();
    }
  };

  // Get the current drawing mode from the PDFViewer
  const isDrawingMode = pdfViewerRef.current?.isDrawingMode || false;

  // Handle clear drawing
  const handleClearDrawing = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.clearDrawing();
    }
  };


  return (
    <div className="enhanced-pdf-container">
      {!readOnly && (
        <PDFToolbar
          isDrawingMode={isDrawingMode}
          onToggleDrawing={handleToggleDrawing}
          onSave={onSave ? handleSave : undefined}
          onClear={handleClearDrawing}
          readOnly={readOnly}
        />
      )}
      <PDFViewer ref={pdfViewerRef} {...props} />
    </div>
  );
};

export default EnhancedPDFViewer;