import React, { useState } from 'react';

export interface SignatureAdjustmentControlsProps {
  onAdjustmentsChange: (adjustments: { x: number; y: number }) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SignatureAdjustmentControls: React.FC<SignatureAdjustmentControlsProps> = ({
  onAdjustmentsChange,
  className,
  style
}) => {
  const [xAdjustment, setXAdjustment] = useState(0);
  const [yAdjustment, setYAdjustment] = useState(0);

  const handleXChange = (value: number) => {
    setXAdjustment(value);
    onAdjustmentsChange({ x: value, y: yAdjustment });
  };

  const handleYChange = (value: number) => {
    setYAdjustment(value);
    onAdjustmentsChange({ x: xAdjustment, y: value });
  };

  const resetAdjustments = () => {
    setXAdjustment(0);
    setYAdjustment(0);
    onAdjustmentsChange({ x: 0, y: 0 });
  };

  const applyPreset = (preset: { x: number; y: number; name: string }) => {
    setXAdjustment(preset.x);
    setYAdjustment(preset.y);
    onAdjustmentsChange(preset);
  };

  const presets = [
    { x: 0, y: 0, name: 'None' },
    { x: -50, y: 0, name: 'Left' },
    { x: 50, y: 0, name: 'Right' },
    { x: 0, y: -20, name: 'Up' },
    { x: 0, y: 20, name: 'Down' },
    { x: -50, y: -20, name: 'Up-Left' },
    { x: 50, y: -20, name: 'Up-Right' },
    { x: -50, y: 20, name: 'Down-Left' },
    { x: 50, y: 20, name: 'Down-Right' }
  ];

  return (
    <div 
      className={`signature-adjustment-controls ${className || ''}`}
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        ...style
      }}
    >
      <div style={{ 
        fontWeight: 'bold', 
        textAlign: 'center',
        fontSize: '16px',
        marginBottom: '15px'
      }}>
        📝 Signature Position Adjustments
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
            X-Axis (Horizontal): {xAdjustment}px
          </label>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              onClick={() => handleXChange(xAdjustment - 10)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              -10
            </button>
            <button
              onClick={() => handleXChange(xAdjustment - 1)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              -1
            </button>
            <input
              type="number"
              value={xAdjustment}
              onChange={(e) => handleXChange(parseInt(e.target.value) || 0)}
              style={{
                width: '60px',
                padding: '5px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                textAlign: 'center',
                fontSize: '12px'
              }}
              min="-500"
              max="500"
            />
            <button
              onClick={() => handleXChange(xAdjustment + 1)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              +1
            </button>
            <button
              onClick={() => handleXChange(xAdjustment + 10)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              +10
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
            Y-Axis (Vertical): {yAdjustment}px
          </label>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              onClick={() => handleYChange(yAdjustment - 10)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              -10
            </button>
            <button
              onClick={() => handleYChange(yAdjustment - 1)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              -1
            </button>
            <input
              type="number"
              value={yAdjustment}
              onChange={(e) => handleYChange(parseInt(e.target.value) || 0)}
              style={{
                width: '60px',
                padding: '5px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                textAlign: 'center',
                fontSize: '12px'
              }}
              min="-500"
              max="500"
            />
            <button
              onClick={() => handleYChange(yAdjustment + 1)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              +1
            </button>
            <button
              onClick={() => handleYChange(yAdjustment + 10)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              +10
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
          Quick Presets:
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '5px',
          fontSize: '11px'
        }}>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              style={{
                background: preset.x === 0 && preset.y === 0 ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!(preset.x === 0 && preset.y === 0)) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#5a6268';
                }
              }}
              onMouseOut={(e) => {
                if (!(preset.x === 0 && preset.y === 0)) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#6c757d';
                }
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={resetAdjustments}
          style={{
            background: '#ffc107',
            color: '#212529',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reset to Default
        </button>
      </div>

      <div style={{ 
        marginTop: '10px', 
        fontSize: '11px', 
        color: '#ccc',
        textAlign: 'center'
      }}>
        💡 Tip: Positive X moves right, Positive Y moves down
      </div>
    </div>
  );
};

export default SignatureAdjustmentControls;
