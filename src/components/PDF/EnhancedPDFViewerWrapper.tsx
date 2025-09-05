// React component for the enhanced PDF viewer with signature integration and PDF flattening

import React from 'react';
import { EnhancedPDFViewer as NewEnhancedPDFViewer } from './EnhancedPDFViewer';
import '../styles/components/PDFViewer.css';

// Defines properties for the EnhancedPDFViewer component
export interface EnhancedPDFViewerProps {
  // PDF ID - unique identifier for the PDF
  pdfId?: string;
  // Callback function for saving the PDF
  onSave?: (pdfData: Blob, previewImage: Blob) => void;
  // Callback function called before signing (for sneaky save)
  onBeforeSign?: () => Promise<void>;
  // Class name for the component
  className?: string;
  // Style for the component
  style?: React.CSSProperties;
  // Read only state - whether the component is read only
  readOnly?: boolean;
  crewInfo?: {
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  date?: string;
}

const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = (props) => {
  return <NewEnhancedPDFViewer {...props} />;
};

export default EnhancedPDFViewer;
