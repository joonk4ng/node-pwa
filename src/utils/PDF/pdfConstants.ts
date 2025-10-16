// PDF page size constants for precise coordinate mapping and zoom functionality
// Based on actual PDF page dimensions: 7.75 x 5.37 inches

export const PDF_PAGE_SIZE = {
  // Physical dimensions in inches
  widthInches: 7.75,
  heightInches: 5.37,
  
  // Standard PDF DPI (72 DPI)
  standardDPI: 72,
  
  // Pixel dimensions at standard DPI
  widthPixels: 7.75 * 72,  // 558 pixels
  heightPixels: 5.37 * 72, // 386.64 pixels (≈ 387)
  
  // High quality DPI for printing/saving
  highQualityDPI: 150,
  
  // Pixel dimensions at high quality DPI
  widthPixelsHighQuality: 7.75 * 150,  // 1,162.5 pixels
  heightPixelsHighQuality: 5.37 * 150, // 805.5 pixels
} as const;

export const ZOOM_LEVELS = {
  FIT_TO_WIDTH: 'fit-width',
  FIT_TO_HEIGHT: 'fit-height',
  FIT_TO_PAGE: 'fit-page',
  ACTUAL_SIZE: 1.0,
  ZOOM_125: 1.25,
  ZOOM_150: 1.5,
  ZOOM_200: 2.0,
  ZOOM_250: 2.5,
  ZOOM_300: 3.0,
} as const;

export type ZoomLevel = typeof ZOOM_LEVELS[keyof typeof ZOOM_LEVELS];

/**
 * Calculate canvas dimensions for a given zoom level
 */
export const calculateCanvasDimensions = (
  zoomLevel: number,
  devicePixelRatio: number = 1
) => {
  const baseWidth = PDF_PAGE_SIZE.widthPixels;
  const baseHeight = PDF_PAGE_SIZE.heightPixels;
  
  return {
    // Canvas internal dimensions (for high-DPI displays)
    canvasWidth: Math.round(baseWidth * zoomLevel * devicePixelRatio),
    canvasHeight: Math.round(baseHeight * zoomLevel * devicePixelRatio),
    
    // Canvas display dimensions (CSS pixels)
    displayWidth: Math.round(baseWidth * zoomLevel),
    displayHeight: Math.round(baseHeight * zoomLevel),
    
    // Scale factors for coordinate mapping
    coordinateScale: zoomLevel,
    pixelRatio: devicePixelRatio,
    
    // Base dimensions
    baseWidth,
    baseHeight,
  };
};

/**
 * Map display coordinates to PDF coordinates using known page size
 * Simplified to match exact PDF rendering
 */
export const mapDisplayToPDFCoordinates = (
  displayX: number,
  displayY: number,
  canvasRect: DOMRect
) => {
  // Calculate position relative to canvas
  const relativeX = displayX - canvasRect.left;
  const relativeY = displayY - canvasRect.top;
  
  // Simple scaling: canvas internal size / display size
  const devicePixelRatio = window.devicePixelRatio || 1;
  const canvasInternalWidth = canvasRect.width * devicePixelRatio;
  const canvasInternalHeight = canvasRect.height * devicePixelRatio;
  
  // Map to PDF coordinates directly
  const scaleX = PDF_PAGE_SIZE.widthPixels / canvasInternalWidth;
  const scaleY = PDF_PAGE_SIZE.heightPixels / canvasInternalHeight;
  
  return {
    x: relativeX * devicePixelRatio * scaleX,
    y: relativeY * devicePixelRatio * scaleY,
    // Also return the scale factors for reference
    scaleX,
    scaleY,
    devicePixelRatio,
  };
};

/**
 * Map PDF coordinates to display coordinates
 */
export const mapPDFToDisplayCoordinates = (
  pdfX: number,
  pdfY: number,
  canvasRect: DOMRect,
  zoomLevel: number
) => {
  // Scale from PDF coordinates to display coordinates
  const scaleX = canvasRect.width / (PDF_PAGE_SIZE.widthPixels * zoomLevel);
  const scaleY = canvasRect.height / (PDF_PAGE_SIZE.heightPixels * zoomLevel);
  
  return {
    x: pdfX * scaleX,
    y: pdfY * scaleY,
  };
};

/**
 * Calculate optimal zoom level to fit container
 */
export const calculateFitZoom = (
  containerWidth: number,
  containerHeight: number,
  fitType: 'width' | 'height' | 'page' = 'page'
) => {
  const baseWidth = PDF_PAGE_SIZE.widthPixels;
  const baseHeight = PDF_PAGE_SIZE.heightPixels;
  
  // Account for mobile viewport issues
  const isMobile = window.innerWidth <= 768;
  const effectiveWidth = isMobile ? Math.min(containerWidth, window.innerWidth - 40) : containerWidth;
  const effectiveHeight = isMobile ? Math.min(containerHeight, window.innerHeight - 100) : containerHeight;
  
  console.log('🔍 calculateFitZoom:', {
    containerWidth,
    containerHeight,
    effectiveWidth,
    effectiveHeight,
    isMobile,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    fitType
  });
  
  switch (fitType) {
    case 'width':
      return effectiveWidth / baseWidth;
    case 'height':
      return effectiveHeight / baseHeight;
    case 'page':
    default:
      const scaleX = effectiveWidth / baseWidth;
      const scaleY = effectiveHeight / baseHeight;
      return Math.min(scaleX, scaleY);
  }
};
