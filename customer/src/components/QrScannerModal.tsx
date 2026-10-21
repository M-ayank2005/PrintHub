'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useCustomerStore } from '../lib/store';
import { translations } from '../lib/i18n';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Extracts the shop slug from scanned QR text.
 * Handles:
 * - Full URLs: https://.../p/shop-slug
 * - Relative paths: /p/shop-slug
 * - Plain slugs: shop-slug
 */
export function extractShopSlug(rawText: string): string | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // 1. URL matching /p/<slug>
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Ignore URL parse error
  }

  // 2. Regex pattern /p/<slug>
  const pathMatch = trimmed.match(/(?:^|\/)p\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // 3. Fallback: Standalone slug
  const slugRegex = /^[a-zA-Z0-9_-]{2,60}$/;
  if (slugRegex.test(trimmed)) {
    return trimmed;
  }

  return null;
}

type CameraStatus = 'idle' | 'starting' | 'live' | 'permission_denied' | 'no_camera' | 'insecure' | 'error';

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { language } = useCustomerStore();
  const t = translations[language];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasHandledSuccessRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [detectedSlug, setDetectedSlug] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const scanLoopActiveRef = useRef(false);
  const isScanningFrameRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Play subtle audio chime on scan success
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // AudioContext may be restricted by user agent policy
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    scanLoopActiveRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoPlaying(false);
    setTorchOn(false);
  }, []);

  // Handle successful QR detection
  const handleSuccess = useCallback(
    (slug: string) => {
      if (hasHandledSuccessRef.current) return;
      hasHandledSuccessRef.current = true;
      scanLoopActiveRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      setDetectedSlug(slug);
      setScanSuccess(true);
      stopCamera();

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 80]);
        } catch (e) {
          // ignore
        }
      }
      playSuccessChime();

      // Show green check animation briefly then navigate
      setTimeout(() => {
        router.push(`/p/${slug}`);
        onClose();
      }, 650);
    },
    [playSuccessChime, stopCamera, router, onClose]
  );

  // Start camera on modal open
  const startCamera = useCallback(
    async (facing?: 'environment' | 'user') => {
      stopCamera();
      const targetFacing = facing === 'user' || facing === 'environment' ? facing : facingMode;

      if (!navigator?.mediaDevices?.getUserMedia) {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          setCameraStatus('insecure');
        } else {
          setCameraStatus('no_camera');
        }
        return;
      }

      setCameraStatus('starting');
      setIsVideoPlaying(false);
      setManualError(null);

      try {
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (e) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = mediaStream;
        setCameraStatus('live');

        // Check torch capability
        const videoTrack = mediaStream.getVideoTracks()[0];
        const capabilities: any = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.muted = true;
          videoRef.current.defaultMuted = true;
          videoRef.current.playsInline = true;
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('Video play error:', err);
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus('permission_denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraStatus('no_camera');
        } else {
          setCameraStatus('error');
        }
      }
    },
    [stopCamera, facingMode]
  );

  // QR Detection loop - throttled to ~10 checks/s with downscaling to ~640px
  useEffect(() => {
    if (cameraStatus !== 'live' || !isVideoPlaying) return;

    scanLoopActiveRef.current = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Check BarcodeDetector support
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const scanFrame = async (timestamp: number) => {
      if (!scanLoopActiveRef.current) return;

      // Throttle to 10 FPS (~100ms)
      if (timestamp - lastCheckTimeRef.current >= 100 && !isScanningFrameRef.current) {
        lastCheckTimeRef.current = timestamp;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          isScanningFrameRef.current = true;
          try {
            // Downscale to ~640px max width for high detection speed & low battery consumption
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const scale = Math.min(1, 640 / vw);
            const targetW = Math.max(320, Math.round(vw * scale));
            const targetH = Math.max(240, Math.round(vh * scale));

            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            // 1. Try BarcodeDetector
            let foundSlug: string | null = null;
            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes && barcodes.length > 0) {
                  foundSlug = extractShopSlug(barcodes[0].rawValue);
                }
              } catch (e) {
                // fallback to jsQR below
              }
            }

            // 2. jsQR Fallback
            if (!foundSlug) {
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imgData = ctx.getImageData(0, 0, targetW, targetH);
              const qr = jsQR(imgData.data, targetW, targetH, {
                inversionAttempts: 'dontInvert',
              });
              if (qr && qr.data) {
                foundSlug = extractShopSlug(qr.data);
              }
            }

            if (foundSlug) {
              scanLoopActiveRef.current = false;
              handleSuccess(foundSlug);
              return;
            }
          } catch (e) {
            // Frame capture error ignored
          } finally {
            isScanningFrameRef.current = false;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      scanLoopActiveRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [cameraStatus, isVideoPlaying, handleSuccess]);

  // Modal open/close lifecycle, scroll locking & Android back button
  useEffect(() => {
    if (!isOpen) {
      hasHandledSuccessRef.current = false;
      stopCamera();
      setDetectedSlug(null);
      setScanSuccess(false);
      setManualError(null);
      return;
    }

    hasHandledSuccessRef.current = false;

    // Lock body scroll
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Push history state so Android back button closes modal (pushed once on open)
    window.history.pushState({ qrModalOpen: true }, '');
    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    startCamera(facingMode);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      stopCamera();
    };
  }, [isOpen, onClose, startCamera, stopCamera, facingMode]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip front/back camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Upload image fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setManualError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = canvasRef.current || document.createElement('canvas');
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h / w) * maxDim);
              w = maxDim;
            } else {
              w = Math.round((w / h) * maxDim);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);

          // Try BarcodeDetector
          let slug: string | null = null;
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(canvas);
              if (barcodes?.length > 0) {
                slug = extractShopSlug(barcodes[0].rawValue);
              }
            } catch (e) {
              // fallback
            }
          }

          if (!slug) {
            const imgData = ctx.getImageData(0, 0, w, h);
            const qr = jsQR(imgData.data, w, h);
            if (qr?.data) {
              slug = extractShopSlug(qr.data);
            }
          }

          if (slug) {
            handleSuccess(slug);
          } else {
            setManualError('No valid PrintHub QR code found in this image.');
          }
        } catch (err: any) {
          setManualError(err.message || 'Error processing QR image.');
        } finally {
          setIsProcessingImage(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = extractShopSlug(manualCode);
    if (!slug) {
      setManualError(t.invalidShopCode);
      return;
    }
    setManualError(null);
    handleSuccess(slug);
  };

  const isManualValid = Boolean(extractShopSlug(manualCode));

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan Shop QR Code"
        style={{
          position: 'fixed',
          inset: 0,
          height: '100dvh',
          zIndex: 1000,
          background: 'rgba(11, 16, 32, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px calc(10px + env(safe-area-inset-bottom, 0px)) 16px',
        }}
      >
        {/* Hidden offscreen canvas for frame sampling */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            background: '#ffffff',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100dvh - 24px)',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Camera size={19} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  {t.scanShopQr}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Fast instant redirect
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Viewfinder Area (Always renders <video>) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '260px',
              background: '#090d16',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Always mounted video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlaying={() => setIsVideoPlaying(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: cameraStatus === 'live' && isVideoPlaying ? 1 : 0,
                transition: 'opacity 0.25s ease',
              }}
            />

            {/* Starting camera shimmer state */}
            {cameraStatus === 'starting' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: '#ffffff',
                  background: 'radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%)',
                }}
              >
                <Loader2 size={32} className="animate-spin" color="#818cf8" />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>
                  {t.startingCamera}
                </span>
              </div>
            )}

            {/* Permission Denied / Error fallback inside viewfinder */}
            {(cameraStatus === 'permission_denied' || cameraStatus === 'no_camera' || cameraStatus === 'insecure' || cameraStatus === 'error') && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: '#0f172a',
                  color: '#ffffff',
                }}
              >
                <ShieldAlert size={36} color="#fb7185" style={{ marginBottom: '8px' }} />
                <h4 style={{ fontSize: '0.94rem', fontWeight: 700, margin: '0 0 4px 0', color: '#f8fafc' }}>
                  {cameraStatus === 'permission_denied' ? t.permissionDenied : t.noCameraAvailable}
                </h4>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '0 0 12px 0', maxWidth: '280px', lineHeight: 1.35 }}>
                  {cameraStatus === 'permission_denied' ? t.permissionDeniedDesc : t.noCameraDesc}
                </p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    minHeight: '38px',
                    fontSize: '0.8rem',
                    borderRadius: '12px',
                  }}
                >
                  <RefreshCw size={14} />
                  <span>{t.retryCamera}</span>
                </button>
              </div>
            )}

            {/* Viewfinder Controls: Torch & Flip top corner icon buttons */}
            {cameraStatus === 'live' && isVideoPlaying && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 5,
                  }}
                >
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      aria-label="Toggle Torch"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: torchOn ? '#4f46e5' : 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: torchOn ? '0 0 12px #6366f1' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
                    </button>
                  )}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 5,
                  }}
                >
                  <button
                    type="button"
                    onClick={flipCamera}
                    aria-label="Flip Camera"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </>
            )}

            {/* Scanning Reticle Box */}
            <div
              style={{
                position: 'relative',
                width: 'min(70vw, 200px)',
                height: 'min(70vw, 200px)',
                borderRadius: '20px',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 0 30px rgba(79, 70, 229, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {/* L-shaped corner guides */}
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '22px',
                  height: '22px',
                  borderTop: '3.5px solid #6366f1',
                  borderLeft: '3.5px solid #6366f1',
                  borderTopLeftRadius: '14px',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '22px',
                  height: '22px',
                  borderTop: '3.5px solid #6366f1',
                  borderRight: '3.5px solid #6366f1',
                  borderTopRightRadius: '14px',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '-2px',
                  width: '22px',
                  height: '22px',
                  borderBottom: '3.5px solid #6366f1',
                  borderLeft: '3.5px solid #6366f1',
                  borderBottomLeftRadius: '14px',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '22px',
                  height: '22px',
                  borderBottom: '3.5px solid #6366f1',
                  borderRight: '3.5px solid #6366f1',
                  borderBottomRightRadius: '14px',
                }}
              />

              {/* Success Green Check Animation Overlay */}
              {scanSuccess && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '18px',
                    background: 'rgba(5, 150, 105, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    animation: 'fadeInScale 0.18s ease-out forwards',
                  }}
                >
                  <CheckCircle2 size={56} strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Viewfinder Hint Row (Never overlapped by torch/flip) */}
          <div
            style={{
              padding: '8px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600, margin: 0 }}>
              {t.pointAtStandee}
            </p>
          </div>

          {/* Bottom Interactive Area: Always reachable without scrolling */}
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Inline Error Message */}
            {manualError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={15} flex-shrink={0} />
                <span>{manualError}</span>
              </div>
            )}

            {/* Manual Shop Code Input */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder={t.shopCodePlaceholder}
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    if (manualError) setManualError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1.5px solid ${isManualValid ? '#059669' : '#cbd5e1'}`,
                    background: isManualValid ? '#f0fdf4' : '#ffffff',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '16px', // Prevents iOS Safari zoom
                    boxShadow: 'var(--shadow-sm)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!isManualValid}
                style={{
                  padding: '12px 16px',
                  minHeight: '46px',
                  borderRadius: '14px',
                  flexShrink: 0,
                  gap: '4px',
                  fontSize: '0.88rem',
                }}
              >
                <span>{t.goToShop}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Upload QR Image / Screenshot Action */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '12px',
                minHeight: '46px',
                borderRadius: '14px',
                fontSize: '0.86rem',
                fontWeight: 700,
                color: '#4f46e5',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                background: '#f8fafc',
              }}
            >
              {isProcessingImage ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Scanning image...</span>
                </>
              ) : (
                <>
                  <ImageIcon size={18} />
                  <span>{t.uploadQrImage}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
