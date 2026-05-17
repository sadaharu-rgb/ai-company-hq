/**
 * 株式AI分析ルート
 *
 * POST /api/analyze-stock  → 株ツールのデータを取得しAIが BUY/HOLD/SKIP 判定
 */
import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

const 株ツールURL = 'http://localhost:3003'

// ── アナリストシステムプロンプト ──────────────────────────────
const アナリストプロンプト = `あなたはプロの日本株アナリストです。
提供された株価データ・テクニカル指標・財務データをもとに、投資判断を行います。

【出力ルール】
- 根拠を明確に示す（感覚ではなくデータに基づく）
- リスクも必ず言及する
- 短期・中長期の両面から評価する
- 投資は自己責任である旨を添える

【出力フォーマット】
## テクニカル分析
（MA・RSI・出来高・ブレイクアウト等の評価）

## ファンダメンタル分析
（PER・PBR・配当・成長率・アナリスト評価等）

## リスク要因
（懸念点・損切りライン・注意事項）

## 総合評価
（買いポイント・目標・タイミング）

【必須フォーマット — 省略・変形禁止】
回答の最後に必ず以下のブロックをそのまま出力すること：

【最終判定】
判断: [BUY/HOLD/SKIP のいずれか]
確信度: [0〜100の整数のみ]
`

// ── 株ツールからランキングデータを取得 ────────────────────────
async function 株データを取得(銘柄名?: string, コード?: string) {
  const res = await fetch(`${株ツールURL}/api/rankings`)
  const json = await res.json() as {
    success: boolean
    data?: Record<string, 銘柄データ[]>
  }

  if (!json.success || !json.data) return null

  // 総合タブ優先、なければ全軸を合算
  const 総合 = json.data['総合'] ?? []
  const 全軸 = Object.values(json.data).flat()

  if (!銘柄名 && !コード) {
    // 指定なし → 総合TOP1
    return 総合[0] ?? null
  }

  // 銘柄名 or コードで検索
  const 検索対象 = 総合.length > 0 ? 総合 : 全軸
  return 検索対象.find(s =>
    (銘柄名 && s.name?.includes(銘柄名)) ||
    (コード && s.code === コード)
  ) ?? null
}

type 銘柄データ = {
  code?: string
  name?: string
  セクター?: string
  price?: number
  date?: string
  signal?: string
  スコア?: number
  スコア内訳?: { 勝率?: number; 上昇余地?: number; リスク?: number; タイミング?: number }
  ma5?: number
  ma25?: number
  rsi?: number
  ブレイクアウト?: boolean
  ボラティリティ?: number
  高値比率52週?: number
  per?: number
  pbr?: number
  配当利回り?: number
  財務売上成長率?: number
  財務利益成長率?: number
  自己資本比率?: number
  アナリスト目標株価?: number
  アナリストシグナル?: string
  損切りライン?: number
  損切り率?: number
  出来高比?: number
}

