# PDF Pipeline: From Form Filling to Download

This document outlines the complete pipeline of how PDFs are handled in the Engine Time Report application, from initial form filling through display, drawing, and final download.

## Overview

The application uses a dual-library approach:
- **pdf-lib**: For PDF creation, form field filling, and manipulation
- **pdfjs-dist (PDF.js)**: For PDF rendering and display
- **Custom Canvas System**: For drawing/signatures

---

## Stage 1: PDF Creation & Form Filling

### Location: `src/components/FederalTimeTable.tsx` (or similar form components)

**Process:**
1. User fills out form data in the UI
2. Form data is validated
3. Form data is mapped to PDF field names using field mappers:
   - `src/utils/fieldmapper/federalFieldMapper.ts`
   - `src/utils/fieldmapper/eestFieldMapper.ts`
4. **pdf-lib** loads the base PDF template from IndexedDB:
   ```typescript
   const storedPDF = await getPDF('federal-form');
   const pdfDoc = await PDFLib.PDFDocument.load(await storedPDF.pdf.arrayBuffer());
   ```
5. Form fields are populated using pdf-lib:
   ```typescript
   const form = pdfDoc.getForm();
   form.getField(fieldName).setText(value); // or .check(), .select(), etc.
   ```
6. Filled PDF is saved as bytes and converted to Blob
7. **Filled PDF is stored back to IndexedDB** with ID `'federal-form'`:
   ```typescript
   await storePDFWithId('federal-form', filledPdfBlob, null, metadata);
   ```

**Key Files:**
- `src/components/FederalTimeTable.tsx` - `handleViewPDF()` function
- `src/utils/pdfStorage.ts` - `storePDFWithId()` function
- `src/utils/fieldmapper/*.ts` - Field mapping logic

---

## Stage 2: PDF Storage (IndexedDB)

### Location: `src/utils/pdfStorage.ts`

**Storage Structure:**
```typescript
interface PDFData {
  id: string;              // Unique identifier (e.g., 'federal-form')
  pdf: Blob;               // The actual PDF file
  preview: Blob | null;    // Optional PNG preview
  metadata: {
    filename: string;
    date: string;
    crewNumber: string;
    fireName: string;
    fireNumber: string;
  };
  timestamp: string;
}
```

**Database:** IndexedDB (`ctr-pdf-storage` database, `pdfs` store)

**Key Functions:**
- `storePDFWithId()` - Store PDF with specific ID
- `getPDF(id)` - Retrieve PDF by ID
- `listPDFs()` - List all stored PDFs

---

## Stage 3: PDF Loading for Display

### Location: `src/components/PDF/PDFCanvas.tsx` or `src/components/PDF/EESTPDFViewer.tsx`

**Process:**
1. Component receives `pdfId` prop (e.g., `'federal-form'`)
2. PDF is retrieved from IndexedDB:
   ```typescript
   const storedPDF = await getPDF(pdfId);
   ```
3. PDF Blob is converted to ArrayBuffer
4. **PDF.js loads the document:**
   ```typescript
   const loadingTask = pdfjsLib.getDocument({ 
     data: arrayBuffer,
     useSystemFonts: true,
     disableFontFace: false
   });
   const pdfDoc = await loadingTask.promise;
   ```
5. PDF.js renders the first page to an HTML5 canvas:
   ```typescript
   const page = await pdfDoc.getPage(1);
   const viewport = page.getViewport({ scale });
   const renderTask = page.render({
     canvasContext: context,
     viewport: viewport,
     intent: 'display'
   });
   await renderTask.promise;
   ```

**Key Files:**
- `src/components/PDF/PDFCanvas.tsx` - Main PDF rendering component
- `src/utils/PDF/pdfRendering.ts` - Rendering utilities
- `src/components/PDF/EESTPDFViewer.tsx` - EEST-specific viewer

**Canvas Setup:**
- Base PDF canvas: Renders the PDF using PDF.js
- Drawing canvas: Overlays on top for signatures/annotations
- Both canvases are synchronized in size and position

---

