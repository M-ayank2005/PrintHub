'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Extracts the shop slug from scanned QR text.
 * Handles:
 * - Full URLs: https://print-hub-mauve.vercel.app/p/shop-slug
 * - Relative paths: /p/shop-slug
 * - Plain slugs: shop-slug
 */
export function extractShopSlug(rawText: string): string | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // 1. Check for URL matching /p/<slug>
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/p\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // ignore URL parse errors
  }

  // 2. Check for regex pattern /p/<slug> anywhere in string
  const pathMatch = trimmed.match(/(?:^|\/)p\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // 3. Fallback: If it's a standalone slug (alphanumeric, hyphens, underscores)
  const slugRegex = /^[a-zA-Z0-9_-]{2,60}$/;
  if (slugRegex.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedSlug, setDetectedSlug] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Play subtle audio chime on scan success
  const playSuccessChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // AudioContext may be restricted by user agent
    }
  }, []);

  const handleSuccess = useCallback(
    (slug: string) => {
      if (detectedSlug) return; // already handling
      setDetectedSlug(slug);

      // Trigger haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 80]);
      }
      playSuccessChime();

      // Clean up camera immediately
      stopCamera();

      // Redirect to shop page after brief visual confirmation
      setTimeout(() => {
        router.push(`/p/${slug}`);
        onClose();
      }, 700);
    },
    [detectedSlug, onClose, playSuccessChime, router]
  );

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. Please enter the shop code or upload an image.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        // Fallback to basic video constraints if ideal resolution/facingMode is rejected
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

        // Ensure video metadata is loaded before starting playback
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.onloadeddata = () => resolve();
            video.onloadedmetadata = () => resolve();
            // Safety timeout after 500ms
            setTimeout(resolve, 500);
          }
        });

        await video.play().catch((playErr) => {
          console.warn('Video play prevented, attempting muted play:', playErr);
          video.muted = true;
          return video.play();
        });
      }

      setCameraActive(true);

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(!!capabilities.torch);

      // Start continuous QR detection loop
      startScanningLoop();
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let msg = 'Could not access camera. Please allow camera permissions or enter the shop code below.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Tap the lock icon in your address bar to allow camera access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

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
      console.warn('Failed to toggle torch:', e);
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const startScanningLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let detector: any = null;
    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        hasBarcodeDetector = false;
      }
    }

    const tick = async () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // 1. Try native BarcodeDetector API (fastest, hardware accelerated)
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            const slug = extractShopSlug(raw);
            if (slug) {
              handleSuccess(slug);
              return;
            }
          }
        } catch (e) {
          // fallback to jsQR below
        }
      }

      // 2. Fallback to jsQR on canvas buffer
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const slug = extractShopSlug(code.data);
        if (slug) {
          handleSuccess(slug);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Decode QR code from an uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingImage(false);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Try BarcodeDetector first
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            if (barcodes.length > 0) {
              const slug = extractShopSlug(barcodes[0].rawValue);
              if (slug) {
                setIsProcessingImage(false);
                handleSuccess(slug);
                return;
              }
            }
          } catch (e) {
            // fallback to jsQR
          }
        }

        // Fallback to jsQR
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setIsProcessingImage(false);

        if (code && code.data) {
          const slug = extractShopSlug(code.data);
          if (slug) {
            handleSuccess(slug);
          } else {
            setCameraError(`Found QR code, but could not identify a valid print cafe: "${code.data}"`);
          }
        } else {
          setCameraError('No QR code detected in the selected image. Please try another photo or enter the shop code.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = extractShopSlug(manualCode);
    if (!slug) {
      alert('Please enter a valid shop slug or code (e.g. "cyber-corner").');
      return;
    }
    handleSuccess(slug);
  };

  useEffect(() => {
    if (isOpen) {
      setDetectedSlug(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
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
                borderRadius: '10px',
                background: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Scan Shop QR Code
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Point at the counter standee or Google Lens QR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '290px',
            background: '#0f172a',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'contrast(1.05) brightness(1.04)',
                }}
              />

              {/* Modern Translucent Mask & Scanning Frame */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'radial-gradient(circle at center, transparent 130px, rgba(15, 23, 42, 0.35) 150px)',
                }}
              >
                {/* Scanning Reticle Box */}
                <div
                  style={{
                    position: 'relative',
                    width: '210px',
                    height: '210px',
                    border: '1.5px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '20px',
                    boxShadow: '0 0 25px rgba(79, 70, 229, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* 4 Crisp Glowing Neon Corners */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      width: '24px',
                      height: '24px',
                      borderTop: '4px solid #6366f1',
                      borderLeft: '4px solid #6366f1',
                      borderTopLeftRadius: '16px',
                      filter: 'drop-shadow(0 0 4px #4f46e5)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '24px',
                      height: '24px',
                      borderTop: '4px solid #6366f1',
                      borderRight: '4px solid #6366f1',
                      borderTopRightRadius: '16px',
                      filter: 'drop-shadow(0 0 4px #4f46e5)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: '-2px',
                      width: '24px',
                      height: '24px',
                      borderBottom: '4px solid #6366f1',
                      borderLeft: '4px solid #6366f1',
                      borderBottomLeftRadius: '16px',
                      filter: 'drop-shadow(0 0 4px #4f46e5)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '24px',
                      height: '24px',
                      borderBottom: '4px solid #6366f1',
                      borderRight: '4px solid #6366f1',
                      borderBottomRightRadius: '16px',
                      filter: 'drop-shadow(0 0 4px #4f46e5)',
                    }}
                  />

                  {/* Animated Horizontal Laser Scanner Line */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '92%',
                      height: '3px',
                      background: 'linear-gradient(90deg, transparent, #818cf8, #4f46e5, #818cf8, transparent)',
                      boxShadow: '0 0 14px #6366f1, 0 0 5px #818cf8',
                      animation: 'qrLaserScan 2s infinite ease-in-out',
                    }}
                  />
                </div>

                <span
                  style={{
                    marginTop: '10px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Align counter QR code within box
                </span>
              </div>

              {/* Viewfinder Controls (Flip & Torch) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  zIndex: 10,
                }}
              >
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      background: torchOn ? '#f59e0b' : 'rgba(0, 0, 0, 0.65)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Zap size={14} fill={torchOn ? '#ffffff' : 'none'} />
                    {torchOn ? 'Torch On' : 'Torch'}
                  </button>
                )}

                <button
                  onClick={flipCamera}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <RefreshCw size={14} />
                  Flip Camera
                </button>
              </div>
            </>
          ) : (
            /* Camera Inactive / Loading / Fallback state */
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <Camera size={44} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600 }}>
                {cameraError || 'Initializing camera stream...'}
              </p>
              <button
                onClick={startCamera}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Success Overlay when detected */}
          {detectedSlug && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                zIndex: 20,
                animation: 'fadeInScale 0.2s ease forwards',
              }}
            >
              <CheckCircle2 size={56} color="#ffffff" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Shop Detected!</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '4px' }}>
                Connecting to <strong>{detectedSlug}</strong>...
              </p>
            </div>
          )}
        </div>

        {/* Alternative Actions: Image Upload & Manual Input */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Option A: Upload QR screenshot / photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ImageIcon size={18} color="#4f46e5" />
            {isProcessingImage ? 'Analyzing Image...' : 'Upload QR Image / Screenshot'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
              OR ENTER SHOP CODE
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Option B: Manual Shop Code Input */}
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. cyber-cafe-1 or slug"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                color: '#0f172a',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="btn-primary"
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                opacity: !manualCode.trim() ? 0.6 : 1,
              }}
            >
              <span>Go</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Help Tip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.45,
            }}
          >
            <HelpCircle size={15} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Tip: You can scan the counter poster using <strong>Google Lens</strong>, your phone&apos;s camera app, or directly using this web scanner. Both will open this print cafe automatically!
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes qrLaserScan {
          0% {
            top: 6%;
            opacity: 0.8;
          }
          50% {
            top: 92%;
            opacity: 1;
          }
          100% {
            top: 6%;
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};
