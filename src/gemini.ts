import { GoogleGenAI, Content, Part } from '@google/genai';

export const model = 'gemini-2.5-flash';

/**
 * Summarize a YouTube video using Gemini 2.5 Flash API
 * @param videoUrl The full YouTube video URL
 * @param env Cloudflare environment bindings (must include GEMINI_API_KEY)
 * @returns The summary string
 */
export async function summarizeWithGemini(videoUrl: string, videoId: string, env: CloudflareBindings): Promise<string> {
    console.log(`🎬 Starting Gemini analysis for video: ${videoUrl} (ID: ${videoId})`);

    if (!env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in environment variables');
        return '❌ Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.';
    }

    try {
        console.log('🤖 Initializing Google AI client...');
        // Initialize the Google AI client
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

        // Create a detailed prompt for better YouTube video summaries
        const prompt = `
        Analyze the following YouTube video and generate a concise summary formatted for a Discord message under 1700 characters.
        - Start with a short summary summarizing the overall theme or purpose of the video.
        - Each point must begin with a timestamp in [m:ss] format (e.g., [1:15]).
        - Format the timestamp [m:ss] as a clickable hyperlink like: https://www.youtube.com/watch?v=${videoId}#t=SECONDS.
        - Use total SECONDS for the timestamp (e.g., 75 instead of 01:15).
        - Do not include any other text than the summary. minimalistic.
        - If there is any important information that is not covered in the transcript, add it to the summary, like code, links, images, problems, solutions, etc.
        `;

        console.log('📝 Created prompt for video analysis');
        console.log(`📋 Using model: ${model}`);

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

        console.log('🚀 Sending request to Gemini API...');
        const startTime = Date.now();

        // Generate content using Gemini 2.5 Pro
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;
        console.log(`✅ Gemini API response received in ${processingTime}ms`);

        // Extract the summary text
        const summary = response.text;

        if (summary && summary.trim()) {
            console.log(`📄 Summary generated successfully (${summary.length} characters)`);
            console.log(`📊 Summary preview: ${summary.substring(0, 100)}...`);
            return summary.trim();
        } else {
            console.error('❌ Gemini API returned empty or null summary');
            return '❌ Gemini API did not return a summary. The video might be private, unavailable, or the API encountered an issue.';
        }
    } catch (error: any) {
        console.error('❌ Gemini API error occurred:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // Provide more specific error messages
        if (error.message?.includes('API key')) {
            console.error('🔑 API key validation failed');
            return '❌ Invalid API key. Please check your GEMINI_API_KEY environment variable.';
        } else if (error.message?.includes('quota')) {
            console.error('📊 API quota exceeded');
            return '❌ API quota exceeded. Please try again later or check your Gemini API usage limits.';
        } else if (error.message?.includes('blocked')) {
            console.error('🚫 Content was blocked by Gemini');
            return '❌ Content was blocked. The video might contain restricted content or be unavailable.';
        } else if (error.message?.includes('not found')) {
            console.error('🔍 Video not found or inaccessible');
            return '❌ Video not found. Please check if the YouTube URL is valid and the video is publicly accessible.';
        } else {
            console.error('🔥 Unknown Gemini API error');
            return `❌ Error calling Gemini API: ${error.message || 'Unknown error occurred'}`;
        }
    }
} 