// Signature canvas component to sign the document
import React, { useRef, useEffect, useState } from 'react';
import '../styles/components/SignatureCanvas.css';

// interface for the point
interface Point {
  x: number;
  y: number;
}

// interface for the signature canvas props
interface SignatureCanvasProps {
  // function to save the signature
  onSave: (signatureData: string) => void;
  // function to cancel the signature
  onCancel: () => void;
  // show guide line
  showGuideLine?: boolean;
  // line color
  lineColor?: string;
  // line width
  lineWidth?: number;
}

// signature canvas component
export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  // function to save the signature
  onSave,
  // function to cancel the signature
  onCancel,
  // show guide line
  showGuideLine = true,
  // line color
  lineColor = '#000000',
  // line width
  lineWidth = 2
}) => {
  // canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // container ref
  const containerRef = useRef<HTMLDivElement>(null);
  // context ref
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  // is drawing
  const [isDrawing, setIsDrawing] = useState(false);
  // has signature
  const [hasSignature, setHasSignature] = useState(false);
  // last point
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  // Initialize canvas and prevent default touch behaviors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = { passive: false };
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length <= 2) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefault, options);
    container.addEventListener('touchmove', preventDefault, options);
    container.addEventListener('touchend', preventDefault, options);

    return () => {
      container.removeEventListener('touchstart', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
      container.removeEventListener('touchend', preventDefault);
    };
  }, []);

  // Set up canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false
    });

    if (!context) return;
    
    // get the container bounding client rect
    const rect = container.getBoundingClientRect();
    // set the canvas width and height (no DPR scaling)
    canvas.width = rect.width;
    canvas.height = rect.height;
    // set the canvas style width and height
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // set the context stroke style
    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Draw guide line if enabled
    if (showGuideLine) {
      const { width, height } = canvas;
      context.beginPath();
      context.moveTo(width * 0.1, height * 0.7);
      context.lineTo(width * 0.9, height * 0.7);
      context.strokeStyle = '#ccc';
      context.lineWidth = 1;
      context.stroke();
      // Reset stroke style for drawing
      context.strokeStyle = lineColor;
      context.lineWidth = lineWidth;
    }
  }, [lineColor, lineWidth, showGuideLine]);

  // Get coordinates from mouse or touch event
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e && e.touches.length !== 1) return;
    
    const point = getCoordinates(e);
    const context = contextRef.current;
    
    if (context) {
      context.beginPath();
      context.moveTo(point.x, point.y);
      setIsDrawing(true);
      setLastPoint(point);
      setHasSignature(true);
    }
  };

  // draw
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !lastPoint) return;
    if ('touches' in e && e.touches.length !== 1) return;
    
    const point = getCoordinates(e);
    const context = contextRef.current;
    
    if (context) {
      context.lineTo(point.x, point.y);
      context.stroke();
      setLastPoint(point);
    }
  };

  // stop drawing
  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  // clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    // Clear the canvas immediately and restore white background
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw guide line if enabled (async to avoid blocking)
    if (showGuideLine) {
      requestAnimationFrame(() => {
        if (context && canvas) {
          const { width, height } = canvas;
          context.beginPath();
          context.moveTo(width * 0.1, height * 0.7);
          context.lineTo(width * 0.9, height * 0.7);
          context.strokeStyle = '#ccc';
          context.lineWidth = 1;
          context.stroke();
          // Reset stroke style for drawing
          context.strokeStyle = lineColor;
          context.lineWidth = lineWidth;
        }
      });
    }
    
    setHasSignature(false);
  };

  // save the signature
  const saveSignature = () => {
    if (!canvasRef.current || !hasSignature) return;
    
    try {
      // Use a more efficient format and lower quality for better performance
      const signatureData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      onSave(signatureData);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  // return the signature canvas
  return (
    <>
      <div className="signature-overlay" />
      <div 
        className="signature-canvas-container" 
        ref={containerRef}
      >
        <div className="signature-canvas-wrapper">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && (
            <div className="signature-canvas-placeholder">
              Sign here
            </div>
          )}
          {showGuideLine && <div className="signature-guide-line" />}
        </div>
        <div className="signature-canvas-actions">
          <div className="button-bar">
            <button
              onClick={() => {
                clearCanvas();
                setIsDrawing(false);
                setLastPoint(null);
              }}
              className="signature-button clear-button"
              type="button"
              disabled={!hasSignature}
            >
              Clear
            </button>
            <button
              onClick={() => {
                saveSignature();
                setIsDrawing(false);
                setLastPoint(null);
              }}
              className="signature-button save-button"
              type="button"
              disabled={!hasSignature}
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsDrawing(false);
                setLastPoint(null);
                onCancel();
              }}
              className="signature-button cancel-button"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}; 