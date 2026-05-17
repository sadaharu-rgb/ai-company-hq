/**
 * Discord スラッシュコマンド登録スクリプト（初回のみ実行）
 *
 * DISCORD_GUILD_ID が設定されていれば → ギルド限定登録（即時反映）
 * 未設定の場合 → グローバル登録（最大1時間後に反映）
 *
 * 実行:
 *   npm run discord:register
 */
import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const コマンド一覧 = [
  new SlashCommandBuilder()
    .setName('meeting')
    .setDescription('AI会議を開始します（各部門が議論 → CEOが統合判断）')
    .addStringOption(option =>
      option
        .setName('theme')
        .setDescription('会議のテーマ（例: Discord連携機能を追加すべきか）')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(200)
    ),

  new SlashCommandBuilder()
    .setName('stock')
    .setDescription('株式AI分析（株ツールのデータを元にBUY/HOLD/SKIPを判定）')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('銘柄名（例: トヨタ、ソニー）。省略すると総合TOP1を分析')
        .setRequired(false)
        .setMaxLength(50)
    ),
].map(cmd => cmd.toJSON())

const TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const GUILD_ID = process.env.DISCORD_GUILD_ID

if (!TOKEN || !CLIENT_ID) {
  console.error('[Discord] DISCORD_TOKEN と DISCORD_CLIENT_ID が必要です（.envを確認）')
  process.exit(1)
}

const rest = new REST().setToken(TOKEN)

async function コマンドを登録() {
  try {
    if (GUILD_ID) {
      // ギルド限定登録（即時反映・開発向け）
      console.log(`[Discord] ギルドコマンドを登録中... (Guild: ${GUILD_ID})`)
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: コマンド一覧 }
      )
      console.log('[Discord] ✅ ギルドコマンド登録完了（即時反映）')
    } else {
      // グローバル登録（最大1時間後に反映・本番向け）
      console.log('[Discord] グローバルコマンドを登録中...')
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: コマンド一覧 }
      )
      console.log('[Discord] ✅ グローバルコマンド登録完了（最大1時間後に反映）')
    }
  } catch (e) {
    console.error('[Discord] ❌ コマンド登録失敗:', e)
    process.exit(1)
  }
}

コマンドを登録()
