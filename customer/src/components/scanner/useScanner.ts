import { useState, useCallback, useEffect, useRef } from 'react';
import { ScannedPage, ScannerFilter, CropCoords, ScannerStep } from './types';
import { normalizeCapturedBlob, generatePageThumbnail, exportPagesToPdf } from './processor';
import { useToast } from '../../ui/Toast';

export function useScanner(onComplete: (pdfBlob: Blob, pageCount: number) => void, onClose: () => void) {
  const { showToast } = useToast();
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activeStep, setActiveStep] = useState<ScannerStep>('camera');

  // Currently editing or captured photo
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Active crop settings in Crop step
  const [crop, setCrop] = useState<CropCoords>({ l: 0.03, t: 0.03, r: 0.97, b: 0.97 });
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [filter, setFilter] = useState<ScannerFilter>('AUTO');

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDiscardSheetOpen, setIsDiscardSheetOpen] = useState(false);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // Clean up thumbnail URLs when pages are deleted or on unmount
  const cleanupThumbnails = useCallback((items: ScannedPage[]) => {
    items.forEach((p) => {
      if (p.thumbUrl) {
        try {
          URL.revokeObjectURL(p.thumbUrl);
        } catch (e) {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      cleanupThumbnails(pagesRef.current);
    };
  }, [cleanupThumbnails]);

  // Handle a new captured or selected image
  const handlePhotoCaptured = useCallback(async (rawBlob: Blob) => {
    if (pagesRef.current.length >= 30) {
      showToast('Maximum 30 pages per scan session reached.', 'warning');
      return;
    }

    try {
      const normalized = await normalizeCapturedBlob(rawBlob, 3000);
      setCurrentBlob(normalized);
      setEditingIndex(null);
      setCrop({ l: 0.03, t: 0.03, r: 0.97, b: 0.97 });
      setRotation(0);
      setFilter('AUTO');
      setActiveStep('crop');
    } catch (err) {
      console.error('Failed to normalize captured image', err);
    }
  }, [showToast]);

  // Save changes from Crop step
  const saveCroppedPage = useCallback(
    async (finalCrop: CropCoords, finalRotation: 0 | 90 | 180 | 270, finalFilter: ScannerFilter) => {
      if (!currentBlob) return;

      const thumbUrl = await generatePageThumbnail(
        currentBlob,
        finalCrop,
        finalRotation,
        finalFilter
      );

      if (editingIndex !== null) {
        // Update existing page
        setPages((prev) => {
          const updated = [...prev];
          const oldPage = updated[editingIndex];
          if (oldPage?.thumbUrl) URL.revokeObjectURL(oldPage.thumbUrl);

          updated[editingIndex] = {
            ...oldPage,
            original: currentBlob,
            crop: finalCrop,
            rotation: finalRotation,
            filter: finalFilter,
            thumbUrl,
          };
          return updated;
        });
        setActiveStep('pages');
      } else {
        // Add new page
        const newPage: ScannedPage = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          original: currentBlob,
          crop: finalCrop,
          rotation: finalRotation,
          filter: finalFilter,
          thumbUrl,
        };
        setPages((prev) => [...prev, newPage]);
        setActiveStep('camera');
      }

      setCurrentBlob(null);
      setEditingIndex(null);
    },
    [currentBlob, editingIndex]
  );

  // Open existing page for editing
  const openEditPage = useCallback((index: number) => {
    const page = pagesRef.current[index];
    if (!page) return;

    setCurrentBlob(page.original);
    setEditingIndex(index);
    setCrop(page.crop);
    setRotation(page.rotation);
    setFilter(page.filter);
    setActiveStep('crop');
  }, []);

  // Delete a page
  const deletePage = useCallback((index: number) => {
    setPages((prev) => {
      const pageToDelete = prev[index];
      if (pageToDelete?.thumbUrl) {
        URL.revokeObjectURL(pageToDelete.thumbUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setActiveStep('camera');
      }
      return updated;
    });
  }, []);

  // Retake a page (replaces this page with new shot)
  const retakePage = useCallback((index: number) => {
    setEditingIndex(index);
    setActiveStep('camera');
  }, []);

  // Reorder pages in review grid
  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // Finish scan session and export multi-page PDF
  const finishAndExport = useCallback(async () => {
    if (pages.length === 0) return;

    setIsExporting(true);
    setExportProgress({ current: 0, total: pages.length });

    try {
      const { pdfBlob, pageCount } = await exportPagesToPdf(pages, (curr, tot) => {
        setExportProgress({ current: curr, total: tot });
      });

      cleanupThumbnails(pages);
      setPages([]);
      onComplete(pdfBlob, pageCount);
      onClose();
    } catch (err: any) {
      console.error('Failed to export PDF', err);
      showToast(err.message || 'Error creating PDF from scans', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [pages, cleanupThumbnails, onComplete, onClose, showToast]);

  // Handle modal close request
  const handleRequestClose = useCallback(() => {
    if (pages.length > 0) {
      setIsDiscardSheetOpen(true);
    } else {
      cleanupThumbnails(pages);
      setPages([]);
      onClose();
    }
  }, [pages, cleanupThumbnails, onClose]);

  const confirmDiscard = useCallback(() => {
    cleanupThumbnails(pages);
    setPages([]);
    setIsDiscardSheetOpen(false);
    onClose();
  }, [pages, cleanupThumbnails, onClose]);

  return {
    pages,
    activeStep,
    setActiveStep,
    currentBlob,
    editingIndex,
    crop,
    setCrop,
    rotation,
    setRotation,
    filter,
    setFilter,
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
  };
}
