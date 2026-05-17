/**
 * AI自動会議ルート
 *
 * POST /api/cases/:id/meeting      → 既存エンドポイント（ダッシュボード用・SSE）
 * POST /api/meeting/discord        → Discord Bot用（案件ID不要・同じSSEエンジン）
 * GET  /api/departments            → 利用可能な部門一覧
 */
import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import pLimit from 'p-limit'
import { データベース取得 } from '../db/データベース.js'
import { 部門一覧読込, HQ取得, 会議参加部門取得, コンプライアンス部門取得, セキュリティ規約取得 } from '../utils/部門ローダー.js'
import type { 部門情報 } from '../utils/部門ローダー.js'

const router = Router()
// ESMのimport hoistingでdotenv.config()より先に実行されるため遅延初期化
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// 同時実行数制限（APIレート制限対策）
const 並列上限 = 4

// ── 社訓（全部門プロンプトの先頭に付与・最上位ルール）──────────
const 社訓 = `【社訓 — 最上位ルール】
すべての判断・提案・行動はこの社訓を最優先とする。
収益性・スピードより社訓に反する場合は必ず却下する。

① コンプライアンスを最優先とする
・法律・規約・倫理に反する行為は禁止
・グレーな手法でもリスクがある場合は採用しない

② 嘘をつかない
・誇張・ミスリード・虚偽表現を禁止
・不確定な情報は「仮説・考察」として扱う

③ すべての笑顔のために
・ユーザー・関係者・社会にとってプラスになる判断をする
・短期利益より長期信頼を優先する

④ ホワイトな会社であること
・無理・過剰・搾取的な設計は禁止
・健全で持続可能な仕組みを優先する

---

`

// ── 部門一覧取得（フォルダから動的に読む）────────────────────
router.get('/departments', (_req: Request, res: Response) => {
  const 部門 = 部門一覧読込()
  res.json({
    success: true,
    data: 部門.map(d => ({ id: d.id, 名前: d.名前 })),
  })
})

// ── 部門意見を要約（CEO入力用・トークン削減）──────────────────
function 部門意見要約(結果: { 部門: 部門情報; 内容: string }[]): string {
  return 結果
    .map(r => `【${r.部門.名前}】\n${r.内容.slice(0, 200)}`)
    .join('\n\n---\n\n')
}

// ── CEO出力から判定ブロックを解析──────────────────────────────
function CEO判定を抽出(text: string): { 判断: string; 確信度: number } | null {
  const match = text.match(/【最終判定】\s*\n判断:\s*(.+)\n確信度:\s*(\d+)/)
  if (!match) return null
  const 確信度 = parseInt(match[2], 10)
  if (isNaN(確信度)) return null
  return { 判断: match[1].trim(), 確信度 }
}

// ── CEO専用の判定フォーマット指示（全部門プロンプトの後に付与）──
const CEO判定指示 = `

【必須フォーマット】
回答の最後に、必ず以下のブロックをそのままの形で出力すること（省略・変形禁止）：

【最終判定】
判断: [実行/保留/見送り/条件付き実行 のいずれか]
確信度: [0〜100の整数のみ]
`

