import React from 'react';
import '../styles/components/TableSelector.css';

export type TableType = 'eest' | 'federal' | 'odf';

interface TableSelectorProps {
  activeTable: TableType;
  onTableChange: (table: TableType) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  activeTable,
  onTableChange,
  showSettings,
  onToggleSettings
}) => {
  return (
    <div className="table-selector">
      <div className="selector-tabs">
        <button
          className={`tab ${activeTable === 'eest' ? 'active' : ''}`}
          onClick={() => onTableChange('eest')}
        >
          Emergency Equipment Shift Ticket
        </button>
        {showSettings && (
          <div className="settings-tabs">
            <button
              className={`tab ${activeTable === 'federal' ? 'active' : ''}`}
              onClick={() => onTableChange('federal')}
            >
              Federal Equipment
            </button>
            <button
              className={`tab ${activeTable === 'odf' ? 'active' : ''}`}
              onClick={() => onTableChange('odf')}
            >
              ODF Equipment Time Sheet
            </button>
          </div>
        )}
      </div>
      <button
        className="settings-btn"
        onClick={onToggleSettings}
      >
        {showSettings ? 'Hide Settings' : 'Settings'}
      </button>
    </div>
  );
}; 