# AI聽覺橋接功能 (huzai-ear.js)

⚠️ 重要環境提醒：
本腳本採用 Windows 原生 Node.js 與 WSL (Windows Subsystem for Linux) 跨環境協作模式。
您需要具備一個運作中的 Discord Bot，且確保您的 OpenClaw Gateway 服務已在 WSL 環境中啟動並監聽指定的 Port (埠號)，方可達成完整的語音橋接。

Discord 語音 → Deepgram STT → OpenClaw Gateway

---

## 架構說明

```
用戶 說話
   │
   ▼
Discord Voice (Opus)
   │  @discordjs/voice
   ▼
Opus → PCM 解碼 (prism-media)
   │
   ▼
Deepgram LiveTranscription (WebSocket)
   │  nova-2 模型，zh-TW
   ▼
轉錄文字
   │
   ▼
HTTP POST → WSL2 OpenClaw Gateway (/v1/chat/completions)
   localhost:18789/v1/chat/completions(你指定的埠號)
   Authorization: Bearer <TOKEN>
   │
   ▼
AI 回覆發送到文字頻道 (TEXT_CHANNEL_ID)
```

## 對話流程

1. **語音輸入**：用戶 在語音頻道說話
2. **語音轉文字**：Deepgram 將語音即時轉為文字
3. **發送到 Gateway**：以 Chat Completions 格式傳送訊息
4. **AI 回覆**：Gateway 處理後，回覆會發送到指定的文字頻道

```
轉錄文字 → Gateway (Chat Completions) → 回覆訊息 → TEXT_CHANNEL_ID
```

---

## 前置需求

### 1. Node.js (Windows 原生)
- 版本 >= 18.x
- 下載：https://nodejs.org/

### 2. FFmpeg
- 下載：https://ffmpeg.org/download.html
- 解壓後將 `bin/` 資料夾加入 `PATH` 環境變數

### 3. Discord Bot 設定
1. 前往 https://discord.com/developers/applications
2. 建立新應用程式 → Bot → 取得 Token
3. 開啟以下 **Privileged Gateway Intents**：
   - `GUILD_MEMBERS`
   - `GUILD_VOICE_STATES`
4. 邀請機器人時需要 `Connect` + `Speak` 權限（OAuth2 URL Generator）

### 4. Deepgram API 金鑰
- 註冊：https://console.deepgram.com/
- 建立 API Key（免費層有 $200 額度）

---

## 安裝

```powershell
# 在 Windows CMD 或 PowerShell 中執行
# 建立目錄並放入腳本
mkdir C:\huzai-ear
cd C:\huzai-ear

# 複製 huzai-ear.js 和 huzai-ear-package.json 到此目錄
# 將 huzai-ear-package.json 重新命名為 package.json

copy huzai-ear-package.json package.json

# 安裝依賴
npm install

# 若 sodium-native 編譯失敗（需要 Visual Studio Build Tools），改用：
npm install tweetnacl
```

---

## 設定環境變數

### 方法 A：CMD 臨時設定
```cmd
set DISCORD_TOKEN=Bot_你的Token
set DEEPGRAM_API_KEY=你的Deepgram金鑰
set GATEWAY_TOKEN=你的OpenClaw_Gateway_Token
set TARGET_CHANNEL_ID=語音頻道的18位數字ID
set TEXT_CHANNEL_ID=文字頻道的18位數字ID（AI回覆會發送到這裡）
set FELIX_USER_ID=用戶的Discord用戶ID（選填，留空則監聽所有人）
node huzai-ear.js
```

### 方法 B：PowerShell 臨時設定
```powershell
$env:DISCORD_TOKEN     = "Bot_你的Token"
$env:DEEPGRAM_API_KEY  = "你的Deepgram金鑰"
$env:GATEWAY_TOKEN     = "你的OpenClaw_Gateway_Token"
$env:TARGET_CHANNEL_ID = "語音頻道的18位數字ID"
$env:TEXT_CHANNEL_ID   = "文字頻道的18位數字ID（AI回覆會發送到這裡）"
$env:FELIX_USER_ID     = "用戶的Discord用戶ID"
node huzai-ear.js
```

### 方法 C：直接修改腳本
在 `huzai-ear.js` 頂端的 `CONFIG` 區塊中直接填入值（注意不要上傳到公開 Repo）。

---

## 取得頻道 ID 和用戶 ID

Discord 桌面版：
1. 設定 → 進階 → 開啟「開發者模式」
2. 右鍵語音頻道 → 複製頻道 ID
3. 右鍵 用戶 的頭像 → 複製用戶 ID

---

## 執行

```cmd
node huzai-ear.js
```

腳本啟動時會先檢查 Gateway 健康狀態：
- 健康檢查端點：`GET /api/health`
- 確認 Gateway 正常運作後才會連線到 Discord

正常輸出範例：
```
[Boot] 狐仔聽覺橋接腳本啟動中...
[Health] 檢查 Gateway 狀態...
[Health ✓] Gateway 運作正常
[Bot] 已登入為 HuzaiEar#1234
[Bot] 加入語音頻道: 語音聊天室 (我的伺服器)
[Bot] 語音連線就緒，開始監聽...
[Ear] 偵測到 用戶 開始說話
[STT] 用戶: 今天天氣真好
[Gateway →] 發送至 /v1/chat/completions
[Gateway ✓] 已發送到文字頻道
```

---

## Gateway 發送格式（Chat Completions）

腳本以 Chat Completions 格式傳送訊息到 Gateway：

```json
{
  "model": "default",
  "messages": [
    {
      "role": "user",
      "content": "今天天氣真好",
      "name": "用戶"
    }
  ],
  "extra": {
    "source": "discord-voice",
    "userId": "1234567890",
    "username": "用戶",
    "transcript": "今天天氣真好",
    "timestamp": "2026-02-19T12:38:00.000Z"
  }
}
```

Header：
```
Content-Type: application/json
Authorization: Bearer <GATEWAY_TOKEN>
```

**注意**：
- 使用 `/v1/chat/completions` 端點（而非舊的 `/api/hear`）
- 回覆會自動發送到 `TEXT_CHANNEL_ID` 指定的文字頻道

---

## 常見問題

| 問題 | 解法 |
|------|------|
| `sodium-native` 編譯失敗 | 改裝 `tweetnacl`：`npm install tweetnacl` |
| FFmpeg not found | 確認 FFmpeg 已加入系統 PATH |
| 機器人進不了頻道 | 檢查 Bot 是否有 `Connect` 權限 |
| 聽不到聲音 | 確認 `selfDeaf: false` 且 Bot 有 `Use Voice Activity` 權限 |
| Gateway 連線失敗 | 確認 WSL2 已啟動且 Gateway 在 18789 埠運行 |
| Deepgram 無轉錄 | 確認語言設定 (`zh-TW`) 與實際語言吻合 |
| 沒有收到 AI 回覆 | 確認 `TEXT_CHANNEL_ID` 已正確設定（回覆會發送到此文字頻道） |
| 健康檢查失敗 | 確認 Gateway 正在運行：`curl http://localhost:18789/api/health` |

---

## 語言切換

修改 `huzai-ear.js` 中 `startDeepgramStream` 函數的 `language` 參數：
- 繁體中文：`zh-TW`
- 英文：`en-US`
- 日文：`ja`
- 混合（自動偵測）：移除 `language` 參數
