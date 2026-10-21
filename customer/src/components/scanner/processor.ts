import { ScannedPage, ScannerFilter, CropCoords } from './types';
import { applyFilterToImageData } from './imageFilters';
import { imagesToPdf } from '../../lib/pdf-processor';

/**
 * Loads a Blob into an HTMLImageElement safely.
 */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Downscales an input Blob/File so its long edge <= maxDim (default 3000px).
 */
export async function normalizeCapturedBlob(fileOrBlob: Blob, maxDim = 3000): Promise<Blob> {
  const img = await blobToImage(fileOrBlob);
  const { naturalWidth: width, naturalHeight: height } = img;

  if (width <= maxDim && height <= maxDim) {
    return fileOrBlob;
  }

  let targetW = width;
  let targetH = height;
  if (width > height) {
    targetW = maxDim;
    targetH = Math.round((height / width) * maxDim);
  } else {
    targetH = maxDim;
    targetW = Math.round((width / height) * maxDim);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to normalize captured blob'));
    }, 'image/jpeg', 0.92);
  });
}

/**
 * Renders a processed canvas from an image with crop, rotation, and filter applied.
 */
export async function renderProcessedCanvas(
  img: HTMLImageElement,
  crop: CropCoords,
  rotation: 0 | 90 | 180 | 270,
  filter: ScannerFilter,
  maxDimension = 2480
): Promise<HTMLCanvasElement> {
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // Normalized crop to pixel rect
  const cropX = Math.round(crop.l * origW);
  const cropY = Math.round(crop.t * origH);
  const cropW = Math.max(10, Math.round((crop.r - crop.l) * origW));
  const cropH = Math.max(10, Math.round((crop.b - crop.t) * origH));

  // Determine post-rotation dimensions
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const rotatedW = isRotated90or270 ? cropH : cropW;
  const rotatedH = isRotated90or270 ? cropW : cropH;

  // Downscale if long edge exceeds maxDimension
  let finalW = rotatedW;
  let finalH = rotatedH;
  const longEdge = Math.max(rotatedW, rotatedH);
  if (longEdge > maxDimension) {
    const scale = maxDimension / longEdge;
    finalW = Math.round(rotatedW * scale);
    finalH = Math.round(rotatedH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.save();

  // Apply rotation around canvas center
  ctx.translate(finalW / 2, finalH / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  // Scaled dimensions before rotation
  const scaleX = finalW / rotatedW;
  const scaleY = finalH / rotatedH;
  const drawW = cropW * (isRotated90or270 ? scaleY : scaleX);
  const drawH = cropH * (isRotated90or270 ? scaleX : scaleY);

  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();

  // Apply document filter
  if (filter !== 'ORIGINAL') {
    const imgData = ctx.getImageData(0, 0, finalW, finalH);
    const filtered = applyFilterToImageData(imgData, filter);
    ctx.putImageData(filtered, 0, 0);
  }

  return canvas;
}

/**
 * Generates a small preview thumbnail URL (revocable) for a scanned page.
 */
export async function generatePageThumbnail(
  blob: Blob,
  crop: CropCoords,
  rotation: 0 | 90 | 180 | 270,
  filter: ScannerFilter
): Promise<string> {
  const img = await blobToImage(blob);
  const canvas = await renderProcessedCanvas(img, crop, rotation, filter, 360);
  return new Promise<string>((resolve) => {
    canvas.toBlob((b) => {
      if (b) resolve(URL.createObjectURL(b));
      else resolve('');
    }, 'image/jpeg', 0.8);
  });
}

/**
 * Exports all scanned pages into a single PDF document.
 */
export async function exportPagesToPdf(
  pages: ScannedPage[],
  onProgress?: (current: number, total: number) => void
): Promise<{ pdfBlob: Blob; pageCount: number }> {
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  const pageBuffers: Array<{ data: Uint8Array }> = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (onProgress) onProgress(i + 1, pages.length);

    const img = await blobToImage(page.original);
    const canvas = await renderProcessedCanvas(
      img,
      page.crop,
      page.rotation,
      page.filter,
      2480
    );

    const quality = page.filter === 'BW' || page.filter === 'GRAYSCALE' ? 0.72 : 0.80;

    const pageBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );

    if (!pageBlob) throw new Error('Failed to encode page image');

    const buffer = new Uint8Array(await pageBlob.arrayBuffer());
    pageBuffers.push({ data: buffer });
  }

  const pdfBytes = await imagesToPdf(pageBuffers);
  const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

  return { pdfBlob, pageCount: pages.length };
}
