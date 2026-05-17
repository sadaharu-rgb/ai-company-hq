/**
 * 株式AI分析ランナー
 * /api/analyze-stock のSSEを消費して Discord スレッドに投稿する
 */
import type { ThreadChannel } from 'discord.js'

const サーバーURL = process.env.SERVER_URL ?? 'http://localhost:3002'

// 最終判定ブロックを解析
function 判定を抽出(text: string): { 判断: string; 確信度: number } | null {
  const match = text.match(/【最終判定】\s*\n判断:\s*(.+)\n確信度:\s*(\d+)/)
  if (!match) return null
  return { 判断: match[1].trim(), 確信度: parseInt(match[2], 10) }
}

// 判断ごとの色（Discord Embed color）
const 判断色: Record<string, number> = {
  'BUY':  0x00C853,  // 緑
  'HOLD': 0xFFB300,  // 黄
  'SKIP': 0xE53935,  // 赤
}

const 判断絵文字: Record<string, string> = {
  'BUY':  '🟢 BUY',
  'HOLD': '🟡 HOLD',
  'SKIP': '🔴 SKIP',
}

export async function runStockAnalysis(銘柄名: string, thread: ThreadChannel): Promise<void> {
  const progressMsg = await thread.send('📊 **株式AI分析 開始...**\nデータ取得中...')

  const res = await fetch(`${サーバーURL}/api/analyze-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 銘柄名: 銘柄名 === 'top' ? undefined : 銘柄名 }),
  })

  if (!res.body) throw new Error('SSEストリームが取得できませんでした')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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

        if (部門ID === 'status') {
          await progressMsg.edit(`📊 **株式AI分析 進行中...**\n${内容}`)

        } else if (部門ID === 'done') {
          await progressMsg.delete().catch(() => {})

        } else if (部門ID === 'エラー') {
          await progressMsg.edit(`❌ ${内容}`)

        } else if (部門ID.startsWith('00_') || 部門ID === 'CEO') {
          // アナリスト判定 → Embed（色付き）
          const 判定 = 判定を抽出(内容)
          const 判断キー = 判定?.判断 ?? ''
          const 色 = 判断色[判断キー] ?? 0x607D8B
          const 絵文字 = 判断絵文字[判断キー] ?? `🤔 ${判断キー}`

          await thread.send({
            embeds: [{
              title: '📈 株式AI分析レポート',
              description: 内容.slice(0, 4000),
              color: 色,
              footer: {
                text: 判定
                  ? `${絵文字}  |  確信度: ${判定.確信度}%  |  ⚠️ 投資は自己責任で`
                  : '⚠️ 投資は自己責任で',
              },
            }],
          })
        }

      } catch {
        // JSON parseエラーはスキップ
      }
    }
  }
}
