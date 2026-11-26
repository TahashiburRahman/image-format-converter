import JSZip from 'jszip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BatchToolbar } from './components/BatchToolbar';
import { BeforeAfterModal } from './components/BeforeAfterModal';
import { DropZone } from './components/DropZone';
import { FileSettingsModal } from './components/FileSettingsModal';
import { FormatMatrixView } from './components/FormatMatrixView';
import { type ActiveTab, Header } from './components/Header';
import { OfflineGuideView } from './components/OfflineGuideView';
import { QueueTable } from './components/QueueTable';
import type {
  BrowserCapabilities,
  ConvertSettings,
  OutputFormat,
  QueueItem,
} from './types/image';
import { detectBrowserCapabilities } from './utils/encoders';
import {
  DEFAULT_SETTINGS,
  detectInputFormat,
  formatBytes,
  isSupportedImageFile,
} from './utils/formatters';
import {
  generateSampleBatchFiles,
  loadImageFile,
  processImageItem,
} from './utils/imageProcessor';

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('converter');
  const [globalSettings, setGlobalSettings] =
    useState<ConvertSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>({
    webp: true,
    avif: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectorItemId, setInspectorItemId] = useState<string | null>(null);
  const [settingsItemId, setSettingsItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;

  const isOfflineFileProtocol =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  useEffect(() => {
    detectBrowserCapabilities().then(setCapabilities);
  }, []);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      }
    };
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'resizer' && globalSettings.resizeMode === 'none') {
      setGlobalSettings((prev) => ({
        ...prev,
        resizeMode: 'dimensions',
      }));
    }
  };

  const handleFilesAdded = useCallback(
    async (rawFiles: File[]) => {
      setNotice(null);
      const valid = rawFiles.filter(isSupportedImageFile);
      const skipped = rawFiles.length - valid.length;

      if (valid.length === 0) {
        setNotice(
          'No supported image files found. Try PNG, JPG, WebP, AVIF, GIF, BMP, ICO, TIFF, or SVG.'
        );
        return;
      }

      const loaded: QueueItem[] = [];
      let decodeErrors = 0;

      for (const file of valid) {
        try {
          const info = await loadImageFile(file);
          loaded.push({
            id: createItemId(),
            file,
            name: file.name,
            originalFormat: detectInputFormat(file),
            originalSize: file.size,
            originalWidth: info.width,
            originalHeight: info.height,
            previewUrl: info.previewUrl,
            status: 'pending',
            useCustomSettings: false,
            customSettings: { ...globalSettings },
          });
        } catch {
          decodeErrors++;
        }
      }

      if (loaded.length > 0) {
        setItems((prev) => [...prev, ...loaded]);
      }

      if (skipped > 0 || decodeErrors > 0) {
        const parts: string[] = [];
        if (skipped > 0) parts.push(`${skipped} non-image file(s) skipped`);
        if (decodeErrors > 0)
          parts.push(`${decodeErrors} file(s) could not be decoded`);
        setNotice(parts.join(' · '));
      }
    },
    [globalSettings]
  );

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const sampleFiles = await generateSampleBatchFiles();
      await handleFilesAdded(sampleFiles);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleGlobalSettingsChange = (next: ConvertSettings) => {
    setGlobalSettings(next);
    setItems((prev) =>
      prev.map((item) => {
        if (item.useCustomSettings || item.status !== 'done') return item;
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
        return {
          ...item,
          status: 'pending',
          outputBlob: undefined,
          outputUrl: undefined,
          outputSize: undefined,
          outputWidth: undefined,
          outputHeight: undefined,
          outputFormat: undefined,
          outputFilename: undefined,
          processingMs: undefined,
        };
      })
    );
  };

  const convertItemById = async (
    id: string,
    overrideSettings?: ConvertSettings
  ) => {
    const targetItem = itemsRef.current.find((i) => i.id === id);
    if (!targetItem) return;

    const effective =
      overrideSettings ??
      (targetItem.useCustomSettings
        ? targetItem.customSettings
        : globalSettings);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
        return {
          ...item,
          status: 'processing',
          errorMessage: undefined,
          outputBlob: undefined,
          outputUrl: undefined,
        };
      })
    );

    try {
      const result = await processImageItem(targetItem, effective);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done',
                outputBlob: result.blob,
                outputUrl: result.url,
                outputSize: result.size,
                outputWidth: result.width,
                outputHeight: result.height,
                outputFormat: effective.format,
                outputFilename: result.filename,
                processingMs: result.processingMs,
              }
            : item
        )
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unexpected conversion error.';
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'error', errorMessage: msg }
            : item
        )
      );
    }
  };

  const handleConvertAll = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setNotice(null);
    try {
      const ids = itemsRef.current.map((i) => i.id);
      for (const id of ids) {
        await convertItemById(id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItemFormat = (id: string, format: OutputFormat) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
        const base = item.useCustomSettings
          ? item.customSettings
          : globalSettings;
        return {
          ...item,
          status: 'pending',
          useCustomSettings: true,
          customSettings: { ...base, format },
          outputBlob: undefined,
          outputUrl: undefined,
          outputSize: undefined,
        };
      })
    );
  };

  const handleSaveCustomItemSettings = (
    id: string,
    customSettings: ConvertSettings
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
        return {
          ...item,
          status: 'pending',
          useCustomSettings: true,
          customSettings,
          outputBlob: undefined,
          outputUrl: undefined,
          outputSize: undefined,
        };
      })
    );
  };

  const handleResetItemToGlobal = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
        return {
          ...item,
          status: 'pending',
          useCustomSettings: false,
          customSettings: { ...globalSettings },
          outputBlob: undefined,
          outputUrl: undefined,
          outputSize: undefined,
        };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.outputUrl) URL.revokeObjectURL(target.outputUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    for (const item of items) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }
    setItems([]);
    setNotice(null);
  };

  const handleDownloadSingle = (item: QueueItem) => {
    if (!item.outputBlob || !item.outputFilename) return;
    triggerBrowserDownload(item.outputBlob, item.outputFilename);
  };

  const handleDownloadZip = async () => {
    const completed = items.filter(
      (i) => i.status === 'done' && i.outputBlob && i.outputFilename
    );
    if (completed.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();

      for (const item of completed) {
        let filename = item.outputFilename!;
        const count = usedNames.get(filename) ?? 0;
        usedNames.set(filename, count + 1);
        if (count > 0) {
          const dotIdx = filename.lastIndexOf('.');
          const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
          const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
          filename = `${base} (${count + 1})${ext}`;
        }
        zip.file(filename, item.outputBlob!);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerBrowserDownload(zipBlob, `localconvert-images-${dateStr}.zip`);
    } finally {
      setIsZipping(false);
    }
  };

  const doneItems = useMemo(
    () => items.filter((i) => i.status === 'done'),
    [items]
  );

  const totalSavedBytes = useMemo(() => {
    let orig = 0;
    let out = 0;
    for (const item of doneItems) {
      orig += item.originalSize;
      out += item.outputSize ?? 0;
    }
    return { orig, out, saved: orig - out };
  }, [doneItems]);

  const referenceAspect = useMemo(() => {
    if (items.length > 0 && items[0].originalHeight > 0) {
      return items[0].originalWidth / items[0].originalHeight;
    }
    return 16 / 9;
  }, [items]);

  const inspectorItem = useMemo(
    () => items.find((i) => i.id === inspectorItemId) ?? null,
    [items, inspectorItemId]
  );

  const settingsItem = useMemo(
    () => items.find((i) => i.id === settingsItemId) ?? null,
    [items, settingsItemId]
  );

  const isWorkspaceTab = activeTab === 'converter' || activeTab === 'resizer';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOfflineFileProtocol={isOfflineFileProtocol}
        onAddFilesClick={() => fileInputRef.current?.click()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isWorkspaceTab && (
          <>
            {/* Compact Hero Lead */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display text-balance">
                  {activeTab === 'resizer'
                    ? 'Bulk Image Resizer & Optimizer'
                    : 'Offline Image Converter & Bulk Resizer'}
                </h1>
                <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
                  Convert formats, resize batches by pixels, percentage, or target KB, and export everything locally as a ZIP without uploading a single byte.
                </p>
              </div>

              {doneItems.length > 0 && (
                <div className="text-left md:text-right shrink-0">
                  <div className="text-xs text-slate-500">
                    Batch output summary
                  </div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                    {formatBytes(totalSavedBytes.orig)} →{' '}
                    {formatBytes(totalSavedBytes.out)}
                    {totalSavedBytes.saved > 0 && (
                      <span className="text-emerald-700 ml-1.5">
                        (-{formatBytes(totalSavedBytes.saved)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {notice && (
              <div
                role="status"
                className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 flex items-center justify-between gap-3"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Batch Settings & Controls */}
            <BatchToolbar
              settings={globalSettings}
              onChange={handleGlobalSettingsChange}
              capabilities={capabilities}
              totalCount={items.length}
              doneCount={doneItems.length}
              isProcessing={isProcessing}
              onConvertAll={handleConvertAll}
              onDownloadZip={handleDownloadZip}
              isZipping={isZipping}
              defaultExpandedOptions={activeTab === 'resizer'}
              referenceAspect={referenceAspect}
            />

            {/* DropZone (Full when empty, compact bar when populated) */}
            <DropZone
              onFilesAdded={handleFilesAdded}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
              compact={items.length > 0}
              fileInputRef={fileInputRef}
            />

            {/* Conversion Queue */}
            <QueueTable
              items={items}
              globalSettings={globalSettings}
              capabilities={capabilities}
              onUpdateItemFormat={handleUpdateItemFormat}
              onOpenItemSettings={(item) => setSettingsItemId(item.id)}
              onOpenInspector={(item) => setInspectorItemId(item.id)}
              onConvertSingle={(id) => convertItemById(id)}
              onDownloadSingle={handleDownloadSingle}
              onRemoveItem={handleRemoveItem}
              onClearAll={handleClearAll}
            />
          </>
        )}

        {activeTab === 'formats' && (
          <FormatMatrixView capabilities={capabilities} />
        )}

        {activeTab === 'offline' && (
          <OfflineGuideView isOfflineFileProtocol={isOfflineFileProtocol} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            LocalConvert · Client-side image conversion &amp; bulk resizing
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('formats')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Supported Codecs
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('offline')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Offline Standalone Setup
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BeforeAfterModal
        item={inspectorItem}
        onClose={() => setInspectorItemId(null)}
        onDownload={handleDownloadSingle}
      />

      <FileSettingsModal
        item={settingsItem}
        globalSettings={globalSettings}
        capabilities={capabilities}
        onClose={() => setSettingsItemId(null)}
        onSaveCustom={handleSaveCustomItemSettings}
        onResetToGlobal={handleResetItemToGlobal}
      />
    </div>
  );
}
