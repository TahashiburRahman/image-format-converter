import { FolderOpen, ImagePlus, Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  onLoadSamples: () => void;
  isLoadingSamples: boolean;
  compact?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const items = Array.from(dataTransfer.items || []);
  const collected: File[] = [];

  const traverseEntry = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      await new Promise<void>((resolve) => {
        fileEntry.file(
          (file) => {
            collected.push(file);
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const readAllEntries = async (): Promise<FileSystemEntry[]> => {
        const all: FileSystemEntry[] = [];
        while (true) {
          const batch = await new Promise<FileSystemEntry[]>((resolve) => {
            reader.readEntries(
              (entries) => resolve(entries),
              () => resolve([])
            );
          });
          if (!batch.length) break;
          all.push(...batch);
        }
        return all;
      };
      const entries = await readAllEntries();
      for (const child of entries) {
        await traverseEntry(child);
      }
    }
  };

  if (items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        await traverseEntry(entry);
      } else {
        const f = item.getAsFile();
        if (f) collected.push(f);
      }
    }
    return collected;
  }

  return Array.from(dataTransfer.files || []);
}

export function DropZone({
  onFilesAdded,
  onLoadSamples,
  isLoadingSamples,
  compact = false,
  fileInputRef,
}: DropZoneProps) {
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = await collectFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      onFilesAdded(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesAdded(files);
    }
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border transition-colors ${
        isDragging
          ? 'border-red-600 bg-red-50/60'
          : 'border-dashed border-slate-300 bg-white hover:border-slate-400'
      } ${compact ? 'px-5 py-4' : 'px-6 py-10'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.tif,.tiff,.bmp,.ico,.svg,.avif,.webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        onChange={handleFileChange}
        className="hidden"
      />

      {compact ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Drop more images or folders here
              </p>
              <p className="text-xs text-slate-500">
                PNG, JPG, WebP, AVIF, GIF, BMP, ICO, TIFF, SVG · Processed locally in your browser
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Add Files</span>
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Add Folder</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mx-auto mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 font-display">
            Drop images or entire folders to convert and resize
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            All decoding, resizing, and compression happens on your PC. Zero files leave your device.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Select Images</span>
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Select Folder</span>
            </button>
            <button
              type="button"
              onClick={onLoadSamples}
              disabled={isLoadingSamples}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoadingSamples ? 'Generating...' : 'Load Sample Batch'}</span>
            </button>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Inputs: PNG, JPG, WebP, AVIF, GIF, BMP, ICO, TIFF, SVG · Outputs: WebP, PNG, JPG, AVIF, ICO, BMP, TIFF, SVG
          </p>
        </div>
      )}
    </div>
  );
}
