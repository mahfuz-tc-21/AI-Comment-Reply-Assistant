import { useEffect, useState } from 'react';
import { Sparkles, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { CommentCard } from './components/CommentCard';
import { SettingsView } from './components/SettingsView';
import { DebugPanel } from './components/DebugPanel';
import { Platform, ContentContext, CommentContext, AnalysisResult, BrandSettings } from '../shared/types';
import { detectPlatform } from '../content/platformDetector';
import { DEFAULT_BRAND_SETTINGS, DEFAULT_SERVER_URL } from '../shared/constants';

function App() {
  // State variables
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [content, setContent] = useState<ContentContext | null>(null);
  const [comments, setComments] = useState<CommentContext[]>([]);
  const [analyzedResults, setAnalyzedResults] = useState<Map<string, AnalysisResult>>(new Map());
  
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [serverStatus, setServerStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  
  const [status, setStatus] = useState<'idle' | 'detecting' | 'loading_comments' | 'analyzing' | 'complete' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View Toggles
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // Action status indicators
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // 1. Initial Load settings and setup tab check
  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['brandSettings', 'serverUrl', 'debugMode'], (result) => {
      if (result.brandSettings) setBrandSettings(result.brandSettings);
      if (result.serverUrl) setServerUrl(result.serverUrl);
      if (result.debugMode !== undefined) setDebugMode(result.debugMode);
      
      checkServerHealth(result.serverUrl || DEFAULT_SERVER_URL);
    });

    // Detect environment on load
    detectActiveTabEnvironment();

    // Listen to tab changes (navigation/update)
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        detectActiveTabEnvironment();
      }
    };
    
    // Listen to tab selection changes
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      detectActiveTabEnvironment();
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);

  const checkServerHealth = (url: string) => {
    setServerStatus('checking');
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
  };

  const detectActiveTabEnvironment = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id && activeTab.url) {
        setActiveTabId(activeTab.id);
        const p = detectPlatform(activeTab.url);
        setPlatform(p);

        if (p) {
          setStatus('detecting');
          // Request platform information from content script
          chrome.tabs.sendMessage(activeTab.id, { action: 'get_current_content' }, (res) => {
            if (chrome.runtime.lastError) {
              console.warn('Content script not injected yet or ready:', chrome.runtime.lastError.message);
              setStatus('idle');
              setContent(null);
              return;
            }
            if (res?.success && res.content) {
              setContent(res.content);
              setStatus('idle');
            } else {
              setContent(null);
              setStatus('idle');
            }
          });
        } else {
          setContent(null);
          setStatus('idle');
        }
      }
    });
  };

  // 2. Click handler: Extract and analyze first 5 comments
  const handleAnalyzeFirstFive = async () => {
    if (!activeTabId) {
      setErrorMsg('No active tab detected.');
      setStatus('error');
      return;
    }

    setStatus('loading_comments');
    setErrorMsg(null);
    setComments([]);

    // Ask content script to find comments (limit 5)
    chrome.tabs.sendMessage(activeTabId, { action: 'get_comments', limit: 5 }, async (res) => {
      if (chrome.runtime.lastError) {
        setErrorMsg('Communication error: Please refresh the target webpage and try again.');
        setStatus('error');
        return;
      }

      if (!res?.success || !res.comments || res.comments.length === 0) {
        // Retry/wait 1.5 seconds or prompt empty
        setErrorMsg('No valid top-level comments found on this page. Scroll down or load comments first.');
        setStatus('error');
        return;
      }

      const extractedComments: CommentContext[] = res.comments;
      setComments(extractedComments);

      // Now call AI Backend in batch
      setStatus('analyzing');

      try {
        const response = await fetch(`${serverUrl}/api/analyze-comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            content,
            comments: extractedComments.map((c) => ({
              id: c.id,
              author: c.author,
              text: c.text
            })),
            settings: brandSettings
          })
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.results) {
          const resultsMap = new Map<string, AnalysisResult>();
          data.results.forEach((r: AnalysisResult) => {
            resultsMap.set(r.commentId, r);
          });
          setAnalyzedResults(resultsMap);
          setStatus('complete');
        } else {
          throw new Error(data.error || 'Server failed to analyze comments');
        }
      } catch (err: any) {
        console.error('Failed to run comment analysis:', err);
        setErrorMsg(`Analysis failed: ${err.message || 'Check if server is running'}`);
        setStatus('error');
      }
    });
  };

  // 3. Click handler: Regenerate single comment
  const handleRegenerateComment = async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    setRegeneratingId(commentId);

    try {
      const response = await fetch(`${serverUrl}/api/analyze-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          content,
          comments: [{
            id: comment.id,
            author: comment.author,
            text: comment.text
          }],
          settings: brandSettings
        })
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.results && data.results.length > 0) {
        const newResult: AnalysisResult = data.results[0];
        setAnalyzedResults((prev) => {
          const updated = new Map(prev);
          updated.set(commentId, newResult);
          return updated;
        });
      }
    } catch (err) {
      console.error('Single comment regeneration failed:', err);
      alert('Could not regenerate response. Check server connection.');
    } finally {
      setRegeneratingId(null);
    }
  };

  // 4. Click handler: Copy reply
  const handleCopyToClipboard = (text: string, commentId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCommentId(commentId);
      setTimeout(() => {
        setCopiedCommentId(null);
      }, 1500);
    });
  };

  // 5. Click handler: Insert reply DOM manipulation
  const handleInsertReply = (commentId: string, replyText: string) => {
    if (!activeTabId) return;

    setInsertingId(commentId);

    chrome.tabs.sendMessage(activeTabId, {
      action: 'insert_reply',
      commentId,
      replyText
    }, (res) => {
      setInsertingId(null);
      if (chrome.runtime.lastError || !res?.success) {
        alert('Could not automatically insert reply text. Please copy and paste manually.');
      } else {
        // Remove the comment from the side panel list so it disappears
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    });
  };

  // 6. Settings saved
  const handleSaveSettings = (newSettings: BrandSettings, newServerUrl: string) => {
    setBrandSettings(newSettings);
    setServerUrl(newServerUrl);
    chrome.storage.local.set({
      brandSettings: newSettings,
      serverUrl: newServerUrl
    });
    checkServerHealth(newServerUrl);
  };

  // Toggle debug panel
  const handleToggleDebug = () => {
    const nextVal = !debugMode;
    setDebugMode(nextVal);
    chrome.storage.local.set({ debugMode: nextVal });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0b14] text-[#f3f4f6]">
      {/* Header */}
      <Header
        platform={platform}
        serverStatus={serverStatus}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onRefresh={detectActiveTabEnvironment}
        debugMode={debugMode}
        onToggleDebug={handleToggleDebug}
      />

      {/* Settings View overlay */}
      {showSettings ? (
        <SettingsView
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          currentSettings={brandSettings}
          currentServerUrl={serverUrl}
        />
      ) : debugMode && !showSettings ? (
        /* Debug Panel */
        <DebugPanel
          platform={platform}
          content={content}
          comments={comments}
          serverUrl={serverUrl}
          onClose={handleToggleDebug}
        />
      ) : (
        /* Main Panel content */
        <main className="flex-1 p-4 space-y-4">
          
          {/* Active Platform Info Banner */}
          {platform ? (
            <div className="bg-[#141121] border border-[#221c3b] rounded-xl p-3 flex flex-col gap-1.5 shadow-md shadow-brand-950/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#84809e] uppercase font-bold tracking-wider">Active Workspace</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-950/30 text-brand-300 border border-brand-900/40 uppercase">
                  {platform}
                </span>
              </div>
              <h3 className="font-semibold text-xs text-white truncate max-w-full">
                {content?.title || 'Loading content context...'}
              </h3>
            </div>
          ) : (
            <div className="bg-[#2a1b1b]/30 border border-[#3e2323]/50 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <div>
                <h3 className="font-bold text-xs text-rose-400">Unsupported Workspace</h3>
                <p className="text-[10px] text-[#a09cb4] mt-1 max-w-[200px] leading-normal">
                  Open YouTube Studio Comments, Meta Business Suite Inbox, or the Mock Sandbox to start.
                </p>
              </div>
            </div>
          )}

          {/* Setup Action Trigger */}
          {platform && (
            <div className="space-y-3">
              {status === 'idle' && (
                <button
                  onClick={handleAnalyzeFirstFive}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-brand-600/10 active:scale-98 transition duration-200 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Analyze First 5 Comments
                </button>
              )}

              {/* Progress Steps Indicators */}
              {(status === 'loading_comments' || status === 'analyzing') && (
                <div className="bg-[#141121] border border-[#221c3b] rounded-xl p-4 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#84809e] uppercase font-bold">Analyzing comments...</span>
                    <RefreshCw className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#a09cb4]">Detecting Content Context</span>
                      <span className="text-[#4ade80] font-semibold">✓ Done</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a09cb4]">Extracting Target Comments</span>
                      {status === 'loading_comments' ? (
                        <span className="text-brand-400 font-semibold animate-pulse">Running...</span>
                      ) : (
                        <span className="text-[#4ade80] font-semibold">✓ Done</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a09cb4]">AI Batch Reply Generation</span>
                      {status === 'loading_comments' ? (
                        <span className="text-[#5e5a7b]">Waiting...</span>
                      ) : (
                        <span className="text-brand-400 font-semibold animate-pulse">Running...</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error messages */}
              {status === 'error' && (
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#ef4444] leading-relaxed">
                      {errorMsg}
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyzeFirstFive}
                    className="w-full py-1.5 px-3 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-900/40 rounded text-rose-200 font-bold text-[10px] transition cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analyzed Comments Lists */}
          {comments.length > 0 && (status === 'complete' || status === 'analyzing' || status === 'error') && (
            <div className="space-y-3 pb-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#84809e] uppercase font-bold tracking-wider">
                  Analyzed Feed ({comments.length})
                </span>
                {status === 'complete' && (
                  <button
                    onClick={handleAnalyzeFirstFive}
                    className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-Analyze
                  </button>
                )}
              </div>

              {comments.map((comment, idx) => (
                <CommentCard
                  key={comment.id}
                  index={idx}
                  comment={comment}
                  result={analyzedResults.get(comment.id)}
                  onCopy={handleCopyToClipboard}
                  onInsert={handleInsertReply}
                  onRegenerate={handleRegenerateComment}
                  isCopied={copiedCommentId === comment.id}
                  isInserting={insertingId === comment.id}
                  isRegenerating={regeneratingId === comment.id}
                />
              ))}
            </div>
          )}

          {/* Idle Empty State */}
          {platform && comments.length === 0 && status === 'idle' && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-[#221c3b] rounded-xl bg-[#141121]/20">
              <Sparkles className="w-6 h-6 text-brand-500/50" />
              <span className="text-xs text-[#84809e] font-semibold">Workspace Connected</span>
              <p className="text-[10px] text-[#5e5a7b] max-w-[160px] leading-normal">
                Click the button above to fetch and analyze the first 5 comments.
              </p>
            </div>
          )}

        </main>
      )}
    </div>
  );
}

export default App;
