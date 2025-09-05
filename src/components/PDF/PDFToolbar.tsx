// PDF Toolbar component for PDF viewer actions
import React from 'react';

export interface PDFToolbarProps {
  isDrawingMode: boolean;
  onToggleDrawing: () => void;
  onSave?: () => void;
  onClear: () => void;
  readOnly?: boolean;
  currentZoom?: number;
  availableZooms?: number[];
  onZoomChange?: (zoom: number) => void;
  isMobile?: boolean;
}

export const PDFToolbar: React.FC<PDFToolbarProps> = ({
  isDrawingMode,
  onToggleDrawing,
  onSave,
  onClear,
  readOnly = false,
  currentZoom = 1.0,
  availableZooms = [1.0, 1.25, 1.5],
  onZoomChange,
  isMobile = false
}) => {
  if (readOnly) {
    return (
      <div className="toolbar">
        {onSave && (
          <button onClick={onSave} className="save-btn" title="Save PDF">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
            Save
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="toolbar">
      {/* Zoom Controls - Only show on desktop */}
      {onZoomChange && !isMobile && (
        <div className="zoom-controls">
          <span className="zoom-label">Zoom:</span>
          {availableZooms.map((zoom) => (
            <button
              key={zoom}
              onClick={() => onZoomChange(zoom)}
              className={`zoom-btn ${Math.abs(currentZoom - zoom) < 0.01 ? 'active' : ''}`}
              title={`${Math.round(zoom * 100)}%`}
            >
              {`${Math.round(zoom * 100)}%`}
            </button>
          ))}
        </div>
      )}
      
      
      <button
        onClick={onToggleDrawing}
        className={`draw-btn ${isDrawingMode ? 'active' : ''}`}
        title="Sign"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        Sign
      </button>
      
      {onSave && (
        <button onClick={onSave} className="save-btn" title="Save PDF">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
        Save
      </button>
      )}
      
      <button onClick={onClear} className="clear-btn" title="Undo">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
        </svg>
        Undo
      </button>
    </div>
  );
};
