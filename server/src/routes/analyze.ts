import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GeminiProvider } from '../services/gemini';
import { OpenAIProvider } from '../services/openai';
import { AIProvider } from '../services/ai';

const router = Router();

// Initialize providers
const geminiProvider = new GeminiProvider();
const openAIProvider = new OpenAIProvider();

// Zod validation schemas
const ContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid URL format').or(z.string().min(1))
});

const CommentItemSchema = z.object({
  id: z.string(),
  author: z.string().default('Anonymous'),
  text: z.string().min(1, 'Comment text is required')
});

const BrandSettingsSchema = z.object({
  brandName: z.string(),
  brandTone: z.string(),
  defaultLanguage: z.string(),
  replyLength: z.enum(['short', 'detailed']),
  emojiUsage: z.enum(['none', 'minimal', 'frequent']),
  wordsToAvoid: z.array(z.string()),
  preferredPhrases: z.array(z.string()),
  customInstructions: z.string()
});

const AnalyzeRequestSchema = z.object({
  platform: z.enum(['youtube', 'meta', 'mock']),
  content: ContentSchema,
  comments: z.array(CommentItemSchema).max(10, 'Maximum comments to analyze at once is 10'),
  provider: z.enum(['gemini', 'openai']).optional().default('gemini'),
  settings: BrandSettingsSchema.partial().optional()
});

router.post('/analyze-comments', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate payload
    const validation = AnalyzeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format()
      });
      return;
    }

    const { platform, content, comments, provider, settings } = validation.data;

    // 2. Select AI Provider
    let activeProvider: AIProvider = geminiProvider;
    if (provider === 'openai') {
      activeProvider = openAIProvider;
    }

    console.log(`Analyzing ${comments.length} comments from ${platform} using ${provider}...`);

    // 3. Call AI analysis
    const results = await activeProvider.analyzeComments(
      platform,
      content,
      comments,
      settings as any
    );

    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Error during comment analysis route:', error);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred during analysis.',
      message: error.message
    });
  }
});

export default router;
