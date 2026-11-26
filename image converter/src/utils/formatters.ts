import type {
  ConvertSettings,
  FormatInfo,
  OutputFormat,
  ResizePreset,
} from '../types/image';

export const FORMAT_LIST: FormatInfo[] = [
  {
    id: 'webp',
    label: 'WebP',
    ext: 'webp',
    mime: 'image/webp',
    supportsQuality: true,
    supportsTransparency: true,
    description: 'Modern web format with superior lossy and lossless compression.',
  },
  {
    id: 'png',
    label: 'PNG',
    ext: 'png',
    mime: 'image/png',
    supportsQuality: false,
    supportsTransparency: true,
    description: 'Lossless raster graphics with full alpha channel transparency.',
  },
  {
    id: 'jpeg',
    label: 'JPG',
    ext: 'jpg',
    mime: 'image/jpeg',
    supportsQuality: true,
    supportsTransparency: false,
    description: 'Universal photographic compression with adjustable quality.',
  },
  {
    id: 'avif',
    label: 'AVIF',
    ext: 'avif',
    mime: 'image/avif',
    supportsQuality: true,
    supportsTransparency: true,
    description: 'Next-generation AV1 image codec with ultra-small file sizes.',
  },
  {
    id: 'ico',
    label: 'ICO',
    ext: 'ico',
    mime: 'image/x-icon',
    supportsQuality: false,
    supportsTransparency: true,
    description: 'Windows application and browser favicon icon container.',
  },
  {
    id: 'bmp',
    label: 'BMP',
    ext: 'bmp',
    mime: 'image/bmp',
    supportsQuality: false,
    supportsTransparency: false,
    description: 'Uncompressed 24-bit device-independent bitmap image.',
  },
  {
    id: 'tiff',
    label: 'TIFF',
    ext: 'tiff',
    mime: 'image/tiff',
    supportsQuality: false,
    supportsTransparency: true,
    description: 'Archival uncompressed RGBA tagged image file format.',
  },
  {
    id: 'svg',
    label: 'SVG',
    ext: 'svg',
    mime: 'image/svg+xml',
    supportsQuality: false,
    supportsTransparency: true,
    description: 'Scalable vector container with embedded lossless pixel layer.',
  },
];

export const FORMAT_MAP: Record<OutputFormat, FormatInfo> = FORMAT_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<OutputFormat, FormatInfo>
);

export const RESIZE_PRESETS: ResizePreset[] = [
  {
    id: 'ig-square',
    label: 'Instagram Square (1080 × 1080)',
    category: 'Social',
    width: 1080,
    height: 1080,
    fitMode: 'cover',
  },
  {
    id: 'ig-portrait',
    label: 'Instagram Portrait (1080 × 1350)',
    category: 'Social',
    width: 1080,
    height: 1350,
    fitMode: 'cover',
  },
  {
    id: 'ig-story',
    label: 'Story / Reels (1080 × 1920)',
    category: 'Social',
    width: 1080,
    height: 1920,
    fitMode: 'cover',
  },
  {
    id: 'yt-thumb',
    label: 'YouTube Thumbnail (1280 × 720)',
    category: 'Social',
    width: 1280,
    height: 720,
    fitMode: 'cover',
  },
  {
    id: 'og-card',
    label: 'OpenGraph / Link Card (1200 × 630)',
    category: 'Web & UI',
    width: 1200,
    height: 630,
    fitMode: 'cover',
  },
  {
    id: 'favicon',
    label: 'Browser Favicon (32 × 32)',
    category: 'Web & UI',
    width: 32,
    height: 32,
    fitMode: 'contain',
  },
  {
    id: 'app-icon',
    label: 'App Icon (512 × 512)',
    category: 'Web & UI',
    width: 512,
    height: 512,
    fitMode: 'contain',
  },
  {
    id: 'fhd',
    label: 'Full HD 1080p (1920 × 1080)',
    category: 'Display',
    width: 1920,
    height: 1080,
    fitMode: 'contain',
  },
  {
    id: 'uhd-4k',
    label: '4K UHD (3840 × 2160)',
    category: 'Display',
    width: 3840,
    height: 2160,
    fitMode: 'contain',
  },
];

export const DEFAULT_SETTINGS: ConvertSettings = {
  format: 'webp',
  quality: 85,
  resizeMode: 'none',
  width: 1920,
  height: 1080,
  lockAspect: true,
  fitMode: 'contain',
  percentage: 50,
  maxEdge: 1600,
  noUpscale: true,
  targetKb: 250,
  rotate: 0,
  flipH: false,
  flipV: false,
  backgroundColor: '#ffffff',
  smoothing: 'high',
  icoSize: 'multi',
  filenameSuffix: '',
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value >= 100 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`;
}

export function formatSavings(originalBytes: number, newBytes: number): {
  label: string;
  isSmaller: boolean;
  percent: number;
} {
  if (originalBytes <= 0) {
    return { label: '0%', isSmaller: false, percent: 0 };
  }
  const diff = originalBytes - newBytes;
  const pct = (Math.abs(diff) / originalBytes) * 100;
  if (diff > 0) {
    return {
      label: `-${pct.toFixed(1)}%`,
      isSmaller: true,
      percent: pct,
    };
  }
  if (diff < 0) {
    return {
      label: `+${pct.toFixed(1)}%`,
      isSmaller: false,
      percent: pct,
    };
  }
  return { label: '0%', isSmaller: true, percent: 0 };
}

export function buildOutputFilename(
  originalName: string,
  format: OutputFormat,
  width: number,
  height: number,
  suffixTemplate: string
): string {
  const dotIdx = originalName.lastIndexOf('.');
  const base = dotIdx > 0 ? originalName.slice(0, dotIdx) : originalName;
  const ext = FORMAT_MAP[format].ext;
  const resolvedSuffix = suffixTemplate
    .replaceAll('{width}', String(width))
    .replaceAll('{height}', String(height))
    .replaceAll('{format}', ext);
  return `${base}${resolvedSuffix}.${ext}`;
}

export function detectInputFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg') return 'JPG';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  if (ext === 'avif') return 'AVIF';
  if (ext === 'gif') return 'GIF';
  if (ext === 'bmp') return 'BMP';
  if (ext === 'ico') return 'ICO';
  if (ext === 'svg') return 'SVG';
  if (ext === 'tif' || ext === 'tiff') return 'TIFF';
  if (file.type.startsWith('image/')) {
    return file.type.replace('image/', '').toUpperCase();
  }
  return ext.toUpperCase() || 'IMG';
}

const SUPPORTED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'gif',
  'bmp',
  'ico',
  'svg',
  'tif',
  'tiff',
]);

export function isSupportedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.has(ext);
}
