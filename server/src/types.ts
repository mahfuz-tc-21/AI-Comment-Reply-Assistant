export interface ContentContext {
  title: string;
  description?: string;
  url: string;
}

export interface ReplySuggestion {
  optionA: string;
  optionB: string;
  optionC: string;
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
