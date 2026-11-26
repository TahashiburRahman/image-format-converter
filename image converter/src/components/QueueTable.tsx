import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Play,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  BrowserCapabilities,
  ConvertSettings,
  OutputFormat,
  QueueItem,
} from '../types/image';
import { FORMAT_LIST, formatBytes, formatSavings } from '../utils/formatters';
import { computeTargetDimensions } from '../utils/imageProcessor';

interface QueueTableProps {
  items: QueueItem[];
  globalSettings: ConvertSettings;
  capabilities: BrowserCapabilities;
  onUpdateItemFormat: (id: string, format: OutputFormat) => void;
  onOpenItemSettings: (item: QueueItem) => void;
  onOpenInspector: (item: QueueItem) => void;
  onConvertSingle: (id: string) => void;
  onDownloadSingle: (item: QueueItem) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

type FilterStatus = 'all' | 'pending' | 'done' | 'error';

export function QueueTable({
  items,
  globalSettings,
  capabilities,
  onUpdateItemFormat,
  onOpenItemSettings,
  onOpenInspector,
  onConvertSingle,
  onDownloadSingle,
  onRemoveItem,
  onClearAll,
}: QueueTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === 'pending' && item.status !== 'pending' && item.status !== 'processing') {
        return false;
      }
      if (statusFilter === 'done' && item.status !== 'done') {
        return false;
      }
      if (statusFilter === 'error' && item.status !== 'error') {
        return false;
      }
      if (q && !item.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    let done = 0;
    let error = 0;
    let pending = 0;
    let totalOrigBytes = 0;
    let totalOutBytes = 0;
    for (const item of items) {
      totalOrigBytes += item.originalSize;
      if (item.status === 'done') {
        done++;
        totalOutBytes += item.outputSize ?? 0;
      } else if (item.status === 'error') {
        error++;
      } else {
        pending++;
      }
    }
    return { done, error, pending, totalOrigBytes, totalOutBytes };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Conversion queue"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Queue Filter & Summary Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: `All (${items.length})` },
                { id: 'pending', label: `Ready (${counts.pending})` },
                { id: 'done', label: `Done (${counts.done})` },
                { id: 'error', label: `Errors (${counts.error})` },
              ] as { id: FilterStatus; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Total input: {formatBytes(counts.totalOrigBytes)}
            {counts.done > 0 && ` · Output: ${formatBytes(counts.totalOutBytes)}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter filenames..."
              className="h-8 pl-8 pr-3 w-48 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
          <button
            type="button"
            onClick={onClearAll}
            className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-slate-600 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Queue Rows */}
      <div className="divide-y divide-slate-100">
        {filteredItems.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No files match the current filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const effective = item.useCustomSettings
              ? item.customSettings
              : globalSettings;
            const targetDims = computeTargetDimensions(
              item.originalWidth,
              item.originalHeight,
              effective
            );
            const isIco = effective.format === 'ico';
            const previewTargetW = isIco
              ? effective.icoSize === 'multi'
                ? 256
                : effective.icoSize
              : targetDims.width;
            const previewTargetH = isIco
              ? effective.icoSize === 'multi'
                ? 256
                : effective.icoSize
              : targetDims.height;

            const savings =
              item.status === 'done' && item.outputSize !== undefined
                ? formatSavings(item.originalSize, item.outputSize)
                : null;

            return (
              <div
                key={item.id}
                className="px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* Left: Thumbnail + File Identity */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenInspector(item)}
                    className="w-12 h-12 rounded-lg border border-slate-200 checkerboard-bg overflow-hidden shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                    title="Inspect preview"
                  >
                    <img
                      src={item.outputUrl || item.previewUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </span>
                      {item.useCustomSettings && (
                        <span className="text-xs font-medium text-red-700 shrink-0">
                          · Custom
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span>{item.originalFormat}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.originalWidth} × {item.originalHeight} px
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(item.originalSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Target Format & Projected Dimensions */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">to</span>
                    <select
                      aria-label={`Output format for ${item.name}`}
                      value={effective.format}
                      onChange={(e) =>
                        onUpdateItemFormat(
                          item.id,
                          e.target.value as OutputFormat
                        )
                      }
                      className="h-8 px-2.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-700"
                    >
                      {FORMAT_LIST.map((fmt) => {
                        const disabled =
                          fmt.id === 'avif' && !capabilities.avif;
                        return (
                          <option key={fmt.id} value={fmt.id} disabled={disabled}>
                            {fmt.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-600 min-w-[130px]">
                    → {previewTargetW} × {previewTargetH} px
                  </div>

                  {/* Status Column */}
                  <div className="min-w-[175px]">
                    {item.status === 'pending' && (
                      <span className="text-xs font-medium text-slate-500">
                        Ready to convert
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Converting...</span>
                      </span>
                    )}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono tabular-nums">
                          {formatBytes(item.outputSize ?? 0)}
                          {savings ? ` (${savings.label})` : ''}
                        </span>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <span
                        title={item.errorMessage}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {item.errorMessage || 'Conversion failed'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Per-Row Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenItemSettings(item)}
                    title="Customize resize and format settings for this file"
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>

                  {item.status === 'done' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenInspector(item)}
                        title="Compare before and after"
                        className="h-8 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Compare</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadSingle(item)}
                        className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={item.status === 'processing'}
                      onClick={() => onConvertSingle(item.id)}
                      className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Convert</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
