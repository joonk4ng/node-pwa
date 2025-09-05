// Zoom Controls component for PDF zoom functionality
import React, { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export interface ZoomControlsProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentZoom: number;
  onZoomChange: (zoom: number) => void;
  isMobile?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface ZoomLevel {
  zoom: number;
  image: Blob;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  pdfDoc,
  currentZoom,
  onZoomChange,
  isMobile = false,
  className,
  style
}) => {
  const [zoomLevels, setZoomLevels] = useState<Record<number, Blob>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Different zoom levels for mobile vs desktop
  const availableZooms = isMobile ? [1.0, 1.5, 2.0, 2.5, 3.0] : [1.0, 1.25, 1.5];

  // Generate zoom level images
  const generateZoomLevels = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    if (isGenerating) return;
    
    console.log('🔍 ZoomControls: Generating zoom levels...');
    setIsGenerating(true);
    const zoomImages: Record<number, Blob> = {};
    
    try {
      for (const zoom of availableZooms) {
        if (zoomLevels[zoom]) {
          // Use existing zoom level
          zoomImages[zoom] = zoomLevels[zoom];
          continue;
        }

        try {
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: zoom });
          
          // Create temporary canvas for this zoom level
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) continue;
          
          // Clear with white background
          tempCtx.fillStyle = 'white';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Render PDF at this zoom level
          await page.render({
            canvasContext: tempCtx,
            viewport: viewport
          }).promise;
          
          // Convert to blob
          const blob = await new Promise<Blob>((resolve) => {
            tempCanvas.toBlob((blob) => {
              resolve(blob!);
            }, 'image/png');
          });
          
          zoomImages[zoom] = blob;
          console.log(`🔍 ZoomControls: Generated zoom level ${zoom}x`);
        } catch (error) {
          console.warn(`Failed to generate zoom level ${zoom}:`, error);
        }
      }
      
      setZoomLevels(zoomImages);
    } finally {
      setIsGenerating(false);
    }
  }, [availableZooms, zoomLevels, isGenerating]);

  // Generate zoom levels when PDF changes
  useEffect(() => {
    if (pdfDoc) {
      generateZoomLevels(pdfDoc);
    }
  }, [pdfDoc, generateZoomLevels]);

  // Switch to a different zoom level
  const setZoom = useCallback((newZoom: number) => {
    if (zoomLevels[newZoom] && newZoom !== currentZoom) {
      console.log(`🔍 ZoomControls: Switching to zoom level ${newZoom}x`);
      onZoomChange(newZoom);
    }
  }, [zoomLevels, currentZoom, onZoomChange]);

  if (!pdfDoc || isGenerating) {
    return null;
  }

  return (
    <div className={className} style={style}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 20
      }}>
        Zoom: {Math.round(currentZoom * 100)}%
      </div>
      
      {/* Zoom controls could be added here if needed */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        display: 'flex',
        gap: '5px',
        zIndex: 20
      }}>
        {availableZooms.map(zoom => (
          <button
            key={zoom}
            onClick={() => setZoom(zoom)}
            style={{
              background: currentZoom === zoom ? '#007bff' : 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
};
