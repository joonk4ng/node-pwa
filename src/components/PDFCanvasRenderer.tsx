import React, { useEffect, useRef, useState } from 'react';
import { getPDF } from '../utils/pdfStorage';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFCanvasRendererProps {
  pdfId: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const PDFCanvasRenderer: React.FC<PDFCanvasRendererProps> = ({
  pdfId,
  onCanvasReady,
  onError,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;
    let pdfDocument: any = null;

    const renderPDFToCanvas = async () => {
      if (!pdfId || !canvasRef.current) return;

      try {
        setIsLoading(true);
        setError(null);
        
        // Create a new canvas key to force recreation
        setCanvasKey(prev => prev + 1);

        // Get PDF from storage
        const pdfData = await getPDF(pdfId);
        if (!pdfData) {
          throw new Error('PDF not found in storage');
        }

        // Convert blob to array buffer
        const arrayBuffer = await pdfData.pdf.arrayBuffer();

        // Load PDF with PDF.js
        loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdfDocument = await loadingTask.promise;

        if (isCancelled) return;

        // Get the first page
        const page = await pdfDocument.getPage(1);

        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Get page viewport
        const viewport = page.getViewport({ scale: 1.0 });

        // Set canvas size to match PDF dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Clear the canvas before rendering
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        if (isCancelled) return;

        // Notify parent component that canvas is ready
        onCanvasReady?.(canvas);

        console.log('PDF rendered to canvas successfully:', {
          pdfId,
          width: viewport.width,
          height: viewport.height
        });

      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering PDF to canvas:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to render PDF';
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    renderPDFToCanvas();

    // Cleanup function
    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy?.();
      }
      if (pdfDocument) {
        pdfDocument.destroy?.();
      }
    };
  }, [pdfId, onCanvasReady, onError]);

  // Cleanup canvas on unmount
  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, []);

  if (error) {
    return (
      <div 
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          color: 'red',
          ...style
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#f5f5f5',
        ...style
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px 40px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          color: '#495057',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1001
        }}>
          Rendering PDF...
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        key={`pdf-canvas-${pdfId}-${canvasKey}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default PDFCanvasRenderer;
