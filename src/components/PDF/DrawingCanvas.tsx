// Drawing Canvas component for signature and annotation functionality
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
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
  } = usePDFDrawing({
    canvasRef: drawCanvasRef,
    isDrawingMode: isDrawingMode
  });

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
          const container = drawCanvasRef.current.parentElement;
          const containerRect = container?.getBoundingClientRect();
          
          if (containerRect && pdfRect.width > 0 && pdfRect.height > 0) {
            // Calculate device pixel ratio for high-DPI displays
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            // Set drawing canvas internal size to match PDF canvas internal size exactly
            // This ensures proper coordinate mapping regardless of display scaling
            drawCanvasRef.current.width = pdfCanvas.width;
            drawCanvasRef.current.height = pdfCanvas.height;
            
            // Set display size to match PDF canvas display size exactly
            drawCanvasRef.current.style.width = `${pdfRect.width}px`;
            drawCanvasRef.current.style.height = `${pdfRect.height}px`;
            
            // Position the drawing canvas to match the PDF canvas position exactly
            // Calculate the offset from the container to the PDF canvas
            const pdfOffsetX = pdfRect.left - containerRect.left;
            const pdfOffsetY = pdfRect.top - containerRect.top;
            
            // Ensure the drawing canvas is positioned absolutely and matches the PDF canvas exactly
            drawCanvasRef.current.style.position = 'absolute';
            drawCanvasRef.current.style.left = `${pdfOffsetX}px`;
            drawCanvasRef.current.style.top = `${pdfOffsetY}px`;
            drawCanvasRef.current.style.zIndex = '10';
            
            // Reset any transform that might be affecting positioning
            drawCanvasRef.current.style.transform = 'none';
            drawCanvasRef.current.style.transformOrigin = 'initial';
            
            // Verify the positioning is correct by checking the actual position
            const drawRect = drawCanvasRef.current.getBoundingClientRect();
            const positionMatch = Math.abs(drawRect.left - pdfRect.left) < 1 && Math.abs(drawRect.top - pdfRect.top) < 1;
            
            // If positioning doesn't match, try to correct it
            if (!positionMatch) {
              console.warn('🔍 DrawingCanvas: Position mismatch detected, attempting correction...');
              // Force the position to match exactly
              drawCanvasRef.current.style.left = `${pdfOffsetX}px`;
              drawCanvasRef.current.style.top = `${pdfOffsetY}px`;
              
              // Re-check position after correction
              const correctedRect = drawCanvasRef.current.getBoundingClientRect();
              const correctedMatch = Math.abs(correctedRect.left - pdfRect.left) < 1 && Math.abs(correctedRect.top - pdfRect.top) < 1;
              console.log('🔍 DrawingCanvas: Position after correction:', correctedMatch);
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
            
            console.log('🔍 DrawingCanvas: Enhanced canvas setup', {
              pdfCanvas: { width: pdfCanvas.width, height: pdfCanvas.height },
              pdfRect: { width: pdfRect.width, height: pdfRect.height, left: pdfRect.left, top: pdfRect.top },
              containerRect: { left: containerRect.left, top: containerRect.top },
              offset: { x: pdfOffsetX, y: pdfOffsetY },
              drawingCanvas: { 
                width: drawCanvasRef.current.width, 
                height: drawCanvasRef.current.height,
                styleWidth: drawCanvasRef.current.style.width,
                styleHeight: drawCanvasRef.current.style.height,
                styleLeft: drawCanvasRef.current.style.left,
                styleTop: drawCanvasRef.current.style.top,
                actualLeft: drawRect.left,
                actualTop: drawRect.top
              },
              devicePixelRatio,
              isAligned: drawCanvasRef.current.width === pdfCanvas.width && drawCanvasRef.current.height === pdfCanvas.height,
              positionMatch
            });
          }
        }
      }
    };

    // Multiple sync attempts to handle different loading scenarios
    const syncAttempts = [50, 100, 200, 500, 1000, 2000];
    const timeoutIds = syncAttempts.map(delay => setTimeout(syncCanvasSize, delay));
    
    // Also try to sync when the PDF canvas becomes available
    let pdfCanvasCheckInterval: number | null = null;
    const checkForPDFCanvas = () => {
      const pdfCanvas = pdfCanvasRef?.current?.canvas || 
        drawCanvasRef.current?.parentElement?.querySelector('.pdf-canvas') as HTMLCanvasElement;
      if (pdfCanvas && pdfCanvas.width > 0 && pdfCanvas.height > 0) {
        syncCanvasSize();
        if (pdfCanvasCheckInterval) {
          clearInterval(pdfCanvasCheckInterval);
          pdfCanvasCheckInterval = null;
        }
      } else {
        pdfCanvasCheckInterval = setTimeout(checkForPDFCanvas, 100);
      }
    };
    
    // Start checking for PDF canvas availability
    setTimeout(checkForPDFCanvas, 0);

    // Set up resize observer to sync canvas sizes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      setTimeout(syncCanvasSize, 50);
    });
    
    if (drawCanvasRef.current) {
      resizeObserver.observe(drawCanvasRef.current);
    }

    // Also observe the PDF canvas for changes
    const container = drawCanvasRef.current?.parentElement;
    const pdfCanvas = pdfCanvasRef?.current?.canvas || container?.querySelector('.pdf-canvas');
    if (pdfCanvas) {
      resizeObserver.observe(pdfCanvas);
    }

    // Also observe the container for changes
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      if (pdfCanvasCheckInterval) {
        clearTimeout(pdfCanvasCheckInterval);
      }
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
    console.log('🔍 DrawingCanvas: Touch start event', { 
      isDrawingMode, 
      touchCount: e.touches.length,
      target: e.target 
    });
    
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
      startDrawing(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) {
      e.preventDefault();
      e.stopPropagation();
      draw(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    console.log('🔍 DrawingCanvas: Touch end event', { 
      isDrawingMode, 
      changedTouchCount: e.changedTouches.length,
      target: e.target 
    });
    
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
          // Mobile-specific touch handling
          touchAction: isDrawingMode ? 'none' : 'auto',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
          <div style={{
            position: 'absolute',
            top: '70px',
            left: '10px',
            background: 'rgba(0, 255, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            Mobile: {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Yes' : 'No'}
          </div>
          <div style={{
            position: 'absolute',
            top: '130px',
            left: '10px',
            background: 'rgba(0, 0, 255, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            Scale: {drawCanvasRef.current ? `${(drawCanvasRef.current.width / drawCanvasRef.current.getBoundingClientRect().width).toFixed(2)}x` : 'N/A'}
          </div>
          <div style={{
            position: 'absolute',
            top: '160px',
            left: '10px',
            background: 'rgba(128, 0, 128, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 20
          }}>
            DPR: {window.devicePixelRatio || 1}
          </div>
        </>
      )}
    </>
  );
});
