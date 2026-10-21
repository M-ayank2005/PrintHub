'use client';

import React from 'react';
import { CartDocItem, useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';
import {
  FileText,
  Image as ImageIcon,
  Camera,
  Trash2,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { DocumentOptions } from '@printhub/shared';
import { Segmented, Stepper } from '../ui';

interface DocumentCardProps {
  doc: CartDocItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => {
  const { language, shop, updateDocOptions, removeDoc } = useCustomerStore();
  const t = translations[language];

  const pricing = shop?.pricing || {};
  const isColorOffered = Boolean(pricing.A4_COLOR_SINGLE?.enabled || pricing.A4_COLOR_DOUBLE?.enabled);
  const isDuplexOffered = Boolean(pricing.A4_BW_DOUBLE?.enabled || pricing.A4_COLOR_DOUBLE?.enabled);
  const isA3Offered = Boolean(pricing.A3_BW_SINGLE?.enabled || pricing.A3_COLOR_SINGLE?.enabled);

  const handleOptionChange = (key: keyof DocumentOptions, value: any) => {
    updateDocOptions(doc.docId, { [key]: value });
  };

  const IconComponent =
    doc.kind === 'PDF' ? FileText : doc.kind === 'SCAN' ? Camera : ImageIcon;

  const isMultiPage = doc.pages > 1;
  const isUploaded = doc.uploadProgress === undefined || doc.uploadProgress === 100;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px 14px',
        marginBottom: '14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        position: 'relative',
        background: 'var(--bg-card)',
      }}
    >
      {/* Top row: Icon/Thumbnail with Stack Effect, Name, Details, Delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          {/* Document Preview Icon with stacked paper effect for multi-page */}
          <div
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              flexShrink: 0,
            }}
          >
            {/* Multi-page paper stack layers */}
            {isMultiPage && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: '-2px -2px 2px 2px',
                    borderRadius: '12px',
                    background: '#cbd5e1',
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: '-4px -4px 4px 4px',
                    borderRadius: '12px',
                    background: '#e2e8f0',
                    zIndex: 0,
                  }}
                />
              </>
            )}

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                background:
                  doc.kind === 'PDF'
                    ? 'rgba(79, 70, 229, 0.12)'
                    : doc.kind === 'SCAN'
                    ? 'rgba(5, 150, 105, 0.12)'
                    : 'rgba(2, 132, 199, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:
                  doc.kind === 'PDF'
                    ? 'var(--accent-primary)'
                    : doc.kind === 'SCAN'
                    ? 'var(--accent-emerald)'
                    : 'var(--accent-cyan)',
              }}
            >
              <IconComponent size={22} />

              {/* Upload Progress ring / Green checkmark */}
              {doc.uploadProgress !== undefined && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: '#ffffff',
                    borderRadius: '50%',
                    padding: '2px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {isUploaded ? (
                    <CheckCircle2 size={15} color="#059669" />
                  ) : (
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4f46e5' }}>
                      {doc.uploadProgress}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h4
              style={{
                fontSize: '0.94rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--text-main)',
                margin: 0,
              }}
            >
              {doc.name}
            </h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
              {doc.pages} {doc.pages === 1 ? 'page' : 'pages'} • {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeDoc(doc.docId)}
          aria-label={t.remove}
          className="stepper-btn"
          style={{
            color: '#e11d48',
            borderColor: '#fecdd3',
            background: '#fff1f2',
            width: '40px',
            height: '40px',
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Options Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Copies Stepper */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}>
            {t.copies}
          </label>
          <Stepper
            value={doc.options.copies}
            min={1}
            max={99}
            onChange={(copies) => handleOptionChange('copies', copies)}
          />
        </div>

        {/* Paper Size */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t.paperSize}
            </label>
            {!isA3Offered && (
              <span style={{ fontSize: '0.66rem', color: '#e11d48', fontWeight: 600 }}>
                {t.notOffered}
              </span>
            )}
          </div>
          <Segmented
            value={doc.options.paperSize}
            onChange={(val) => handleOptionChange('paperSize', val)}
            size="sm"
            options={[
              { value: 'A4', label: 'A4' },
              {
                value: 'A3',
                label: 'A3',
                disabled: !isA3Offered,
                disabledReason: t.notOffered,
              },
            ]}
          />
        </div>
      </div>

      {/* Colour Mode and Sides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Color Mode */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t.colorMode}
            </label>
            {!isColorOffered && (
              <span style={{ fontSize: '0.66rem', color: '#e11d48', fontWeight: 600 }}>
                {t.notOffered}
              </span>
            )}
          </div>
          <Segmented
            value={doc.options.colorMode}
            onChange={(val) => handleOptionChange('colorMode', val)}
            size="sm"
            options={[
              { value: 'BW', label: t.bw },
              {
                value: 'COLOR',
                label: t.color,
                disabled: !isColorOffered,
                disabledReason: t.notOffered,
              },
            ]}
          />
        </div>

        {/* Sides (Single vs Duplex) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t.sides}
            </label>
            {!isDuplexOffered && (
              <span style={{ fontSize: '0.66rem', color: '#e11d48', fontWeight: 600 }}>
                {t.notOffered}
              </span>
            )}
          </div>
          <Segmented
            value={doc.options.sides}
            onChange={(val) => handleOptionChange('sides', val)}
            size="sm"
            options={[
              { value: 'SINGLE', label: t.singleSided },
              {
                value: 'DOUBLE',
                label: t.doubleSided,
                disabled: !isDuplexOffered,
                disabledReason: t.notOffered,
              },
            ]}
          />
        </div>
      </div>

      {/* N-up (Pages per sheet) Segmented Control & Page Range */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '5px' }}>
            <Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            {t.pagesPerSheet}
          </label>
          <Segmented
            value={doc.options.pagesPerSheet}
            onChange={(val) => handleOptionChange('pagesPerSheet', val)}
            size="sm"
            options={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 4, label: '4' },
              { value: 6, label: '6' },
              { value: 9, label: '9' },
            ]}
          />
        </div>

        {/* Page Range Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
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
              color: 'var(--text-main)',
              fontSize: '16px', // Prevents iOS auto-zoom
              fontWeight: 500,
              boxShadow: 'var(--shadow-sm)',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
