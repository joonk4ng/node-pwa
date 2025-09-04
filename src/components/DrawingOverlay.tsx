import React, { useRef, useEffect, useState, useCallback } from 'react';
import '../styles/components/PDFDrawingViewer.css';

export interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  pdfPoints: Array<{ x: number; y: number }>; // Unscaled coordinates for PDF export
  color: string;
  width: number;
  timestamp: number;
}

export interface DrawingData {
  strokes: DrawingStroke[];
  version: string;
}

interface DrawingOverlayProps {
  width: number;
  height: number;
  scale: number;
  onDrawingChange?: (drawingData: DrawingData) => void;
  initialDrawingData?: DrawingData;
  className?: string;
  style?: React.CSSProperties;
}

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  width,
  height,
  scale,
  onDrawingChange,
  initialDrawingData,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [drawingData, setDrawingData] = useState<DrawingData>(
    initialDrawingData || { strokes: [], version: '1.0' }
  );

  // Drawing settings
  const strokeColor = '#000000';
  const strokeWidth = 2;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    
    // Redraw all strokes
    redrawCanvas();
  }, [width, height]);

  // Redraw canvas when drawing data changes
  useEffect(() => {
    redrawCanvas();
  }, [drawingData]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    drawingData.strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Move to first point
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      // Draw lines to subsequent points
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });
  }, [drawingData]);

  const getCanvasCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in event) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Calculate coordinates relative to canvas
    const unscaledX = (clientX - rect.left);
    const unscaledY = (clientY - rect.top);
    
    // Scale coordinates for canvas drawing
    const x = unscaledX / scale;
    const y = unscaledY / scale;

    return { x, y, unscaledX: unscaledX, unscaledY: unscaledY };
  }, [scale]);

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    
    // Only allow drawing when draw mode is enabled
    if (!isDrawMode) return;
    
    const coords = getCanvasCoordinates(event);
    console.log(`Starting stroke: scaled(${coords.x}, ${coords.y}) unscaled(${coords.unscaledX}, ${coords.unscaledY})`);
    
    const newStroke: DrawingStroke = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      points: [{ x: coords.x, y: coords.y }],
      pdfPoints: [{ x: coords.unscaledX || 0, y: coords.unscaledY || 0 }],
      color: strokeColor,
      width: strokeWidth,
      timestamp: Date.now()
    };

    setCurrentStroke(newStroke);
    setIsDrawing(true);
  }, [getCanvasCoordinates, isDrawMode]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    
    console.log(`Draw function called - isDrawing: ${isDrawing}, currentStroke: ${!!currentStroke}`);
    
    if (!isDrawing || !currentStroke) {
      console.log(`❌ Skipping draw - isDrawing: ${isDrawing}, currentStroke: ${!!currentStroke}`);
      return;
    }

    const coords = getCanvasCoordinates(event);
    console.log(`Drawing point: scaled(${coords.x}, ${coords.y}) unscaled(${coords.unscaledX}, ${coords.unscaledY})`);
    
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x: coords.x, y: coords.y }],
      pdfPoints: [...currentStroke.pdfPoints, { x: coords.unscaledX || 0, y: coords.unscaledY || 0 }]
    };

    setCurrentStroke(updatedStroke);

    // Draw the current stroke
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = updatedStroke.color;
    ctx.lineWidth = updatedStroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw from the previous point to the current point
    const prevPoint = updatedStroke.points[updatedStroke.points.length - 2];
    const currentPoint = updatedStroke.points[updatedStroke.points.length - 1];

    if (prevPoint) {
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    }
  }, [isDrawing, currentStroke, getCanvasCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    console.log(`Completing stroke:`, currentStroke);
    console.log(`Stroke points:`, currentStroke.points);
    console.log(`Stroke pdfPoints:`, currentStroke.pdfPoints);

    // Add the completed stroke to drawing data
    const updatedDrawingData = {
      ...drawingData,
      strokes: [...drawingData.strokes, currentStroke]
    };

    console.log(`Updated drawing data:`, updatedDrawingData);

    setDrawingData(updatedDrawingData);
    setCurrentStroke(null);
    setIsDrawing(false);

    // Notify parent component
    onDrawingChange?.(updatedDrawingData);
  }, [isDrawing, currentStroke, drawingData, onDrawingChange]);

  // Clear all drawings
  const clearDrawings = useCallback(() => {
    const clearedData = { ...drawingData, strokes: [] };
    setDrawingData(clearedData);
    onDrawingChange?.(clearedData);
  }, [drawingData, onDrawingChange]);

  // Toggle draw mode
  const toggleDrawMode = useCallback(() => {
    setIsDrawMode(prev => !prev);
  }, []);

  // Prevent scrolling when draw mode is active
  useEffect(() => {
    const preventScroll = (e: Event) => {
      if (isDrawMode) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventScrollOnCanvas = (e: Event) => {
      if (isDrawMode) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isDrawMode) {
      // Prevent scrolling on the document body
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      // Add event listeners to prevent scroll
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('scroll', preventScroll, { passive: false });
      
      // Also prevent scroll on the canvas element specifically
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.addEventListener('wheel', preventScrollOnCanvas, { passive: false });
        canvas.addEventListener('touchmove', preventScrollOnCanvas, { passive: false });
        canvas.addEventListener('scroll', preventScrollOnCanvas, { passive: false });
      }
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      // Remove event listeners
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('scroll', preventScroll);
      
      // Remove canvas event listeners
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.removeEventListener('wheel', preventScrollOnCanvas);
        canvas.removeEventListener('touchmove', preventScrollOnCanvas);
        canvas.removeEventListener('scroll', preventScrollOnCanvas);
      }
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('scroll', preventScroll);
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.removeEventListener('wheel', preventScrollOnCanvas);
        canvas.removeEventListener('touchmove', preventScrollOnCanvas);
        canvas.removeEventListener('scroll', preventScrollOnCanvas);
      }
    };
  }, [isDrawMode]);

  // Keyboard shortcut to exit draw mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawMode) {
        setIsDrawMode(false);
      }
    };

    if (isDrawMode) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawMode]);

  // Undo last stroke
  const undoLastStroke = useCallback(() => {
    if (drawingData.strokes.length === 0) return;

    const updatedStrokes = drawingData.strokes.slice(0, -1);
    const updatedData = { ...drawingData, strokes: updatedStrokes };
    setDrawingData(updatedData);
    onDrawingChange?.(updatedData);
  }, [drawingData, onDrawingChange]);

  return (
    <div 
      className={`drawing-overlay ${className || ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        border: isDrawMode ? '2px solid #28a745' : 'none',
        borderRadius: isDrawMode ? '4px' : '0',
        overflow: isDrawMode ? 'hidden' : 'visible',
        touchAction: isDrawMode ? 'none' : 'auto',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDrawMode ? 'crosshair' : 'default',
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      {/* Drawing controls */}
      <div className="drawing-controls">
        <button
          className={`draw-btn ${isDrawMode ? 'active' : ''}`}
          onClick={toggleDrawMode}
          title={isDrawMode ? 'Exit Draw Mode' : 'Enter Draw Mode'}
        >
          ✏️ {isDrawMode ? 'Drawing' : 'Draw'}
        </button>
        <button
          className="undo-btn"
          onClick={undoLastStroke}
          disabled={drawingData.strokes.length === 0}
        >
          Undo
        </button>
        <button
          className="clear-btn"
          onClick={clearDrawings}
          disabled={drawingData.strokes.length === 0}
        >
          Clear
        </button>
      </div>

      {/* Draw mode instruction */}
      {!isDrawMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          Click "Draw" to start drawing on the PDF
        </div>
      )}

      {/* Draw mode active indicator */}
      {isDrawMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(40, 167, 69, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '14px' }}>✏️</span>
          Drawing Mode - Scrolling Disabled (Press Esc to exit)
        </div>
      )}
    </div>
  );
};

export default DrawingOverlay;
