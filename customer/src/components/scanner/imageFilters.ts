import { ScannerFilter } from './types';

/**
 * Applies document enhancement filters to an ImageData buffer.
 * Non-destructive: returns a new ImageData or mutates in-place when specified.
 */
export function applyFilterToImageData(
  srcData: ImageData,
  filter: ScannerFilter
): ImageData {
  const width = srcData.width;
  const height = srcData.height;
  const src = srcData.data;

  const output = new ImageData(
    new Uint8ClampedArray(src),
    width,
    height
  );
  const dst = output.data;

  if (filter === 'ORIGINAL') {
    return output;
  }

  const numPixels = width * height;
  const gray = new Uint8Array(numPixels);

  // 1. Convert to luminance grayscale
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    // Standard perceptual Rec. 601 luma
    gray[p] = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
  }

  if (filter === 'GRAYSCALE') {
    for (let p = 0, i = 0; p < numPixels; p++, i += 4) {
      const g = gray[p];
      dst[i] = g;
      dst[i + 1] = g;
      dst[i + 2] = g;
      dst[i + 3] = 255;
    }
    return output;
  }

  if (filter === 'BW') {
    // Bradley-Roth Adaptive Threshold using Integral Image
    // Window s = width / 16, offset = 10%
    const s = Math.max(8, Math.round(width / 16));
    const s2 = Math.floor(s / 2);
    const offset = 0.10; // 10% below local average

    // Compute integral image in Float64Array or Uint32Array (3000x3000 max sum is ~2.3e9, fits Uint32)
    const integral = new Uint32Array(width * height);

    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      const yOffset = y * width;
      const prevYOffset = (y - 1) * width;
      for (let x = 0; x < width; x++) {
        rowSum += gray[yOffset + x];
        if (y === 0) {
          integral[yOffset + x] = rowSum;
        } else {
          integral[yOffset + x] = integral[prevYOffset + x] + rowSum;
        }
      }
    }

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(height - 1, y + s2);
      const yOffset = y * width;
      const y1Offset = (y1 - 1) * width;
      const y2Offset = y2 * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - s2);
        const x2 = Math.min(width - 1, x + s2);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        let sum = integral[y2Offset + x2];
        if (x1 > 0) sum -= integral[y2Offset + x1 - 1];
        if (y1 > 0) sum -= integral[y1Offset + x2];
        if (x1 > 0 && y1 > 0) sum += integral[y1Offset + x1 - 1];

        const avg = sum / count;
        const val = gray[yOffset + x] < avg * (1 - offset) ? 0 : 255;
        const outIdx = (yOffset + x) * 4;

        dst[outIdx] = val;
        dst[outIdx + 1] = val;
        dst[outIdx + 2] = val;
        dst[outIdx + 3] = 255;
      }
    }
    return output;
  }

  if (filter === 'AUTO') {
    // 1. Compute 1st and 99th percentile luminance for contrast stretch
    const hist = new Uint32Array(256);
    for (let p = 0; p < numPixels; p++) {
      hist[gray[p]]++;
    }

    const lowThresholdCount = Math.floor(numPixels * 0.015);
    const highThresholdCount = Math.floor(numPixels * 0.985);

    let accumulated = 0;
    let minLuma = 0;
    let maxLuma = 255;

    for (let i = 0; i < 256; i++) {
      accumulated += hist[i];
      if (accumulated >= lowThresholdCount && minLuma === 0) {
        minLuma = i;
      }
      if (accumulated >= highThresholdCount) {
        maxLuma = i;
        break;
      }
    }

    if (maxLuma <= minLuma) {
      maxLuma = 255;
      minLuma = 0;
    }

    const range = maxLuma - minLuma;
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      if (i <= minLuma) lut[i] = 0;
      else if (i >= maxLuma) lut[i] = 255;
      else lut[i] = Math.round(((i - minLuma) / range) * 255);
    }

    // Apply LUT and mild high-frequency sharpening
    for (let y = 0; y < height; y++) {
      const yOffset = y * width;
      for (let x = 0; x < width; x++) {
        const p = yOffset + x;
        const originalLuma = gray[p];
        let stretched = lut[originalLuma];

        // Mild 3x3 unsharp mask
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const up = gray[p - width];
          const down = gray[p + width];
          const left = gray[p - 1];
          const right = gray[p + 1];
          const laplacian = 5 * originalLuma - (up + down + left + right);
          const sharpVal = Math.min(255, Math.max(0, Math.round(0.85 * stretched + 0.15 * laplacian)));
          stretched = sharpVal;
        }

        // Slight desaturation leaning toward clean high-contrast document reading
        const outIdx = p * 4;
        const r = src[outIdx];
        const g = src[outIdx + 1];
        const b = src[outIdx + 2];
        const colorWeight = 0.2; // 80% luma, 20% original hue

        dst[outIdx] = Math.min(255, Math.round((1 - colorWeight) * stretched + colorWeight * lut[r]));
        dst[outIdx + 1] = Math.min(255, Math.round((1 - colorWeight) * stretched + colorWeight * lut[g]));
        dst[outIdx + 2] = Math.min(255, Math.round((1 - colorWeight) * stretched + colorWeight * lut[b]));
        dst[outIdx + 3] = 255;
      }
    }
    return output;
  }

  return output;
}
