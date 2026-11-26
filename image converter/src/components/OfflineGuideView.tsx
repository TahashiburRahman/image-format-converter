import { Download, FileArchive, HardDrive, Laptop, ShieldCheck } from 'lucide-react';

interface OfflineGuideViewProps {
  isOfflineFileProtocol: boolean;
}

export function OfflineGuideView({
  isOfflineFileProtocol,
}: OfflineGuideViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900 font-display text-balance">
            Run LocalConvert 100% offline on your PC
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            You do not need Google AI Studio, Node.js, Python, or an internet connection. The standalone package bundles the entire application—UI, bundled fonts, TIFF/BMP/ICO codecs, image resizer, and ZIP exporter—into a single self-contained HTML file.
          </p>

          {!isOfflineFileProtocol ? (
            <div className="mt-5">
              <a
                href="./LocalConvert-Offline-Standalone.zip"
                download="LocalConvert-Offline-Standalone.zip"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Standalone Offline ZIP</span>
              </a>
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span>You are currently running the standalone offline file directly from your PC.</span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <FileArchive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              1. Extract the ZIP once
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Unzip LocalConvert-Offline-Standalone.zip anywhere on your Windows, macOS, or Linux desktop. Inside is LocalConvert-Offline.html.
            </p>
          </div>

          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <Laptop className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              2. Double-click to open
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Open LocalConvert-Offline.html in Chrome, Edge, Firefox, or Safari. Bookmark it or pin it to your desktop for instant offline access.
            </p>
          </div>

          <div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              3. Zero cloud dependencies
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Every pixel resize, format conversion, and bulk ZIP creation executes inside browser memory without external requests or telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
