'use client';

import React from 'react';
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Edit2,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { ScannedPage } from './types';
import { useCustomerStore } from '../../lib/store';
import { translations } from '../../lib/i18n';

interface PagesStepProps {
  pages: ScannedPage[];
  isExporting: boolean;
  exportProgress: { current: number; total: number } | null;
  onEditPage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRetakePage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onAddPage: () => void;
  onFinish: () => void;
  onClose: () => void;
}

export const PagesStep: React.FC<PagesStepProps> = ({
  pages,
  isExporting,
  exportProgress,
  onEditPage,
  onDeletePage,
  onRetakePage,
  onReorderPages,
  onAddPage,
  onFinish,
  onClose,
}) => {
  const { language } = useCustomerStore();
  const t = translations[language];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0b1020',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(11, 16, 32, 0.95)',
          zIndex: 10,
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            {t.pagesReview}
          </h3>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} ready to compile
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Pages 2-Column Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          alignContent: 'start',
        }}
      >
        {pages.map((page, index) => (
          <div
            key={page.id}
            style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#151c33',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Page Thumbnail clickable for re-editing */}
            <div
              onClick={() => onEditPage(index)}
              style={{
                position: 'relative',
                width: '100%',
                paddingTop: '133%', // 3:4 aspect ratio
                cursor: 'pointer',
                background: '#090d16',
                overflow: 'hidden',
              }}
            >
              {page.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.thumbUrl}
                  alt={`Page ${index + 1}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              )}

              {/* Page Number Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                #{index + 1}
              </div>

              {/* Edit overlay icon hint */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(99, 102, 241, 0.9)',
                  color: '#ffffff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Edit2 size={13} />
              </div>
            </div>

            {/* Per-Page Quick Actions Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: '#10162a',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Reorder Buttons */}
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => onReorderPages(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Move page up"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: index === 0 ? '#475569' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: index === 0 ? 'default' : 'pointer',
                  }}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onReorderPages(index, index + 1)}
                  disabled={index === pages.length - 1}
                  aria-label="Move page down"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: index === pages.length - 1 ? '#475569' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: index === pages.length - 1 ? 'default' : 'pointer',
                  }}
                >
                  <ArrowDown size={15} />
                </button>
              </div>

              {/* Retake and Delete Buttons */}
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => onRetakePage(index)}
                  aria-label="Retake page"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePage(index)}
                  aria-label="Delete page"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fb7185',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Actions Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px calc(14px + env(safe-area-inset-bottom, 0px)) 18px',
          background: 'rgba(11, 16, 32, 0.98)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onAddPage}
          disabled={isExporting}
          className="btn-secondary"
          style={{
            flex: 1,
            minHeight: '48px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 700,
          }}
        >
          <Plus size={18} />
          <span>{t.addPage}</span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={isExporting || pages.length === 0}
          className="btn-primary"
          style={{
            flex: 1.5,
            minHeight: '48px',
            borderRadius: '14px',
            fontSize: '0.92rem',
            fontWeight: 800,
            gap: '8px',
          }}
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>
                {t.preparingPdf}{' '}
                {exportProgress ? `(${exportProgress.current}/${exportProgress.total})` : ''}
              </span>
            </>
          ) : (
            <>
              <FileCheck size={18} />
              <span>{t.useNPages.replace('{n}', pages.length.toString())}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
