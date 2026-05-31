/**
 * プロジェクト進捗 API（管理者認証 必須）
 *
 * GET /api/projects/progress
 *   各監視プロジェクトの git 状態を読み取り専用で集めて整形して返す。
 *
 * セキュリティ：
 *  - 認証必須ミドルウェアで保護（未認証は 401・データを一切返さない）
 *  - git は execFileSync（シェル非経由）＋引数配列＋パスは定数 → コマンドインジェクション不可
 *  - 実行するのは log/rev-parse/status/ls-files の読み取り系のみ（書き込み系は呼ばない）
 */
import { Router, type Request, type Response } from 'express'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { 認証必須 } from '../utils/管理者認証.js'
import { 監視プロジェクト, 進捗を整形する, type git生出力 } from '../utils/プロジェクト進捗.js'

const router = Router()

/** Projects/ ルート（PROJECTS_DIR・なければ ai-company-hq から2階層上） */
function プロジェクトルート(): string {
  if (process.env.PROJECTS_DIR) return process.env.PROJECTS_DIR
  return resolve(process.cwd(), '../..')
}

/** git を読み取り専用で実行（シェル非経由・失敗時 null） */
function git実行(絶対パス: string, 引数: string[]): string | null {
  try {
    return execFileSync('git', ['-C', 絶対パス, ...引数], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

router.get('/progress', 認証必須, (_req: Request, res: Response) => {
  const ルート = プロジェクトルート()
  const 生: git生出力[] = 監視プロジェクト.map(p => {
    const 絶対 = resolve(ルート, p.相対パス)
    return {
      名前: p.名前,
      稼働: p.稼働,
      log: git実行(絶対, ['log', '-1', '--format=%cI|%h|%s']),
      ブランチ: git実行(絶対, ['rev-parse', '--abbrev-ref', 'HEAD']),
      status: git実行(絶対, ['status', '--porcelain']),
      テストファイル: git実行(絶対, ['ls-files', '*.test.ts', '*.test.tsx']),
    }
  })
  res.json({ success: true, data: 進捗を整形する(生) })
})

export default router
