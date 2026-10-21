'use client';

import React from 'react';
import { CartDocItem, useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import { FileText, Image as ImageIcon, Camera, Trash2, Plus, Minus, Layers } from 'lucide-react';
import { DocumentOptions } from '@printhub/shared';

interface DocumentCardProps {
  doc: CartDocItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => {
  const { language, shop, updateDocOptions, removeDoc } = useCustomerStore();
  const t = translations[language];

  const pricing = shop?.pricing || {};
  const isColorOffered = !!pricing.A4_COLOR_SINGLE?.enabled || !!pricing.A4_COLOR_DOUBLE?.enabled;
  const isDuplexOffered = !!pricing.A4_BW_DOUBLE?.enabled || !!pricing.A4_COLOR_DOUBLE?.enabled;
  const isA3Offered = !!pricing.A3_BW_SINGLE?.enabled || !!pricing.A3_COLOR_SINGLE?.enabled;

  const handleOptionChange = (key: keyof DocumentOptions, value: any) => {
    updateDocOptions(doc.docId, { [key]: value });
  };

  const IconComponent =
    doc.kind === 'PDF' ? FileText : doc.kind === 'SCAN' ? Camera : ImageIcon;

  return (
    <div className="glass-panel" style={{ padding: '16px 14px', marginBottom: '16px' }}>
      {/* Top row: Icon, Name, Page count, Delete button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '13px',
              background: 'rgba(79, 70, 229, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
              flexShrink: 0,
            }}
          >
            <IconComponent size={21} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f172a', margin: 0 }}>
              {doc.name}
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              {doc.pages} {doc.pages === 1 ? 'page' : 'pages'} • {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        </div>

        <button
          onClick={() => removeDoc(doc.docId)}
          className="stepper-btn"
          style={{ color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2', width: '38px', height: '38px' }}
          title={t.remove}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Options Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Copies Stepper */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
            {t.copies}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleOptionChange('copies', Math.max(1, doc.options.copies - 1))}
              disabled={doc.options.copies <= 1}
              className="stepper-btn"
              style={{ width: '38px', height: '38px' }}
            >
              <Minus size={13} />
            </button>
            <span style={{ fontSize: '1rem', fontWeight: 800, minWidth: '24px', textAlign: 'center', color: '#0f172a' }}>
              {doc.options.copies}
            </span>
            <button
              onClick={() => handleOptionChange('copies', Math.min(99, doc.options.copies + 1))}
              className="stepper-btn"
              style={{ width: '38px', height: '38px' }}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Paper Size */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
            {t.paperSize}
          </label>
          <div className="segment-container" style={{ minHeight: '38px' }}>
            <button
              type="button"
              className={`segment-btn ${doc.options.paperSize === 'A4' ? 'active' : ''}`}
              onClick={() => handleOptionChange('paperSize', 'A4')}
              style={{ fontSize: '0.78rem', padding: '6px 4px' }}
            >
              A4
            </button>
            <button
              type="button"
              className={`segment-btn ${doc.options.paperSize === 'A3' ? 'active' : ''}`}
              onClick={() => handleOptionChange('paperSize', 'A3')}
              disabled={!isA3Offered}
              title={!isA3Offered ? t.notOffered : ''}
              style={{ fontSize: '0.78rem', padding: '6px 4px' }}
            >
              A3
            </button>
          </div>
        </div>
      </div>

      {/* Colour Mode and Sides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Color Mode */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
            {t.colorMode}
          </label>
          <div className="segment-container" style={{ minHeight: '38px' }}>
            <button
              type="button"
              className={`segment-btn ${doc.options.colorMode === 'BW' ? 'active' : ''}`}
              onClick={() => handleOptionChange('colorMode', 'BW')}
              style={{ fontSize: '0.76rem', padding: '6px 4px' }}
            >
              {t.bw}
            </button>
            <button
              type="button"
              className={`segment-btn ${doc.options.colorMode === 'COLOR' ? 'active' : ''}`}
              onClick={() => handleOptionChange('colorMode', 'COLOR')}
              disabled={!isColorOffered}
              title={!isColorOffered ? t.notOffered : ''}
              style={{ fontSize: '0.76rem', padding: '6px 4px' }}
            >
              {t.color}
            </button>
          </div>
        </div>

        {/* Sides (Single vs Duplex) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
            {t.sides}
          </label>
          <div className="segment-container" style={{ minHeight: '38px' }}>
            <button
              type="button"
              className={`segment-btn ${doc.options.sides === 'SINGLE' ? 'active' : ''}`}
              onClick={() => handleOptionChange('sides', 'SINGLE')}
              style={{ fontSize: '0.74rem', padding: '6px 2px' }}
            >
              {t.singleSided}
            </button>
            <button
              type="button"
              className={`segment-btn ${doc.options.sides === 'DOUBLE' ? 'active' : ''}`}
              onClick={() => handleOptionChange('sides', 'DOUBLE')}
              disabled={!isDuplexOffered}
              title={!isDuplexOffered ? t.notOffered : ''}
              style={{ fontSize: '0.74rem', padding: '6px 2px' }}
            >
              {t.doubleSided}
            </button>
          </div>
        </div>
      </div>

      {/* N-up and Page Range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* N-up (Pages per sheet) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            <Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            {t.pagesPerSheet}
          </label>
          <select
            value={doc.options.pagesPerSheet}
            onChange={(e) => handleOptionChange('pagesPerSheet', parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '0.88rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <option value="1">1 page</option>
            <option value="2">2 pages</option>
            <option value="4">4 pages</option>
            <option value="6">6 pages</option>
            <option value="9">9 pages</option>
          </select>
        </div>

        {/* Page Range Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            {t.pageRange}
          </label>
          <input
            type="text"
            placeholder={t.allPages}
            value={doc.options.pageRange || ''}
            onChange={(e) => handleOptionChange('pageRange', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '0.88rem',
              fontWeight: 500,
              boxShadow: 'var(--shadow-sm)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
