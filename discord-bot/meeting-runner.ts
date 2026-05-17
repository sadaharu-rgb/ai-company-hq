/**
 * Discord会議ランナー
 * サーバーのSSEストリームを消費して、Discord スレッドに投稿する
 */
import type { ThreadChannel } from 'discord.js'

const サーバーURL = process.env.SERVER_URL ?? 'http://localhost:3002'

// CEO部門IDかどうか判定（00_〇〇 または CEO）
function isCEO(部門ID: string): boolean {
  return 部門ID.startsWith('00_') || 部門ID === 'CEO'
}

// CEO出力から判定ブロックを解析
function 判定を抽出(text: string): { 判断: string; 確信度: number } | null {
  const match = text.match(/【最終判定】\s*\n判断:\s*(.+)\n確信度:\s*(\d+)/)
  if (!match) return null
  return { 判断: match[1].trim(), 確信度: parseInt(match[2], 10) }
}

const 判断絵文字: Record<string, string> = {
  '実行': '✅',
  '保留': '⏸️',
  '見送り': '❌',
  '条件付き実行': '⚠️',
}

export async function runDiscordMeeting(テーマ: string, thread: ThreadChannel): Promise<void> {
  // 進行状況メッセージ（後で編集する）
  const progressMsg = await thread.send('🤖 **会議開始...**\n進行状況：準備中')

  // 部門名マップを取得（ID → 表示名）
  const 部門名Map = new Map<string, string>()
  try {
    const 部門Res = await fetch(`${サーバーURL}/api/departments`)
    const 部門Data = await 部門Res.json() as { data: { id: string; 名前: string }[] }
    for (const d of 部門Data.data) 部門名Map.set(d.id, d.名前)
  } catch {
    console.warn('[Discord] 部門名マップ取得失敗、IDをそのまま使用')
  }

  // SSEストリームに接続
  const res = await fetch(`${サーバーURL}/api/meeting/discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ テーマ }),
  })

  if (!res.body) throw new Error('SSEストリームが取得できませんでした')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let 完了 = 0
  let 合計 = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      try {
        const parsed = JSON.parse(line.slice(6)) as { 部門ID: string; 内容: string }
        const { 部門ID, 内容 } = parsed

        if (部門ID === 'progress') {
          // 進行度更新 → progressMsgを編集
          const { 完了: c, 合計: t } = JSON.parse(内容) as { 完了: number; 合計: number }
          完了 = c; 合計 = t
          await progressMsg.edit(`🤖 **会議進行中...**\n進行状況：${c} / ${t}`)

        } else if (部門ID === 'status') {
          // ステータスメッセージはスキップ（progressで代替）

        } else if (部門ID === 'done') {
          if (完了 === 0) {
            await progressMsg.edit(`❌ **会議失敗** — 部門の応答が0件でした`)
          } else {
            await progressMsg.edit(`✅ **会議完了** (${完了} / ${合計})`)
          }

        } else if (部門ID === 'エラー') {
          await progressMsg.edit(`❌ **会議中止**`)
          await thread.send(`❌ ${内容}`)

        } else if (isCEO(部門ID)) {
          // 👑 CEO → Embed（金色・特別表示）
          const 判定 = 判定を抽出(内容)
          const 判断絵 = 判定 ? (判断絵文字[判定.判断] ?? '🤔') : ''

          await thread.send({
            embeds: [{
              title: '👑 CEO 統合判断',
              description: 内容.slice(0, 4000),
              color: 0xFFD700,  // 金色
              footer: 判定
                ? { text: `${判断絵} 判断: ${判定.判断}  |  確信度: ${判定.確信度}%` }
                : { text: '判定ブロック解析不可' },
            }],
          })

        } else {
          // 一般部門 → テキスト投稿（200文字に要約）
          const 部門名 = 部門名Map.get(部門ID) ?? 部門ID
          const 要約 = 内容.slice(0, 1800)
          await thread.send(`**[${部門名}]**\n${要約}`)
        }

      } catch {
        // JSON parseエラーはスキップ
      }
    }
  }
}
