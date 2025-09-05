// Custom hook for managing PDF drawing/signature functionality
import { useState, useRef, useCallback, useEffect } from 'react';

export interface DrawingState {
  isDrawing: boolean;
  isDrawingMode: boolean;
  lastPosition: { x: number; y: number } | null;
}

export interface UsePDFDrawingOptions {
  onBeforeSign?: () => Promise<void>;
  readOnly?: boolean;
}

export const usePDFDrawing = (options: UsePDFDrawingOptions = {}) => {
  const { onBeforeSign, readOnly = false } = options;
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Detect Chrome on iOS for special handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);
  const isChromeIOS = isIOS && isChrome;

  // Get touch position for the draw canvas
  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    const touch = e.touches[0];
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    
    // Round coordinates to integers to avoid sub-pixel rendering issues
    const x = Math.round((touch.clientX - rect.left) * scaleX);
    const y = Math.round((touch.clientY - rect.top) * scaleY);
    
    return { x, y };
  }, []);

  // Get mouse position for the draw canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    
    // Round coordinates to integers to avoid sub-pixel rendering issues
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    return { x, y };
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
    if (!isDrawing || !drawCanvasRef.current || !lastPosRef.current || !isDrawingMode || readOnly) {
      return;
    }
    
    let currentPos;
    if ('touches' in e) {
      currentPos = getTouchPos(e as React.TouchEvent<HTMLCanvasElement>);
    } else {
      currentPos = getMousePos(e as React.MouseEvent<HTMLCanvasElement>);
    }

    // Skip if coordinates haven't changed significantly (performance optimization)
    const threshold = 1; // Minimum pixel movement
    const dx = Math.abs(currentPos.x - lastPosRef.current.x);
    const dy = Math.abs(currentPos.y - lastPosRef.current.y);
    
    if (dx < threshold && dy < threshold) {
      return; // Skip unnecessary draws
    }

    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) {
      return;
    }

    // Configure context for crisp drawing
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = false; // Crisp lines
    
    // Draw the line
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
    setIsDrawingMode(false);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Setup canvas for optimal drawing quality
  const setupCanvas = useCallback((pdfViewport: any) => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !pdfViewport) return;

    // Set canvas size to match PDF viewport exactly
    canvas.width = pdfViewport.width;
    canvas.height = pdfViewport.height;
    
    // Set display size
    canvas.style.width = `${pdfViewport.width}px`;
    canvas.style.height = `${pdfViewport.height}px`;
    
    // Configure context for crisp drawing
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false; // Crisp lines
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    }
    
    console.log('🔍 usePDFDrawing: Canvas setup complete', {
      width: canvas.width,
      height: canvas.height,
      displayWidth: canvas.style.width,
      displayHeight: canvas.style.height
    });
  }, []);

  // Toggle drawing mode
  const toggleDrawingMode = useCallback(async () => {
    if (readOnly) return;
    
    console.log('🔍 usePDFDrawing: Toggling drawing mode from', isDrawingMode, 'to', !isDrawingMode);
    
    // If we're about to enable drawing mode and there's a sneaky save callback, call it
    if (!isDrawingMode && onBeforeSign) {
      try {
        await onBeforeSign();
      } catch (error) {
        console.error('Error during sneaky save before signing:', error);
        // Continue with signing even if sneaky save fails
      }
    }
    
    setIsDrawingMode(prev => {
      const newMode = !prev;
      console.log('🔍 usePDFDrawing: Drawing mode set to', newMode);
      return newMode;
    });
    
    // Clear any existing drawing when toggling mode
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
        console.log('🔍 usePDFDrawing: Cleared existing drawing');
      }
    }
    // Reset drawing state
    setIsDrawing(false);
    lastPosRef.current = null;
  }, [isDrawingMode, onBeforeSign, readOnly]);

  // Set up touch event prevention for iOS Chrome and prevent scrolling when drawing
  useEffect(() => {
    const container = drawCanvasRef.current?.parentElement;
    const pdfViewer = container?.parentElement; // The enhanced-pdf-viewer container
    if (!container || !pdfViewer) return;

    const options = { passive: false };
    
    const preventDefault = (e: TouchEvent) => {
      // Prevent default if we're in drawing mode and touching the canvas or its container
      if (isDrawingMode && (e.target === drawCanvasRef.current || e.target === container)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add touch event listeners with passive: false to both container and PDF viewer
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
    toggleDrawingMode,
    setupCanvas,
    
    // Utilities
    getTouchPos,
    getMousePos
  };
};
