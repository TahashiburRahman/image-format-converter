import UTIF from 'utif2';
import type { BrowserCapabilities } from '../types/image';

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Browser could not encode ${mimeType}`));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
  const probe = document.createElement('canvas');
  probe.width = 4;
  probe.height = 4;
  const ctx = probe.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 4, 4);
  }

  const checkMime = async (mime: string): Promise<boolean> => {
    try {
      const blob = await canvasToBlob(probe, mime, 0.8);
      return blob.type === mime;
    } catch {
      return false;
    }
  };

  const [webp, avif] = await Promise.all([
    checkMime('image/webp'),
    checkMime('image/avif'),
  ]);

  return { webp, avif };
}

/**
 * Pure TypeScript 24-bit uncompressed BGR BMP encoder.
 * Works identically on http:// and file:// with zero external dependencies.
 */
export function encodeBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowStride * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // BITMAPFILEHEADER (14 bytes)
  bytes[0] = 0x42; // 'B'
  bytes[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, headerSize, true);

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive => bottom-up
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // 72 DPI horizontal
  view.setInt32(42, 2835, true); // 72 DPI vertical
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    const dstOffset = headerSize + y * rowStride;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4;
      const dstIdx = dstOffset + x * 3;
      bytes[dstIdx] = data[srcIdx + 2]; // Blue
      bytes[dstIdx + 1] = data[srcIdx + 1]; // Green
      bytes[dstIdx + 2] = data[srcIdx]; // Red
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Pure TypeScript PNG-in-ICO multi-size icon encoder.
 */
export async function encodeIco(canvases: HTMLCanvasElement[]): Promise<Blob> {
  const entries = await Promise.all(
    canvases.map(async (canvas) => {
      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const arrayBuffer = await pngBlob.arrayBuffer();
      return {
        width: canvas.width,
        height: canvas.height,
        data: new Uint8Array(arrayBuffer),
      };
    })
  );

  const count = entries.length;
  const headerSize = 6;
  const dirSize = count * 16;
  const totalDataSize = entries.reduce((sum, entry) => sum + entry.data.byteLength, 0);
  const totalSize = headerSize + dirSize + totalDataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);

  // ICONDIR header
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = ICO
  view.setUint16(4, count, true);

  let dataOffset = headerSize + dirSize;

  for (let i = 0; i < count; i++) {
    const entry = entries[i];
    const dirOffset = headerSize + i * 16;
    out[dirOffset] = entry.width >= 256 ? 0 : entry.width;
    out[dirOffset + 1] = entry.height >= 256 ? 0 : entry.height;
    out[dirOffset + 2] = 0; // palette count
    out[dirOffset + 3] = 0; // reserved
    view.setUint16(dirOffset + 4, 1, true); // color planes
    view.setUint16(dirOffset + 6, 32, true); // bits per pixel
    view.setUint32(dirOffset + 8, entry.data.byteLength, true);
    view.setUint32(dirOffset + 12, dataOffset, true);

    out.set(entry.data, dataOffset);
    dataOffset += entry.data.byteLength;
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

/**
 * Pure JS TIFF encoder via utif2.
 */
export function encodeTiff(imageData: ImageData): Blob {
  const tiffBuffer = UTIF.encodeImage(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height
  );
  return new Blob([tiffBuffer], { type: 'image/tiff' });
}

/**
 * Pure JS TIFF decoder via utif2 returning an HTMLCanvasElement.
 */
export function decodeTiffToCanvas(arrayBuffer: ArrayBuffer): HTMLCanvasElement {
  const ifds = UTIF.decode(arrayBuffer);
  if (!ifds.length) {
    throw new Error('Invalid or empty TIFF file.');
  }

  let target = ifds[0];
  let candidates = ifds;
  if (ifds[0].subIFD && ifds[0].subIFD.length > 0) {
    candidates = candidates.concat(ifds[0].subIFD);
  }
  let maxArea = 0;
  for (const ifd of candidates) {
    const w = ifd.t256?.[0] ?? 0;
    const h = ifd.t257?.[0] ?? 0;
    if (w * h > maxArea) {
      maxArea = w * h;
      target = ifd;
    }
  }

  UTIF.decodeImage(arrayBuffer, target, ifds);
  const rgba = UTIF.toRGBA8(target);
  const w = target.width;
  const h = target.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context.');
  }
  const imgData = new ImageData(new Uint8ClampedArray(rgba), w, h);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Standalone SVG container wrapping embedded lossless PNG data at target dimensions.
 */
export function encodeSvgWrapper(
  pngDataUrl: string,
  width: number,
  height: number
): Blob {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${pngDataUrl}" />
</svg>
`;
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}
