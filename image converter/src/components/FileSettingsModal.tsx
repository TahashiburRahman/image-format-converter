import { Lock, RotateCcw, Unlock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  BrowserCapabilities,
  ConvertSettings,
  FitMode,
  OutputFormat,
  QueueItem,
  ResizeMode,
  RotationAngle,
} from '../types/image';
import { FORMAT_LIST, FORMAT_MAP } from '../utils/formatters';

interface FileSettingsModalProps {
  item: QueueItem | null;
  globalSettings: ConvertSettings;
  capabilities: BrowserCapabilities;
  onClose: () => void;
  onSaveCustom: (id: string, settings: ConvertSettings) => void;
  onResetToGlobal: (id: string) => void;
}

export function FileSettingsModal({
  item,
  globalSettings,
  capabilities,
  onClose,
  onSaveCustom,
  onResetToGlobal,
}: FileSettingsModalProps) {
  const [draft, setDraft] = useState<ConvertSettings>(globalSettings);

  useEffect(() => {
    if (item) {
      const base = item.useCustomSettings ? item.customSettings : globalSettings;
      setDraft({
        ...base,
        width:
          base.resizeMode === 'none' ? item.originalWidth : base.width,
        height:
          base.resizeMode === 'none' ? item.originalHeight : base.height,
      });
    }
  }, [item, globalSettings]);

  if (!item) return null;

  const aspect =
    item.originalHeight > 0 ? item.originalWidth / item.originalHeight : 1;

  const update = <K extends keyof ConvertSettings>(
    key: K,
    value: ConvertSettings[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleWidth = (val: string) => {
    const w = Math.max(1, Math.min(16384, Number(val) || 1));
    if (draft.lockAspect) {
      setDraft((prev) => ({
        ...prev,
        width: w,
        height: Math.max(1, Math.round(w / aspect)),
      }));
    } else {
      update('width', w);
    }
  };

  const handleHeight = (val: string) => {
    const h = Math.max(1, Math.min(16384, Number(val) || 1));
    if (draft.lockAspect) {
      setDraft((prev) => ({
        ...prev,
        width: Math.max(1, Math.round(h * aspect)),
        height: h,
      }));
    } else {
      update('height', h);
    }
  };

  const formatInfo = FORMAT_MAP[draft.format];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Custom settings for ${item.name}`}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate font-display">
              Custom Options: {item.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
              Source: {item.originalWidth} × {item.originalHeight} px ·{' '}
              {item.originalFormat}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Format + Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Output Format
              </label>
              <select
                value={draft.format}
                onChange={(e) => update('format', e.target.value as OutputFormat)}
                className="w-full h-9 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                {FORMAT_LIST.map((fmt) => (
                  <option
                    key={fmt.id}
                    value={fmt.id}
                    disabled={fmt.id === 'avif' && !capabilities.avif}
                  >
                    {fmt.label} (.{fmt.ext})
                  </option>
                ))}
              </select>
            </div>

            {formatInfo.supportsQuality && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Quality
                  </label>
                  <span className="text-xs font-mono tabular-nums text-slate-900">
                    {draft.quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={draft.quality}
                  onChange={(e) => update('quality', Number(e.target.value))}
                  className="w-full h-9 accent-red-700 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Resize Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Resize Mode
            </label>
            <select
              value={draft.resizeMode}
              onChange={(e) =>
                update('resizeMode', e.target.value as ResizeMode)
              }
              className="w-full h-9 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="none">Original Size (No Resize)</option>
              <option value="dimensions">Exact / Fit Dimensions (px)</option>
              <option value="percentage">Scale by Percentage (%)</option>
              <option value="max-edge">Constrain Longest Side (px)</option>
              <option value="target-size">Target File Size (KB)</option>
            </select>
          </div>

          {draft.resizeMode === 'dimensions' && (
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-end gap-2.5">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16384}
                    value={draft.width}
                    onChange={(e) => handleWidth(e.target.value)}
                    className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => update('lockAspect', !draft.lockAspect)}
                  className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border cursor-pointer ${
                    draft.lockAspect
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  {draft.lockAspect ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16384}
                    value={draft.height}
                    onChange={(e) => handleHeight(e.target.value)}
                    className="w-full h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fit Mode
                </label>
                <select
                  value={draft.fitMode}
                  onChange={(e) => update('fitMode', e.target.value as FitMode)}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="contain">Contain (Fit Within Box)</option>
                  <option value="cover">Cover (Fill &amp; Center Crop)</option>
                  <option value="pad">Pad (Letterbox Margin)</option>
                  <option value="stretch">Stretch (Exact W × H)</option>
                </select>
              </div>
            </div>
          )}

          {draft.resizeMode === 'percentage' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Scale Percentage (%)
              </label>
              <input
                type="number"
                min={1}
                max={400}
                value={draft.percentage}
                onChange={(e) =>
                  update(
                    'percentage',
                    Math.max(1, Math.min(400, Number(e.target.value) || 1))
                  )
                }
                className="w-32 h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {draft.resizeMode === 'max-edge' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Max Longest Side (px)
              </label>
              <input
                type="number"
                min={16}
                max={16384}
                value={draft.maxEdge}
                onChange={(e) =>
                  update(
                    'maxEdge',
                    Math.max(16, Math.min(16384, Number(e.target.value) || 16))
                  )
                }
                className="w-32 h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {draft.resizeMode === 'target-size' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Target Max Size (KB)
              </label>
              <input
                type="number"
                min={5}
                max={50000}
                value={draft.targetKb}
                onChange={(e) =>
                  update(
                    'targetKb',
                    Math.max(5, Math.min(50000, Number(e.target.value) || 5))
                  )
                }
                className="w-32 h-9 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {/* Transform row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Rotation
              </label>
              <select
                value={draft.rotate}
                onChange={(e) =>
                  update('rotate', Number(e.target.value) as RotationAngle)
                }
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value={0}>0° (Original)</option>
                <option value={90}>90° Clockwise</option>
                <option value={180}>180°</option>
                <option value={270}>270° Clockwise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Matte Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    draft.backgroundColor === 'transparent'
                      ? '#ffffff'
                      : draft.backgroundColor
                  }
                  onChange={(e) => update('backgroundColor', e.target.value)}
                  className="h-9 w-12 p-1 bg-white border border-slate-300 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600">
                  {draft.backgroundColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          {item.useCustomSettings ? (
            <button
              type="button"
              onClick={() => {
                onResetToGlobal(item.id);
                onClose();
              }}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-slate-700 hover:text-red-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Use Global Batch Settings</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveCustom(item.id, draft);
                onClose();
              }}
              className="h-9 px-4 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
            >
              Apply to File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
