import { PDFDocument } from 'pdf-lib';

/**
 * Downscales an image blob to standard A4 printing resolution (200-300 DPI)
 * and returns the processed JPEG ArrayBuffer.
 */
export async function optimizeImage(
  file: File | Blob,
  isColor = true,
  maxDimension = 2480
): Promise<Uint8Array> {
  const imageBitmap = await createImageBitmap(file);
  const { width, height } = imageBitmap;

  let targetWidth = width;
  let targetHeight = height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      targetWidth = maxDimension;
      targetHeight = Math.round((height / width) * maxDimension);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((width / height) * maxDimension);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  if (!isColor) {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
  );

  if (!blob) {
    throw new Error('Failed to encode optimized image');
  }

  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Assembles one or more images into a single multi-page A4 PDF document.
 * Each image becomes one page scaled to fit A4 (595.28 x 841.89 points).
 */
export async function imagesToPdf(
  images: Array<{ data: Uint8Array | ArrayBuffer; width?: number; height?: number }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in points: 595.28 x 841.89
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (const img of images) {
    const embeddedImg = await pdfDoc.embedJpg(img.data);
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    // Calculate fit-to-page scale preserving aspect ratio
    const scale = Math.min(A4_WIDTH / imgWidth, A4_HEIGHT / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    const x = (A4_WIDTH - scaledWidth) / 2;
    const y = (A4_HEIGHT - scaledHeight) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  return await pdfDoc.save();
}
