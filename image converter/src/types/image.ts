export type OutputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'bmp'
  | 'ico'
  | 'tiff'
  | 'svg';

export type ResizeMode =
  | 'none'
  | 'dimensions'
  | 'percentage'
  | 'max-edge'
  | 'target-size';

export type FitMode = 'contain' | 'cover' | 'stretch' | 'pad';

export type RotationAngle = 0 | 90 | 180 | 270;

export type ResamplingMode = 'high' | 'pixelated';

export type IcoSizeOption = 16 | 32 | 48 | 64 | 128 | 256 | 'multi';

export interface ConvertSettings {
  format: OutputFormat;
  quality: number; // 1 - 100
  resizeMode: ResizeMode;
  width: number;
  height: number;
  lockAspect: boolean;
  fitMode: FitMode;
  percentage: number; // 1 - 400
  maxEdge: number; // px
  noUpscale: boolean;
  targetKb: number; // target file size in KB for lossy formats
  rotate: RotationAngle;
  flipH: boolean;
  flipV: boolean;
  backgroundColor: string; // hex e.g. '#ffffff' or 'transparent'
  smoothing: ResamplingMode;
  icoSize: IcoSizeOption;
  filenameSuffix: string;
}

export type ItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  originalFormat: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  previewUrl: string;
  status: ItemStatus;
  errorMessage?: string;
  useCustomSettings: boolean;
  customSettings: ConvertSettings;
  outputBlob?: Blob;
  outputUrl?: string;
  outputSize?: number;
  outputWidth?: number;
  outputHeight?: number;
  outputFormat?: OutputFormat;
  outputFilename?: string;
  processingMs?: number;
}

export interface FormatInfo {
  id: OutputFormat;
  label: string;
  ext: string;
  mime: string;
  supportsQuality: boolean;
  supportsTransparency: boolean;
  description: string;
}

export interface BrowserCapabilities {
  webp: boolean;
  avif: boolean;
}

export interface ResizePreset {
  id: string;
  label: string;
  category: 'Social' | 'Web & UI' | 'Display';
  width: number;
  height: number;
  fitMode: FitMode;
}
