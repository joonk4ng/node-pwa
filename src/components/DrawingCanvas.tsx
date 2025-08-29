import React, { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  isDrawingMode: boolean;
  drawingColor: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  isDrawingMode,
  drawingColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const brushSize = 1; // Fixed minimum brush size

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth - 40; // Account for padding
        canvas.height = container.clientHeight - 40;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    
    e.preventDefault(); // Prevent default browser behavior
    e.stopPropagation(); // Stop event bubbling
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;

    e.preventDefault(); // Prevent default browser behavior
    e.stopPropagation(); // Stop event bubbling

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDrawing(false);
  };



    return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      pointerEvents: 'auto',
      zIndex: 10
    }}>
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={isDrawingMode ? startDrawing : undefined}
        onMouseMove={isDrawingMode ? draw : undefined}
        onMouseUp={isDrawingMode ? stopDrawing : undefined}
        onMouseLeave={isDrawingMode ? stopDrawing : undefined}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        style={{
          width: '100%',
          height: '100%',
          cursor: isDrawingMode ? 'crosshair' : 'default',
          border: '1px solid #ccc',
          borderRadius: '4px',
          pointerEvents: isDrawingMode ? 'auto' : 'none' // Only capture events when in drawing mode
        }}
      />
    </div>
  );
};

export default DrawingCanvas;
