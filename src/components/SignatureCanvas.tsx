// Signature canvas component to sign the document
import React, { useRef, useEffect, useState } from 'react';
import '../styles/components/SignatureCanvas.css';

// interface for the point
interface Point {
  x: number;
  y: number;
}

// interface for the transform
interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
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
  // min zoom
  minZoom?: number;
  // max zoom
  maxZoom?: number;
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
  lineWidth = 2,
  // min zoom
  minZoom = 1,
  // max zoom
  maxZoom = 4
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
  // transform
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  // is panning
  const [isPanning, setIsPanning] = useState(false);
  // last pan point
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
    // get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    // get the container bounding client rect
    const rect = container.getBoundingClientRect();
    // set the canvas width and height
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    // set the canvas style width and height
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    // set the context scale
    context.scale(dpr, dpr);
    // set the context stroke style
    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    redrawCanvas();
  }, [lineColor, lineWidth, showGuideLine, transform]);

  // redraw the canvas
  const redrawCanvas = () => {
    // retrieve the context
    const context = contextRef.current;
    // retrieve the canvas
    const canvas = canvasRef.current;
    // if the context or canvas is not found, return
    if (!context || !canvas) return;
    
    // clear the canvas
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
    // set the transform
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
    // if the number of touches is 2
    if (e.touches.length === 2) {
      // get the first touch
      const touch1 = e.touches[0];
      // get the second touch
      const touch2 = e.touches[1];
      // calculate the distance between the two touches
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

  // pinch distance
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);

  // handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    // if the number of touches is 2 and the pinch distance is not null
    if (e.touches.length === 2 && pinchDistance !== null) {
      // get the first touch
      const touch1 = e.touches[0];
      // get the second touch
      const touch2 = e.touches[1];
      // calculate the new distance between the two touches
      const newDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      // calculate the scale factor
      const scaleFactor = newDistance / pinchDistance;
      // set the pinch distance
      setPinchDistance(newDistance);
      // set the transform
      setTransform(prev => {
        const newScale = Math.min(
          Math.max(prev.scale * scaleFactor, minZoom),
          maxZoom
        );
        return { ...prev, scale: newScale };
      });
    } else if (e.touches.length === 1 && isPanning && lastPanPoint) {
      // get the first touch
      const touch = e.touches[0];
      // calculate the delta x
      const deltaX = touch.clientX - lastPanPoint.x;
      // calculate the delta y
      const deltaY = touch.clientY - lastPanPoint.y;
      // set the transform
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      // set the last pan point
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  };

  // handle touch end
  const handleTouchEnd = () => {
    // set the pinch distance to null
    setPinchDistance(null);
    // set the is panning to false
    setIsPanning(false);
    // set the last pan point to null
    setLastPanPoint(null);
  };

  // Convert coordinates based on transform
  const getTransformedPoint = (point: Point): Point => {
    return {
      x: (point.x - transform.translateX) / transform.scale,
      y: (point.y - transform.translateY) / transform.scale
    };
  };

  // get the touch coordinates
  const getTouchCoordinates = (e: TouchEvent): Point => {
    // get the first touch
    const touch = e.touches[0];
    // get the canvas bounding client rect
    const rect = canvasRef.current!.getBoundingClientRect();
    // calculate the scale x
    const scaleX = canvasRef.current!.width / rect.width;
    // calculate the scale y
    const scaleY = canvasRef.current!.height / rect.height;
    // calculate the point
    const point = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };

    return getTransformedPoint(point);
  };

  // start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // if the event is a touch event and the number of touches is not 1, return
    if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length !== 1) return;
    // get the point
    const point = 'touches' in e ? getTouchCoordinates(e as unknown as TouchEvent) : {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    // if the context is found
    if (contextRef.current) {
      // get the transformed point
      const transformedPoint = getTransformedPoint(point);
      // begin the path
      contextRef.current.beginPath();
      contextRef.current.moveTo(transformedPoint.x, transformedPoint.y);
      // set the is drawing to true
      setIsDrawing(true);
      // set the last point
      setLastPoint(transformedPoint);
      // set the has signature to true
      setHasSignature(true);
    }
  };

  // draw
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // if the is drawing is false or the context is not found or the last point is not found, return
    if (!isDrawing || !contextRef.current || !lastPoint) return;
    // if the event is a touch event and the number of touches is not 1, return
    if (e.nativeEvent instanceof TouchEvent && e.nativeEvent.touches.length !== 1) return;
    // get the point
    const point = 'touches' in e ? getTouchCoordinates(e as unknown as TouchEvent) : {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    // get the transformed point
    const transformedPoint = getTransformedPoint(point);
    // save the context
    contextRef.current.save();
    contextRef.current.translate(transform.translateX, transform.translateY);
    contextRef.current.scale(transform.scale, transform.scale);
    // begin the path
    contextRef.current.beginPath();
    // move to the last point
    contextRef.current.moveTo(lastPoint.x, lastPoint.y);
    // draw a line to the transformed point
    contextRef.current.lineTo(transformedPoint.x, transformedPoint.y);
    // set the stroke style
    contextRef.current.strokeStyle = lineColor;
    // set the line width
    contextRef.current.lineWidth = lineWidth / transform.scale;
    contextRef.current.stroke();
    // restore the context
    contextRef.current.restore();
    // set the last point
    setLastPoint(transformedPoint);
  };

  // stop drawing
  const stopDrawing = () => {
    // set the is drawing to false
    setIsDrawing(false);
    // set the last point to null
    setLastPoint(null);
  };

  // clear the canvas
  const clearCanvas = () => {
    // get the canvas
    const canvas = canvasRef.current;
    // get the context
    const context = contextRef.current;
    // if the canvas or context is not found, return
    if (!canvas || !context) return;
    // clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    // set the transform
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    // redraw the canvas
    redrawCanvas();
    // set the has signature to false
    setHasSignature(false);
  };

  // save the signature
  const saveSignature = () => {
    // if the canvas or has signature is not found, return
    if (!canvasRef.current || !hasSignature) return;
    // try to save the signature
    try {
      const timestamp = new Date().toISOString();
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      // if the context is found
      if (context) {
        // save the context
        context.save();
        // translate the context
        context.translate(transform.translateX, transform.translateY);
        // scale the context
        context.scale(transform.scale, transform.scale);
        // set the font
        context.font = `${10 / transform.scale}px Arial`;
        // set the fill style
        context.fillStyle = '#999999';
        // fill the text
        context.fillText(`Signed: ${timestamp}`, 5, canvas.height - 5);
        // restore the context
        context.restore();
      }
      // get the signature data
      const signatureData = canvas.toDataURL('image/png');
      // save the signature data
      onSave(signatureData);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  // return the signature canvas
  return (
    // return the signature canvas
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