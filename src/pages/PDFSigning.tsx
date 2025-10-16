import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EnhancedPDFViewer } from '../components/PDF';
import { getPDF, storePDFWithId } from '../utils/pdfStorage';

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
      
      // Generate a unique ID for the signed PDF
      const signedPdfId = `federal-signed-${crewInfo?.crewNumber || 'unknown'}-${crewInfo?.fireName || 'unknown'}-${crewInfo?.fireNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}`;
      
      // Store the signed PDF in the gallery
      await storePDFWithId(signedPdfId, pdfData, previewImage, {
        filename: `signed-federal-form-${crewInfo?.crewNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`,
        date: date || new Date().toLocaleDateString(),
        crewNumber: crewInfo?.crewNumber || 'Unknown',
        fireName: crewInfo?.fireName || 'Unknown',
        fireNumber: crewInfo?.fireNumber || 'Unknown'
      });
      
      console.log('🔍 PDFSigning: PDF saved to gallery with ID:', signedPdfId);
      
      // Also create a download link for immediate access
      const url = URL.createObjectURL(pdfData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-federal-form-${crewInfo?.crewNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      alert('PDF signed and saved to gallery successfully!');
      
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
