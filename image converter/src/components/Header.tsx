import { Download, Plus } from 'lucide-react';

export type ActiveTab = 'converter' | 'resizer' | 'formats' | 'offline';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOfflineFileProtocol: boolean;
  onAddFilesClick: () => void;
}

export function Header({
  activeTab,
  onTabChange,
  isOfflineFileProtocol,
  onAddFilesClick,
}: HeaderProps) {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'converter', label: 'Converter' },
    { id: 'resizer', label: 'Bulk Resizer' },
    { id: 'formats', label: 'Format Support' },
    { id: 'offline', label: 'Offline Guide' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onTabChange('converter')}
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 rounded"
        >
          LocalConvert
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 rounded ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-red-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          {isOfflineFileProtocol ? (
            <button
              type="button"
              onClick={onAddFilesClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Images</span>
            </button>
          ) : (
            <a
              href="./LocalConvert-Offline-Standalone.zip"
              download="LocalConvert-Offline-Standalone.zip"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Offline ZIP</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile compact nav row */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-red-700 text-slate-900'
                  : 'border-transparent text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
