import type { ConvertSettings, QueueItem } from '../types/image';
import {
  canvasToBlob,
  decodeTiffToCanvas,
  encodeBmp,
  encodeIco,
  encodeSvgWrapper,
  encodeTiff,
} from './encoders';
import { buildOutputFilename, detectInputFormat, FORMAT_MAP } from './formatters';

interface LoadedSource {
  width: number;
  height: number;
  previewUrl: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image in browser.'));
    img.src = src;
  });
}

export async function loadImageFile(file: File): Promise<LoadedSource> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'tif' || ext === 'tiff' || file.type === 'image/tiff') {
    const buffer = await file.arrayBuffer();
    const canvas = decodeTiffToCanvas(buffer);
    const pngBlob = await canvasToBlob(canvas, 'image/png');
    const previewUrl = URL.createObjectURL(pngBlob);
    return {
      width: canvas.width,
      height: canvas.height,
      previewUrl,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const width = img.naturalWidth || img.width || 800;
    const height = img.naturalHeight || img.height || 600;
    return {
      width,
      height,
      previewUrl: objectUrl,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export interface TargetDimensions {
  width: number;
  height: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

export function computeTargetDimensions(
  srcW: number,
  srcH: number,
  settings: ConvertSettings
): TargetDimensions {
  const isRotated90 = settings.rotate === 90 || settings.rotate === 270;
  const orientedW = isRotated90 ? srcH : srcW;
  const orientedH = isRotated90 ? srcW : srcH;

  let targetW = orientedW;
  let targetH = orientedH;

  if (settings.resizeMode === 'percentage') {
    const factor = Math.max(1, Math.min(400, settings.percentage)) / 100;
    targetW = Math.max(1, Math.round(orientedW * factor));
    targetH = Math.max(1, Math.round(orientedH * factor));
  } else if (settings.resizeMode === 'max-edge') {
    const maxEdge = Math.max(1, settings.maxEdge);
    const longest = Math.max(orientedW, orientedH);
    if (longest > maxEdge || !settings.noUpscale) {
      const scale = maxEdge / longest;
      targetW = Math.max(1, Math.round(orientedW * scale));
      targetH = Math.max(1, Math.round(orientedH * scale));
    }
  } else if (settings.resizeMode === 'dimensions') {
    let reqW = Math.max(1, Math.round(settings.width));
    let reqH = Math.max(1, Math.round(settings.height));

    if (settings.fitMode === 'contain') {
      let scale = Math.min(reqW / orientedW, reqH / orientedH);
      if (settings.noUpscale && scale > 1) scale = 1;
      targetW = Math.max(1, Math.round(orientedW * scale));
      targetH = Math.max(1, Math.round(orientedH * scale));
    } else if (settings.fitMode === 'pad') {
      targetW = reqW;
      targetH = reqH;
      let scale = Math.min(targetW / orientedW, targetH / orientedH);
      if (settings.noUpscale && scale > 1) scale = 1;
      const drawW = Math.max(1, Math.round(orientedW * scale));
      const drawH = Math.max(1, Math.round(orientedH * scale));
      return {
        width: targetW,
        height: targetH,
        drawX: Math.round((targetW - drawW) / 2),
        drawY: Math.round((targetH - drawH) / 2),
        drawW,
        drawH,
        cropX: 0,
        cropY: 0,
        cropW: orientedW,
        cropH: orientedH,
      };
    } else if (settings.fitMode === 'cover') {
      if (settings.noUpscale && (reqW > orientedW || reqH > orientedH)) {
        const downScale = Math.min(orientedW / reqW, orientedH / reqH);
        reqW = Math.max(1, Math.round(reqW * downScale));
        reqH = Math.max(1, Math.round(reqH * downScale));
      }
      targetW = reqW;
      targetH = reqH;
      const targetRatio = targetW / targetH;
      const srcRatio = orientedW / orientedH;
      let cropW = orientedW;
      let cropH = orientedH;
      let cropX = 0;
      let cropY = 0;

      if (srcRatio > targetRatio) {
        cropW = Math.round(orientedH * targetRatio);
        cropX = Math.round((orientedW - cropW) / 2);
      } else if (srcRatio < targetRatio) {
        cropH = Math.round(orientedW / targetRatio);
        cropY = Math.round((orientedH - cropH) / 2);
      }

      return {
        width: targetW,
        height: targetH,
        drawX: 0,
        drawY: 0,
        drawW: targetW,
        drawH: targetH,
        cropX,
        cropY,
        cropW,
        cropH,
      };
    } else {
      // stretch
      if (settings.noUpscale) {
        targetW = Math.min(orientedW, reqW);
        targetH = Math.min(orientedH, reqH);
      } else {
        targetW = reqW;
        targetH = reqH;
      }
    }
  }

  return {
    width: targetW,
    height: targetH,
    drawX: 0,
    drawY: 0,
    drawW: targetW,
    drawH: targetH,
    cropX: 0,
    cropY: 0,
    cropW: orientedW,
    cropH: orientedH,
  };
}

function createOrientedCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  settings: ConvertSettings
): HTMLCanvasElement {
  const isRotated90 = settings.rotate === 90 || settings.rotate === 270;
  const outW = isRotated90 ? srcH : srcW;
  const outH = isRotated90 ? srcW : srcH;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create 2D canvas.');

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  if (settings.rotate !== 0) {
    ctx.rotate((settings.rotate * Math.PI) / 180);
  }
  ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  ctx.drawImage(source, -srcW / 2, -srcH / 2, srcW, srcH);
  ctx.restore();

  return canvas;
}

/**
 * Multi-step progressive downscale when shrinking >2x with high smoothing
 * to preserve crisp detail and avoid moire aliasing.
 */
function drawResizedRegion(
  srcCanvas: HTMLCanvasElement,
  target: TargetDimensions,
  smoothing: 'high' | 'pixelated',
  fillColor: string | null
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = target.width;
  outCanvas.height = target.height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Unable to create output 2D canvas.');

  if (fillColor) {
    outCtx.fillStyle = fillColor;
    outCtx.fillRect(0, 0, target.width, target.height);
  }

  let workingCanvas = srcCanvas;
  let sx = target.cropX;
  let sy = target.cropY;
  let sw = target.cropW;
  let sh = target.cropH;

  // Crop first if needed before progressive step-down
  if (sx !== 0 || sy !== 0 || sw !== srcCanvas.width || sh !== srcCanvas.height) {
    const cropped = document.createElement('canvas');
    cropped.width = sw;
    cropped.height = sh;
    const cCtx = cropped.getContext('2d');
    if (cCtx) {
      cCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      workingCanvas = cropped;
      sx = 0;
      sy = 0;
    }
  }

  if (smoothing === 'high' && (sw > target.drawW * 2 || sh > target.drawH * 2)) {
    let curW = sw;
    let curH = sh;
    while (curW * 0.5 > target.drawW && curH * 0.5 > target.drawH) {
      const nextW = Math.max(target.drawW, Math.round(curW * 0.5));
      const nextH = Math.max(target.drawH, Math.round(curH * 0.5));
      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = nextW;
      stepCanvas.height = nextH;
      const stepCtx = stepCanvas.getContext('2d');
      if (!stepCtx) break;
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(workingCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
      workingCanvas = stepCanvas;
      curW = nextW;
      curH = nextH;
    }
    sw = curW;
    sh = curH;
  }

  if (smoothing === 'pixelated') {
    outCtx.imageSmoothingEnabled = false;
  } else {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
  }

  outCtx.drawImage(
    workingCanvas,
    sx,
    sy,
    sw,
    sh,
    target.drawX,
    target.drawY,
    target.drawW,
    target.drawH
  );

  return outCanvas;
}

async function encodeWithTargetSize(
  canvas: HTMLCanvasElement,
  mime: string,
  targetBytes: number
): Promise<Blob> {
  let low = 0.08;
  let high = 0.98;
  let bestBlob = await canvasToBlob(canvas, mime, 0.85);

  if (bestBlob.size <= targetBytes) {
    // Try pushing quality higher first
    const maxBlob = await canvasToBlob(canvas, mime, high);
    if (maxBlob.size <= targetBytes) return maxBlob;
  }

  let fallbackBlob = await canvasToBlob(canvas, mime, low);
  if (fallbackBlob.size > targetBytes) {
    return fallbackBlob;
  }

  bestBlob = fallbackBlob;
  for (let i = 0; i < 8; i++) {
    const mid = (low + high) / 2;
    const candidate = await canvasToBlob(canvas, mime, mid);
    if (candidate.size <= targetBytes) {
      bestBlob = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  return bestBlob;
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  filename: string;
  processingMs: number;
}

export async function processImageItem(
  item: QueueItem,
  settings: ConvertSettings
): Promise<ProcessResult> {
  const start = performance.now();
  const img = await loadImageElement(item.previewUrl);
  const srcW = item.originalWidth || img.naturalWidth || 800;
  const srcH = item.originalHeight || img.naturalHeight || 600;

  const oriented = createOrientedCanvas(img, srcW, srcH, settings);
  const target = computeTargetDimensions(srcW, srcH, settings);

  const formatInfo = FORMAT_MAP[settings.format];
  const needsOpaqueBackground =
    !formatInfo.supportsTransparency ||
    (settings.resizeMode === 'dimensions' &&
      settings.fitMode === 'pad' &&
      settings.backgroundColor !== 'transparent');

  const fillColor = needsOpaqueBackground
    ? settings.backgroundColor === 'transparent'
      ? '#ffffff'
      : settings.backgroundColor
    : null;

  const outCanvas = drawResizedRegion(
    oriented,
    target,
    settings.smoothing,
    fillColor
  );

  let blob: Blob;
  let finalW = outCanvas.width;
  let finalH = outCanvas.height;

  if (settings.format === 'bmp') {
    const ctx = outCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not read canvas image data.');
    blob = encodeBmp(ctx.getImageData(0, 0, finalW, finalH));
  } else if (settings.format === 'tiff') {
    const ctx = outCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not read canvas image data.');
    blob = encodeTiff(ctx.getImageData(0, 0, finalW, finalH));
  } else if (settings.format === 'svg') {
    const dataUrl = outCanvas.toDataURL('image/png');
    blob = encodeSvgWrapper(dataUrl, finalW, finalH);
  } else if (settings.format === 'ico') {
    const sizes =
      settings.icoSize === 'multi'
        ? [16, 32, 48, 64, 128, 256]
        : [settings.icoSize];
    const iconCanvases = sizes.map((sz) => {
      const c = document.createElement('canvas');
      c.width = sz;
      c.height = sz;
      const cCtx = c.getContext('2d');
      if (cCtx) {
        cCtx.imageSmoothingEnabled = settings.smoothing === 'high';
        cCtx.imageSmoothingQuality = 'high';
        // Fit proportionally into square icon frame
        const scale = Math.min(sz / outCanvas.width, sz / outCanvas.height);
        const dw = Math.max(1, Math.round(outCanvas.width * scale));
        const dh = Math.max(1, Math.round(outCanvas.height * scale));
        const dx = Math.round((sz - dw) / 2);
        const dy = Math.round((sz - dh) / 2);
        cCtx.drawImage(outCanvas, dx, dy, dw, dh);
      }
      return c;
    });
    blob = await encodeIco(iconCanvases);
    finalW = sizes[sizes.length - 1];
    finalH = sizes[sizes.length - 1];
  } else if (
    settings.resizeMode === 'target-size' &&
    formatInfo.supportsQuality
  ) {
    blob = await encodeWithTargetSize(
      outCanvas,
      formatInfo.mime,
      Math.max(5, settings.targetKb) * 1024
    );
  } else {
    const qualityArg = formatInfo.supportsQuality
      ? Math.max(0.01, Math.min(1, settings.quality / 100))
      : undefined;
    blob = await canvasToBlob(outCanvas, formatInfo.mime, qualityArg);
  }

  const filename = buildOutputFilename(
    item.name,
    settings.format,
    finalW,
    finalH,
    settings.filenameSuffix
  );

  const url = URL.createObjectURL(blob);
  const processingMs = Math.max(1, Math.round(performance.now() - start));

  return {
    blob,
    url,
    size: blob.size,
    width: finalW,
    height: finalH,
    filename,
    processingMs,
  };
}

export async function generateSampleBatchFiles(): Promise<File[]> {
  const files: File[] = [];

  // 1. Crisp Transparent SVG Logo Mark
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    <rect x="120" y="120" width="960" height="960" rx="220" fill="url(#g1)"/>
    <circle cx="600" cy="600" r="290" fill="none" stroke="#dc2626" stroke-width="52"/>
    <path d="M470 600 L565 695 L750 495" fill="none" stroke="#ffffff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  files.push(
    new File([svgMarkup], 'brand-emblem.svg', { type: 'image/svg+xml' })
  );

  // 2. High-Resolution Landscape Photo-Style PNG (1920x1280)
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = 1920;
  photoCanvas.height = 1280;
  const pCtx = photoCanvas.getContext('2d');
  if (pCtx) {
    const grad = pCtx.createLinearGradient(0, 0, 1920, 1280);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#475569');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 1920, 1280);

    // Architectural studio shapes
    pCtx.fillStyle = '#dc2626';
    pCtx.beginPath();
    pCtx.arc(1380, 420, 260, 0, Math.PI * 2);
    pCtx.fill();

    pCtx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 6; i++) {
      pCtx.fillRect(160 + i * 260, 760 - i * 45, 200, 520 + i * 45);
    }

    pCtx.fillStyle = '#f8fafc';
    pCtx.font = 'bold 72px sans-serif';
    pCtx.fillText('ARCHITECTURAL STUDY 01', 160, 260);
    pCtx.fillStyle = '#cbd5e1';
    pCtx.font = '36px sans-serif';
    pCtx.fillText('1920 x 1280 Studio Master Render', 160, 330);

    const pngBlob = await canvasToBlob(photoCanvas, 'image/png');
    files.push(new File([pngBlob], 'studio-render-1920x1280.png', { type: 'image/png' }));
  }

  // 3. Product Portrait JPG (1200x1500)
  const prodCanvas = document.createElement('canvas');
  prodCanvas.width = 1200;
  prodCanvas.height = 1500;
  const cCtx = prodCanvas.getContext('2d');
  if (cCtx) {
    cCtx.fillStyle = '#f1f5f9';
    cCtx.fillRect(0, 0, 1200, 1500);
    cCtx.fillStyle = '#e2e8f0';
    cCtx.fillRect(140, 180, 920, 920);
    cCtx.fillStyle = '#0f172a';
    cCtx.beginPath();
    cCtx.arc(600, 640, 270, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.fillStyle = '#dc2626';
    cCtx.fillRect(460, 500, 280, 280);
    cCtx.fillStyle = '#0f172a';
    cCtx.font = 'bold 52px sans-serif';
    cCtx.fillText('PRODUCT LOOKBOOK', 140, 1230);
    cCtx.fillStyle = '#64748b';
    cCtx.font = '32px sans-serif';
    cCtx.fillText('1200 x 1500 Portrait Asset', 140, 1290);

    const jpgBlob = await canvasToBlob(prodCanvas, 'image/jpeg', 0.92);
    files.push(new File([jpgBlob], 'lookbook-portrait.jpg', { type: 'image/jpeg' }));
  }

  return files;
}

export { detectInputFormat };
