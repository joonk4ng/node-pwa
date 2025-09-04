# PDF Drawing Features

This document describes the new PDF drawing capabilities added to the Engine Time Report application.

## Overview

The application now includes a comprehensive PDF drawing system that allows users to:
- View PDFs rendered to canvas using PDF.js
- Draw freehand annotations directly on PDFs
- Zoom in/out using CSS transforms (no re-rendering)
- Save drawing data as JSON
- Export PDFs with drawings flattened into the document

## Component Architecture

The drawing system is built using a microservices architecture with the following components:

### 1. PDFCanvasRenderer
- **Purpose**: Renders PDFs to HTML canvas using PDF.js
- **Features**: 
  - Loads PDFs from IndexedDB storage
  - Renders at native PDF resolution
  - Provides canvas ready callback for overlay positioning

### 2. DrawingOverlay
- **Purpose**: Handles freehand drawing on top of PDF canvas
- **Features**:
  - Freehand pen drawing with fixed stroke width
  - Touch and mouse support
  - Undo/clear functionality
  - Zoom-aware coordinate mapping
  - Real-time stroke rendering

### 3. PDFDrawingViewer
- **Purpose**: Main component that combines PDF rendering and drawing
- **Features**:
  - Zoom controls (10% to 500%)
  - Export functionality with pdf-lib
  - Drawing data persistence
  - Responsive design

### 4. DrawingStorage
- **Purpose**: Manages drawing data persistence in IndexedDB
- **Features**:
  - Store/retrieve drawing data by PDF ID
  - JSON export/import functionality
  - Automatic saving of drawing changes

## Key Features

### Zoom Implementation
- Uses CSS transforms (`scale()`) for smooth zooming
- No PDF re-rendering required
- Maintains drawing accuracy at all zoom levels
- Transform origin set to top-left for consistent behavior

### Drawing Data Model
```typescript
interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
}

interface DrawingData {
  strokes: DrawingStroke[];
  version: string;
}
```

### Export Process
1. Render drawing overlay at PDF's native resolution
2. Convert canvas to PNG image
3. Embed image in PDF using pdf-lib
4. Flatten drawing into PDF document
5. Generate downloadable blob

## Usage

### Basic Usage
```tsx
<PDFDrawingViewer 
  pdfId="your-pdf-id"
  onDrawingChange={handleDrawingChange}
  onExport={handleExport}
/>
```

### With Initial Drawing Data
```tsx
<PDFDrawingViewer 
  pdfId="your-pdf-id"
  initialDrawingData={savedDrawingData}
  onDrawingChange={handleDrawingChange}
  onExport={handleExport}
/>
```

### Drawing Storage
```typescript
// Save drawing data
await storeDrawing(pdfId, drawingData);

// Load drawing data
const drawingData = await getDrawing(pdfId);

// Export as JSON
const jsonData = await exportDrawingData(pdfId);
```

## Technical Implementation

### PDF Rendering
- Uses PDF.js for PDF parsing and rendering
- Renders to HTML canvas at native resolution
- Supports all PDF formats

### Drawing System
- Canvas-based drawing with 2D context
- Real-time stroke rendering
- Coordinate transformation for zoom support
- Touch and mouse event handling

### Data Persistence
- IndexedDB storage using Dexie
- Automatic saving on drawing changes
- JSON export/import for data portability

### Export System
- pdf-lib for PDF manipulation
- Canvas-to-image conversion
- Image embedding in PDF
- Flattened output generation

## Browser Compatibility

- Modern browsers with Canvas API support
- Touch devices supported
- IndexedDB required for data persistence
- PDF.js worker required for PDF processing

## Performance Considerations

- Large PDFs may impact initial rendering time
- Drawing data stored separately from PDF
- Zoom operations are CSS-only for performance
- Export process is asynchronous

## Future Enhancements

- Multiple brush sizes
- Color selection
- Shape tools (rectangles, circles, lines)
- Text annotations
- Layer management
- Drawing templates
