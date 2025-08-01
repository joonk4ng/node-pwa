import React, { useRef, useEffect, useState } from 'react';
import '../styles/components/SignatureCanvas.css';

interface Point {
  x: number;
  y: number;
}

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  showGuideLine?: boolean;
  lineColor?: string;
  lineWidth?: number;
  minZoom?: number;
  maxZoom?: number;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  showGuideLine = true,
  lineColor = '#000000',
  lineWidth = 2,
  minZoom = 1,
  maxZoom = 4
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Initialize canvas and prevent default touch behaviors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = { passive: false };
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length <= 2) { // Allow more than 2 finger gestures to pass through
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

  // Set up canvas with high DPI support
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    context.scale(dpr, dpr);
    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    redrawCanvas();
  }, [lineColor, lineWidth, showGuideLine, transform]);

  const redrawCanvas = () => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    context.save();
    context.translate(transform.translateX, transform.translateY);
    context.scale(transform.scale, transform.scale);

    // Draw guide line if enabled
    if (showGuideLine) {
      const { width, height } = canvas;
      context.beginPath();
      context.moveTo(width * 0.1, height * 0.7);
      context.lineTo(width * 0.9, height * 0.7);
      context.strokeStyle = '#ccc';
      context.lineWidth = 1 / transform.scale;
      context.stroke();
    }

    context.restore();
  };

  // Handle zoom gestures
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const scaleFactor = 1.1;
    
    setTransform(prev => {
      const newScale = delta > 0 
        ? Math.min(prev.scale * scaleFactor, maxZoom)
        : Math.max(prev.scale / scaleFactor, minZoom);

      return {
        ...prev,
        scale: newScale
      };
    });
  };

  // Handle pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setPinchDistance(distance);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      setIsPanning(true);
    }
  };

  const [pinchDistance, setPinchDistance] = useState<number | null>(null);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const scaleFactor = newDistance / pinchDistance;
      setPinchDistance(newDistance);

      setTransform(prev => {
        const newScale = Math.min(
          Math.max(prev.scale * scaleFactor, minZoom),
          maxZoom
        );
        return { ...prev, scale: newScale };
      });
    } else if (e.touches.length === 1 && isPanning && lastPanPoint) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;

      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));

      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setPinchDistance(null);
    setIsPanning(false);
    setLastPanPoint(null);
  };

  // Convert coordinates based on transform
  const getTransformedPoint = (point: Point): Point => {
    return {
      x: (point.x - transform.translateX) / transform.scale,
      y: (point.y - transform.translateY) / transform.scale
    };
  };

  const getTouchCoordinates = (e: TouchEvent): Point => {
    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    const point = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };

    return getTransformedPoint(point);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length !== 1) return;

    const point = 'touches' in e ? getTouchCoordinates(e as unknown as TouchEvent) : {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    
    if (contextRef.current) {
      const transformedPoint = getTransformedPoint(point);
      contextRef.current.beginPath();
      contextRef.current.moveTo(transformedPoint.x, transformedPoint.y);
      setIsDrawing(true);
      setLastPoint(transformedPoint);
      setHasSignature(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !lastPoint) return;
    if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length !== 1) return;

    const point = 'touches' in e ? getTouchCoordinates(e as unknown as TouchEvent) : {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };

    const transformedPoint = getTransformedPoint(point);

    // Draw smooth line
    contextRef.current.save();
    contextRef.current.translate(transform.translateX, transform.translateY);
    contextRef.current.scale(transform.scale, transform.scale);
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(lastPoint.x, lastPoint.y);
    contextRef.current.lineTo(transformedPoint.x, transformedPoint.y);
    contextRef.current.strokeStyle = lineColor;
    contextRef.current.lineWidth = lineWidth / transform.scale;
    contextRef.current.stroke();
    
    contextRef.current.restore();
    
    setLastPoint(transformedPoint);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    redrawCanvas();
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (!canvasRef.current || !hasSignature) return;
    
    try {
      const timestamp = new Date().toISOString();
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.save();
        context.translate(transform.translateX, transform.translateY);
        context.scale(transform.scale, transform.scale);
        context.font = `${10 / transform.scale}px Arial`;
        context.fillStyle = '#999999';
        context.fillText(`Signed: ${timestamp}`, 5, canvas.height - 5);
        context.restore();
      }
      
      const signatureData = canvas.toDataURL('image/png');
      onSave(signatureData);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  return (
    <>
      <div className="signature-overlay" />
      <div 
        className="signature-canvas-container" 
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          <div className="zoom-info">
            Zoom: {Math.round(transform.scale * 100)}%
          </div>
          <div className="button-bar">
            <button
              onClick={clearCanvas}
              className="signature-button clear-button"
              type="button"
              disabled={!hasSignature}
            >
              Clear
            </button>
            <button
              onClick={() => setTransform({ scale: 1, translateX: 0, translateY: 0 })}
              className="signature-button reset-button"
              type="button"
            >
              Reset View
            </button>
            <button
              onClick={saveSignature}
              className="signature-button save-button"
              type="button"
              disabled={!hasSignature}
            >
              Save
            </button>
            <button
              onClick={onCancel}
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