// Drawing Canvas component for signature and annotation functionality
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  isRotated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onDrawingChange?: () => void;
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
  onDrawingChange
}, ref) => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Use the drawing hook
  const {
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing,
    hasDrawing
  } = usePDFDrawing(drawCanvasRef, onDrawingChange);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    canvas: drawCanvasRef.current,
    clearDrawing,
    hasDrawing
  }));

  // Sync canvas size with parent canvas
  useEffect(() => {
    const syncCanvasSize = () => {
      if (drawCanvasRef.current) {
        const parentCanvas = drawCanvasRef.current.parentElement?.querySelector('.pdf-canvas') as HTMLCanvasElement;
        if (parentCanvas && drawCanvasRef.current) {
          drawCanvasRef.current.width = parentCanvas.width;
          drawCanvasRef.current.height = parentCanvas.height;
          
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

    // Initial sync
    syncCanvasSize();

    // Set up resize observer to sync canvas sizes
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    if (drawCanvasRef.current) {
      resizeObserver.observe(drawCanvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    startDrawing(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    draw(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopDrawing();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    startDrawing(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    draw(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
