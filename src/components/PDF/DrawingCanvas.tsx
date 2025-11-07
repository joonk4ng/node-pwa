// Drawing Canvas component for signature and annotation functionality
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { usePDFDrawing } from '../../hooks/usePDFDrawing';

export interface DrawingCanvasProps {
  isDrawingMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  pdfCanvasRef?: React.RefObject<{ canvas: HTMLCanvasElement | null } | null>;
  zoomLevel?: number;
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
  pdfCanvasRef,
  zoomLevel = 1.0
}, ref) => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Use the drawing hook with zoom level
  const {
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing
  } = usePDFDrawing({
    canvasRef: drawCanvasRef,
    isDrawingMode: isDrawingMode,
    zoomLevel: zoomLevel
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
    let debounceTimer: number | null = null;
    let lastDimensions: { width: number; height: number; displayWidth: number; displayHeight: number } | null = null;
    
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
            // Check if dimensions have actually changed to avoid unnecessary updates
            const currentDimensions = {
              width: pdfCanvas.width,
              height: pdfCanvas.height,
              displayWidth: pdfRect.width,
              displayHeight: pdfRect.height
            };
            
            if (lastDimensions &&
                lastDimensions.width === currentDimensions.width &&
                lastDimensions.height === currentDimensions.height &&
                lastDimensions.displayWidth === currentDimensions.displayWidth &&
                lastDimensions.displayHeight === currentDimensions.displayHeight) {
              // Dimensions haven't changed, skip update
              return;
            }
            
            lastDimensions = currentDimensions;
            
            // Calculate device pixel ratio for high-DPI displays
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            // Set drawing canvas internal size to match PDF canvas internal size exactly
            // This ensures proper coordinate mapping regardless of display scaling
            drawCanvasRef.current.width = pdfCanvas.width;
            drawCanvasRef.current.height = pdfCanvas.height;
            
            // Set display size to match PDF canvas display size exactly
            drawCanvasRef.current.style.width = `${pdfRect.width}px`;
            drawCanvasRef.current.style.height = `${pdfRect.height}px`;
            
            // Position the drawing canvas directly on top of the PDF canvas
            // Use a simpler approach - position relative to the PDF canvas itself
            drawCanvasRef.current.style.position = 'absolute';
            drawCanvasRef.current.style.left = '0px';
            drawCanvasRef.current.style.top = '0px';
            drawCanvasRef.current.style.zIndex = '10';
            
            // Reset any transform that might be affecting positioning
            drawCanvasRef.current.style.transform = 'none';
            drawCanvasRef.current.style.transformOrigin = 'initial';
            
            // VALIDATION: Check alignment between PDF canvas and drawing canvas
            const drawRect = drawCanvasRef.current.getBoundingClientRect();
            const pdfRectAfter = pdfCanvas.getBoundingClientRect();
            
            // Calculate alignment offsets (should be 0 if perfectly aligned)
            const offsetX = Math.abs(drawRect.left - pdfRectAfter.left);
            const offsetY = Math.abs(drawRect.top - pdfRectAfter.top);
            const widthDiff = Math.abs(drawRect.width - pdfRectAfter.width);
            const heightDiff = Math.abs(drawRect.height - pdfRectAfter.height);
            
            // Threshold for acceptable misalignment (1px tolerance for subpixel rendering)
            const ALIGNMENT_THRESHOLD = 1;
            const isAligned = offsetX <= ALIGNMENT_THRESHOLD && 
                            offsetY <= ALIGNMENT_THRESHOLD && 
                            widthDiff <= ALIGNMENT_THRESHOLD && 
                            heightDiff <= ALIGNMENT_THRESHOLD;
            
            // Warn if misaligned
            if (!isAligned) {
              console.warn('⚠️ DrawingCanvas: Canvas misalignment detected!', {
                offsetX,
                offsetY,
                widthDiff,
                heightDiff,
                pdfRect: { left: pdfRectAfter.left, top: pdfRectAfter.top, width: pdfRectAfter.width, height: pdfRectAfter.height },
                drawRect: { left: drawRect.left, top: drawRect.top, width: drawRect.width, height: drawRect.height },
                scrollPosition: { x: window.scrollX, y: window.scrollY },
                containerScroll: container ? { scrollLeft: container.scrollLeft, scrollTop: container.scrollTop } : null
              });
            }
            
            // Since both canvases are in the same container, they should align perfectly
            // The PDF canvas and drawing canvas will have the same position within their shared container
            
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
              pdfRect: { width: pdfRect.width, height: pdfRect.height },
              drawingCanvas: { 
                width: drawCanvasRef.current.width, 
                height: drawCanvasRef.current.height,
                styleWidth: drawCanvasRef.current.style.width,
                styleHeight: drawCanvasRef.current.style.height,
                position: 'absolute',
                left: '0px',
                top: '0px'
              },
              devicePixelRatio,
              isAligned: drawCanvasRef.current.width === pdfCanvas.width && drawCanvasRef.current.height === pdfCanvas.height,
              alignmentCheck: {
                isAligned,
                offsetX,
                offsetY,
                widthDiff,
                heightDiff
              }
            });
          }
        }
      }
    };

    // Debounced sync function
    const debouncedSync = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(syncCanvasSize, 100);
    };
    
    // VALIDATION: Re-check alignment on scroll and resize
    const validateAlignment = () => {
      if (drawCanvasRef.current && pdfCanvasRef?.current?.canvas) {
        const pdfCanvas = pdfCanvasRef.current.canvas;
        const drawRect = drawCanvasRef.current.getBoundingClientRect();
        const pdfRect = pdfCanvas.getBoundingClientRect();
        
        const offsetX = Math.abs(drawRect.left - pdfRect.left);
        const offsetY = Math.abs(drawRect.top - pdfRect.top);
        const ALIGNMENT_THRESHOLD = 1;
        
        if (offsetX > ALIGNMENT_THRESHOLD || offsetY > ALIGNMENT_THRESHOLD) {
          console.warn('⚠️ DrawingCanvas: Alignment check failed on scroll/resize', {
            offsetX,
            offsetY,
            pdfRect: { left: pdfRect.left, top: pdfRect.top },
            drawRect: { left: drawRect.left, top: drawRect.top },
            scrollPosition: { x: window.scrollX, y: window.scrollY }
          });
          // Re-sync to fix alignment
          debouncedSync();
        }
      }
    };

    // Initial sync attempts (reduced from 6 to 2)
    const initialTimeout1 = setTimeout(syncCanvasSize, 100);
    const initialTimeout2 = setTimeout(syncCanvasSize, 500);
    
    // VALIDATION: Add scroll and resize listeners to check alignment
    const handleScroll = () => {
      validateAlignment();
    };
    
    const handleResize = () => {
      debouncedSync();
      // Also validate after resize
      setTimeout(validateAlignment, 150);
    };
    
    // Listen to scroll events on window and container
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Also listen to scroll on the container if it exists
    const container = drawCanvasRef.current?.parentElement;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Check for PDF canvas availability with polling
    let pdfCanvasCheckInterval: number | null = null;
    let checkCount = 0;
    const maxChecks = 20; // Limit to 20 checks (2 seconds max)
    
    const checkForPDFCanvas = () => {
      const pdfCanvas = pdfCanvasRef?.current?.canvas || 
        drawCanvasRef.current?.parentElement?.querySelector('.pdf-canvas') as HTMLCanvasElement;
      if (pdfCanvas && pdfCanvas.width > 0 && pdfCanvas.height > 0) {
        syncCanvasSize();
        if (pdfCanvasCheckInterval) {
          clearTimeout(pdfCanvasCheckInterval);
          pdfCanvasCheckInterval = null;
        }
      } else if (checkCount < maxChecks) {
        checkCount++;
        pdfCanvasCheckInterval = setTimeout(checkForPDFCanvas, 100);
      }
    };
    
    // Start checking for PDF canvas availability
    setTimeout(checkForPDFCanvas, 0);

    // Set up resize observer to sync canvas sizes (debounced)
    const resizeObserver = new ResizeObserver(() => {
      debouncedSync();
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
      clearTimeout(initialTimeout1);
      clearTimeout(initialTimeout2);
      // Clean up scroll and resize listeners
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (pdfCanvasCheckInterval) {
        clearTimeout(pdfCanvasCheckInterval);
      }
      resizeObserver.disconnect();
    };
  }, [pdfCanvasRef]);

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
