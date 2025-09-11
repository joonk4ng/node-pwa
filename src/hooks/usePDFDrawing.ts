// Custom hook for managing PDF drawing/signature functionality
import { useState, useRef, useCallback, useEffect } from 'react';

export interface DrawingState {
  isDrawing: boolean;
  isDrawingMode: boolean;
  lastPosition: { x: number; y: number } | null;
}

export interface UsePDFDrawingOptions {
  readOnly?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  isDrawingMode?: boolean;
}

export const usePDFDrawing = (options: UsePDFDrawingOptions = {}) => {
  const { readOnly = false, canvasRef, isDrawingMode = false } = options;
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const drawCanvasRef = canvasRef || useRef<HTMLCanvasElement>(null);

  // Detect Chrome on iOS for special handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);
  const isChromeIOS = isIOS && isChrome;

  // Get touch position for the draw canvas - 1:1 mapping
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    
    // Use the first touch point, or changedTouches if available (for touchend events)
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return { x: 0, y: 0 };
    
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    // Direct 1:1 coordinate mapping - no scaling needed if canvas size matches display size
    const pos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    console.log('🔍 usePDFDrawing: Touch position (1:1 mapping)', {
      eventType: e.type,
      clientPos: { x: touch.clientX, y: touch.clientY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasSize: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height },
      finalPos: pos
    });
    
    return pos;
  }, []);

  // Get mouse position for the draw canvas - 1:1 mapping
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    // Direct 1:1 coordinate mapping - no scaling needed if canvas size matches display size
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    console.log('🔍 usePDFDrawing: Mouse position (1:1 mapping)', {
      clientPos: { x: e.clientX, y: e.clientY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasSize: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height },
      finalPos: pos
    });
    
    return pos;
  }, []);

  // Ensure drawing context is properly configured
  const ensureDrawingContext = useCallback(() => {
    if (!drawCanvasRef.current) return false;
    
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return false;
    
    // Configure the context for drawing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.globalCompositeOperation = 'source-over';
    
    return true;
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    console.log('🔍 usePDFDrawing: startDrawing called', { 
      hasCanvas: !!drawCanvasRef.current, 
      isDrawingMode, 
      readOnly,
      eventType: e.type,
      target: e.target
    });
    
    if (!drawCanvasRef.current || !isDrawingMode || readOnly) {
      console.log('🔍 usePDFDrawing: startDrawing blocked', { 
        hasCanvas: !!drawCanvasRef.current, 
        isDrawingMode, 
        readOnly 
      });
      return;
    }
    
    // Ensure context is properly configured
    if (!ensureDrawingContext()) {
      console.log('🔍 usePDFDrawing: Failed to configure drawing context');
      return;
    }
    
    let pos;
    if ('touches' in e) {
      pos = getTouchPos(e as React.TouchEvent<HTMLCanvasElement>);
    } else {
      pos = getMousePos(e as React.MouseEvent<HTMLCanvasElement>);
    }
    
    console.log('🔍 usePDFDrawing: Starting to draw at position', pos);
    
    // Test: Draw a simple dot to see if drawing is working
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
      console.log('🔍 usePDFDrawing: Drew test dot at', pos);
    }
    
    lastPosRef.current = pos;
    setIsDrawing(true);
  }, [isDrawingMode, readOnly, getTouchPos, getMousePos]);

  // Draw signature
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    console.log('🔍 usePDFDrawing: draw called', { 
      isDrawing, 
      hasCanvas: !!drawCanvasRef.current, 
      hasLastPos: !!lastPosRef.current, 
      isDrawingMode, 
      readOnly 
    });
    
    if (!isDrawing || !drawCanvasRef.current || !lastPosRef.current || !isDrawingMode || readOnly) {
      console.log('🔍 usePDFDrawing: draw blocked', { 
        isDrawing, 
        hasCanvas: !!drawCanvasRef.current, 
        hasLastPos: !!lastPosRef.current, 
        isDrawingMode, 
        readOnly 
      });
      return;
    }
    
    let currentPos;
    if ('touches' in e) {
      currentPos = getTouchPos(e as React.TouchEvent<HTMLCanvasElement>);
    } else {
      currentPos = getMousePos(e as React.MouseEvent<HTMLCanvasElement>);
    }

    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) {
      console.log('🔍 usePDFDrawing: No canvas context available');
      return;
    }
    
    // Ensure context is properly configured
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.globalCompositeOperation = 'source-over';

    console.log('🔍 usePDFDrawing: Drawing line from', lastPosRef.current, 'to', currentPos);

    // Begin the path
    ctx.beginPath();
    ctx.strokeStyle = '#000000'; // Default black color
    ctx.lineWidth = 2; // Default line width
    ctx.lineCap = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  }, [isDrawing, isDrawingMode, readOnly, getTouchPos, getMousePos]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  // Clear drawing
  const clearDrawing = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Clear drawing when drawing mode is turned OFF (but not when turned ON)
  const [prevDrawingMode, setPrevDrawingMode] = useState(isDrawingMode);
  useEffect(() => {
    // Only clear if drawing mode was turned OFF (true -> false)
    if (prevDrawingMode && !isDrawingMode && drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
        console.log('🔍 usePDFDrawing: Cleared existing drawing due to mode being turned OFF');
      }
    }
    
    // Reset drawing state when mode changes
    setIsDrawing(false);
    lastPosRef.current = null;
    
    // Update previous state
    setPrevDrawingMode(isDrawingMode);
  }, [isDrawingMode, prevDrawingMode]);

  // Set up touch event prevention for mobile devices to prevent scrolling when drawing
  useEffect(() => {
    const container = drawCanvasRef.current?.parentElement;
    const pdfViewer = container?.parentElement; // The enhanced-pdf-viewer container
    if (!container || !pdfViewer) return;

    const options = { passive: false };
    
    const preventDefault = (e: TouchEvent) => {
      // Only prevent default if we're in drawing mode and NOT touching the drawing canvas
      // This allows the drawing canvas to handle its own events while preventing scrolling
      if (isDrawingMode && e.target !== drawCanvasRef.current) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔍 usePDFDrawing: Prevented default touch behavior for non-canvas target');
      }
    };

    // Add touch event listeners to prevent scrolling when drawing
    container.addEventListener('touchstart', preventDefault, options);
    container.addEventListener('touchmove', preventDefault, options);
    container.addEventListener('touchend', preventDefault, options);
    
    pdfViewer.addEventListener('touchstart', preventDefault, options);
    pdfViewer.addEventListener('touchmove', preventDefault, options);
    pdfViewer.addEventListener('touchend', preventDefault, options);

    return () => {
      container.removeEventListener('touchstart', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
      container.removeEventListener('touchend', preventDefault);
      
      pdfViewer.removeEventListener('touchstart', preventDefault);
      pdfViewer.removeEventListener('touchmove', preventDefault);
      pdfViewer.removeEventListener('touchend', preventDefault);
    };
  }, [isDrawingMode]);

  return {
    // State
    isDrawing,
    isDrawingMode,
    isChromeIOS,
    
    // Refs
    drawCanvasRef,
    
    // Actions
    startDrawing,
    draw,
    stopDrawing,
    clearDrawing,
    
    // Utilities
    getTouchPos,
    getMousePos
  };
};
