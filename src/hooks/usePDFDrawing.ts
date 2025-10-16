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
  zoomLevel?: number;
}

export const usePDFDrawing = (options: UsePDFDrawingOptions = {}) => {
  const { readOnly = false, canvasRef, isDrawingMode = false, zoomLevel = 1.0 } = options;
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const drawCanvasRef = canvasRef || useRef<HTMLCanvasElement>(null);

  // Detect Chrome on iOS for special handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);
  const isChromeIOS = isIOS && isChrome;

  // Get touch position using precise coordinate mapping with known page size
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    
    // Use the first touch point, or changedTouches if available (for touchend events)
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return { x: 0, y: 0 };
    
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const relativeX = touch.clientX - rect.left;
    const relativeY = touch.clientY - rect.top;
    
    // Map to canvas internal coordinates
    // The drawing canvas internal size matches PDF canvas internal size
    // Scale from display coordinates to internal coordinates
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    const canvasX = relativeX * scaleX;
    const canvasY = relativeY * scaleY;
    
    console.log('🔍 usePDFDrawing: Touch position (canvas mapping)', {
      eventType: e.type,
      clientPos: { x: touch.clientX, y: touch.clientY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      relativePos: { x: relativeX, y: relativeY },
      canvasSize: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height },
      scale: { x: scaleX, y: scaleY },
      canvasPos: { x: canvasX, y: canvasY }
    });
    
    return { x: canvasX, y: canvasY };
  }, []);

  // Get mouse position using canvas coordinate mapping
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    
    // Map to canvas internal coordinates
    // The drawing canvas internal size matches PDF canvas internal size
    // Scale from display coordinates to internal coordinates
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    const canvasX = relativeX * scaleX;
    const canvasY = relativeY * scaleY;
    
    console.log('🔍 usePDFDrawing: Mouse position (canvas mapping)', {
      clientPos: { x: e.clientX, y: e.clientY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      relativePos: { x: relativeX, y: relativeY },
      canvasSize: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height },
      scale: { x: scaleX, y: scaleY },
      canvasPos: { x: canvasX, y: canvasY }
    });
    
    return { x: canvasX, y: canvasY };
  }, []);

  // Ensure drawing context is properly configured for precise drawing
  const ensureDrawingContext = useCallback(() => {
    if (!drawCanvasRef.current) return false;
    
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return false;
    
    // Configure the context for high-quality drawing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Use a consistent line width that works well for signatures
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.globalCompositeOperation = 'source-over';
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('🔍 usePDFDrawing: Drawing context configured', {
      lineWidth: ctx.lineWidth,
      zoomLevel,
      canvasSize: { width: drawCanvasRef.current.width, height: drawCanvasRef.current.height }
    });
    
    return true;
  }, [zoomLevel]);

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
    
    // Ensure context is properly configured for current zoom level
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    console.log('🔍 usePDFDrawing: Drawing line from', lastPosRef.current, 'to', currentPos, 'lineWidth:', ctx.lineWidth);

    // Begin the path
    ctx.beginPath();
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