// ── AI会議のコアエンジン（SSEストリーミング）──────────────────
// 両エンドポイントから呼ばれる共通処理
async function AI会議を実行(
  案件ID: string,
  テーマ: string,
  参加部門IDs: string[] | undefined,
  res: Response
): Promise<void> {
  const db = データベース取得()

  // SSE ヘッダー
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const 送信 = (部門ID: string, 内容: string) =>
    res.write(`data: ${JSON.stringify({ 部門ID, 内容 })}\n\n`)

  try {
    // 参加部門を決定（指定なし = 全部門、CEOは自動で最後）
    const 全部門 = 会議参加部門取得()
    const 対象部門 = 参加部門IDs
      ? 全部門.filter(d => 参加部門IDs.includes(d.id))
      : 全部門

    const HQ = HQ取得()
    const 部門数 = 対象部門.length

    console.log(`[AI会議] テーマ: ${テーマ}`)
    console.log(`[AI会議] 参加部門: ${対象部門.map(d => d.名前).join(' / ')}`)
    if (HQ) console.log(`[AI会議] CEO統合あり（Sonnet）`)

    // ── 会議レコードを作成（グルーピング用ID発行）────────────────
    const 会議作成結果 = db.prepare(
      'INSERT INTO 会議 (案件ID, テーマ) VALUES (?, ?)'
    ).run(案件ID, テーマ)
    const 会議ID = 会議作成結果.lastInsertRowid

    // ── ① 一般部門を並列実行（pLimit で同時数制限）──────────────
    const limit = pLimit(並列上限)
    let 完了数 = 0
    let エラー数 = 0
    const 部門結果: { 部門: 部門情報; 内容: string }[] = []

    await Promise.all(
      対象部門.map(部門 =>
        limit(async () => {
          console.log(`  ▶ ${部門.名前} 思考中...`)
          送信('status', `${部門.名前} 思考中... (${完了数 + 1}/${部門数})`)

          try {
            const 応答 = await getAnthropic().messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 800,
              system: 社訓 + セキュリティ規約取得() + 部門.プロンプト,
              messages: [{ role: 'user', content: テーマ }],
            })

            const 内容 = 応答.content[0]?.type === 'text' ? 応答.content[0].text : ''
            if (!内容) return

            db.prepare(
              "INSERT INTO 投稿 (案件ID, 会議ID, 部門ID, 内容, 種別) VALUES (?, ?, ?, ?, 'AI生成')"
            ).run(案件ID, 会議ID, 部門.id, 内容)

            部門結果.push({ 部門, 内容 })
            完了数++

            送信('progress', JSON.stringify({ 完了: 完了数, 合計: 部門数 }))
            送信(部門.id, 内容)
            console.log(`  ✅ ${部門.名前} 完了 (${完了数}/${部門数})`)
          } catch (e: unknown) {
            エラー数++
            const msg = e instanceof Error ? e.message : String(e)
            const isCredit = msg.includes('credit balance')
            console.error(`  ❌ ${部門.名前} エラー:`, msg)
            if (isCredit) {
              送信('エラー', 'APIクレジット不足のため会議を中止しました。Anthropicのダッシュボードでクレジットを確認してください。')
              throw e  // 全体のPromise.allを止める
            }
            送信('progress', JSON.stringify({ 完了: 完了数, 合計: 部門数 }))
          }
        })
      )
    )

    if (エラー数 > 0 && 部門結果.length === 0) {
      送信('done', '会議終了（全部門エラー）')
      res.end()
      return
    }

    // ── ② コンプライアンスゲート──────────────────────────────────
    const コンプラ = コンプライアンス部門取得()
    let コンプラ結果 = ''
    let コンプラ判定: 'OK' | '条件付きOK' | 'NG' = 'OK'

    if (コンプラ && 部門結果.length > 0) {
      console.log('  🛡️ コンプライアンスチェック中...')
      送信('status', 'コンプライアンス チェック中...')

      const 全部門意見 = 部門結果
        .map(r => `【${r.部門.名前}】\n${r.内容}`)
        .join('\n\n---\n\n')

      const コンプラ入力 = `テーマ：${テーマ}\n\n各部門の提案：\n\n${全部門意見}\n\n以上の提案をコンプライアンス観点でチェックしてください。`

      const コンプラ応答 = await getAnthropic().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: 社訓 + セキュリティ規約取得() + コンプラ.プロンプト,
        messages: [{ role: 'user', content: コンプラ入力 }],
      })

      コンプラ結果 = コンプラ応答.content[0]?.type === 'text' ? コンプラ応答.content[0].text : ''

      if (コンプラ結果) {
        if (コンプラ結果.includes('実行可否：NG') || /④\s*NG/.test(コンプラ結果)) {
          コンプラ判定 = 'NG'
        } else if (コンプラ結果.includes('条件付き')) {
          コンプラ判定 = '条件付きOK'
        }

        db.prepare(
          "INSERT INTO 投稿 (案件ID, 会議ID, 部門ID, 内容, 種別) VALUES (?, ?, ?, ?, 'AI生成')"
        ).run(案件ID, 会議ID, コンプラ.id, コンプラ結果)

        送信(コンプラ.id, コンプラ結果)
        console.log(`  🛡️ コンプラ判定: ${コンプラ判定}`)
      }

      if (コンプラ判定 === 'NG') {
        送信('status', '❌ コンプライアンス NG → 会議を停止しました')
        送信('done', '会議終了（コンプラNG）')
        res.end()
        return
      }

      if (コンプラ判定 === '条件付きOK') {
        送信('status', '⚠️ 条件付きOK → 修正後のみ実行可能')
      }
    }

    // ── ③ CEO統合（Sonnet で最終判断）────────────────────────────
    if (HQ && 部門結果.length > 0) {
      console.log('  👑 CEO統合中（Sonnet）...')
      送信('status', 'CEO 統合判断中（Sonnet）...')

      const 各部門要約 = 部門意見要約(部門結果)
      const コンプラセクション = コンプラ結果
        ? `\n\n【コンプライアンス判定：${コンプラ判定}】\n${コンプラ結果}`
        : ''

      const CEO入力 = `テーマ：${テーマ}\n\n各部門の意見（要約）：\n\n${各部門要約}${コンプラセクション}`

      const CEO応答 = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: 社訓 + セキュリティ規約取得() + HQ.プロンプト + CEO判定指示,
        messages: [{ role: 'user', content: CEO入力 }],
      })

      const CEO内容 = CEO応答.content[0]?.type === 'text' ? CEO応答.content[0].text : ''
      if (CEO内容) {
        const 判定 = CEO判定を抽出(CEO内容)
        if (判定) {
          db.prepare(
            'UPDATE 会議 SET 判断 = ?, 確信度 = ? WHERE id = ?'
          ).run(判定.判断, 判定.確信度, 会議ID)
          console.log(`  👑 判定: ${判定.判断}（確信度 ${判定.確信度}%）`)
        } else {
          console.warn('  ⚠️ CEO判定ブロックの解析失敗')
        }

        db.prepare(
          "INSERT INTO 投稿 (案件ID, 会議ID, 部門ID, 内容, 種別) VALUES (?, ?, ?, ?, 'AI生成')"
        ).run(案件ID, 会議ID, HQ.id, CEO内容)

        送信(HQ.id, CEO内容)
        console.log('  👑 CEO統合完了')
      }
    }

    送信('done', '会議終了')
  } catch (e) {
    console.error('[AI会議] エラー:', e)
    送信('エラー', 'AI会議でエラーが発生しました')
  } finally {
    res.end()
  }
}

