import './App.css';
import { useState } from 'react';
import EESTTimeTable from './components/EESTTimeTable';
import { FederalTimeTable } from './components/FederalTimeTable';
import TimeEntryTable from './components/TimeEntryTable';
import { TableSelector } from './components/TableSelector';
import type { TableType } from './components/TableSelector';

function App() {
  const [activeTable, setActiveTable] = useState<TableType>('federal');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app">
      <TableSelector
        activeTable={activeTable}
        onTableChange={setActiveTable}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />
      
      {activeTable === 'federal' && <FederalTimeTable />}
      {activeTable === 'eest' && showSettings && <EESTTimeTable />}
      {activeTable === 'odf' && showSettings && <TimeEntryTable tableType="equipment" />}
      
      {((activeTable === 'eest' || activeTable === 'odf') && !showSettings) && (
        <div className="settings-message">
          <p>Additional time sheets are available in Settings.</p>
          <button onClick={() => setShowSettings(true)}>
            Open Settings
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
