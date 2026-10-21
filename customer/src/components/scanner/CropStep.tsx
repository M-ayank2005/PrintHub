'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
  Check,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { CropCoords, ScannerFilter } from './types';
import { blobToImage, renderProcessedCanvas } from './processor';
import { useCustomerStore } from '../../lib/store';
import { translations } from '../../lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface CropStepProps {
  blob: Blob;
  initialCrop?: CropCoords;
  initialRotation?: 0 | 90 | 180 | 270;
  initialFilter?: ScannerFilter;
  onSave: (crop: CropCoords, rotation: 0 | 90 | 180 | 270, filter: ScannerFilter) => void;
  onRetake: () => void;
  onCancel: () => void;
}

type DragTarget =
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'
  | 'edge-top'
  | 'edge-bottom'
  | 'edge-left'
  | 'edge-right';

export const CropStep: React.FC<CropStepProps> = ({
  blob,
  initialCrop = { l: 0.03, t: 0.03, r: 0.97, b: 0.97 },
  initialRotation = 0,
  initialFilter = 'AUTO',
  onSave,
  onRetake,
  onCancel,
}) => {
  const { language } = useCustomerStore();
  const t = translations[language];

  const [crop, setCrop] = useState<CropCoords>(initialCrop);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialRotation);
  const [filter, setFilter] = useState<ScannerFilter>(initialFilter);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Small working copy canvas (~800px) for live preview & filter rendering
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [activeHandle, setActiveHandle] = useState<DragTarget | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  const dragInfoRef = useRef<{
    target: DragTarget;
    startX: number;
    startY: number;
    initialCrop: CropCoords;
  } | null>(null);

  // Debounced live filter preview update on working copy (~800px)
  const updateWorkingPreview = useCallback(
    async (
      img: HTMLImageElement,
      rot: 0 | 90 | 180 | 270,
      fil: ScannerFilter
    ) => {
      try {
        // Full frame preview with rotation and filter applied
        const canvas = await renderProcessedCanvas(
          img,
          { l: 0, t: 0, r: 1, b: 1 },
          rot,
          fil,
          800
        );
        setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.error('Failed to render working preview', err);
      }
    },
    []
  );

  // Load and downscale working copy image
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const fullImg = await blobToImage(blob);
        if (cancelled) return;
        imageElementRef.current = fullImg;
        updateWorkingPreview(fullImg, rotation, filter);
      } catch (e) {
        console.error('Failed to load image for crop step', e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [blob, rotation, filter, updateWorkingPreview]);

  useEffect(() => {
    if (!imageElementRef.current) return;
    const timer = setTimeout(() => {
      if (imageElementRef.current) {
        updateWorkingPreview(imageElementRef.current, rotation, filter);
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [rotation, filter, updateWorkingPreview]);

  // Update Loupe Magnifier during corner drags
  const updateLoupe = useCallback(
    (clientX: number, clientY: number, normX: number, normY: number) => {
      if (!loupeCanvasRef.current || !imageElementRef.current) return;
      const canvas = loupeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = imageElementRef.current;
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const pxX = normX * w;
      const pxY = normY * h;
      const sampleSize = 60; // 60x60 sampled area

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        Math.max(0, pxX - sampleSize / 2),
        Math.max(0, pxY - sampleSize / 2),
        sampleSize,
        sampleSize,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Draw crosshairs
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    },
    []
  );

  // Compute displayed image bounding rect inside container (object-fit: contain)
  const getImageDisplayRect = useCallback(() => {
    if (!containerRef.current || !imageElementRef.current) return null;
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;

    const naturalW =
      rotation === 90 || rotation === 270
        ? imageElementRef.current.naturalHeight
        : imageElementRef.current.naturalWidth;
    const naturalH =
      rotation === 90 || rotation === 270
        ? imageElementRef.current.naturalWidth
        : imageElementRef.current.naturalHeight;

    const scale = Math.min(cWidth / naturalW, cHeight / naturalH);
    const dispW = naturalW * scale;
    const dispH = naturalH * scale;
    const dispX = (cWidth - dispW) / 2;
    const dispY = (cHeight - dispH) / 2;

    return { x: dispX, y: dispY, width: dispW, height: dispH };
  }, [rotation]);

  // Pointer drag start
  const handlePointerDown = (target: DragTarget, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragInfoRef.current = {
      target,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    };
    setActiveHandle(target);
    setPointerPos({ x: e.clientX, y: e.clientY });
  };

  // Pointer drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfoRef.current) return;
    const { target, startX, startY, initialCrop: startCrop } = dragInfoRef.current;
    const rect = getImageDisplayRect();
    if (!rect) return;

    const deltaX = (e.clientX - startX) / rect.width;
    const deltaY = (e.clientY - startY) / rect.height;

    const minSize = 0.15; // Minimum 15% per side

    let nextL = startCrop.l;
    let nextT = startCrop.t;
    let nextR = startCrop.r;
    let nextB = startCrop.b;

    switch (target) {
      case 'tl':
        nextL = Math.max(0, Math.min(startCrop.r - minSize, startCrop.l + deltaX));
        nextT = Math.max(0, Math.min(startCrop.b - minSize, startCrop.t + deltaY));
        break;
      case 'tr':
        nextR = Math.min(1, Math.max(startCrop.l + minSize, startCrop.r + deltaX));
        nextT = Math.max(0, Math.min(startCrop.b - minSize, startCrop.t + deltaY));
        break;
      case 'bl':
        nextL = Math.max(0, Math.min(startCrop.r - minSize, startCrop.l + deltaX));
        nextB = Math.min(1, Math.max(startCrop.t + minSize, startCrop.b + deltaY));
        break;
      case 'br':
        nextR = Math.min(1, Math.max(startCrop.l + minSize, startCrop.r + deltaX));
        nextB = Math.min(1, Math.max(startCrop.t + minSize, startCrop.b + deltaY));
        break;
      case 'edge-top':
        nextT = Math.max(0, Math.min(startCrop.b - minSize, startCrop.t + deltaY));
        break;
      case 'edge-bottom':
        nextB = Math.min(1, Math.max(startCrop.t + minSize, startCrop.b + deltaY));
        break;
      case 'edge-left':
        nextL = Math.max(0, Math.min(startCrop.r - minSize, startCrop.l + deltaX));
        break;
      case 'edge-right':
        nextR = Math.min(1, Math.max(startCrop.l + minSize, startCrop.r + deltaX));
        break;
    }

    setCrop({ l: nextL, t: nextT, r: nextR, b: nextB });
    setPointerPos({ x: e.clientX, y: e.clientY });

    // Update loupe on corner drag
    if (['tl', 'tr', 'bl', 'br'].includes(target)) {
      const activeX = target.includes('l') ? nextL : nextR;
      const activeY = target.includes('t') ? nextT : nextB;
      updateLoupe(e.clientX, e.clientY, activeX, activeY);
    }
  };

  const handlePointerUp = () => {
    dragInfoRef.current = null;
    setActiveHandle(null);
    setPointerPos(null);
  };

  // Reset crop to default 3% inset
  const handleResetCrop = () => {
    setCrop({ l: 0.03, t: 0.03, r: 0.97, b: 0.97 });
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => {
      const next = ((prev + 90) % 360) as 0 | 90 | 180 | 270;
      return next;
    });
  };

  // Calculate pixel bounds of crop for CSS placement
  const rect = getImageDisplayRect();
  const cX = rect ? rect.x + crop.l * rect.width : 0;
  const cY = rect ? rect.y + crop.t * rect.height : 0;
  const cW = rect ? (crop.r - crop.l) * rect.width : 0;
  const cH = rect ? (crop.b - crop.t) * rect.height : 0;

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
        userSelect: 'none',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(11, 16, 32, 0.9) 0%, transparent 100%)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to camera"
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
          <ArrowLeft size={20} />
        </button>

        <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
          Trim & Enhance
        </span>

        <button
          type="button"
          onClick={handleRotate}
          aria-label="Rotate 90 degrees"
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
          <RotateCw size={19} />
        </button>
      </div>

      {/* Main Image & Draggable Crop Stage */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Working copy image */}
        {previewDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewDataUrl}
            alt="Captured scan preview"
            style={{
              position: 'absolute',
              left: rect?.x,
              top: rect?.y,
              width: rect?.width,
              height: rect?.height,
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 4 Dark Mask Overlays outside crop frame */}
        {rect && (
          <>
            {/* Top Mask */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: Math.max(0, cY),
                background: 'rgba(11, 16, 32, 0.72)',
                pointerEvents: 'none',
              }}
            />
            {/* Bottom Mask */}
            <div
              style={{
                position: 'absolute',
                top: cY + cH,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(11, 16, 32, 0.72)',
                pointerEvents: 'none',
              }}
            />
            {/* Left Mask */}
            <div
              style={{
                position: 'absolute',
                top: cY,
                left: 0,
                width: Math.max(0, cX),
                height: cH,
                background: 'rgba(11, 16, 32, 0.72)',
                pointerEvents: 'none',
              }}
            />
            {/* Right Mask */}
            <div
              style={{
                position: 'absolute',
                top: cY,
                left: cX + cW,
                right: 0,
                height: cH,
                background: 'rgba(11, 16, 32, 0.72)',
                pointerEvents: 'none',
              }}
            />

            {/* Draggable Crop Frame Box */}
            <div
              style={{
                position: 'absolute',
                left: cX,
                top: cY,
                width: cW,
                height: cH,
                border: '2px solid #818cf8',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              {/* Rule of Thirds Grid (visible while dragging) */}
              {activeHandle && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.3,
                    backgroundImage: `
                      linear-gradient(to right, transparent 33.3%, rgba(255,255,255,0.8) 33.3%, rgba(255,255,255,0.8) 33.8%, transparent 33.8%, transparent 66.6%, rgba(255,255,255,0.8) 66.6%, rgba(255,255,255,0.8) 67.1%, transparent 67.1%),
                      linear-gradient(to bottom, transparent 33.3%, rgba(255,255,255,0.8) 33.3%, rgba(255,255,255,0.8) 33.8%, transparent 33.8%, transparent 66.6%, rgba(255,255,255,0.8) 66.6%, rgba(255,255,255,0.8) 67.1%, transparent 67.1%)
                    `,
                  }}
                />
              )}
            </div>

            {/* 4 Edge Pill Handles (hit area >= 44x44px, touch-action: none) */}
            {/* Top edge */}
            <div
              onPointerDown={(e) => handlePointerDown('edge-top', e)}
              style={{
                position: 'absolute',
                left: cX + cW / 2 - 22,
                top: cY - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ns-resize',
                touchAction: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '5px',
                  borderRadius: '3px',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* Bottom edge */}
            <div
              onPointerDown={(e) => handlePointerDown('edge-bottom', e)}
              style={{
                position: 'absolute',
                left: cX + cW / 2 - 22,
                top: cY + cH - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ns-resize',
                touchAction: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '5px',
                  borderRadius: '3px',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* Left edge */}
            <div
              onPointerDown={(e) => handlePointerDown('edge-left', e)}
              style={{
                position: 'absolute',
                left: cX - 22,
                top: cY + cH / 2 - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ew-resize',
                touchAction: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  width: '5px',
                  height: '24px',
                  borderRadius: '3px',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* Right edge */}
            <div
              onPointerDown={(e) => handlePointerDown('edge-right', e)}
              style={{
                position: 'absolute',
                left: cX + cW - 22,
                top: cY + cH / 2 - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ew-resize',
                touchAction: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  width: '5px',
                  height: '24px',
                  borderRadius: '3px',
                  background: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}
              />
            </div>

            {/* 4 Corner L-Handles (hit area >= 44x44px, touch-action: none) */}
            {/* Top-Left */}
            <div
              onPointerDown={(e) => handlePointerDown('tl', e)}
              style={{
                position: 'absolute',
                left: cX - 22,
                top: cY - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'nwse-resize',
                touchAction: 'none',
                zIndex: 20,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderTop: '4px solid #ffffff',
                  borderLeft: '4px solid #ffffff',
                  transform: activeHandle === 'tl' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Top-Right */}
            <div
              onPointerDown={(e) => handlePointerDown('tr', e)}
              style={{
                position: 'absolute',
                left: cX + cW - 22,
                top: cY - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'nesw-resize',
                touchAction: 'none',
                zIndex: 20,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderTop: '4px solid #ffffff',
                  borderRight: '4px solid #ffffff',
                  transform: activeHandle === 'tr' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Bottom-Left */}
            <div
              onPointerDown={(e) => handlePointerDown('bl', e)}
              style={{
                position: 'absolute',
                left: cX - 22,
                top: cY + cH - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'nesw-resize',
                touchAction: 'none',
                zIndex: 20,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderBottom: '4px solid #ffffff',
                  borderLeft: '4px solid #ffffff',
                  transform: activeHandle === 'bl' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Bottom-Right */}
            <div
              onPointerDown={(e) => handlePointerDown('br', e)}
              style={{
                position: 'absolute',
                left: cX + cW - 22,
                top: cY + cH - 22,
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'nwse-resize',
                touchAction: 'none',
                zIndex: 20,
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderBottom: '4px solid #ffffff',
                  borderRight: '4px solid #ffffff',
                  transform: activeHandle === 'br' ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Magnifier Loupe offset ~70px above touch finger during corner drag */}
            <AnimatePresence>
              {pointerPos && activeHandle && ['tl', 'tr', 'bl', 'br'].includes(activeHandle) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    position: 'fixed',
                    left: Math.max(16, Math.min(window.innerWidth - 106, pointerPos.x - 45)),
                    top: Math.max(20, pointerPos.y - 110),
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    border: '3px solid #6366f1',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    background: '#000000',
                    pointerEvents: 'none',
                    zIndex: 99,
                  }}
                >
                  <canvas
                    ref={loupeCanvasRef}
                    width={90}
                    height={90}
                    style={{ width: '100%', height: '100%' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Bottom Toolbar: Filter Chips, Secondary Actions, and Primary Button */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px 18px calc(14px + env(safe-area-inset-bottom, 0px)) 18px',
          background: 'linear-gradient(0deg, rgba(11, 16, 32, 0.98) 0%, rgba(11, 16, 32, 0.9) 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10,
        }}
      >
        {/* Filter Chip Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '3px',
            borderRadius: '14px',
            gap: '4px',
          }}
        >
          {(['AUTO', 'ORIGINAL', 'GRAYSCALE', 'BW'] as ScannerFilter[]).map((mode) => {
            const isActive = filter === mode;
            const label =
              mode === 'AUTO'
                ? t.autoFilter
                : mode === 'ORIGINAL'
                ? t.originalFilter
                : mode === 'GRAYSCALE'
                ? t.grayscaleFilter
                : t.bwFilter;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  minHeight: '38px',
                  borderRadius: '11px',
                  border: 'none',
                  background: isActive ? '#4f46e5' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Action Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetCrop}
            style={{
              padding: '10px 14px',
              minHeight: '44px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCcw size={15} />
            <span>{t.resetCrop}</span>
          </button>

          <button
            type="button"
            onClick={onRetake}
            style={{
              padding: '10px 14px',
              minHeight: '44px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} />
            <span>{t.retake}</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(crop, rotation, filter)}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '12px 18px',
              minHeight: '46px',
              borderRadius: '14px',
              fontSize: '0.92rem',
              fontWeight: 800,
              gap: '6px',
            }}
          >
            <span>{t.useThisPage}</span>
            <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
