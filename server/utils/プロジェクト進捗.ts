/**
 * プロジェクト進捗（純関数・DB/IO非依存）
 *
 * 各プロジェクトの git 生出力（ルートが execFileSync で収集）を整形する。
 * 状態は最終コミットからの経過日数で判定（活発/安定/停滞）。
 */

export type 監視プロジェクト定義 = { 名前: string; 相対パス: string; 稼働: string }

/** Projects/ ルートからの相対パスと稼働種別（定数＝コマンドインジェクション対象外） */
export const 監視プロジェクト: 監視プロジェクト定義[] = [
  { 名前: 'pokeca-price-monitor', 相対パス: '03_データ収集部/pokeca-price-monitor', 稼働: 'Railway 24h' },
  { 名前: 'lottery-app', 相対パス: '02_バックエンド部/lottery-app', 稼働: 'Railway 24h' },
  { 名前: 'ai-company-hq', 相対パス: '01_フロントエンド部/ai-company-hq', 稼働: 'ローカル' },
  { 名前: 'landing-page', 相対パス: '01_フロントエンド部/landing-page', 稼働: '保留' },
  { 名前: '株ツール', 相対パス: '02_バックエンド部/株ツール', 稼働: 'ローカル' },
]

export type 進捗状態 = '活発' | '安定' | '停滞' | '不明'

/** 最終コミット日時（ISO）から状態を判定する（活発≤3日 / 安定≤30日 / 停滞>30日） */
export function 状態を判定する(最終コミットISO: string | null, now: number = Date.now()): 進捗状態 {
  if (!最終コミットISO) return '不明'
  const t = Date.parse(最終コミットISO)
  if (!Number.isFinite(t)) return '不明'
  const 経過日 = (now - t) / 86400000
  if (経過日 <= 3) return '活発'
  if (経過日 <= 30) return '安定'
  return '停滞'
}

export type プロジェクト進捗 = {
  名前: string
  稼働: string
  最終コミット日時: string | null
  最終コミットハッシュ: string | null
  最終コミットメッセージ: string | null
  ブランチ: string | null
  未コミット数: number
  テスト数: number
  状態: 進捗状態
  取得失敗: boolean
}

/** ルートが集める git 生出力（取得失敗時は各フィールド null） */
export type git生出力 = {
  名前: string
  稼働: string
  log: string | null // "%cI|%h|%s"
  ブランチ: string | null
  status: string | null // porcelain（空文字＝変更なし）
  テストファイル: string | null // ls-files の改行区切り（空文字＝テストなし）
}

function 非空行数(s: string | null): number {
  if (!s) return 0
  return s.split('\n').filter(l => l.trim() !== '').length
}

/** git 生出力を整形する純関数。log が null のプロジェクトは取得失敗として扱う */
export function 進捗を整形する(生: git生出力[], now: number = Date.now()): プロジェクト進捗[] {
  return 生.map(g => {
    if (g.log == null) {
      return {
        名前: g.名前, 稼働: g.稼働,
        最終コミット日時: null, 最終コミットハッシュ: null, 最終コミットメッセージ: null,
        ブランチ: g.ブランチ, 未コミット数: 0, テスト数: 0, 状態: '不明', 取得失敗: true,
      }
    }
    // %s（subject）に "|" が含まれ得るため、先頭2つだけ分割して残りを結合
    const [日時, ハッシュ, ...残り] = g.log.split('|')
    return {
      名前: g.名前,
      稼働: g.稼働,
      最終コミット日時: 日時 || null,
      最終コミットハッシュ: ハッシュ || null,
      最終コミットメッセージ: 残り.join('|') || null,
      ブランチ: g.ブランチ,
      未コミット数: 非空行数(g.status),
      テスト数: 非空行数(g.テストファイル),
      状態: 状態を判定する(日時 || null, now),
      取得失敗: false,
    }
  })
}
