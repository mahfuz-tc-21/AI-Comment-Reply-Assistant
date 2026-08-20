import { useEffect, useState } from 'react';
import { Sparkles, Sidebar, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Platform } from '../shared/types';
import { detectPlatform } from '../content/platformDetector';

function App() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [serverStatus, setServerStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3000');

  useEffect(() => {
    // 1. Get active tab details and detect platform
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        const p = detectPlatform(activeTab.url);
        setPlatform(p);
      }
    });

    // 2. Fetch serverUrl from storage and test connection
    chrome.storage.local.get(['serverUrl'], (result) => {
      const url = result.serverUrl || 'http://localhost:3000';
      setServerUrl(url);
      
      fetch(`${url}/health`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'healthy') {
            setServerStatus('connected');
          } else {
            setServerStatus('error');
          }
        })
        .catch(() => {
          setServerStatus('error');
        });
    });
  }, []);

  const openSidePanel = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        // In Chrome MV3, we can call chrome.sidePanel.open
        if (chrome.sidePanel) {
          chrome.sidePanel.open({ tabId: activeTab.id }, () => {
            window.close();
          });
        } else {
          // Fallback message
          chrome.runtime.sendMessage({ action: 'open_sidepanel' }, () => {
            window.close();
          });
        }
      }
    });
  };

  return (
    <div className="w-80 p-4 bg-[#0d0b14] text-[#f3f4f6] select-none border border-[#2d274e] rounded-xl">
      <div className="flex items-center gap-2 border-b border-[#221c3b] pb-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-purple-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight text-white">Programming Hero</h2>
          <p className="text-xs text-[#a09cb4]">AI Comment Reply Assistant</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status block */}
        <div className="bg-[#141121] p-3 rounded-lg border border-[#221c3b] flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#84809e]">Platform Status:</span>
            {platform ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e2a1e] text-[#4ade80] border border-[#263e26] capitalize">
                {platform === 'mock' ? 'Mock Sandbox' : platform} Detected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2a1b1b] text-[#f87171] border border-[#3e2323]">
                No supported page
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#84809e]">Backend Server:</span>
            {serverStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-[#4ade80] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : serverStatus === 'checking' ? (
              <span className="text-[#a09cb4]">Checking...</span>
            ) : (
              <span className="flex items-center gap-1 text-[#f87171] font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Offline (Mock mode)
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <button
          onClick={openSidePanel}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition duration-200 shadow-md shadow-brand-600/10 cursor-pointer"
        >
          <Sidebar className="w-4 h-4" />
          Open Side Panel
        </button>

        <div className="text-center text-[10px] text-[#5e5a7b]">
          Open Side Panel to start analyzing and generating replies.
        </div>
      </div>
    </div>
  );
}

export default App;
