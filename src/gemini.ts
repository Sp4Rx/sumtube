import { GoogleGenAI, Content, Part } from '@google/genai';

/**
 * Summarize a YouTube video using Gemini 2.5 Flash API
 * @param videoUrl The full YouTube video URL
 * @param env Cloudflare environment bindings (must include GEMINI_API_KEY)
 * @returns The summary string
 */
export async function summarizeWithGemini(videoUrl: string, videoId: string, env: CloudflareBindings): Promise<string> {
    if (!env.GEMINI_API_KEY) {
        return '❌ Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.';
    }

    try {
        // Initialize the Google AI client
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

        // Create a detailed prompt for better YouTube video summaries
        const prompt = `Analyze the following YouTube video content. Provide a concise summary in discord message format. Add relevant timestamps to the summary with hyperlinks to the timestamps, use youtube.com/watch?v=${videoId}#t=TIMESTAMP where TIMESTAMP is the timestamp in seconds. Do not include any other text than the summary.`;

        // Create content with both text prompt and YouTube URL
        const contents: Content = {
            parts: [
                {
                    text: prompt
                } as Part,
                {
                    fileData: {
                        fileUri: videoUrl
                    }
                } as Part
            ]
        };

        // Generate content using Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro-preview-03-25',
            contents: contents,
        });

        // Extract the summary text
        const summary = response.text;

        if (summary && summary.trim()) {
            return summary.trim();
        } else {
            return '❌ Gemini API did not return a summary. The video might be private, unavailable, or the API encountered an issue.';
        }
    } catch (error: any) {
        console.error('Gemini API error:', error);

        // Provide more specific error messages
        if (error.message?.includes('API key')) {
            return '❌ Invalid API key. Please check your GEMINI_API_KEY environment variable.';
        } else if (error.message?.includes('quota')) {
            return '❌ API quota exceeded. Please try again later or check your Gemini API usage limits.';
        } else if (error.message?.includes('blocked')) {
            return '❌ Content was blocked. The video might contain restricted content or be unavailable.';
        } else if (error.message?.includes('not found')) {
            return '❌ Video not found. Please check if the YouTube URL is valid and the video is publicly accessible.';
        } else {
            return `❌ Error calling Gemini API: ${error.message || 'Unknown error occurred'}`;
        }
    }
} 