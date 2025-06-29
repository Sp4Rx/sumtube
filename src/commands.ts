/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const ABOUT_COMMAND = {
    name: 'about',
    description: 'Learn about this YouTube summarizer bot and get the homepage link',
} as const;

export const SUMMARIZE_COMMAND = {
    name: 'summarize',
    description: 'Summarize a YouTube video',
    options: [
        {
            name: 'url',
            description: 'YouTube video URL to summarize',
            type: 3, // STRING
            required: true,
        },
    ],
} as const;

export const COMMANDS = [ABOUT_COMMAND, SUMMARIZE_COMMAND] as const; 