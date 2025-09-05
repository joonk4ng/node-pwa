// PDF flattening utilities
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

export const pdfOptions = {
  disableAutoFetch: true,
  disableStream: true,
  disableFontFace: false,
  useSystemFonts: true,
  enableXfa: true,
  isEvalSupported: false,
  maxImageSize: 4096 * 4096,
  cMapUrl: undefined,
  standardFontDataUrl: undefined
};

export const flattenPDFToImage = async (pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<Blob> => {
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = viewport.width;
  tempCanvas.height = viewport.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Could not get canvas context for flattening');
  }

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.fillStyle = 'white';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  await page.render({
    canvasContext: tempCtx,
    viewport: viewport
  }).promise;

  return new Promise<Blob>((resolve, reject) => {
    tempCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png', 1.0);
  });
};

export const createFlattenedPDF = async (
  pdfImageBlob: Blob, 
  signatureImageBlob: Blob | null,
  signaturePosition?: { x: number; y: number; width: number; height: number }
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const pdfImageBytes = new Uint8Array(await pdfImageBlob.arrayBuffer());
  const pdfImage = await pdfDoc.embedPng(pdfImageBytes);
  
  const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
  
  page.drawImage(pdfImage, {
    x: 0,
    y: 0,
    width: pdfImage.width,
    height: pdfImage.height,
  });

  if (signatureImageBlob) {
    const signatureImageBytes = new Uint8Array(await signatureImageBlob.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    
    const position = signaturePosition || { 
      x: 0, 
      y: 0, 
      width: pdfImage.width, 
      height: pdfImage.height 
    };
    
    page.drawImage(signatureImage, {
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
    });
  }

  return await pdfDoc.save();
};

export const hasSignature = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
};
