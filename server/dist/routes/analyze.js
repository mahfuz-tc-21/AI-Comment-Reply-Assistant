"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const gemini_1 = require("../services/gemini");
const openai_1 = require("../services/openai");
const router = (0, express_1.Router)();
// Initialize providers
const geminiProvider = new gemini_1.GeminiProvider();
const openAIProvider = new openai_1.OpenAIProvider();
// Zod validation schemas
const ContentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    url: zod_1.z.string().url('Invalid URL format').or(zod_1.z.string().min(1))
});
const CommentItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    author: zod_1.z.string().default('Anonymous'),
    text: zod_1.z.string().min(1, 'Comment text is required')
});
const BrandSettingsSchema = zod_1.z.object({
    brandName: zod_1.z.string(),
    brandTone: zod_1.z.string(),
    defaultLanguage: zod_1.z.string(),
    replyLength: zod_1.z.enum(['short', 'detailed']),
    emojiUsage: zod_1.z.enum(['none', 'minimal', 'frequent']),
    wordsToAvoid: zod_1.z.array(zod_1.z.string()),
    preferredPhrases: zod_1.z.array(zod_1.z.string()),
    customInstructions: zod_1.z.string()
});
const AnalyzeRequestSchema = zod_1.z.object({
    platform: zod_1.z.enum(['youtube', 'meta', 'mock']),
    content: ContentSchema,
    comments: zod_1.z.array(CommentItemSchema).max(10, 'Maximum comments to analyze at once is 10'),
    provider: zod_1.z.enum(['gemini', 'openai']).optional().default('gemini'),
    settings: BrandSettingsSchema.partial().optional(),
    apiKey: zod_1.z.string().optional()
});
router.post('/analyze-comments', async (req, res) => {
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
        const { platform, content, comments, provider, settings, apiKey } = validation.data;
        // 2. Select AI Provider
        let activeProvider = geminiProvider;
        if (provider === 'openai') {
            activeProvider = openAIProvider;
        }
        console.log(`Analyzing ${comments.length} comments from ${platform} using ${provider}...`);
        // 3. Call AI analysis
        const results = await activeProvider.analyzeComments(platform, content, comments, settings, apiKey);
        res.json({
            success: true,
            results
        });
    }
    catch (error) {
        console.error('Error during comment analysis route:', error);
        res.status(500).json({
            success: false,
            error: 'An internal error occurred during analysis.',
            message: error.message
        });
    }
});
exports.default = router;
