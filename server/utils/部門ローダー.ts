/**
 * Projects フォルダ内の CLAUDE.md を読み込んで部門として返す
 * フォルダ = 部門 の構造を自動認識する
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// server/utils/ → server/ → ai-company-hq/ → 01_フロントエンド部/ → Projects/
const PROJECTS_DIR = process.env.PROJECTS_DIR
  ?? path.resolve(__dirname, '../../../..')

export type 部門情報 = {
  id: string      // フォルダ名（例: "05_心理部"）
  名前: string    // 表示名（例: "心理部"）
  プロンプト: string
}

// Projects/ 配下の全 CLAUDE.md を読み込む
export function 部門一覧読込(): 部門情報[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.warn(`[部門ローダー] PROJECTS_DIR が見つかりません: ${PROJECTS_DIR}`)
    return []
  }

  return fs.readdirSync(PROJECTS_DIR)
    .filter(dir => {
      const fullPath = path.join(PROJECTS_DIR, dir)
      return fs.statSync(fullPath).isDirectory()
    })
    .sort() // 番号順に処理（00_HQ → 01_... → ...）
    .map(dir => {
      const claudePath = path.join(PROJECTS_DIR, dir, 'CLAUDE.md')
      if (!fs.existsSync(claudePath)) return null
      return {
        id: dir,
        名前: dir.replace(/^\d+_/, ''), // "05_心理部" → "心理部"
        プロンプト: fs.readFileSync(claudePath, 'utf-8'),
      }
    })
    .filter((d): d is 部門情報 => d !== null)
}

// HQ（CEO）部門だけ取得（00_HQ を優先）
export function HQ取得(): 部門情報 | null {
  const 全部門 = 部門一覧読込()
  return 全部門.find(d => d.id === '00_HQ')
    ?? 全部門.find(d => d.id.startsWith('00_') && !d.id.includes('セキュリティ'))
    ?? null
}

// セキュリティ規約（全部門プロンプトの先頭に注入する掟）
export function セキュリティ規約取得(): string {
  const 全部門 = 部門一覧読込()
  const 規約 = 全部門.find(d => d.id.includes('セキュリティ規約'))
  return 規約 ? `【掟 — セキュリティ規約】\n${規約.プロンプト}\n\n---\n\n` : ''
}

// HQ以外・コンプラ以外の全部門（通常の会議参加部門）
export function 会議参加部門取得(): 部門情報[] {
  return 部門一覧読込().filter(d => !d.id.startsWith('00_') && !コンプラIDか(d.id))
}

// コンプライアンス部門だけ取得
export function コンプライアンス部門取得(): 部門情報 | null {
  return 部門一覧読込().find(d => コンプラIDか(d.id)) ?? null
}

function コンプラIDか(id: string): boolean {
  return id.includes('コンプライアンス')
}
