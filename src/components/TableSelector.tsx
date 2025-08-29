// Table selector component to select the table to display
// Selects between 2 types of tables: Federal and ODF tables
import React from 'react';
import '../styles/components/TableSelector.css';

// type for the table to display
export type TableType = 'eest' | 'federal' | 'odf';

// interface for the table selector props
interface TableSelectorProps {
  // active table to display
  activeTable: TableType;
  // function to change the table
  onTableChange: (table: TableType) => void;
  // show settings
  showSettings: boolean;
  // function to toggle settings
  onToggleSettings: () => void;
}

// table selector component
export const TableSelector: React.FC<TableSelectorProps> = ({
  // active table to display
  activeTable,
  // function to change the table
  onTableChange,
  // show settings
  showSettings,
  // function to toggle settings
  onToggleSettings
}) => {
  // table selector component
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