// ── 株データ → テーマ文字列に変換 ────────────────────────────
function テーマを構築(株: 銘柄データ, 元の銘柄名?: string): string {
  const 名前 = 株.name ?? 元の銘柄名 ?? '不明'
  const sign = (n: number) => n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)

  return `【銘柄】${名前}（${株.code ?? '—'}）${株.セクター ? ` / ${株.セクター}セクター` : ''}

【価格・スコア】
- 現在値: ¥${株.price?.toLocaleString() ?? '不明'}（${株.date ?? '—'}）
- 総合スコア: ${株.スコア ?? '—'} / 100点
- シグナル: ${株.signal ?? '—'}

【スコア内訳】
- 勝率スコア: ${株.スコア内訳?.勝率 ?? '—'}
- 上昇余地スコア: ${株.スコア内訳?.上昇余地 ?? '—'}
- リスクスコア（低いほど良い）: ${株.スコア内訳?.リスク ?? '—'}
- タイミングスコア: ${株.スコア内訳?.タイミング ?? '—'}

【テクニカル指標】
- トレンド: ${株.ma5 != null && 株.ma25 != null ? (株.ma5 > 株.ma25 ? '上昇トレンド（MA5 > MA25）' : '調整中（MA5 < MA25）') : '—'}
- RSI: ${株.rsi?.toFixed(1) ?? '—'}
- 出来高比（平均比）: ${株.出来高比?.toFixed(1) ?? '—'}倍
- ブレイクアウト: ${株.ブレイクアウト ? 'あり' : 'なし'}
- ボラティリティ: ${株.ボラティリティ ?? '—'}%
- 52週高値比: ${株.高値比率52週 ?? '—'}%

【ファンダメンタル】
- PER: ${株.per ? `${株.per}倍` : '—'}
- PBR: ${株.pbr ? `${株.pbr}倍` : '—'}
- 配当利回り: ${株.配当利回り ? `${株.配当利回り}%` : '—'}
- 売上成長率: ${株.財務売上成長率 != null ? `${sign(株.財務売上成長率)}%` : '—'}
- 利益成長率: ${株.財務利益成長率 != null ? `${sign(株.財務利益成長率)}%` : '—'}
- 自己資本比率: ${株.自己資本比率 != null ? `${株.自己資本比率.toFixed(1)}%` : '—'}

【アナリスト情報（株予報）】
- 目標株価: ${株.アナリスト目標株価 ? `¥${株.アナリスト目標株価.toLocaleString()}` : '—'}
- アナリスト評価: ${株.アナリストシグナル ?? '—'}
- 損切りライン目安: ${株.損切りライン ? `¥${株.損切りライン.toLocaleString()}（-${株.損切り率}%）` : '—'}

上記データをもとに BUY・HOLD・SKIP のいずれかで投資判断してください。`
}

// ── エンドポイント ────────────────────────────────────────────
router.post('/analyze-stock', async (req: Request, res: Response) => {
  const { 銘柄名, コード } = req.body as { 銘柄名?: string; コード?: string }

  // SSEヘッダー
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const 送信 = (部門ID: string, 内容: string) =>
    res.write(`data: ${JSON.stringify({ 部門ID, 内容 })}\n\n`)

  try {
    // ── 株データ取得 ──────────────────────────────────────────
    送信('status', '📊 株価データ取得中...')

    let 株: 銘柄データ | null = null
    let テーマ: string

    try {
      株 = await 株データを取得(銘柄名, コード)
    } catch {
      送信('status', '⚠️ 株ツールサーバーに接続できません。銘柄名のみで分析します。')
    }

    if (株) {
      テーマ = テーマを構築(株, 銘柄名)
      送信('status', `🔍 ${株.name ?? 銘柄名} を分析中...`)
    } else if (銘柄名) {
      テーマ = `${銘柄名} について一般的な投資判断の観点からBUY・HOLD・SKIPで評価してください。（株ツールのデータが取得できなかったため、銘柄名のみの分析です）`
      送信('status', `🔍 ${銘柄名} を分析中（データなし・銘柄名のみ）...`)
    } else {
      送信('エラー', '銘柄名またはコードを指定してください（例: /stock トヨタ）')
      res.end()
      return
    }

    // ── AI分析実行 ────────────────────────────────────────────
    const 応答 = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: アナリストプロンプト,
      messages: [{ role: 'user', content: テーマ }],
    })

    const 内容 = 応答.content[0]?.type === 'text' ? 応答.content[0].text : ''
    if (内容) {
      // 00_ プレフィックスで送信 → Discord側でCEO扱い（Embed表示）
      送信('00_株アナリスト', 内容)
    }

    送信('done', '分析完了')
  } catch (e) {
    console.error('[株分析] エラー:', e)
    送信('エラー', '株分析でエラーが発生しました')
  } finally {
    res.end()
  }
})

export default router