// ── ダッシュボード用エンドポイント（案件ID指定）──────────────────
router.post('/:id/meeting', async (req: Request, res: Response) => {
  const { テーマ, 参加部門IDs } = req.body as {
    テーマ: string
    参加部門IDs?: string[]
  }
  await AI会議を実行(req.params.id, テーマ, 参加部門IDs, res)
})

// ── Discord Bot用エンドポイント（案件ID不要）────────────────────
// 「Discord会議」案件を自動的に取得 or 作成してエンジンを呼ぶ
router.post('/meeting/discord', async (req: Request, res: Response) => {
  const { テーマ, 参加部門IDs } = req.body as {
    テーマ: string
    参加部門IDs?: string[]
  }

  const db = データベース取得()

  // Discord専用の案件を取得 or 作成
  let 案件 = db.prepare(
    "SELECT id FROM 案件 WHERE タイトル = 'Discord会議'"
  ).get() as { id: number } | undefined

  if (!案件) {
    const r = db.prepare(
      "INSERT INTO 案件 (タイトル, 説明, 優先度, カテゴリ) VALUES ('Discord会議', 'Discord経由のAI会議ログ', '高', 'Discord')"
    ).run()
    案件 = { id: Number(r.lastInsertRowid) }
    console.log(`[Discord] Discord会議案件を作成しました（id: ${案件.id}）`)
  }

  await AI会議を実行(String(案件.id), テーマ, 参加部門IDs, res)
})

export default router
