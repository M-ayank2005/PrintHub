'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Header } from '../../../../components/Header';
import { DocumentCard } from '../../../../components/DocumentCard';
import { PricingFooter } from '../../../../components/PricingFooter';
import { useCustomerStore } from '../../../../lib/store';
import { translations } from '../../../../lib/i18n';
import { presignUpload, uploadBinary, confirmUpload, getQuote } from '../../../../lib/api';
import { optimizeImage, imagesToPdf } from '../../../../lib/pdf-processor';
import { UploadCloud, Camera, Image as ImageIcon, Loader2, FilePlus2 } from 'lucide-react';
import { StepIndicator, IconTile, useToast } from '../../../../ui';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load heavy document scanner component
const ScannerModal = dynamic(
  () => import('../../../../components/ScannerModal').then((mod) => mod.ScannerModal),
  { ssr: false }
);

export default function CartPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { language, shop, sessionToken, docs, addDoc, totals, setTotals, isQuoting, setQuoting } = useCustomerStore();
  const t = translations[language];
  const { showToast } = useToast();

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [uploadingState, setUploadingState] = useState<string | null>(null);

  // Debounced quote calculation on docs / options changes
  useEffect(() => {
    if (!sessionToken || docs.length === 0) {
      setTotals(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setQuoting(true);
        const quotePayload = docs.map((doc) => ({
          docId: doc.docId,
          kind: doc.kind,
          totalPages: doc.pages,
          options: doc.options,
        }));
        const res = await getQuote(sessionToken, quotePayload);
        setTotals(res.totals);
      } catch (err) {
        console.error('Failed to get quote', err);
      } finally {
        setQuoting(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [docs, sessionToken, setQuoting, setTotals]);

  // Handle PDF file upload
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    try {
      setUploadingState(`Uploading ${file.name}...`);
      const presign = await presignUpload(sessionToken, 'PDF', 'application/pdf', file.size);
      await uploadBinary(presign.uploadUrl, file, 'application/pdf', undefined, presign.headers);
      const confirmed = await confirmUpload(sessionToken, presign.storageKey, 'PDF');

      addDoc({
        docId: presign.docId,
        name: file.name,
        kind: 'PDF',
        storageKey: presign.storageKey,
        sizeBytes: confirmed.sizeBytes,
        pages: confirmed.pages,
        options: {
          copies: 1,
          colorMode: 'BW',
          sides: 'SINGLE',
          paperSize: 'A4',
          pagesPerSheet: 1,
          orientation: 'AUTO',
          fitMode: 'FIT',
        },
      });
      showToast(`${file.name} added to cart`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error uploading PDF', 'error');
    } finally {
      setUploadingState(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // Handle Photos upload (compiles to A4 PDF)
  const handlePhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !sessionToken) return;

    try {
      setUploadingState('Optimizing photos and compiling A4 PDF...');
      const imageBuffers: Array<{ data: Uint8Array }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const optimized = await optimizeImage(file, true);
        imageBuffers.push({ data: optimized });
      }

      const pdfBytes = await imagesToPdf(imageBuffers);
      const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

      setUploadingState('Uploading photo PDF...');
      const presign = await presignUpload(sessionToken, 'IMAGE', 'application/pdf', pdfBlob.size);
      await uploadBinary(presign.uploadUrl, pdfBlob, 'application/pdf', undefined, presign.headers);
      const confirmed = await confirmUpload(sessionToken, presign.storageKey, 'PDF');

      addDoc({
        docId: presign.docId,
        name: files.length === 1 ? files[0].name : `Photos (${files.length} images)`,
        kind: 'IMAGE',
        storageKey: presign.storageKey,
        sizeBytes: confirmed.sizeBytes,
        pages: confirmed.pages,
        options: {
          copies: 1,
          colorMode: 'COLOR',
          sides: 'SINGLE',
          paperSize: 'A4',
          pagesPerSheet: 1,
          orientation: 'AUTO',
          fitMode: 'FIT',
        },
      });
      showToast('Photos compiled into PDF and added to cart', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error processing photos', 'error');
    } finally {
      setUploadingState(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Handle completed Camera Scan
  const handleScanComplete = async (pdfBlob: Blob, pageCount: number) => {
    if (!sessionToken) return;
    try {
      setUploadingState('Uploading scanned document...');
      const presign = await presignUpload(sessionToken, 'SCAN', 'application/pdf', pdfBlob.size);
      await uploadBinary(presign.uploadUrl, pdfBlob, 'application/pdf', undefined, presign.headers);
      const confirmed = await confirmUpload(sessionToken, presign.storageKey, 'PDF');

      addDoc({
        docId: presign.docId,
        name: `Scanned Document (${pageCount} ${pageCount === 1 ? 'page' : 'pages'})`,
        kind: 'SCAN',
        storageKey: presign.storageKey,
        sizeBytes: confirmed.sizeBytes,
        pages: confirmed.pages,
        options: {
          copies: 1,
          colorMode: 'BW',
          sides: 'SINGLE',
          paperSize: 'A4',
          pagesPerSheet: 1,
          orientation: 'AUTO',
          fitMode: 'FIT',
        },
      });
      showToast(`Scanned document (${pageCount} pages) added to cart`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error uploading scan', 'error');
    } finally {
      setUploadingState(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <Header shopName={shop?.shopName} isAvailable={shop?.isAvailable} />

      {/* Step Indicator across Checkout Flow */}
      <StepIndicator currentStep={1} />

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={pdfInputRef}
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handlePdfSelected}
      />
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handlePhotosSelected}
      />

      {/* 3 Upload Action Tiles with Consistent Icons and Press Feedback */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <IconTile
          icon={<UploadCloud size={20} strokeWidth={2.4} />}
          label={t.uploadPdf}
          onClick={() => pdfInputRef.current?.click()}
          accentColor="#4f46e5"
          bgColor="#eef2ff"
          borderColor="rgba(99, 102, 241, 0.25)"
        />

        <IconTile
          icon={<ImageIcon size={20} strokeWidth={2.4} />}
          label={t.uploadPhotos}
          onClick={() => photoInputRef.current?.click()}
          accentColor="#0284c7"
          bgColor="#e0f2fe"
          borderColor="rgba(2, 132, 199, 0.25)"
        />

        <IconTile
          icon={<Camera size={20} strokeWidth={2.4} />}
          label={t.scanCamera}
          onClick={() => setIsScannerOpen(true)}
          accentColor="#059669"
          bgColor="#ecfdf5"
          borderColor="rgba(16, 185, 129, 0.25)"
        />
      </div>

      {/* Uploading Status Banner */}
      {uploadingState && (
        <div
          className="glass-panel"
          style={{
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderColor: '#818cf8',
            background: '#eef2ff',
          }}
        >
          <Loader2 size={18} className="animate-spin" color="#4f46e5" />
          <span style={{ fontSize: '0.86rem', color: '#312e81', fontWeight: 600 }}>{uploadingState}</span>
        </div>
      )}

      {/* Cart Document List or Friendly Empty State */}
      {docs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--text-dim)',
            }}
          >
            <FilePlus2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
            {t.cartEmptyTitle}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', maxWidth: '300px', margin: '0 auto' }}>
            {t.cartEmptyDesc}
          </p>
        </div>
      ) : (
        <motion.div layout>
          <AnimatePresence mode="popLayout">
            {docs.map((doc) => (
              <motion.div
                key={doc.docId}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <DocumentCard doc={doc} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Lazy Loaded Scanner Modal */}
      {isScannerOpen && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onComplete={handleScanComplete}
        />
      )}

      {/* Sticky Bottom Pricing Bar */}
      <PricingFooter slug={slug} />
    </div>
  );
}
