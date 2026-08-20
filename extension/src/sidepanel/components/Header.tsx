import React from 'react';
import { Sparkles, Settings, RefreshCw, Bug } from 'lucide-react';
import { Platform } from '../../shared/types';

interface HeaderProps {
  platform: Platform | null;
  serverStatus: 'connected' | 'error' | 'checking';
  onToggleSettings: () => void;
  showSettings: boolean;
  onRefresh: () => void;
  debugMode: boolean;
  onToggleDebug: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  platform,
  serverStatus,
  onToggleSettings,
  showSettings,
  onRefresh,
  debugMode,
  onToggleDebug
}) => {
  return (
    <header className="border-b border-[#221c3b] bg-[#0d0b14]/85 backdrop-blur-md sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-600/30">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-wide leading-none">PH AI Assistant</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverStatus === 'connected' ? 'bg-[#4ade80]' : serverStatus === 'checking' ? 'bg-amber-400' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] text-[#84809e] font-medium">
              {serverStatus === 'connected' ? 'Connected' : serverStatus === 'checking' ? 'Connecting...' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleDebug}
          title="Toggle Debug Info"
          className={`p-1.5 rounded-lg transition ${
            debugMode ? 'bg-[#2a1a45] text-brand-400' : 'text-[#84809e] hover:text-white hover:bg-[#161224]'
          }`}
        >
          <Bug className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          title="Scan Platform Page"
          className="p-1.5 rounded-lg text-[#84809e] hover:text-white hover:bg-[#161224] transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleSettings}
          title="Brand Settings"
          className={`p-1.5 rounded-lg transition ${
            showSettings ? 'bg-[#2a1a45] text-brand-400' : 'text-[#84809e] hover:text-white hover:bg-[#161224]'
          }`}
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
};
