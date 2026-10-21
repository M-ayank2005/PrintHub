'use client';

import React, { useEffect } from 'react';
import { Portal } from '../ui/Portal';
import { useScanner } from './scanner/useScanner';
import { CameraStep } from './scanner/CameraStep';
import { CropStep } from './scanner/CropStep';
import { PagesStep } from './scanner/PagesStep';
import { AlertTriangle } from 'lucide-react';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (pdfBlob: Blob, pageCount: number) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { language } = useCustomerStore();
  const t = translations[language];

  const {
    pages,
    activeStep,
    setActiveStep,
    currentBlob,
    editingIndex,
    crop,
    rotation,
    filter,
    isExporting,
    exportProgress,
    isDiscardSheetOpen,
    setIsDiscardSheetOpen,
    handlePhotoCaptured,
    saveCroppedPage,
    openEditPage,
    deletePage,
    retakePage,
    reorderPages,
    finishAndExport,
    handleRequestClose,
    confirmDiscard,
  } = useScanner(onComplete, onClose);

  // Lock body scroll and handle Android back button & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Push history state so Android back button closes or triggers discard confirmation
    window.history.pushState({ scannerModalOpen: true }, '');

    const handlePopState = () => {
      handleRequestClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document Scanner"
        style={{
          position: 'fixed',
          inset: 0,
          height: '100dvh',
          zIndex: 1000,
          background: '#0b1020',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Step 1: Camera */}
        {activeStep === 'camera' && (
          <CameraStep
            pages={pages}
            editingIndex={editingIndex}
            onPhotoCaptured={handlePhotoCaptured}
            onOpenPages={() => setActiveStep('pages')}
            onFinishScan={finishAndExport}
            onClose={handleRequestClose}
          />
        )}

        {/* Step 2: Crop */}
        {activeStep === 'crop' && currentBlob && (
          <CropStep
            blob={currentBlob}
            initialCrop={crop}
            initialRotation={rotation}
            initialFilter={filter}
            onSave={saveCroppedPage}
            onRetake={() => setActiveStep('camera')}
            onCancel={() => {
              if (editingIndex !== null) {
                setActiveStep('pages');
              } else {
                setActiveStep('camera');
              }
            }}
          />
        )}

        {/* Step 3: Pages Review */}
        {activeStep === 'pages' && (
          <PagesStep
            pages={pages}
            isExporting={isExporting}
            exportProgress={exportProgress}
            onEditPage={openEditPage}
            onDeletePage={deletePage}
            onRetakePage={retakePage}
            onReorderPages={reorderPages}
            onAddPage={() => setActiveStep('camera')}
            onFinish={finishAndExport}
            onClose={handleRequestClose}
          />
        )}

        {/* Discard Confirmation Bottom Sheet (Not confirm()) */}
        {isDiscardSheetOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#151c33',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
                borderTop: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    {t.discardScanTitle}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    {t.discardScanDesc}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsDiscardSheetOpen(false)}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    minHeight: '48px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  {t.keepScanning}
                </button>

                <button
                  type="button"
                  onClick={confirmDiscard}
                  style={{
                    flex: 1,
                    minHeight: '48px',
                    borderRadius: '14px',
                    background: '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.discard}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Portal>
  );
};
