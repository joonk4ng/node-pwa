// PDF Canvas component for rendering PDF content
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPDFToCanvas, loadPDFDocument } from '../../utils/PDF/pdfRendering';
import { getPDF } from '../../utils/pdfStorage';

export interface PDFCanvasProps {
  pdfId?: string;
  className?: string;
  style?: React.CSSProperties;
  onPDFLoaded?: (pdfDoc: pdfjsLib.PDFDocumentProxy) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export interface PDFCanvasRef {
  canvas: HTMLCanvasElement | null;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  renderPDF: () => Promise<void>;
  destroy: () => void;
}

export const PDFCanvas = forwardRef<PDFCanvasRef, PDFCanvasProps>(({
  pdfId,
  className,
  style,
  onPDFLoaded,
  onError,
  onLoadingChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Render PDF to canvas with flexible sizing
  const renderPDF = useCallback(async () => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    try {
      // Get the container element for flexible sizing
      const container = canvasRef.current.parentElement;
      
      // Use flexible rendering - let the PDF determine its natural size
      await renderPDFToCanvas(pdfDocRef.current, canvasRef.current, container, {
        maintainAspectRatio: true
      });
    } catch (error) {
      console.error('Error rendering PDF:', error);
      onError?.('Failed to render PDF');
    }
  }, [onError]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    pdfDoc: pdfDocRef.current,
    renderPDF,
    destroy: () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    }
  }));

  // Load PDF effect
  useEffect(() => {
    let mounted = true;
    let currentPdf: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPDF = async () => {
      if (!pdfId) return;

      try {
        onLoadingChange?.(true);
        
        const storedPDF = await getPDF(pdfId);
        if (!storedPDF || !mounted) return;

        // Load the PDF document
        const pdf = await loadPDFDocument(storedPDF.pdf);
        
        if (!mounted) {
          pdf.destroy();
          return;
        }

        // Clean up previous PDF document
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }

        currentPdf = pdf;
        pdfDocRef.current = pdf;

        await renderPDF();
        onPDFLoaded?.(pdf);
        onLoadingChange?.(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (mounted) {
          onError?.('Failed to load PDF. Please try again.');
          onLoadingChange?.(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
      if (currentPdf) {
        currentPdf.destroy();
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [pdfId, renderPDF, onPDFLoaded, onError, onLoadingChange]);

  // Re-render when needed
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPDF();
    }
  }, [renderPDF]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{
        ...style
      }}
    />
  );
});
