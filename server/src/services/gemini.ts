import { AIProvider } from './ai';
import { ContentContext, BrandSettings, AnalysisResult } from '../types';
import { getSystemPrompt } from '../prompt/systemPrompt';
import { GEMINI_API_KEY } from '../config';

export class GeminiProvider implements AIProvider {
  constructor() {
    console.log('Gemini AI Provider initialized in Direct REST Mode.');
  }

  async analyzeComments(
    platform: string,
    content: ContentContext,
    comments: { id: string; author: string; text: string }[],
    settings?: BrandSettings,
    apiKey?: string
  ): Promise<AnalysisResult[]> {
    const keyToUse = (apiKey && apiKey.trim() !== '') ? apiKey.trim() : (GEMINI_API_KEY ? GEMINI_API_KEY.trim() : '');
    
    if (!keyToUse) {
      console.log('Running analysis in Fallback Mock Mode (Missing API Key)...');
      return this.generateMockAIResponse(comments, content);
    }

    const systemPrompt = getSystemPrompt(
      settings?.brandName,
      settings?.brandTone,
      settings?.customInstructions
    );

    const userPrompt = `
Platform: ${platform}
Content/Post Details:
- Title/Text: ${content.title}
- Description/Url: ${content.description || ''} (${content.url})

Comments to analyze:
${JSON.stringify(comments, null, 2)}
`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        results: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              commentId: { type: "STRING" },
              intent: { type: "STRING" },
              sentiment: { type: "STRING" },
              requiresReply: { type: "BOOLEAN" },
              priority: { type: "STRING" },
              replies: {
                type: "OBJECT",
                properties: {
                  optionA: { type: "STRING" },
                  optionB: { type: "STRING" },
                  optionC: { type: "STRING" }
                },
                required: ["optionA", "optionB", "optionC"]
              }
            },
            required: [
              "commentId", 
              "intent", 
              "sentiment", 
              "requiresReply", 
              "priority", 
              "replies"
            ]
          }
        }
      },
      required: ["results"]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(keyToUse)}`;
    
    const requestBody = {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1,
        maxOutputTokens: 4096
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const responseData = (await response.json()) as any;
      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('Empty response received from Gemini API');
      }

      const parsed = JSON.parse(responseText);
      if (parsed && Array.isArray(parsed.results)) {
        return parsed.results as AnalysisResult[];
      }

      throw new Error('Invalid response structure returned by Gemini Model');
    } catch (err: any) {
      console.error('Gemini API call failed:', err);
      // If an explicit API key was provided by the user/env, re-throw the error so UI receives the actual error
      if (keyToUse) {
        throw new Error(`Gemini API Error: ${err.message || err}`);
      }
      return this.generateMockAIResponse(comments, content);
    }
  }

  // Realistic fallback / Mock generator for offline/unconfigured environments
  private generateMockAIResponse(
    comments: { id: string; author: string; text: string }[],
    content: ContentContext
  ): AnalysisResult[] {
    return comments.map((comment) => {
      const isBangla = /[\u0980-\u09FF]/.test(comment.text);
      const textLower = comment.text.toLowerCase();
      
      let intent = 'appreciation';
      let sentiment: 'positive' | 'negative' | 'neutral' = 'positive';
      let requiresReply = true;
      let priority: 'low' | 'medium' | 'high' = 'low';
      let replies = { optionA: '', optionB: '', optionC: '' };

      if (textLower.includes('worth') || textLower.includes('cse') || textLower.includes('admit') || textLower.includes(' ভর্তি') || textLower.includes('কন্টিনিউ')) {
        intent = 'career_question';
        priority = 'high';
        sentiment = 'neutral';
        
        if (isBangla || textLower.includes('ami') || textLower.includes('vai')) {
          replies = {
            optionA: 'অবশ্যই ভাই, সিএসই পড়া এখনো অনেক লাভজনক। তবে থিওরির পাশাপাশি নিজের প্রবলেম সলভিং স্কিলটাও বাড়াতে হবে।',
            optionB: 'সিএসই পড়া অবশ্যই ভালো অপশন ভাই, তবে সাথে ভালো কোডিং স্কিল থাকা লাগবে।',
            optionC: 'সিএসই পড়লে ফিউচার খুবই ব্রাইট ভাই! শুধু ভার্সিটির ভরসায় না থেকে নিজেকে সেলফ-লার্নিংয়ে অভ্যস্ত করতে হবে।'
          };
        } else {
          replies = {
            optionA: 'Yes, pursuing CSE is definitely worth it! Just make sure to build strong problem solving skills along with your degree.',
            optionB: 'Definitely worth it. Focus on building real projects alongside your coursework.',
            optionC: 'CSE has great scope! But remember, your self-learning coding skills will matter the most in the industry.'
          };
        }
      } else if (textLower.includes('join') || textLower.includes('লিংক') || textLower.includes('link') || textLower.includes('চাই')) {
        intent = 'course_admission';
        priority = 'high';
        
        if (isBangla || textLower.includes('ami') || textLower.includes('vai') || textLower.includes('wanna')) {
          replies = {
            optionA: 'ধন্যবাদ ভাই! আমাদের ডিসকর্ড কমিউনিটিতে জয়েন করতে চাইলে ডেসক্রিপশনে দেয়া লিংকটি চেক করতে পারো।',
            optionB: 'ডিসকর্ডে জয়েন করতে কমেন্ট বা ডেসক্রিপশনের লিংকে ক্লিক করো ভাই।',
            optionC: 'অবশ্যই ভাই, লিংকে ক্লিক করে আমাদের কমিউনিটিতে যোগ দাও। সেখানে আমরা সবাই একসাথে ডিসকাস করি!'
          };
        } else {
          replies = {
            optionA: 'Hey! You can join our Discord community by clicking the link in the video description.',
            optionB: 'Awesome, check the description link to join our Discord!',
            optionC: 'Sure! Click the invitation link in the post to join our community. See you there!'
          };
        }
      } else if (textLower.includes('spam') || textLower.includes('promo') || textLower.includes('ভুয়া') || textLower.includes('fake')) {
        intent = 'spam';
        requiresReply = true;
        sentiment = 'negative';
        if (isBangla) {
          replies = {
            optionA: 'ধন্যবাদ ভাই! আমাদের কোনো সার্ভিস বা বিষয়ে সমস্যা হলে আমাদের ইনবক্স করতে পারো, সাহায্য করব।',
            optionB: 'ফিডব্যাকের জন্য ধন্যবাদ ভাই।',
            optionC: 'ধন্যবাদ ভাই কমেন্ট করার জন্য! কোনো অভিযোগ বা সমস্যা থাকলে পেজে নক দিও।'
          };
        } else {
          replies = {
            optionA: 'Thanks for your feedback! If you face any issues, feel free to reach out to us via inbox.',
            optionB: 'Thanks for the feedback.',
            optionC: 'If you need support, please message our page directly!'
          };
        }
      } else {
        // Default Appreciation/Positive feedback
        if (isBangla || textLower.includes('bhalo') || textLower.includes('nice') || textLower.includes('sundor')) {
          replies = {
            optionA: 'অনেক ধন্যবাদ ভাই! তোমাদের সুন্দর সাপোর্টই আমাদের এগিয়ে চলার অনুপ্রেরণা।',
            optionB: 'অনেক ধন্যবাদ ভাই পাশে থাকার জন্য!',
            optionC: 'ধন্যবাদ ভাই কমেন্ট করার জন্য! এভাবে পাশে থেকো, সামনে আরও দারুন ভিডিও আসছে।'
          };
        } else {
          replies = {
            optionA: 'Thank you so much! Your support keeps us motivated to build better content.',
            optionB: 'Thanks for the support!',
            optionC: 'Great to hear that! Stay tuned, we have more exciting things coming up soon.'
          };
        }
      }

      return {
        commentId: comment.id,
        intent,
        sentiment,
        requiresReply,
        priority,
        replies
      };
    });
  }
}
