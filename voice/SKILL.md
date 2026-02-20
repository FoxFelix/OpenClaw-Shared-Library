# Voice Input System (huzai-ear)

Realtime voice transcription bot for Discord using Deepgram API. Listens to a specified voice channel, transcribes speech in real-time, and sends the text to the OpenClaw Gateway for AI processing.

## Overview

- **Purpose**: Real-time speech-to-text for Discord voice channels
- **Input**: Voice audio from Discord voice channel (via Discord.js + @discordjs/voice)
- **Processing**: Deepgram Nova-2 for speech recognition (Mandarin Chinese optimized)
- **Output**: Transcribed text sent to OpenClaw Gateway for AI response

## Prerequisites

- Node.js 18+
- FFmpeg (system installation)
- Discord Bot with proper intents
- Deepgram API key (nova-2 model)

## Installation

```bash
# Navigate to voice folder
cd /home/rumsgr/.openclaw/workspace-main/voice

# Install dependencies
npm install discord.js @discordjs/voice @deepgram/sdk prism-media libsodium-wrappers
```

## Configuration

Set the following environment variables (e.g., in `.env` file):

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord Bot token | `你的Discord_Bot_Token` |
| `DEEPGRAM_API_KEY` | Deepgram API key | `你的Deepgram_API_Key` |
| `TARGET_CHANNEL_ID` | Voice channel ID to join | `你的頻道ID` |
| `TEXT_CHANNEL_ID` | Text channel for AI responses | `你的頻道ID` |
| `USER_ID` | Only transcribe this user (optional, empty = everyone) | `你的用戶ID` |
| `GATEWAY_HTTP` | OpenClaw Gateway URL | `http://localhost:18789` |
| `GATEWAY_TOKEN` | OpenClaw Gateway token | `你的Gateway_Token` |

### Creating `.env` file:

```bash
echo 'DISCORD_TOKEN=你的Discord_Bot_Token
DEEPGRAM_API_KEY=你的Deepgram_API_Key
TARGET_CHANNEL_ID=你的頻道ID
TEXT_CHANNEL_ID=你的頻道ID
USER_ID=
GATEWAY_HTTP=http://localhost:18789
GATEWAY_TOKEN=你的Gateway_Token' > .env
```

## Running

```bash
node huzai-ear.js
```

## Testing

1. Start the bot: `node huzai-ear.js`
2. The bot should join the target voice channel
3. Speak in the voice channel
4. Transcribed text should appear in console and be sent to the Gateway
5. AI response should appear in the configured text channel

## Key Features

- Real-time speech-to-text using Deepgram Nova-2
- Only processes audio from specified user (optional)
- End-of-speech detection (500ms silence)
- Automatic reconnection to Gateway if needed
- Encryption support via libsodium

## Troubleshooting

- **Bot not joining**: Check `TARGET_CHANNEL_ID` is valid and bot has permission
- **No transcription**: Verify Deepgram API key is valid
- **Gateway errors**: Ensure Gateway is running and `GATEWAY_HTTP` is correct
