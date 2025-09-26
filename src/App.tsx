import './App.css';
import { useState, useEffect } from 'react';
import EESTTimeTable from './components/EESTTimeTable';
import { FederalTimeTable } from './components/FederalTimeTable';
import TimeEntryTable from './components/TimeEntryTable';
import { TableSelector } from './components/TableSelector';
import type { TableType } from './components/TableSelector';

function App() {
  const [activeTable, setActiveTable] = useState<TableType | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load saved table selection from localStorage on mount
  useEffect(() => {
    const savedTable = localStorage.getItem('selectedTable') as TableType | null;
    if (savedTable) {
      setActiveTable(savedTable);
    }
  }, []);

  // Save table selection to localStorage whenever it changes
  const handleTableChange = (table: TableType) => {
    setActiveTable(table);
    localStorage.setItem('selectedTable', table);
  };

  return (
    <div className="app">
      <TableSelector
        activeTable={activeTable}
        onTableChange={handleTableChange}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />
      
      {activeTable === 'federal' && <FederalTimeTable />}
      {activeTable === 'eest' && <EESTTimeTable />}
      {activeTable === 'odf' && <TimeEntryTable tableType="equipment" />}
      
      {!activeTable && (
        <div className="no-table-selected">
          <p>Please select a time sheet to get started.</p>
        </div>
      )}
    </div>
  );
}

export default App;
