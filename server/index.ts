import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import { データベース初期化 } from './db/データベース.js'
import 案件ルート from './routes/案件.js'
import 会議ルート from './routes/会議.js'
import 株分析ルート from './routes/株分析.js'
import マーケティングルート from './routes/マーケティング.js'

dotenv.config({ override: true })

// 起動時の環境変数バリデーション
// PROJECTS_DIR は 部門ローダー.ts 内でフォールバック解決するため任意
const 必須環境変数 = ['ANTHROPIC_API_KEY'] as const
const 未設定環境変数 = 必須環境変数.filter(v => !process.env[v])
if (未設定環境変数.length > 0) {
  console.error(`[起動エラー] 以下の環境変数が未設定です:\n${未設定環境変数.map(v => `  - ${v}`).join('\n')}`)
  process.exit(1)
}

const app = express()
const ポート番号 = parseInt(process.env.PORT ?? '3003', 10)
const 許可オリジン = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5174'

app.use(cors({ origin: 許可オリジン }))
app.use(express.json())

データベース初期化()

app.use('/api/cases', 案件ルート)
app.use('/api/cases', 会議ルート)
app.use('/api', 会議ルート)     // /api/departments, /api/meeting/discord
app.use('/api', 株分析ルート)   // /api/analyze-stock
app.use('/api/marketing', マーケティングルート) // /api/marketing/posts /ideas /summary

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(ポート番号, () => {
  console.log(`[サーバー] http://localhost:${ポート番号} で起動しました`)
})

const discordWebhook = process.env.DISCORD_WEBHOOK_URL

async function discordエラー通知(メッセージ: string) {
  if (!discordWebhook) return
  await axios.post(discordWebhook, { content: メッセージ }, { timeout: 5000 }).catch(() => {})
}

process.on('uncaughtException', async (err) => {
  console.error('[FATAL] uncaughtException:', err)
  await discordエラー通知(`🚨 **ai-company-hq クラッシュ** (uncaughtException)\n\`\`\`\n${err.message}\n\`\`\``)
  process.exit(1)
})

process.on('unhandledRejection', async (reason) => {
  console.error('[FATAL] unhandledRejection:', reason)
  await discordエラー通知(`🚨 **ai-company-hq エラー** (unhandledRejection)\n\`\`\`\n${String(reason)}\n\`\`\``)
})
