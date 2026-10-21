'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Plus, Trash2, Sliders } from 'lucide-react';
import { optimizeImage, imagesToPdf } from '../lib/pdf-processor';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (pdfBlob: Blob, pageCount: number) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scannedPages, setScannedPages] = useState<Uint8Array[]>([]);
  const [filterMode, setFilterMode] = useState<'ORIGINAL' | 'ENHANCED' | 'GRAYSCALE' | 'BW'>('BW');
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedPages([]);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');

        if (video.readyState < 2) {
          await new Promise<void>((res) => {
            video.onloadeddata = () => res();
            setTimeout(res, 500);
          });
        }
        await video.play().catch((err) => console.warn('Scanner camera play err:', err));
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply Filter Mode
    if (filterMode === 'GRAYSCALE' || filterMode === 'BW') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        let v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (filterMode === 'BW') {
          v = v > 128 ? 255 : 0; // Adaptive threshold approximation
        }
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
    );

    if (blob) {
      const optimized = await optimizeImage(blob, filterMode !== 'BW' && filterMode !== 'GRAYSCALE');
      setScannedPages((prev) => [...prev, optimized]);
    }
  };

  const handleFinishScan = async () => {
    if (scannedPages.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await imagesToPdf(scannedPages.map((data) => ({ data })));
      const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      onComplete(pdfBlob, scannedPages.length);
      onClose();
    } catch (err) {
      console.error('Failed to compile scanned PDF', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const removePage = (index: number) => {
    setScannedPages((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="#818cf8" />
          Document Scanner
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Filter Selection Segment */}
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.2)', gap: '4px', marginBottom: '12px' }}>
        {(['BW', 'GRAYSCALE', 'ORIGINAL'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: filterMode === mode ? '#ffffff' : 'transparent',
              color: filterMode === mode ? '#4f46e5' : '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {mode === 'BW' ? 'B&W (High Contrast)' : mode === 'GRAYSCALE' ? 'Grayscale' : 'Color'}
          </button>
        ))}
      </div>

      {/* Live Viewfinder */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Viewfinder Overlay Guides */}
        <div
          style={{
            position: 'absolute',
            inset: '24px',
            border: '2px dashed rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        />

        {/* Capture Shutter Button */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <button
            onClick={capturePage}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '4px solid rgba(99, 102, 241, 0.8)',
              boxShadow: '0 0 25px rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #000' }} />
          </button>
        </div>
      </div>

      {/* Scanned Pages Tray & Done Button */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {scannedPages.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '44px',
                height: '56px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>p.{idx + 1}</span>
              <button
                onClick={() => removePage(idx)}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#f43f5e',
                  borderRadius: '50%',
                  border: 'none',
                  color: '#fff',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
          {scannedPages.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No pages captured yet</span>
          )}
        </div>

        <button
          onClick={handleFinishScan}
          disabled={scannedPages.length === 0 || isProcessing}
          className="btn-primary"
          style={{ padding: '12px 18px', fontSize: '0.9rem' }}
        >
          {isProcessing ? 'Compiling PDF...' : `Done (${scannedPages.length} ${scannedPages.length === 1 ? 'page' : 'pages'})`}
        </button>
      </div>
    </div>
  );
};
