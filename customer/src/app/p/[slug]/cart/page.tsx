'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../../components/Header';
import { DocumentCard } from '../../../../components/DocumentCard';
import { ScannerModal } from '../../../../components/ScannerModal';
import { PricingFooter } from '../../../../components/PricingFooter';
import { useCustomerStore } from '../../../../lib/store';
import { translations } from '../../../../lib/i18n';
import { presignUpload, uploadBinary, confirmUpload, getQuote } from '../../../../lib/api';
import { optimizeImage, imagesToPdf } from '../../../../lib/pdf-processor';
import { UploadCloud, Camera, Image as ImageIcon, Loader2, FilePlus2 } from 'lucide-react';

export default function CartPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { language, shop, sessionToken, docs, addDoc, totals, setTotals, isQuoting, setQuoting } = useCustomerStore();
  const t = translations[language];

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
  }, [docs, sessionToken]);

  // Handle PDF file upload
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    try {
      setUploadingState(`Uploading ${file.name}...`);
      const presign = await presignUpload(sessionToken, 'PDF', 'application/pdf', file.size);
      await uploadBinary(presign.uploadUrl, file, 'application/pdf');
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
    } catch (err: any) {
      alert(err.message || 'Error uploading PDF');
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
      await uploadBinary(presign.uploadUrl, pdfBlob, 'application/pdf');
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
    } catch (err: any) {
      alert(err.message || 'Error processing photos');
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
      await uploadBinary(presign.uploadUrl, pdfBlob, 'application/pdf');
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
    } catch (err: any) {
      alert(err.message || 'Error uploading scan');
    } finally {
      setUploadingState(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <Header shopName={shop?.shopName} isAvailable={shop?.isAvailable} />

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

      {/* Add Document Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => pdfInputRef.current?.click()}
          className="btn-secondary"
          style={{ flexDirection: 'column', gap: '6px', padding: '14px 8px', textAlign: 'center' }}
        >
          <UploadCloud size={22} color="#818cf8" />
          <span style={{ fontSize: '0.78rem' }}>{t.uploadPdf}</span>
        </button>

        <button
          onClick={() => photoInputRef.current?.click()}
          className="btn-secondary"
          style={{ flexDirection: 'column', gap: '6px', padding: '14px 8px', textAlign: 'center' }}
        >
          <ImageIcon size={22} color="#06b6d4" />
          <span style={{ fontSize: '0.78rem' }}>{t.uploadPhotos}</span>
        </button>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="btn-secondary"
          style={{ flexDirection: 'column', gap: '6px', padding: '14px 8px', textAlign: 'center' }}
        >
          <Camera size={22} color="#10b981" />
          <span style={{ fontSize: '0.78rem' }}>{t.scanCamera}</span>
        </button>
      </div>

      {/* Uploading Spinner Indicator */}
      {uploadingState && (
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderColor: 'rgba(99, 102, 241, 0.4)',
          }}
        >
          <Loader2 size={20} className="animate-spin" color="#818cf8" />
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{uploadingState}</span>
        </div>
      )}

      {/* Cart Document List */}
      {docs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <FilePlus2 size={44} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{t.cartEmptyTitle}</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '280px', margin: '0 auto' }}>
            {t.cartEmptyDesc}
          </p>
        </div>
      ) : (
        <div>
          {docs.map((doc) => (
            <DocumentCard key={doc.docId} doc={doc} />
          ))}
        </div>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onComplete={handleScanComplete}
      />

      {/* Sticky Bottom Pricing Bar */}
      <PricingFooter slug={slug} />
    </div>
  );
}
