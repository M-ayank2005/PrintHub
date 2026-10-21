export type ScannerFilter = 'AUTO' | 'ORIGINAL' | 'GRAYSCALE' | 'BW';

export interface CropCoords {
  l: number; // 0..1
  t: number; // 0..1
  r: number; // 0..1
  b: number; // 0..1
}

export interface ScannedPage {
  id: string;
  original: Blob; // Long edge <= 3000px
  crop: CropCoords; // Normalized 0..1 coordinates
  rotation: 0 | 90 | 180 | 270;
  filter: ScannerFilter;
  thumbUrl: string;
}

export type ScannerStep = 'camera' | 'crop' | 'pages';
