/**
 * マーケティング読み取り専用API
 *
 * 設計：
 * - .md ファイルを正本として読み取り専用ビュー提供
 * - DB化しない（テキストエディタで直書きできる利便性を維持）
 * - 編集機能は Phase 2 で .md書き戻し方式
 *
 * エンドポイント：
 * - GET /api/marketing/posts    公開済み.md → 公開済み投稿一覧
 * - GET /api/marketing/ideas    X投稿アイデア.md → ネタ候補一覧
 * - GET /api/marketing/summary  全体サマリ（投稿数・ネタ数・評価別内訳）
 */
import { Router, Request, Response } from 'express'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  公開済み投稿を抽出する,
  ネタ候補を抽出する,
  ネタサマリを集計する,
} from '../utils/マーケティングパーサ.js'

const router = Router()

// .md ファイルのパス解決
// PROJECTS_DIR は Projects/ ルートを指す（部門ローダーと同じ・.envで上書き可）
// デフォルトは ai-company-hq から見て Projects/ ルートまでの相対パスを試す
function コンテンツネタディレクトリ(): string {
  if (process.env.PROJECTS_DIR) {
    return resolve(process.env.PROJECTS_DIR, 'docs/コンテンツネタ')
  }
  // ai-company-hq は Projects/01_フロントエンド部/ai-company-hq/ にある想定
  // → 上に 2階層遡って docs/ へ
  return resolve(process.cwd(), '../../docs/コンテンツネタ')
}

function 公開済みMD読み込み(): string {
  const パス = resolve(コンテンツネタディレクトリ(), '公開済み.md')
  try {
    return readFileSync(パス, 'utf-8')
  } catch (e) {
    console.error('[マーケティングAPI] 公開済み.md 読み込み失敗:', e)
    return ''
  }
}

function アイデアMD読み込み(): string {
  const パス = resolve(コンテンツネタディレクトリ(), 'X投稿アイデア.md')
  try {
    return readFileSync(パス, 'utf-8')
  } catch (e) {
    console.error('[マーケティングAPI] X投稿アイデア.md 読み込み失敗:', e)
    return ''
  }
}

// GET /api/marketing/posts - 公開済み投稿一覧
router.get('/posts', (_req: Request, res: Response) => {
  const md = 公開済みMD読み込み()
  const 一覧 = 公開済み投稿を抽出する(md)
  res.json({ success: true, data: 一覧 })
})

// GET /api/marketing/ideas - ネタ候補一覧
router.get('/ideas', (req: Request, res: Response) => {
  const md = アイデアMD読み込み()
  const 全件 = ネタ候補を抽出する(md)

  // クエリで絞り込み
  const 評価フィルタ = req.query.評価 as string | undefined
  const 草稿フィルタ = req.query.草稿 as string | undefined

  let 結果 = 全件
  if (評価フィルタ && ['S', 'A', 'B'].includes(評価フィルタ)) {
    結果 = 結果.filter(n => n.評価 === 評価フィルタ)
  }
  if (草稿フィルタ === 'true') {
    結果 = 結果.filter(n => n.草稿あり)
  }

  res.json({ success: true, data: 結果 })
})

// GET /api/marketing/summary - 全体サマリ
router.get('/summary', (_req: Request, res: Response) => {
  const 公開済みMD = 公開済みMD読み込み()
  const アイデアMD = アイデアMD読み込み()
  const 投稿一覧 = 公開済み投稿を抽出する(公開済みMD)
  const ネタ一覧 = ネタ候補を抽出する(アイデアMD)
  const ネタサマリ = ネタサマリを集計する(ネタ一覧)

  res.json({
    success: true,
    data: {
      公開済み投稿数: 投稿一覧.length,
      公開済み最新日付: 投稿一覧[0]?.日付 ?? null,
      ネタサマリ,
      // KPI実数は pokeca-price-monitor 側DBに保存。Phase 2で連携
      KPI: {
        TODO: 'pokeca-price-monitor の X投稿KPI履歴 を Phase 2 で接続予定',
        現在の取得元: 'GET /api/test/x-kpi-history?type=ALL&limit=12',
      },
    },
  })
})

export default router
