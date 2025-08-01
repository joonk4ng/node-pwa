import React from 'react';
import { SignatureCanvas } from './SignatureCanvas';
import '../styles/components/SignatureModal.css';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  return (
    <div className="signature-modal">
      <SignatureCanvas
        onSave={(signatureData) => {
          onSave(signatureData);
          onClose();
        }}
        onCancel={onClose}
      />
    </div>
  );
}; 