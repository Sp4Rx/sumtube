# 📺 SumTube - YouTube Summarizer Discord Bot

A Discord bot that automatically detects YouTube links in messages and provides AI-powered summaries using Gemini 2.5 Flash. Built with Hono and deployed on Cloudflare Workers.

## ✨ Features

- 🤖 **Automatic Detection**: No commands needed - just post YouTube links!
- ⚡ **Lightning Fast**: Powered by Cloudflare Workers for global performance
- 🔗 **Universal Support**: Works with all YouTube URL formats
- 🎯 **Smart Summaries**: Uses Google's Gemini 2.5 Flash for intelligent video analysis
- 💬 **Slash Commands**: Includes `/about` command for bot information

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A Discord application and bot token
- Google Gemini API key
- Cloudflare account (for deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sumtube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .dev.vars.example .dev.vars
   
   # Edit .dev.vars with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Register Discord slash commands**
   ```bash
   # In a new terminal window, register the commands
   npm run register
   # Or manually: curl -X POST http://localhost:8787/register
   ```

6. **Deploy to Cloudflare Workers**
   ```bash
   # Set up production secrets
   wrangler secret put DISCORD_TOKEN
   wrangler secret put DISCORD_PUBLIC_KEY  
   wrangler secret put DISCORD_APPLICATION_ID
   wrangler secret put GEMINI_API_KEY
   
   # Deploy
   npm run deploy
   ```

## 🔧 Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Create a bot and get the token
4. Copy the Public Key and Application ID
5. Set up bot permissions: `Send Messages`, `Use Slash Commands`

### Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key for Gemini
3. Add it to your environment variables

## 📖 Usage

1. **Add the bot to your Discord server** using the OAuth2 URL
2. **Post YouTube links** in any channel where the bot has access
3. **Get instant summaries** - the bot will automatically reply with AI-generated summaries
4. **Use `/about`** to learn more about the bot

## 🛠️ Development

### VS Code Debugging

The project includes VS Code debugging configuration:

1. Start Wrangler dev: `npm run dev`
2. Open VS Code Debug panel (Ctrl+Shift+D)
3. Select "Attach debugger" and click play
4. Set breakpoints and debug your code!

### Project Structure

```
src/
├── index.ts          # Main application server
├── commands.ts       # Discord slash command definitions  
└── register.ts       # Command registration script
```

### Type Generation

For generating/synchronizing types based on your Worker configuration:

```bash
npm run cf-typegen
```

## 🚀 Deployment

This bot is designed to run on Cloudflare Workers:

### One-Click Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Sp4Rx/sumtube)

### Manual Deploy

```bash
# Deploy to production
npm run deploy

# View logs
wrangler tail
```

## 📝 License

MIT License - see LICENSE file for details
