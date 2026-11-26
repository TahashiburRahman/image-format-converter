import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const standaloneOutDir = path.join(rootDir, 'dist-standalone');
const publicDir = path.join(rootDir, 'public');
const zipPath = path.join(publicDir, 'LocalConvert-Offline-Standalone.zip');

console.log('Building standalone single-file offline bundle...');
execSync('npx vite build --config vite.config.standalone.ts', {
  stdio: 'inherit',
  cwd: rootDir,
});

const builtHtmlPath = path.join(standaloneOutDir, 'index.html');
if (!fs.existsSync(builtHtmlPath)) {
  throw new Error(`Expected standalone HTML at ${builtHtmlPath}`);
}

const htmlContent = fs.readFileSync(builtHtmlPath);

const readmeContent = `LocalConvert — Offline Image Converter & Bulk Resizer
======================================================

How to run 100% offline on your PC (No internet or AI Studio required):

1. Extract this ZIP archive to any folder on your computer.
2. Double-click "LocalConvert-Offline.html" to open it in Chrome, Edge, Firefox, or Safari.
3. Drag and drop images or entire folders to convert formats and bulk resize locally.

Notes:
- All conversion, resizing, compression, and ZIP creation run strictly inside your browser.
- Supported inputs: PNG, JPG, WebP, AVIF, GIF, BMP, ICO, TIFF, SVG.
- Supported outputs: WebP, PNG, JPG, AVIF (on supported browsers), ICO (single or multi-size), BMP, TIFF, SVG.
- EXIF and GPS metadata are automatically stripped during local re-encoding.
`;

fs.mkdirSync(publicDir, { recursive: true });

const zip = new JSZip();
zip.file('LocalConvert-Offline.html', htmlContent);
zip.file('README.txt', readmeContent);

const zipBuffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});

fs.writeFileSync(zipPath, zipBuffer);
fs.rmSync(standaloneOutDir, { recursive: true, force: true });

console.log(
  `Created ${zipPath} (${(zipBuffer.byteLength / 1024).toFixed(1)} KB)`
);
