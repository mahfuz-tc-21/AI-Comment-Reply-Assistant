import React from 'react';
import { Platform, ContentContext, CommentContext } from '../../shared/types';

interface DebugPanelProps {
  platform: Platform | null;
  content: ContentContext | null;
  comments: CommentContext[];
  serverUrl: string;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  platform,
  content,
  comments,
  serverUrl,
  onClose
}) => {
  return (
    <div className="bg-[#0b0816] p-4 h-[calc(100vh-60px)] overflow-y-auto space-y-4 text-xs font-mono border-t border-[#221c3b]">
      <div className="flex items-center justify-between border-b border-[#221c3b] pb-2">
        <h2 className="font-bold text-white text-xs">Developer Debug Panel</h2>
        <button
          onClick={onClose}
          className="text-[10px] text-[#84809e] hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        {/* Platform */}
        <div>
          <span className="text-brand-400 block font-semibold">Detected Platform:</span>
          <span className="text-[#cfcbdc] bg-[#141121] p-1.5 rounded block mt-0.5 border border-[#1b1730]">
            {platform || 'None / Not matching'}
          </span>
        </div>

        {/* Server */}
        <div>
          <span className="text-brand-400 block font-semibold">Backend Endpoint:</span>
          <span className="text-[#cfcbdc] bg-[#141121] p-1.5 rounded block mt-0.5 border border-[#1b1730]">
            {serverUrl}
          </span>
        </div>

        {/* Content */}
        <div>
          <span className="text-brand-400 block font-semibold">Page Content Details:</span>
          <div className="bg-[#141121] p-2 rounded mt-0.5 border border-[#1b1730] space-y-1 text-[10px] text-[#a09cb4]">
            <div><strong className="text-white">Title:</strong> {content?.title || 'None'}</div>
            <div><strong className="text-white">Desc:</strong> {content?.description || 'None'}</div>
            <div><strong className="text-white">URL:</strong> {content?.url || 'None'}</div>
          </div>
        </div>

        {/* Comments list */}
        <div>
          <span className="text-brand-400 block font-semibold">Extracted Comments ({comments.length}):</span>
          <div className="space-y-2 mt-1">
            {comments.length === 0 ? (
              <span className="text-[#5e5a7b] italic">No comments extracted. click "Analyze" to extract.</span>
            ) : (
              comments.map((c, idx) => (
                <div key={c.id} className="bg-[#141121] p-2 rounded border border-[#1b1730] text-[10px] space-y-1">
                  <div className="flex justify-between border-b border-[#221c3b]/55 pb-1">
                    <span className="font-bold text-white">#{idx + 1}: {c.author}</span>
                    <span className="text-[#84809e] text-[9px]">ID: {c.id}</span>
                  </div>
                  <div className="text-[#cfcbdc]">Text: "{c.text}"</div>
                  <div className="text-[#84809e] text-[9px]">Video/Post: {c.contentTitle}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
