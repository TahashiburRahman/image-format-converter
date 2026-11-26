import { Download, MoveHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { QueueItem } from '../types/image';
import { formatBytes, formatSavings } from '../utils/formatters';

interface BeforeAfterModalProps {
  item: QueueItem | null;
  onClose: () => void;
  onDownload: (item: QueueItem) => void;
}

export function BeforeAfterModal({
  item,
  onClose,
  onDownload,
}: BeforeAfterModalProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'side'>('split');

  if (!item) return null;

  const hasOutput = Boolean(item.outputUrl && item.outputSize !== undefined);
  const savings =
    hasOutput && item.outputSize !== undefined
      ? formatSavings(item.originalSize, item.outputSize)
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visual comparison for ${item.name}`}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate font-display">
              {item.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
              Original: {item.originalFormat} · {item.originalWidth} ×{' '}
              {item.originalHeight} px · {formatBytes(item.originalSize)}
              {hasOutput &&
                `  →  Output: ${item.outputFormat?.toUpperCase()} · ${item.outputWidth} × ${item.outputHeight} px · ${formatBytes(item.outputSize ?? 0)} (${savings?.label})`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasOutput && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Split Slider
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('side')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    viewMode === 'side'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Side by Side
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-5 bg-slate-50">
          {!hasOutput ? (
            <div className="h-[420px] checkerboard-bg border border-slate-200 rounded-lg flex items-center justify-center p-4">
              <img
                src={item.previewUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : viewMode === 'side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 text-xs font-medium text-slate-700 flex justify-between font-mono tabular-nums">
                  <span>Original ({item.originalFormat})</span>
                  <span>{formatBytes(item.originalSize)}</span>
                </div>
                <div className="h-80 checkerboard-bg flex items-center justify-center p-3">
                  <img
                    src={item.previewUrl}
                    alt={`Original ${item.name}`}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 text-xs font-medium text-slate-700 flex justify-between font-mono tabular-nums">
                  <span>Converted ({item.outputFormat?.toUpperCase()})</span>
                  <span>{formatBytes(item.outputSize ?? 0)}</span>
                </div>
                <div className="h-80 checkerboard-bg flex items-center justify-center p-3">
                  <img
                    src={item.outputUrl}
                    alt={`Converted ${item.name}`}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-[420px] checkerboard-bg border border-slate-200 rounded-lg overflow-hidden select-none">
                {/* Converted (Bottom full layer) */}
                <img
                  src={item.outputUrl}
                  alt={`Converted ${item.name}`}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                />

                {/* Original (Clipped left layer) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                >
                  <img
                    src={item.previewUrl}
                    alt={`Original ${item.name}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-4"
                  />
                </div>

                {/* Divider handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-700 pointer-events-none"
                  style={{ left: `${splitPercent}%` }}
                >
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-700 text-white shadow flex items-center justify-center">
                    <MoveHorizontal className="w-4 h-4" />
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-900/80 text-white text-xs font-mono">
                  Original · {formatBytes(item.originalSize)}
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-red-700/90 text-white text-xs font-mono">
                  Output · {formatBytes(item.outputSize ?? 0)}
                </div>

                <input
                  type="range"
                  aria-label="Comparison split slider"
                  min={0}
                  max={100}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Drag across the image to compare original vs converted output</span>
                {item.processingMs !== undefined && (
                  <span className="font-mono tabular-nums">
                    Processed locally in {item.processingMs} ms
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Close
          </button>
          {hasOutput && (
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="h-9 inline-flex items-center gap-2 px-4 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {item.outputFilename}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
