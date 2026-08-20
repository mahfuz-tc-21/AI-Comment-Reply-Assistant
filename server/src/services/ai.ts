import { ContentContext, BrandSettings, AnalysisResult } from '../types';

export interface AIProvider {
  analyzeComments(
    platform: string,
    content: ContentContext,
    comments: { id: string; author: string; text: string }[],
    settings?: BrandSettings,
    apiKey?: string
  ): Promise<AnalysisResult[]>;
}
