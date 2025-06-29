/**
 * The core server that runs on a Cloudflare worker.
 */

import { Hono } from "hono";
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { ABOUT_COMMAND, SUMMARIZE_COMMAND } from "./commands";
import { summarizeWithGemini, model } from "./gemini";

interface DiscordInteraction {
  type: number;
  token?: string;
  data?: {
    name: string;
    options?: Array<{
      name: string;
      value: string;
    }>;
  };
}



const app = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * A simple home page to verify the worker is working.
 * First try to serve from static assets, then fallback to generated HTML
 */
app.get("/", async (c) => {
  try {
    // Try to serve the static index.html from public directory
    const response = await c.env.ASSETS.fetch(c.req.raw);
    if (response.status === 200) {
      return response;
    }
  } catch (error) {
    console.log("Static asset not found, serving simple response");
  }

  // Fallback to simple response
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head><title>SumTube Bot - Running</title></head>
    <body>
      <h1>📺 SumTube Bot</h1>
      <p>Discord YouTube Summarizer Bot is running!</p>
      <p>✅ Ready to receive Discord interactions</p>
    </body>
    </html>
  `);
});

/**
 * Endpoint to register Discord slash commands
 */
app.post("/register", async (c) => {
  const token = c.env.DISCORD_TOKEN;
  const applicationId = c.env.DISCORD_APPLICATION_ID;

  if (!token) {
    return c.text('DISCORD_TOKEN environment variable is required.', 500);
  }
  if (!applicationId) {
    return c.text('DISCORD_APPLICATION_ID environment variable is required.', 500);
  }

  try {
    const discordUrl = `https://discord.com/api/v10/applications/${applicationId}/commands`;

    const response = await fetch(discordUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${token}`,
      },
      method: 'PUT',
      body: JSON.stringify([ABOUT_COMMAND, SUMMARIZE_COMMAND]),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Registered all commands');
      console.log(JSON.stringify(data, null, 2));

      return c.text(`✅ Successfully registered Discord commands!\n\n${JSON.stringify(data, null, 2)}`, 200);
    } else {
      const errorText = await response.text();
      console.error('Error registering commands:', response.status, response.statusText, errorText);

      return c.text(`❌ Error registering commands:\n${response.status} ${response.statusText}\n\n${errorText}`, response.status as any);
    }
  } catch (error: any) {
    console.error('Error registering commands:', error);
    return c.text(`❌ Error registering commands: ${error.message}`, 500);
  }
});

/**
 * Endpoint to get Discord Application ID for testing
 */
app.get("/id", async (c) => {
  return c.text(c.env.DISCORD_APPLICATION_ID || 'DISCORD_APPLICATION_ID not set');
});



/**
 * Check if message contains YouTube links
 */
function containsYouTubeLink(content: string): boolean {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/gi;
  return youtubeRegex.test(content);
}

/**
 * Extract all YouTube links from message content
 */
function extractYouTubeLinks(content: string): Array<{ url: string; videoId: string }> {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/gi;
  const links: Array<{ url: string; videoId: string }> = [];
  let match;

  while ((match = youtubeRegex.exec(content)) !== null) {
    links.push({
      url: match[0],
      videoId: match[1],
    });
  }

  return links;
}

/**
 * Verify Discord request signature
 */
async function verifyDiscordRequest(request: Request, body: string, env: CloudflareBindings): Promise<{ isValid: boolean; interaction?: DiscordInteraction }> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));

  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

/**
 * Discord Interactions endpoint - handles slash commands
 */
app.post("/discord", async (c) => {
  const env = c.env;
  const body = await c.req.text();

  console.log('🔔 Discord interaction received');
  console.log('📊 Request headers:', {
    'x-signature-ed25519': c.req.header('x-signature-ed25519') ? '[PRESENT]' : '[MISSING]',
    'x-signature-timestamp': c.req.header('x-signature-timestamp') ? '[PRESENT]' : '[MISSING]',
    'content-type': c.req.header('content-type'),
    'user-agent': c.req.header('user-agent')
  });

  // Verify Discord interaction signature
  const { isValid, interaction } = await verifyDiscordRequest(c.req.raw, body, env);
  console.log('🔐 Signature validation:', isValid ? '✅ VALID' : '❌ INVALID');
  console.log('📋 Interaction details:', {
    type: interaction?.type,
    data: interaction?.data,
    token: interaction?.token ? '[PRESENT]' : '[MISSING]'
  });

  if (!isValid || !interaction) {
    console.error('❌ Invalid signature or missing interaction data');
    return c.text('Bad request signature.', 401);
  }

  if (interaction.type === InteractionType.PING) {
    console.log('🏓 PING interaction - responding with PONG');
    return c.json({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    console.log(`⚡ Application command received: ${interaction.data?.name}`);
    switch (interaction.data?.name.toLowerCase()) {
      case ABOUT_COMMAND.name.toLowerCase(): {
        const aboutMessage =
          `🎥 **YouTube Summarizer Bot**\n\n` +
          `📝 **Purpose**: I provide AI-powered summaries of YouTube videos!\n\n` +
          `🔗 **How to use**:\n` +
          `• Use \`/summarize <youtube-url>\` to get a video summary\n` +
          `• Works with any YouTube URL format\n` +
          `• Powered by advanced AI for intelligent analysis\n\n` +
          `🏠 **Homepage**: https://sumtube.heysuvajit.workers.dev/\n` +
          `📂 **Source Code**: https://github.com/Sp4Rx/sumtube\n\n` +
          `✨ **Commands**:\n` +
          `• \`/about\` - Show this information\n` +
          `• \`/summarize <url>\` - Summarize a YouTube video`;

        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: aboutMessage,
          },
        });
      }
      case SUMMARIZE_COMMAND.name.toLowerCase(): {
        console.log('🎯 /summarize command received');

        const urlOption = interaction.data?.options?.find(option => option.name === 'url');

        if (!urlOption?.value) {
          console.log('❌ No URL provided in /summarize command');
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Please provide a YouTube URL to summarize.',
            },
          });
        }

        const url = urlOption.value;
        console.log(`📺 Processing YouTube URL: ${url}`);

        // Check if it's a valid YouTube URL
        if (!containsYouTubeLink(url)) {
          console.log('❌ Invalid YouTube URL format detected');
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Please provide a valid YouTube URL. Supported formats:\n• https://www.youtube.com/watch?v=VIDEO_ID\n• https://youtu.be/VIDEO_ID\n• And other YouTube URL variations',
            },
          });
        }

        // Extract video ID and summarize
        const youtubeLinks = extractYouTubeLinks(url);
        if (youtubeLinks.length > 0) {
          const videoId = youtubeLinks[0].videoId;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

          console.log(`✅ Extracted video ID: ${videoId}`);
          console.log(`🔄 Sending deferred response to Discord...`);

          // Send deferred response immediately (tells Discord we're processing)
          // This gives us up to 15 minutes to respond
          // Type 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
          const deferredResponse = c.json({
            type: 5,
          });

          // Process the summary in the background and edit the response
          c.executionCtx.waitUntil((async () => {
            try {
              console.log('🚀 Starting background processing for video summary...');
              const summary = await summarizeWithGemini(videoUrl, videoId, env);

              console.log('🔍 Summary:');
              console.log(summary);
              console.log('📤 Sending summary response to Discord...');
              // Edit the deferred response with the actual summary
              const editResponse = await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: `**YouTube Video Summary**\n\n🎬 **Video:** ${url}\n\n${summary}\n\n✨ *Powered by ${model}*`,
                }),
              });

              if (editResponse.ok) {
                console.log('✅ Successfully sent summary to Discord');
              } else {
                console.error('❌ Failed to edit Discord message:', editResponse.status, editResponse.statusText);
                const errorText = await editResponse.text();
                console.error('Discord API error details:', errorText);
                //format the error text as per discord markdown
                try {
                  await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      content: `❌ Sorry, I couldn't summarize this video.\n \`\`\`${errorText}\`\`\``,
                    }),
                  });
                } catch (error) {
                  console.error('❌ Failed to edit Discord message with the error message:', error);
                }
              }
            } catch (error) {
              console.error('❌ Error processing summary:', error);

              console.log('📤 Sending error message to Discord...');
              // Edit with error message
              await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: `❌ Sorry, I couldn't summarize this video. Please try again later.\n\n📹 **Video:** ${url}`,
                }),
              });
            }
          })());

          return deferredResponse;
        }

        console.log('❌ Could not extract video ID from URL');
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Could not extract video ID from the provided URL.',
          },
        });
      }
      default:
        return c.json(
          { error: 'Unknown Command' },
          400,
        );
    }
  }

  return c.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content:
        "👋 I'm a YouTube summarizer bot! Post a YouTube link and I'll summarize it for you!",
    },
  });
});



app.all("*", () => new Response("Not Found.", { status: 404 }));


export default app;
