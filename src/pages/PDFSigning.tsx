import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EnhancedPDFViewer } from '../components/PDF';
import { getPDF, storePDFWithId } from '../utils/pdfStorage';

// Utility function to convert Date to MM/DD/YY format (same as Federal form)
const formatToMMDDYY = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
};

const PDFSigning: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pdfId, setPdfId] = useState<string>('federal-form');
  const [crewInfo, setCrewInfo] = useState({
    crewNumber: 'N/A',
    fireName: 'N/A',
    fireNumber: 'N/A'
  });
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get parameters from URL
    const urlPdfId = searchParams.get('pdfId') || 'federal-form';
    const urlCrewNumber = searchParams.get('crewNumber') || 'N/A';
    const urlFireName = searchParams.get('fireName') || 'N/A';
    const urlFireNumber = searchParams.get('fireNumber') || 'N/A';
    const urlDate = searchParams.get('date') || new Date().toLocaleDateString();

    setPdfId(urlPdfId);
    setCrewInfo({
      crewNumber: urlCrewNumber,
      fireName: urlFireName,
      fireNumber: urlFireNumber
    });
    setDate(urlDate);

    // Verify PDF exists
    const checkPDF = async () => {
      try {
        const storedPDF = await getPDF(urlPdfId);
        if (!storedPDF) {
          setError('PDF not found. Please return to the main page and try again.');
        }
        setIsLoading(false);
      } catch (err) {
        setError('Error loading PDF. Please try again.');
        setIsLoading(false);
      }
    };

    checkPDF();
  }, [searchParams]);

  const handleSave = async (pdfData: Blob, previewImage: Blob) => {
    try {
      console.log('🔍 PDFSigning: Saving signed PDF to gallery...');
      console.log('🔍 PDFSigning: Date from URL:', date);
      console.log('🔍 PDFSigning: Formatted date:', date || formatToMMDDYY(new Date()));
      
      const saveDate = date || formatToMMDDYY(new Date());
      console.log('🔍 PDFSigning: Using save date:', saveDate);
      
      // Create meaningful names for the PDF
      const crewNumber = crewInfo?.crewNumber && crewInfo.crewNumber !== 'N/A' ? crewInfo.crewNumber : 'Crew';
      const fireName = crewInfo?.fireName && crewInfo.fireName !== 'N/A' ? crewInfo.fireName.replace(/[^a-zA-Z0-9]/g, '-') : 'Fire';
      const fireNumber = crewInfo?.fireNumber && crewInfo.fireNumber !== 'N/A' ? crewInfo.fireNumber : 'Number';
      
      // Use a consistent ID for the signed PDF (one per date)
      const signedPdfId = `federal-signed-${saveDate.replace(/\//g, '-')}`;
      
      // Create a descriptive filename
      const filename = `Federal-Form-Signed-${crewNumber}-${fireName}-${saveDate.replace(/\//g, '-')}.pdf`;
      
      // Store the signed PDF in the gallery (this will replace any existing PDF for this date)
      await storePDFWithId(signedPdfId, pdfData, previewImage, {
        filename: filename,
        date: saveDate,
        crewNumber: crewInfo?.crewNumber || 'N/A',
        fireName: crewInfo?.fireName || 'N/A',
        fireNumber: crewInfo?.fireNumber || 'N/A'
      });
      
      console.log('🔍 PDFSigning: PDF saved to gallery with ID:', signedPdfId);
      console.log('🔍 PDFSigning: PDF saved with date:', saveDate);
      
      // Also create a download link for immediate access
      const url = URL.createObjectURL(pdfData);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      alert('PDF signed and saved to gallery successfully! (Replaced any existing PDF for this date)');
      
      // Navigate back to main page
      navigate('/');
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Error saving PDF. Please try again.');
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Error</h2>
        <p style={{ marginBottom: '20px', fontSize: '16px' }}>{error}</p>
        <button
          onClick={handleClose}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Return to Main Page
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        height: '60px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
            PDF Signing - {crewInfo.fireName}
          </h1>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Crew: {crewInfo.crewNumber} | Date: {date}
          </div>
        </div>
        
        <button
          onClick={handleClose}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#c82333'}
          onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#dc3545'}
        >
          <span>✕</span>
          Close
        </button>
      </div>
      
      {/* PDF Viewer Content */}
      <div style={{
        flex: 1,
        width: '100%',
        height: 'calc(100vh - 60px)',
        overflow: 'auto',
        backgroundColor: '#f5f5f5',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <EnhancedPDFViewer
          pdfId={pdfId}
          onSave={handleSave}
          crewInfo={crewInfo}
          date={date}
        />
      </div>
    </div>
  );
};

export default PDFSigning;
