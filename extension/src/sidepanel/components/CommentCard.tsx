import React, { useState, useEffect } from 'react';
import { Copy, CornerDownRight, RefreshCcw, User, Check, ShieldAlert } from 'lucide-react';
import { CommentContext, AnalysisResult } from '../../shared/types';

interface CommentCardProps {
  index: number;
  comment: CommentContext;
  result?: AnalysisResult;
  onCopy: (text: string, commentId: string) => void;
  onInsert: (commentId: string, replyText: string) => void;
  onRegenerate: (commentId: string) => void;
  isCopied: boolean;
  isInserting: boolean;
  isRegenerating: boolean;
}

export const CommentCard: React.FC<CommentCardProps> = ({
  index,
  comment,
  result,
  onCopy,
  onInsert,
  onRegenerate,
  isCopied,
  isInserting,
  isRegenerating
}) => {
  const [selectedOption, setSelectedOption] = useState<'optionA' | 'optionB' | 'optionC'>('optionA');
  const [editedText, setEditedText] = useState<string>('');

  const getSelectedReplyText = (): string => {
    if (!result || !result.replies) return '';
    if (selectedOption === 'optionA') return result.replies.optionA;
    if (selectedOption === 'optionB') return result.replies.optionB;
    return result.replies.optionC;
  };

  const currentReplyText = getSelectedReplyText();

  // Sync editedText whenever selection or AI result updates
  useEffect(() => {
    setEditedText(currentReplyText);
  }, [selectedOption, result]);

  // Helper colors for intent/sentiment tags
  const getIntentBadgeColor = (intent: string) => {
    const i = intent.toLowerCase();
    if (i.includes('question') || i.includes('admission')) {
      return 'bg-blue-950/40 text-blue-400 border border-blue-900/50';
    }
    if (i.includes('appreciation') || i.includes('feedback')) {
      return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50';
    }
    if (i.includes('spam') || i.includes('irrelevant')) {
      return 'bg-rose-950/40 text-rose-400 border border-rose-900/50';
    }
    return 'bg-zinc-800 text-zinc-400 border border-zinc-700/50';
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'text-emerald-400';
    if (sentiment === 'negative') return 'text-rose-400';
    return 'text-zinc-400';
  };

  return (
    <div className="bg-[#141121] border border-[#221c3b] rounded-xl p-3 relative overflow-hidden transition hover:border-[#2d274e] space-y-3">
      {/* Loading Overlay for Single Card Regeneration */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-[#0d0b14]/75 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-brand-400 animate-spin" />
            <span className="text-[10px] text-[#a09cb4]">Regenerating replies...</span>
          </div>
        </div>
      )}

      {/* Comment Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {comment.avatar ? (
            <img
              src={comment.avatar}
              alt={comment.author}
              className="w-6 h-6 rounded-full border border-[#2d274e]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#221c3b] flex items-center justify-center text-[#84809e]">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <span className="font-semibold text-xs text-white block max-w-[150px] truncate">
              {comment.author}
            </span>
            <span className="text-[10px] text-[#5e5a7b] block truncate max-w-[180px]">
              {comment.contentTitle}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-brand-400/80 bg-brand-950/20 border border-brand-900/30 px-1.5 py-0.5 rounded">
          #{index + 1}
        </span>
      </div>

      {/* Comment Text */}
      <p className="text-[11.5px] text-[#cfcbdc] bg-[#0d0b14]/40 p-2 rounded border border-[#1b1730]/60 leading-relaxed italic">
        "{comment.text}"
      </p>

      {result ? (
        <>
          {/* Analysis Tags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className={`text-[9px] px-2 py-0.5 rounded-full capitalize font-medium ${getIntentBadgeColor(result.intent)}`}>
              {result.intent.replace('_', ' ')}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-950/40 border border-zinc-900/50 text-[#84809e] font-medium">
              Sentiment:{' '}
              <span className={`capitalize font-bold ${getSentimentColor(result.sentiment)}`}>
                {result.sentiment}
              </span>
            </span>
            {result.requiresReply && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                result.priority === 'high' ? 'bg-amber-950/20 text-amber-400 border border-amber-900/30' : 'bg-zinc-900 text-zinc-400'
              }`}>
                {result.priority} Priority
              </span>
            )}
          </div>

          {!result.requiresReply ? (
            /* No Reply Needed Block */
            <div className="bg-rose-950/15 border border-rose-950/40 rounded-lg p-2.5 flex items-start gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[11px] text-rose-400 block leading-tight">No Reply Suggested</span>
                <p className="text-[10px] text-[#a59eb2] mt-0.5">
                  AI identified this comment as spam, troll, or irrelevant, and recommends skipping response.
                </p>
              </div>
            </div>
          ) : (
            /* Reply Suggestion Options Block */
            <div className="space-y-2 pt-1 border-t border-[#1b1730]">
              <span className="text-[10px] text-[#84809e] font-medium block">Suggested Replies:</span>
              
              {/* Option Selectors */}
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedOption('optionA')}
                  className={`flex-1 text-[10px] py-1 px-1.5 rounded text-center font-medium border transition ${
                    selectedOption === 'optionA'
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-600/10'
                      : 'bg-[#161224] border-[#2d274e] text-[#84809e] hover:text-white'
                  }`}
                >
                  Option A (Default)
                </button>
                <button
                  onClick={() => setSelectedOption('optionB')}
                  className={`flex-1 text-[10px] py-1 px-1.5 rounded text-center font-medium border transition ${
                    selectedOption === 'optionB'
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-600/10'
                      : 'bg-[#161224] border-[#2d274e] text-[#84809e] hover:text-white'
                  }`}
                >
                  Option B (Short)
                </button>
                <button
                  onClick={() => setSelectedOption('optionC')}
                  className={`flex-1 text-[10px] py-1 px-1.5 rounded text-center font-medium border transition ${
                    selectedOption === 'optionC'
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-600/10'
                      : 'bg-[#161224] border-[#2d274e] text-[#84809e] hover:text-white'
                  }`}
                >
                  Option C (Convo)
                </button>
              </div>

              {/* Selected Reply Preview (Editable) */}
              <div className="bg-[#0f0a1e] border border-[#221c3b] p-2 rounded-lg flex gap-2 focus-within:border-brand-500 transition">
                <CornerDownRight className="w-4 h-4 text-brand-400 shrink-0 mt-1" />
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full bg-transparent text-[11px] leading-relaxed text-[#cfcbdc] outline-none border-none resize-none min-h-[50px]"
                  placeholder="Edit response suggestion..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                {/* Copy */}
                <button
                  onClick={() => onCopy(editedText, comment.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-semibold border transition ${
                    isCopied
                      ? 'bg-[#1e2a1e] border-[#263e26] text-[#4ade80]'
                      : 'bg-[#161224] border-[#2d274e] text-[#a09cb4] hover:text-white hover:bg-[#201a35]'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied ✓
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>

                {/* Insert */}
                <button
                  onClick={() => onInsert(comment.id, editedText)}
                  disabled={isInserting}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/10 transition disabled:opacity-50"
                >
                  {isInserting ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Insert Reply'
                  )}
                </button>

                {/* Regenerate Single */}
                <button
                  onClick={() => onRegenerate(comment.id)}
                  title="Regenerate this comment reply only"
                  className="px-2 py-1.5 rounded border border-[#2d274e] hover:border-[#4338ca] text-[#84809e] hover:text-white transition"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Unanalyzed Card Placeholder State */
        <div className="text-[10px] text-[#5e5a7b] py-1 text-center font-medium italic border-t border-[#1b1730]/40">
          Ready to analyze comments...
        </div>
      )}
    </div>
  );
};
