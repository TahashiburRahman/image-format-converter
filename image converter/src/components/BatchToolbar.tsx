import {
  Archive,
  ChevronDown,
  ChevronUp,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  Play,
  RotateCw,
  SlidersHorizontal,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';
import type {
  BrowserCapabilities,
  ConvertSettings,
  FitMode,
  IcoSizeOption,
  OutputFormat,
  ResizeMode,
  RotationAngle,
} from '../types/image';
import { FORMAT_LIST, FORMAT_MAP, RESIZE_PRESETS } from '../utils/formatters';

interface BatchToolbarProps {
  settings: ConvertSettings;
  onChange: (next: ConvertSettings) => void;
  capabilities: BrowserCapabilities;
  totalCount: number;
  doneCount: number;
  isProcessing: boolean;
  onConvertAll: () => void;
  onDownloadZip: () => void;
  isZipping: boolean;
  defaultExpandedOptions?: boolean;
  referenceAspect?: number;
}

export function BatchToolbar({
  settings,
  onChange,
  capabilities,
  totalCount,
  doneCount,
  isProcessing,
  onConvertAll,
  onDownloadZip,
  isZipping,
  defaultExpandedOptions = false,
  referenceAspect = 16 / 9,
}: BatchToolbarProps) {
  const [showAdvanced, setShowAdvanced] = useState(defaultExpandedOptions);

  const activeFormat = FORMAT_MAP[settings.format];

  const update = <K extends keyof ConvertSettings>(
    key: K,
    value: ConvertSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const handleWidthChange = (raw: string) => {
    const w = Math.max(1, Math.min(16384, Number(raw) || 1));
    if (settings.lockAspect && referenceAspect > 0) {
      const h = Math.max(1, Math.round(w / referenceAspect));
      onChange({ ...settings, width: w, height: h });
    } else {
      update('width', w);
    }
  };

  const handleHeightChange = (raw: string) => {
    const h = Math.max(1, Math.min(16384, Number(raw) || 1));
    if (settings.lockAspect && referenceAspect > 0) {
      const w = Math.max(1, Math.round(h * referenceAspect));
      onChange({ ...settings, width: w, height: h });
    } else {
      update('height', h);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = RESIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      ...settings,
      resizeMode: 'dimensions',
      width: preset.width,
      height: preset.height,
      fitMode: preset.fitMode,
      lockAspect: false,
    });
  };

  const cycleRotate = () => {
    const angles: RotationAngle[] = [0, 90, 180, 270];
    const next = angles[(angles.indexOf(settings.rotate) + 1) % angles.length];
    update('rotate', next);
  };

  const resizeModes: { id: ResizeMode; label: string }[] = [
    { id: 'none', label: 'Original Size' },
    { id: 'dimensions', label: 'Dimensions (px)' },
    { id: 'percentage', label: 'Percentage (%)' },
    { id: 'max-edge', label: 'Max Edge' },
    { id: 'target-size', label: 'Target KB' },
  ];

  return (
    <section
      aria-label="Batch conversion and resize controls"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
    >
      {/* Top Row: Format + Quality + Primary Batch Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label
              htmlFor="global-output-format"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Output Format
            </label>
            <select
              id="global-output-format"
              value={settings.format}
              onChange={(e) => update('format', e.target.value as OutputFormat)}
              className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              {FORMAT_LIST.map((fmt) => {
                const unsupportedAvif = fmt.id === 'avif' && !capabilities.avif;
                return (
                  <option
                    key={fmt.id}
                    value={fmt.id}
                    disabled={unsupportedAvif}
                  >
                    {fmt.label} (.{fmt.ext})
                    {unsupportedAvif ? ' — Unsupported in browser' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {activeFormat.supportsQuality &&
            settings.resizeMode !== 'target-size' && (
              <div className="min-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="global-quality"
                    className="text-xs font-medium text-slate-600"
                  >
                    Compression Quality
                  </label>
                  <span className="text-xs font-mono tabular-nums font-medium text-slate-900">
                    {settings.quality}%
                  </span>
                </div>
                <input
                  id="global-quality"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={settings.quality}
                  onChange={(e) => update('quality', Number(e.target.value))}
                  className="w-full h-10 accent-red-700 cursor-pointer"
                />
              </div>
            )}

          {settings.format === 'ico' && (
            <div className="min-w-[175px]">
              <label
                htmlFor="global-ico-size"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                ICO Resolution
              </label>
              <select
                id="global-ico-size"
                value={String(settings.icoSize)}
                onChange={(e) => {
                  const val = e.target.value;
                  update(
                    'icoSize',
                    val === 'multi' ? 'multi' : (Number(val) as IcoSizeOption)
                  );
                }}
                className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="multi">Multi-Size (16–256px)</option>
                <option value="256">256 × 256 px</option>
                <option value="128">128 × 128 px</option>
                <option value="64">64 × 64 px</option>
                <option value="48">48 × 48 px</option>
                <option value="32">32 × 32 px</option>
                <option value="16">16 × 16 px</option>
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="h-10 inline-flex items-center justify-center gap-2 px-3.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Transforms &amp; Options</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={totalCount === 0 || isProcessing}
            onClick={onConvertAll}
            className="h-10 inline-flex items-center gap-2 px-5 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isProcessing
                ? 'Processing...'
                : totalCount > 0
                  ? `Convert All (${totalCount})`
                  : 'Convert All'}
            </span>
          </button>

          <button
            type="button"
            disabled={doneCount === 0 || isZipping}
            onClick={onDownloadZip}
            className="h-10 inline-flex items-center gap-2 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Archive className="w-4 h-4" />
            <span>
              {isZipping
                ? 'Packaging ZIP...'
                : `Download ZIP (${doneCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        {/* Bulk Resize Mode Segmented Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {resizeModes.map((mode) => {
              const active = settings.resizeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => update('resizeMode', mode.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="resize-preset-select"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Preset:
            </label>
            <select
              id="resize-preset-select"
              value=""
              onChange={(e) => {
                if (e.target.value) applyPreset(e.target.value);
              }}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="" disabled>
                Choose social or device size...
              </option>
              {RESIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.category} — {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode-Specific Resize Controls */}
        {settings.resizeMode === 'dimensions' && (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <label
                htmlFor="resize-width"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Width (px)
              </label>
              <input
                id="resize-width"
                type="number"
                min={1}
                max={16384}
                value={settings.width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-28 h-9 px-3 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <button
              type="button"
              onClick={() => update('lockAspect', !settings.lockAspect)}
              title={
                settings.lockAspect
                  ? 'Aspect ratio locked'
                  : 'Aspect ratio unlocked'
              }
              aria-label={
                settings.lockAspect
                  ? 'Unlock aspect ratio'
                  : 'Lock aspect ratio'
              }
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                settings.lockAspect
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {settings.lockAspect ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>

            <div>
              <label
                htmlFor="resize-height"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Height (px)
              </label>
              <input
                id="resize-height"
                type="number"
                min={1}
                max={16384}
                value={settings.height}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-28 h-9 px-3 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div className="min-w-[180px]">
              <label
                htmlFor="resize-fit-mode"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Fit Behavior
              </label>
              <select
                id="resize-fit-mode"
                value={settings.fitMode}
                onChange={(e) => update('fitMode', e.target.value as FitMode)}
                className="w-full h-9 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="contain">Contain (Keep Ratio, Fit Inside)</option>
                <option value="cover">Cover (Exact Size, Center Crop)</option>
                <option value="pad">Pad (Exact Size, Add Margin)</option>
                <option value="stretch">Stretch (Exact W × H)</option>
              </select>
            </div>

            <label className="h-9 inline-flex items-center gap-2 px-3 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.noUpscale}
                onChange={(e) => update('noUpscale', e.target.checked)}
                className="w-4 h-4 rounded accent-red-700"
              />
              <span>Do not enlarge smaller images</span>
            </label>
          </div>
        )}

        {settings.resizeMode === 'percentage' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              {[25, 50, 75, 150, 200].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => update('percentage', pct)}
                  className={`h-9 px-3 text-xs font-mono tabular-nums font-medium rounded-lg border transition-colors cursor-pointer ${
                    settings.percentage === pct
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="resize-pct-custom"
                className="text-xs font-medium text-slate-600"
              >
                Custom:
              </label>
              <input
                id="resize-pct-custom"
                type="number"
                min={1}
                max={400}
                value={settings.percentage}
                onChange={(e) =>
                  update(
                    'percentage',
                    Math.max(1, Math.min(400, Number(e.target.value) || 1))
                  )
                }
                className="w-20 h-9 px-2.5 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
          </div>
        )}

        {settings.resizeMode === 'max-edge' && (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="resize-max-edge"
                className="text-xs font-medium text-slate-600"
              >
                Max Longest Side (px):
              </label>
              <input
                id="resize-max-edge"
                type="number"
                min={16}
                max={16384}
                value={settings.maxEdge}
                onChange={(e) =>
                  update(
                    'maxEdge',
                    Math.max(16, Math.min(16384, Number(e.target.value) || 16))
                  )
                }
                className="w-28 h-9 px-3 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {[800, 1200, 1600, 2048, 3840].map((px) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => update('maxEdge', px)}
                  className={`h-8 px-2.5 text-xs font-mono tabular-nums rounded-md border transition-colors cursor-pointer ${
                    settings.maxEdge === px
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {px}px
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.noUpscale}
                onChange={(e) => update('noUpscale', e.target.checked)}
                className="w-4 h-4 rounded accent-red-700"
              />
              <span>Do not enlarge smaller images</span>
            </label>
          </div>
        )}

        {settings.resizeMode === 'target-size' && (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="target-kb-input"
                className="text-xs font-medium text-slate-600"
              >
                Target Max File Size (KB):
              </label>
              <input
                id="target-kb-input"
                type="number"
                min={5}
                max={50000}
                value={settings.targetKb}
                onChange={(e) =>
                  update(
                    'targetKb',
                    Math.max(5, Math.min(50000, Number(e.target.value) || 5))
                  )
                }
                className="w-28 h-9 px-3 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {[50, 100, 250, 500, 1024].map((kb) => (
                <button
                  key={kb}
                  type="button"
                  onClick={() => update('targetKb', kb)}
                  className={`h-8 px-2.5 text-xs font-mono tabular-nums rounded-md border transition-colors cursor-pointer ${
                    settings.targetKb === kb
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {kb >= 1024 ? '1 MB' : `${kb} KB`}
                </button>
              ))}
            </div>
            {!activeFormat.supportsQuality && (
              <p className="text-xs text-amber-700 font-medium">
                Target KB auto-compression applies to WebP, JPG, and AVIF outputs.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expandable Transforms & Output Options */}
      {showAdvanced && (
        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orientation */}
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">
              Orientation &amp; Flip
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleRotate}
                className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{settings.rotate}°</span>
              </button>
              <button
                type="button"
                onClick={() => update('flipH', !settings.flipH)}
                title="Flip horizontally"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border cursor-pointer ${
                  settings.flipH
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FlipHorizontal2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => update('flipV', !settings.flipV)}
                title="Flip vertically"
                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border cursor-pointer ${
                  settings.flipV
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FlipVertical2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Matte Background */}
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">
              Matte / Padding Fill
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Matte background color"
                value={
                  settings.backgroundColor === 'transparent'
                    ? '#ffffff'
                    : settings.backgroundColor
                }
                onChange={(e) => update('backgroundColor', e.target.value)}
                className="h-9 w-11 p-1 bg-white border border-slate-300 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => update('backgroundColor', '#ffffff')}
                className="h-9 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                White
              </button>
              <button
                type="button"
                onClick={() => update('backgroundColor', '#000000')}
                className="h-9 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Black
              </button>
            </div>
          </div>

          {/* Resampling */}
          <div>
            <label
              htmlFor="smoothing-mode"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Resampling Filter
            </label>
            <select
              id="smoothing-mode"
              value={settings.smoothing}
              onChange={(e) =>
                update('smoothing', e.target.value as 'high' | 'pixelated')
              }
              className="w-full h-9 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="high">High Quality (Multi-step Smooth)</option>
              <option value="pixelated">Nearest Neighbor (Pixel Art)</option>
            </select>
          </div>

          {/* Filename Suffix */}
          <div>
            <label
              htmlFor="filename-suffix"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Filename Suffix
            </label>
            <input
              id="filename-suffix"
              type="text"
              placeholder="e.g. _{width}x{height} or _opt"
              value={settings.filenameSuffix}
              onChange={(e) => update('filenameSuffix', e.target.value)}
              className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
        </div>
      )}
    </section>
  );
}
