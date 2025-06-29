/**
 * Summarize a YouTube video using Gemini 2.5 Flash API
 * @param videoUrl The full YouTube video URL
 * @param env Cloudflare environment bindings (must include GEMINI_API_KEY)
 * @returns The summary string
 */
export async function summarizeWithGemini(videoUrl: string, env: CloudflareBindings): Promise<string> {
    if (!env.GEMINI_API_KEY) {
        return '❌ Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.';
    }

    try {
        // Gemini 2.5 Flash API endpoint (replace with the actual endpoint if different)
        const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const prompt = `Summarize this YouTube video: ${videoUrl}`;

        const response = await fetch(`${endpoint}?key=${env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return `❌ Gemini API error: ${response.status} ${response.statusText}\n${errorText}`;
        }

        const data = await response.json();
        // The summary is in data.candidates[0].content.parts[0].text
        const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (summary) {
            return summary;
        } else {
            return '❌ Gemini API did not return a summary.';
        }
    } catch (error: any) {
        return `❌ Error calling Gemini API: ${error.message}`;
    }
} 