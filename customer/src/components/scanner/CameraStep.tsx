'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Check,
  Camera as CameraIcon,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { ScannedPage } from './types';
import { useCustomerStore } from '../../lib/store';
import { translations } from '../../lib/i18n';
import { motion } from 'framer-motion';

interface CameraStepProps {
  pages: ScannedPage[];
  editingIndex: number | null;
  onPhotoCaptured: (blob: Blob) => void;
  onOpenPages: () => void;
  onFinishScan: () => void;
  onClose: () => void;
}

export const CameraStep: React.FC<CameraStepProps> = ({
  pages,
  editingIndex,
  onPhotoCaptured,
  onOpenPages,
  onFinishScan,
  onClose,
}) => {
  const { language } = useCustomerStore();
  const t = translations[language];

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isShutterPressed, setIsShutterPressed] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStreamActive(false);
    setTorchOn(false);
  }, []);

  // Start portrait-preferred camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported or page is not loaded via HTTPS.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 2560, min: 1280 },
            height: { ideal: 1920, min: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      }

      streamRef.current = stream;

      // Check capabilities for continuous focus and torch
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities: any = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};

      if (capabilities.focusMode?.includes('continuous')) {
        try {
          await (videoTrack as any).applyConstraints({
            advanced: [{ focusMode: 'continuous' }],
          });
        } catch (e) {
          // focus mode apply failed silently
        }
      }

      setHasTorch(Boolean(capabilities.torch));

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        await video.play().catch(console.warn);
      }

      setStreamActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      let msg = 'Could not access phone camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Allow camera in your browser settings or choose a photo.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device.';
      }
      setCameraError(msg);
      setStreamActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const next = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Tap-to-focus on viewfinder stage
  const handleStageTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setFocusRing({ x, y });
    setTimeout(() => setFocusRing(null), 1200);

    // Apply focus point constraint if supported
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.pointsOfInterest) {
        const normX = Math.max(0, Math.min(1, x / rect.width));
        const normY = Math.max(0, Math.min(1, y / rect.height));
        try {
          (track as any).applyConstraints({
            advanced: [{ pointsOfInterest: [{ x: normX, y: normY }] }],
          });
        } catch (err) {
          // ignore
        }
      }
    }
  };

  // High quality photo capture
  const handleShutterPress = async () => {
    if (isShutterPressed) return;
    setIsShutterPressed(true);

    // 150ms steady moment to let focus stabilize
    await new Promise((res) => setTimeout(res, 150));

    try {
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      let capturedBlob: Blob | null = null;

      // 1. Try ImageCapture.takePhoto() if supported
      if (typeof window !== 'undefined' && 'ImageCapture' in window && videoTrack) {
        try {
          const imageCapture = new (window as any).ImageCapture(videoTrack);
          capturedBlob = await imageCapture.takePhoto({
            imageWidth: 3000,
            fillLightMode: torchOn ? 'flash' : 'off',
          });
        } catch (e) {
          capturedBlob = null;
        }
      }

      // 2. Fallback: Full resolution frame grab from video
      if (!capturedBlob && videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          capturedBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/jpeg', 0.95)
          );
        }
      }

      if (capturedBlob) {
        // Shutter feedback: 120ms white flash + haptic
        setShowFlash(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(20);
          } catch (e) {
            // ignore
          }
        }
        setTimeout(() => setShowFlash(false), 120);

        onPhotoCaptured(capturedBlob);
      }
    } catch (err) {
      console.error('Error during photo capture:', err);
    } finally {
      setIsShutterPressed(false);
    }
  };

  // Fallback file input handlers
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCaptured(file);
    }
  };

  const pageNum = editingIndex !== null ? editingIndex + 1 : pages.length + 1;
  const lastPageThumb = pages.length > 0 ? pages[pages.length - 1].thumbUrl : null;

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
      {/* Hidden File Inputs for Hardware Fallback */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFilePicked}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFilePicked}
        style={{ display: 'none' }}
      />

      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(11, 16, 32, 0.85) 0%, transparent 100%)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Scanner"
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

        <div
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.25)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#c7d2fe',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {editingIndex !== null ? `Retake Page ${pageNum}` : `Page ${pageNum}`}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label="Toggle Torch"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: torchOn ? '#4f46e5' : 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Main Viewfinder Stage (3:4 ratio container with object-fit: contain) */}
      <div
        onClick={handleStageTap}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            maxHeight: '100%',
          }}
        />

        {/* 4 L-shaped Corner Guide Brackets (No dashed rectangle) */}
        <div
          style={{
            position: 'absolute',
            width: 'min(86vw, 360px)',
            height: 'min(115vw, 480px)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top row corners */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderTop: '3.5px solid #6366f1',
                borderLeft: '3.5px solid #6366f1',
                borderTopLeftRadius: '14px',
                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
              }}
            />
            <span
              style={{
                width: '32px',
                height: '32px',
                borderTop: '3.5px solid #6366f1',
                borderRight: '3.5px solid #6366f1',
                borderTopRightRadius: '14px',
                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
              }}
            />
          </div>

          {/* Faint Rule of Thirds Grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.15,
              backgroundImage: `
                linear-gradient(to right, transparent 33.3%, rgba(255,255,255,0.7) 33.3%, rgba(255,255,255,0.7) 33.8%, transparent 33.8%, transparent 66.6%, rgba(255,255,255,0.7) 66.6%, rgba(255,255,255,0.7) 67.1%, transparent 67.1%),
                linear-gradient(to bottom, transparent 33.3%, rgba(255,255,255,0.7) 33.3%, rgba(255,255,255,0.7) 33.8%, transparent 33.8%, transparent 66.6%, rgba(255,255,255,0.7) 66.6%, rgba(255,255,255,0.7) 67.1%, transparent 67.1%)
              `,
            }}
          />

          {/* Bottom row corners */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderBottom: '3.5px solid #6366f1',
                borderLeft: '3.5px solid #6366f1',
                borderBottomLeftRadius: '14px',
                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
              }}
            />
            <span
              style={{
                width: '32px',
                height: '32px',
                borderBottom: '3.5px solid #6366f1',
                borderRight: '3.5px solid #6366f1',
                borderBottomRightRadius: '14px',
                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
              }}
            />
          </div>
        </div>

        {/* Tap-to-Focus Ring Animation */}
        {focusRing && (
          <div
            style={{
              position: 'absolute',
              left: focusRing.x - 28,
              top: focusRing.y - 28,
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid #818cf8',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.6)',
              pointerEvents: 'none',
              animation: 'bounceBadge 0.4s ease-out',
            }}
          />
        )}

        {/* Hold Steady Shutter Indicator */}
        {isShutterPressed && (
          <div
            style={{
              position: 'absolute',
              padding: '10px 20px',
              borderRadius: '24px',
              background: 'rgba(11, 16, 32, 0.85)',
              border: '1px solid #818cf8',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="pulse-online" />
            <span>{t.holdSteady}</span>
          </div>
        )}

        {/* White Flash on Capture */}
        {showFlash && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#ffffff',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Permission Denied / Error Fallback Screen */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#0b1020',
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: 20,
            }}
          >
            <ShieldAlert size={48} color="#fb7185" style={{ marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px', color: '#f8fafc' }}>
              Camera Unavailable
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '300px', lineHeight: 1.45, marginBottom: '22px' }}>
              {cameraError}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="btn-primary"
                style={{ width: '100%', minHeight: '48px', borderRadius: '14px', fontSize: '0.9rem' }}
              >
                <CameraIcon size={18} />
                <span>Take Photo with Phone Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{ width: '100%', minHeight: '48px', borderRadius: '14px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <ImageIcon size={18} />
                <span>Choose from Gallery</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                <span>Try Camera Again</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px)) 20px',
          background: 'linear-gradient(0deg, rgba(11, 16, 32, 0.95) 0%, rgba(11, 16, 32, 0.4) 100%)',
          zIndex: 10,
        }}
      >
        {/* Left: Thumbnail of last page with page count badge (flying spring into tray) */}
        <div style={{ minWidth: '56px' }}>
          {pages.length > 0 && lastPageThumb ? (
            <motion.button
              key={lastPageThumb}
              initial={{ scale: 2.2, y: -60, x: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              type="button"
              onClick={onOpenPages}
              aria-label="View scanned pages"
              style={{
                position: 'relative',
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #6366f1',
                padding: 0,
                cursor: 'pointer',
                background: '#1e1b4b',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lastPageThumb}
                alt="Last page thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                }}
              >
                {pages.length}
              </span>
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Import photo from gallery"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ImageIcon size={20} />
            </button>
          )}
        </div>

        {/* Center: 72px Shutter Button with press scale & ring */}
        <button
          type="button"
          onClick={handleShutterPress}
          disabled={isShutterPressed}
          aria-label="Take Photo"
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: 'transparent',
            border: '4px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transform: isShutterPressed ? 'scale(0.92)' : 'scale(1)',
            transition: 'transform 0.12s ease',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            }}
          />
        </button>

        {/* Right: Done Pill showing page count, or Gallery Import */}
        <div style={{ minWidth: '56px', display: 'flex', justifyContent: 'flex-end' }}>
          {pages.length > 0 ? (
            <button
              type="button"
              onClick={onFinishScan}
              style={{
                padding: '10px 16px',
                minHeight: '44px',
                borderRadius: '22px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              }}
            >
              <span>Done ({pages.length})</span>
              <Check size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              aria-label="Open phone native camera"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <CameraIcon size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
