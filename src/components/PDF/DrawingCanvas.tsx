// Drawing Canvas component for signature and annotation functionality
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  isRotated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  pdfCanvasRef?: React.RefObject<{ canvas: HTMLCanvasElement | null } | null>;
}

export interface DrawingCanvasRef {
  canvas: HTMLCanvasElement | null;
  clearDrawing: () => void;
  hasDrawing: () => boolean;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  isDrawingMode,
  isRotated = false,
  className,
  style,
  pdfCanvasRef
}, ref) => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Use the drawing hook
  const {
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing
  } = usePDFDrawing();

  // Check if canvas has drawing content
  const hasDrawing = useCallback(() => {
    if (!drawCanvasRef.current) return false;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return false;
    
    const imageData = ctx.getImageData(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    const data = imageData.data;
    
    // Check for any non-transparent pixels
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) { // Alpha channel > 0 means non-transparent
        return true;
      }
    }
    
    return false;
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    canvas: drawCanvasRef.current,
    clearDrawing,
    hasDrawing
  }));

  // Sync canvas size with PDF canvas
  useEffect(() => {
    const syncCanvasSize = () => {
      if (drawCanvasRef.current) {
        // Use the provided PDF canvas ref or fall back to query selector
        const pdfCanvas = pdfCanvasRef?.current?.canvas || 
          drawCanvasRef.current.parentElement?.querySelector('.pdf-canvas') as HTMLCanvasElement;
        
        if (pdfCanvas && drawCanvasRef.current) {
          // Get the actual rendered size of the PDF canvas
          const pdfRect = pdfCanvas.getBoundingClientRect();
          const containerRect = container?.getBoundingClientRect();
          
          if (containerRect) {
            // Set drawing canvas to match PDF canvas dimensions exactly
            drawCanvasRef.current.width = pdfCanvas.width;
            drawCanvasRef.current.height = pdfCanvas.height;
            
            // Position the drawing canvas to match the PDF canvas position
            const pdfOffsetX = pdfRect.left - containerRect.left;
            const pdfOffsetY = pdfRect.top - containerRect.top;
            
            drawCanvasRef.current.style.width = `${pdfRect.width}px`;
            drawCanvasRef.current.style.height = `${pdfRect.height}px`;
            drawCanvasRef.current.style.left = `${pdfOffsetX}px`;
            drawCanvasRef.current.style.top = `${pdfOffsetY}px`;
            
            console.log('🔍 DrawingCanvas: Synced with PDF canvas', {
              pdfCanvas: { width: pdfCanvas.width, height: pdfCanvas.height },
              pdfRect: { width: pdfRect.width, height: pdfRect.height },
              offset: { x: pdfOffsetX, y: pdfOffsetY },
              drawingCanvas: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height }
            });
          }
          
          // Set up the drawing canvas context
          const drawCtx = drawCanvasRef.current.getContext('2d');
          if (drawCtx) {
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.lineWidth = 2;
            drawCtx.strokeStyle = '#000000';
            drawCtx.globalCompositeOperation = 'source-over';
          }
        }
      }
    };

    // Initial sync with a small delay to ensure PDF canvas is rendered
    const timeoutId = setTimeout(syncCanvasSize, 100);

    // Set up resize observer to sync canvas sizes
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    if (drawCanvasRef.current) {
      resizeObserver.observe(drawCanvasRef.current);
    }

    // Also observe the PDF canvas for changes
    const container = drawCanvasRef.current?.parentElement;
    const pdfCanvas = pdfCanvasRef?.current?.canvas || container?.querySelector('.pdf-canvas');
    if (pdfCanvas) {
      resizeObserver.observe(pdfCanvas);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    startDrawing(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    draw(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    startDrawing(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    draw(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  return (
    <>
      <canvas
        ref={drawCanvasRef}
        className={className}
        style={{ 
          ...style,
          pointerEvents: isDrawingMode ? 'auto' : 'none',
          cursor: isDrawingMode ? 'crosshair' : 'default',
          transform: isRotated ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center',
          transition: 'transform 0.3s ease-in-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {isDrawingMode && (
        <>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            Drawing Mode Active - Draw your signature
          </div>
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '10px',
            background: 'rgba(255, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            Canvas: {drawCanvasRef.current ? `${drawCanvasRef.current.width}x${drawCanvasRef.current.height}` : 'Not found'}
          </div>
        </>
      )}
    </>
  );
});
