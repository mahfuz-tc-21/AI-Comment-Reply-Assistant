export type Platform = 'youtube' | 'meta' | 'mock';

export interface ContentContext {
  title: string;
  description?: string;
  url: string;
}

export interface CommentContext {
  id: string; // Deterministic hash if platform doesn't provide
  author: string;
  avatar?: string;
  text: string;
  contentTitle: string;
  timestamp?: string;
  requiresReply?: boolean;
}

export interface ReplySuggestion {
  optionA: string; // Default
  optionB: string; // Shorter
  optionC: string; // More conversational
}

export interface AnalysisResult {
  commentId: string;
  intent: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  requiresReply: boolean;
  priority: 'low' | 'medium' | 'high';
  replies: ReplySuggestion;
}

export interface BrandSettings {
  brandName: string;
  brandTone: string;
  defaultLanguage: string;
  replyLength: 'short' | 'detailed';
  emojiUsage: 'none' | 'minimal' | 'frequent';
  wordsToAvoid: string[];
  preferredPhrases: string[];
  customInstructions: string;
}

export interface AnalysisRequestPayload {
  platform: Platform;
  content: ContentContext;
  comments: {
    id: string;
    author: string;
    text: string;
  }[];
  settings?: Partial<BrandSettings>;
}

export interface AnalysisResponsePayload {
  results: AnalysisResult[];
}
