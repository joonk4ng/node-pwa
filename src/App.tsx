import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FederalTimeTable } from './components/FederalTimeTable';
import PDFSigning from './pages/PDFSigning';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<FederalTimeTable />} />
          <Route path="/pdf-signing" element={<PDFSigning />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
