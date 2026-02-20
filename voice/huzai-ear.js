'use strict';

const sodium = require('libsodium-wrappers');
let encryptionReady = false;
(async () => {
  await sodium.ready;
  console.log('[系統] libsodium 已就緒 ✓');
  encryptionReady = true;
})();

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState, EndBehaviorType } = require('@discordjs/voice');
const { createClient } = require('@deepgram/sdk');
const prism = require('prism-media');

const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'YOUR_DISCORD_TOKEN',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || 'YOUR_DEEPGRAM_API_KEY',
  TARGET_CHANNEL_ID: process.env.TARGET_CHANNEL_ID || 'YOUR_VOICE_CHANNEL_ID',
  TEXT_CHANNEL_ID: process.env.TEXT_CHANNEL_ID || 'YOUR_TEXT_CHANNEL_ID',
  USER_ID: process.env.USER_ID || '',
  GATEWAY_HTTP: process.env.GATEWAY_HTTP || 'http://localhost:18789',
  GATEWAY_TOKEN: process.env.GATEWAY_TOKEN || 'YOUR_GATEWAY_TOKEN'
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers] });

// 等待 Gateway 就緒
async function waitForGateway() {
  console.log('[系統] 等待 Gateway 就緒...');
  while (true) {
    try {
      const res = await fetch(`${CONFIG.GATEWAY_HTTP}/api/health`);
      if (res.ok) {
        console.log('[系統] Gateway 已就緒！');
        return;
      }
    } catch (e) {
      // 忽略錯誤
    }
    console.log('[系統] 等待中...');
    await new Promise(r => setTimeout(r, 3000));
  }
}

function startDeepgramStream(userId, username, opusStream) {
  const deepgram = createClient(CONFIG.DEEPGRAM_API_KEY);
  const live = deepgram.listen.live({ model: 'nova-2', language: 'zh-TW', punctuate: true, encoding: 'linear16', sample_rate: 48000, channels: 1 });
  const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });
  opusStream.pipe(decoder);
  decoder.on('data', (pcm) => { if (live.getReadyState() === 1) live.send(pcm); });
  opusStream.on('end', () => live.finish());
  live.on('Results', (result) => {
    const transcript = result?.channel?.alternatives?.[0]?.transcript?.trim();
    if (transcript) {
      console.log(`[聽到了] ${username}: ${transcript}`);
      sendToGateway(`[聽到了] 用戶說：${transcript}`);
    }
  });
}

async function sendToGateway(text) {
  try {
    console.log('[Gateway] 已收到語音訊息，發送中...');
    const response = await fetch(`${CONFIG.GATEWAY_HTTP}/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.GATEWAY_TOKEN
      },
      body: JSON.stringify({
        model: "openclaw",
        user: "discord_voice",
        messages: [{ role: 'user', content: text }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices[0].message.content;
      const channel = client.channels.cache.get(CONFIG.TEXT_CHANNEL_ID);
      if (channel) channel.send(reply);
      console.log('[Gateway] 已回覆');
    } else {
      console.error('[Gateway] 失敗:', response.status);
    }
  } catch (err) {
    console.error('[Gateway] 錯誤:', err.message);
  }
}

client.once('ready', async () => {
  console.log(`[Bot已上線] ${client.user.tag}`);
  if (!encryptionReady) await new Promise(r => setTimeout(r, 1000));
  const channel = await client.channels.fetch(CONFIG.TARGET_CHANNEL_ID);
  const connection = joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: false, selfMute: true });
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  console.log('狐仔已進入頻道！');
  connection.receiver.speaking.on('start', (userId) => {
    if (CONFIG.USER_ID && userId !== CONFIG.USER_ID) return;
    const opusStream = connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 500 } });
    startDeepgramStream(userId, '用戶', opusStream);
  });
});

// 啟動時等待 Gateway 就緒
waitForGateway().then(() => {
  client.login(CONFIG.DISCORD_TOKEN);
});