## Stage 4: Drawing/Signature Layer

### Location: `src/components/PDF/DrawingCanvas.tsx` + `src/hooks/usePDFDrawing.ts`

**Process:**
1. User clicks "Sign" button, enabling drawing mode
2. **DrawingCanvas** component creates a transparent overlay canvas
3. Canvas is synchronized with PDF canvas dimensions:
   ```typescript
   drawCanvas.width = pdfCanvas.width;
   drawCanvas.height = pdfCanvas.height;
   ```
4. **usePDFDrawing hook** handles drawing events:
   - Mouse/touch events are captured
   - Coordinates are mapped from display space to canvas internal coordinates
   - Strokes are drawn using Canvas 2D API:
     ```typescript
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     ctx.lineWidth = 3;
     ctx.strokeStyle = '#000000';
     ctx.beginPath();
     ctx.moveTo(lastPos.x, lastPos.y);
     ctx.lineTo(currentPos.x, currentPos.y);
     ctx.stroke();
     ```

**Key Features:**
- Touch and mouse support
- Zoom-aware coordinate mapping
- Real-time stroke rendering
- Clear/undo functionality

**Key Files:**
- `src/components/PDF/DrawingCanvas.tsx` - Drawing canvas component
- `src/hooks/usePDFDrawing.ts` - Drawing logic hook

---

## Stage 5: Saving with Signature (Flattening)

### Location: `src/utils/PDF/pdfSaveHandler.ts` - `savePDFWithSignature()`

**Process:**

1. **Create Preview Image:**
   ```typescript
   // Combine base PDF canvas + drawing canvas
   tempCtx.drawImage(baseCanvas, 0, 0);
   tempCtx.drawImage(drawCanvas, 0, 0);
   const previewImage = await canvasToBlob(tempCanvas);
   ```

2. **Check for Signature:**
   ```typescript
   const hasSig = hasSignature(drawCanvas); // Checks for non-transparent pixels
   ```

3. **Flatten PDF to High-Resolution Image:**
   ```typescript
   // PDF.js renders PDF at high resolution (scale: 3.0)
   const flattenedPdfImage = await flattenPDFToImage(pdfDoc);
   ```
   - Uses PDF.js to render all pages at 3x scale
   - Creates a single canvas with all pages stacked vertically

4. **Scale and Position Signature:**
   ```typescript
   // Calculate scale factors from display canvas to high-res PDF
   const scaleX = flattenedPdfImage.width / baseCanvas.width;
   const scaleY = flattenedPdfImage.height / baseCanvas.height;
   
   // Apply mobile-specific position adjustments
   // Draw signature on high-res canvas
   highResCtx.drawImage(drawCanvas, ...);
   ```

5. **Create Flattened PDF with pdf-lib:**
   ```typescript
   // Convert high-res canvas to PNG
   const pdfImageBlob = await canvasToBlob(highResCanvas);
   
   // Create new PDF document with pdf-lib
   const pdfDoc = await PDFLib.PDFDocument.create();
   const pdfImagePng = await pdfDoc.embedPng(pdfImageBytes);
   
   // Create page with image dimensions
   const page = pdfDoc.addPage([imageWidth, imageHeight]);
   page.drawImage(pdfImagePng, { x: 0, y: 0, width: imageWidth, height: imageHeight });
   
   // Save to bytes
   const flattenedPdfBytes = await pdfDoc.save();
   ```

6. **Save Metadata to Database:**
   ```typescript
   await savePDFMetadataToDatabase(options, filename, fileSize, isSigned);
   ```

7. **Download PDF:**
   ```typescript
   const flattenedPdfBlob = new Blob([flattenedPdfBytes], { type: 'application/pdf' });
   await downloadPDF(flattenedPdfBlob, options);
   ```

**Key Files:**
- `src/utils/PDF/pdfSaveHandler.ts` - Main save handler
- `src/utils/PDF/pdfFlattening.ts` - Flattening utilities
  - `flattenPDFToImage()` - PDF.js rendering to canvas
  - `createFlattenedPDF()` - pdf-lib PDF creation

