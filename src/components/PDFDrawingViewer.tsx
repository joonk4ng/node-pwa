import React, { useState, useRef, useCallback, useEffect } from 'react';
import PDFCanvasRenderer from './PDFCanvasRenderer';
import DrawingOverlay, { type DrawingData } from './DrawingOverlay';
import { PDFDocument, rgb } from 'pdf-lib';
import '../styles/components/PDFDrawingViewer.css';

interface PDFDrawingViewerProps {
  pdfId: string;
  onDrawingChange?: (drawingData: DrawingData) => void;
  initialDrawingData?: DrawingData;
  onExport?: (pdfBlob: Blob) => void;
  className?: string;
  style?: React.CSSProperties;
}

const PDFDrawingViewer: React.FC<PDFDrawingViewerProps> = ({
  pdfId,
  onDrawingChange,
  initialDrawingData,
  onExport,
  className,
  style
}) => {
  const [scale, setScale] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [drawingData, setDrawingData] = useState<DrawingData>(
    initialDrawingData || { strokes: [], version: '1.0' }
  );
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setPdfDimensions({
      width: canvas.width,
      height: canvas.height
    });
  }, []);

  const handleDrawingChange = useCallback((newDrawingData: DrawingData) => {
    setDrawingData(newDrawingData);
    onDrawingChange?.(newDrawingData);
  }, [onDrawingChange]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 5)); // Max 5x zoom
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1)); // Min 0.1x zoom
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
  }, []);

  const exportPDFWithDrawings = useCallback(async () => {
    console.log('Starting PDF export with drawings...');
    console.log('PDF ID:', pdfId);
    console.log('Drawing data:', drawingData);
    
    if (!pdfId) {
      console.error('No PDF ID provided');
      return;
    }
    
    if (!drawingData || drawingData.strokes.length === 0) {
      console.error('No drawing data to export');
      alert('No drawings to export. Please draw something first.');
      return;
    }

    try {
      setIsExporting(true);

      // Get the original PDF
      const { getPDF } = await import('../utils/pdfStorage');
      const pdfData = await getPDF(pdfId);
      if (!pdfData) {
        throw new Error('PDF not found in storage');
      }

      // Load PDF with pdf-lib
      const pdfBytes = await pdfData.pdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Get page dimensions
      const { width: pageWidth, height: pageHeight } = firstPage.getSize();
      console.log('PDF page dimensions:', { pageWidth, pageHeight });

      // Draw a test rectangle to verify drawing is working
      firstPage.drawRectangle({
        x: 100,
        y: pageHeight - 100,
        width: 200,
        height: 100,
        borderColor: rgb(1, 0, 0), // Red
        borderWidth: 5,
      });
      console.log('Drew test rectangle');

      // Draw strokes directly on the PDF using pdf-lib
      console.log('Exporting strokes:', drawingData.strokes.length);
      
      drawingData.strokes.forEach((stroke, strokeIndex) => {
        console.log(`=== PROCESSING STROKE ${strokeIndex} ===`);
        console.log(`Stroke object:`, stroke);
        console.log(`Points length: ${stroke.points?.length || 0}`);
        console.log(`PDFPoints length: ${stroke.pdfPoints?.length || 0}`);
        
        if (!stroke.points || stroke.points.length < 2) {
          console.log(`❌ Skipping stroke ${strokeIndex}: insufficient points`);
          return;
        }
        
        if (!stroke.pdfPoints || stroke.pdfPoints.length < 2) {
          console.log(`❌ Skipping stroke ${strokeIndex}: insufficient pdfPoints`);
          return;
        }

        console.log(`Processing stroke ${strokeIndex}: ${stroke.points.length} points`);
        console.log(`Stroke points:`, stroke.points);
        console.log(`Stroke pdfPoints:`, stroke.pdfPoints);

        // Convert color string to RGB and ensure minimum thickness
        const color = rgb(0, 0, 0); // Always use black for now
        const thickness = Math.max(stroke.width, 2); // Ensure minimum thickness of 2
        
        // Draw each stroke as line segments using unscaled coordinates
        for (let i = 0; i < stroke.pdfPoints.length - 1; i++) {
          const startPoint = stroke.pdfPoints[i];
          const endPoint = stroke.pdfPoints[i + 1];
          
          // Simple coordinate mapping - just flip Y axis
          const startY = pageHeight - startPoint.y;
          const endY = pageHeight - endPoint.y;
          
          console.log(`=== STROKE ${strokeIndex} SEGMENT ${i} ===`);
          console.log(`Original canvas coords: (${startPoint.x}, ${startPoint.y}) to (${endPoint.x}, ${endPoint.y})`);
          console.log(`PDF coords: (${startPoint.x}, ${startY}) to (${endPoint.x}, ${endY})`);
          console.log(`Page dimensions: ${pageWidth} x ${pageHeight}`);
          console.log(`Stroke thickness: ${thickness}`);
          
          // Check if coordinates are within reasonable bounds
          if (startPoint.x < 0 || startPoint.x > pageWidth || startPoint.y < 0 || startPoint.y > pageHeight) {
            console.warn(`⚠️ Coordinates out of bounds: (${startPoint.x}, ${startPoint.y})`);
          } else {
            console.log(`✅ Coordinates within bounds`);
          }
          
          try {
            firstPage.drawLine({
              start: { x: startPoint.x, y: startY },
              end: { x: endPoint.x, y: endY },
              thickness: thickness,
              color: color,
            });
            console.log(`✅ Line drawn successfully`);
          } catch (error) {
            console.error(`❌ Error drawing line:`, error);
          }
        }
      });

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      // Notify parent component
      onExport?.(pdfBlob);

      console.log('PDF exported successfully with drawings');

    } catch (error) {
      console.error('Error exporting PDF with drawings:', error);
      alert('Failed to export PDF with drawings. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [pdfId, drawingData, onExport]);

  const downloadPDFWithDrawings = useCallback(async () => {
    try {
      await exportPDFWithDrawings();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }, [exportPDFWithDrawings]);

  // Listen for export events from parent components
  useEffect(() => {
    const handleExportEvent = () => {
      downloadPDFWithDrawings();
    };

    window.addEventListener('export-pdf-with-drawings', handleExportEvent);
    
    return () => {
      window.removeEventListener('export-pdf-with-drawings', handleExportEvent);
    };
  }, [downloadPDFWithDrawings]);

  return (
    <div 
      ref={containerRef}
      className={`pdf-drawing-viewer ${className || ''}`}
      style={style}
    >
      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={handleZoomOut}>-</button>
        <button onClick={handleZoomReset}>{Math.round(scale * 100)}%</button>
        <button onClick={handleZoomIn}>+</button>
      </div>

      {/* Export button - hidden when used in TimeEntryTable */}
      {!className?.includes('no-export-button') && (
        <div className="export-controls">
          <button
            onClick={downloadPDFWithDrawings}
            disabled={isExporting || drawingData.strokes.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Export PDF with Drawings'}
          </button>
        </div>
      )}

      {/* PDF Canvas Renderer */}
      <div 
        className="pdf-container"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        <PDFCanvasRenderer
          pdfId={pdfId}
          onCanvasReady={handleCanvasReady}
          style={{
            width: '100%',
            height: '100%'
          }}
        />

        {/* Drawing Overlay */}
        {pdfDimensions.width > 0 && pdfDimensions.height > 0 && (
          <DrawingOverlay
            width={pdfDimensions.width}
            height={pdfDimensions.height}
            scale={scale}
            onDrawingChange={handleDrawingChange}
            initialDrawingData={initialDrawingData}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>

      {/* Drawing info */}
      {drawingData.strokes.length > 0 && (
        <div className="drawing-info">
          {drawingData.strokes.length} stroke{drawingData.strokes.length !== 1 ? 's' : ''} drawn
        </div>
      )}
    </div>
  );
};

export default PDFDrawingViewer;
