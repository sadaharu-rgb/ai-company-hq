/**
 * AI会議 Discord Bot
 *
 * コマンド:
 *   /meeting [theme]  → 指定テーマでAI会議を開始し、スレッドに結果を投稿
 *
 * 起動:
 *   npm run discord:bot
 *
 * コマンド登録（初回のみ）:
 *   npm run discord:register
 */
import { Client, GatewayIntentBits, Events } from 'discord.js'
import dotenv from 'dotenv'
import { runDiscordMeeting } from './meeting-runner.js'
import { runStockAnalysis } from './stock-runner.js'

dotenv.config()

// ── Bot クライアント初期化 ────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, c => {
  console.log(`[Discord Bot] ${c.user.tag} でログイン中`)
  console.log(`[Discord Bot] サーバー: ${c.guilds.cache.map(g => g.name).join(', ')}`)
})

// ── スレッド作成ユーティリティ ────────────────────────────────
async function スレッドを作成(interaction: import('discord.js').ChatInputCommandInteraction, タイトル: string) {
  if (!interaction.channel || !('threads' in interaction.channel)) {
    await interaction.editReply('❌ このチャンネルではスレッドを作成できません（テキストチャンネルで使用してください）')
    return null
  }
  try {
    return await interaction.channel.threads.create({
      name: タイトル,
      autoArchiveDuration: 60,
    })
  } catch (e) {
    console.error('[Discord Bot] スレッド作成エラー:', e)
    await interaction.editReply('❌ スレッドの作成に失敗しました')
    return null
  }
}

// ── スラッシュコマンド処理 ────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  // ── /meeting ────────────────────────────────────────────────
  if (interaction.commandName === 'meeting') {
    const テーマ = interaction.options.getString('theme', true)
    await interaction.deferReply()

    const thread = await スレッドを作成(interaction, `🤖 AI会議: ${テーマ}`)
    if (!thread) return

    await interaction.editReply(`🤖 AI会議を開始しました → <#${thread.id}>`)
    console.log(`[Discord Bot] 会議開始: ${テーマ}`)

    try {
      await runDiscordMeeting(テーマ, thread)
      console.log(`[Discord Bot] 会議完了: ${テーマ}`)
    } catch (e) {
      console.error('[Discord Bot] 会議エラー:', e)
      await thread.send('❌ 会議中にエラーが発生しました。サーバーが起動しているか確認してください。')
    }
    return
  }

  // ── /stock ──────────────────────────────────────────────────
  if (interaction.commandName === 'stock') {
    const 銘柄名 = interaction.options.getString('name') ?? 'top'
    await interaction.deferReply()

    const タイトル = 銘柄名 === 'top'
      ? '📈 株分析: 総合TOP1'
      : `📈 株分析: ${銘柄名}`

    const thread = await スレッドを作成(interaction, タイトル)
    if (!thread) return

    await interaction.editReply(`📈 株式AI分析を開始しました → <#${thread.id}>`)
    console.log(`[Discord Bot] 株分析開始: ${銘柄名}`)

    try {
      await runStockAnalysis(銘柄名, thread)
      console.log(`[Discord Bot] 株分析完了: ${銘柄名}`)
    } catch (e) {
      console.error('[Discord Bot] 株分析エラー:', e)
      await thread.send('❌ 分析中にエラーが発生しました。サーバーが起動しているか確認してください。')
    }
    return
  }
})

// ── Bot 起動 ──────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN
if (!TOKEN) {
  console.error('[Discord Bot] DISCORD_TOKEN が設定されていません（.envを確認）')
  process.exit(1)
}

client.login(TOKEN)