---

## Stage 6: Download

### Location: `src/utils/PDF/pdfSaveHandler.ts` - `downloadPDF()`

**Process:**
1. Generate filename using naming schema
2. Create Blob URL from PDF bytes
3. Create temporary `<a>` element with download attribute
4. Trigger click to download
5. Clean up Blob URL

**Special Handling:**
- iOS Safari: Opens in new window/tab instead of direct download
- Other browsers: Standard download behavior

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FORM FILLING (pdf-lib)                                   │
│    - Load base PDF template                                 │
│    - Fill form fields                                       │
│    - Save filled PDF to IndexedDB                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. STORAGE (IndexedDB)                                      │
│    - Store PDF Blob with metadata                           │
│    - ID: 'federal-form' or 'eest-form'                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DISPLAY (PDF.js)                                         │
│    - Load PDF from IndexedDB                                │
│    - Render to HTML5 canvas using PDF.js                    │
│    - Display in viewer component                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DRAWING (Custom Canvas)                                  │
│    - Overlay transparent canvas                             │
│    - Capture mouse/touch events                             │
│    - Draw strokes using Canvas 2D API                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FLATTENING (PDF.js + pdf-lib)                            │
│    - PDF.js: Render PDF to high-res canvas (3x scale)       │
│    - Scale drawing canvas to match                          │
│    - Combine both canvases                                  │
│    - pdf-lib: Create new PDF from combined image            │
│    - Save metadata to database                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DOWNLOAD                                                 │
│    - Generate filename                                      │
│    - Create Blob URL                                        │
│    - Trigger browser download                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Technical Details

### Library Responsibilities

**pdf-lib:**
- PDF document creation and manipulation
- Form field filling (text, checkboxes, dropdowns)
- Creating new PDFs from images
- PDF flattening (removing form fields)

**PDF.js (pdfjs-dist):**
- PDF document parsing and loading
- Rendering PDF pages to canvas
- High-resolution rendering for flattening
- Font handling and text rendering

**Custom Canvas System:**
- Drawing/signature capture
- Coordinate mapping and scaling
- Touch and mouse event handling

### Coordinate Systems

1. **Display Coordinates**: Browser viewport pixels
2. **Canvas Internal Coordinates**: Actual canvas pixel dimensions (may differ from display size)
3. **PDF Coordinates**: PDF.js viewport coordinates
4. **High-Resolution Coordinates**: 3x scaled coordinates for flattening

All coordinate transformations are handled in:
- `src/hooks/usePDFDrawing.ts` - Drawing coordinate mapping
- `src/utils/PDF/pdfSaveHandler.ts` - Signature scaling for flattening

### Resolution Handling

- **Display**: PDF rendered at viewport-appropriate scale
- **Drawing**: Canvas matches PDF canvas internal dimensions
- **Flattening**: PDF rendered at 3x scale for high quality
- **Signature Scaling**: Drawing canvas scaled to match high-res PDF dimensions

---

## File Reference

### Core Pipeline Files
- `src/utils/PDF/pdfSaveHandler.ts` - Save/flatten/download logic
- `src/utils/PDF/pdfFlattening.ts` - PDF flattening utilities
- `src/utils/PDF/pdfRendering.ts` - PDF.js rendering utilities
- `src/utils/pdfStorage.ts` - IndexedDB storage

### Display Components
- `src/components/PDF/PDFCanvas.tsx` - PDF rendering component
- `src/components/PDF/DrawingCanvas.tsx` - Drawing overlay component
- `src/components/PDF/EnhancedPDFViewer.tsx` - Main viewer wrapper
- `src/components/PDF/EESTPDFViewer.tsx` - EEST-specific viewer

### Drawing System
- `src/hooks/usePDFDrawing.ts` - Drawing logic hook

### Form Filling
- `src/components/FederalTimeTable.tsx` - Federal form component
- `src/utils/fieldmapper/federalFieldMapper.ts` - Federal field mapping
- `src/utils/fieldmapper/eestFieldMapper.ts` - EEST field mapping

