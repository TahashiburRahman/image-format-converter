import { Check, Minus } from 'lucide-react';
import type { BrowserCapabilities } from '../types/image';
import { FORMAT_LIST } from '../utils/formatters';

interface FormatMatrixViewProps {
  capabilities: BrowserCapabilities;
}

export function FormatMatrixView({ capabilities }: FormatMatrixViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-900 font-display">
          Local Codec &amp; Format Matrix
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
          Every conversion runs directly inside your browser engine using HTML5 Canvas, pure JavaScript encoders (BMP, ICO, TIFF, SVG), and JSZip. No remote servers or cloud queues are ever used.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Format</th>
                <th className="py-3 px-4">Extension</th>
                <th className="py-3 px-4">Transparency</th>
                <th className="py-3 px-4">Quality Control</th>
                <th className="py-3 px-4">Browser Status</th>
                <th className="py-3 pl-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {FORMAT_LIST.map((fmt) => {
                const supported =
                  fmt.id === 'avif'
                    ? capabilities.avif
                    : fmt.id === 'webp'
                      ? capabilities.webp
                      : true;

                return (
                  <tr key={fmt.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900">
                      {fmt.label}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      .{fmt.ext}
                    </td>
                    <td className="py-3.5 px-4">
                      {fmt.supportsTransparency ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          <span>Alpha</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Minus className="w-3.5 h-3.5" />
                          <span>Opaque</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      {fmt.supportsQuality ? 'Lossy / Target KB' : 'Lossless / Container'}
                    </td>
                    <td className="py-3.5 px-4">
                      {supported ? (
                        <span className="text-xs font-medium text-emerald-700">
                          Ready locally
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700">
                          Encode unavailable in this browser
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-xs text-slate-600">
                      {fmt.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 font-display">
          Supported Input Formats
        </h3>
        <p className="mt-1.5 text-sm text-slate-600">
          You can drop PNG, JPG/JPEG, WebP, AVIF, GIF, BMP, ICO, SVG, and TIFF files (including mixed-format batches and entire folders). EXIF and GPS location metadata are automatically stripped when re-encoding locally.
        </p>
      </div>
    </div>
  );
}
