export type 部門ID =
  | 'CEO' | 'CFO' | 'フロント' | 'バック' | 'セキュリティ' | 'リサーチ'
  | '心理' | '統計' | 'マーケ' | '自動化' | 'プロダクト'
  | '子供' | '主婦' | '大人' | 'シニア' | 'コアユーザー'

export type 部門カテゴリ = '経営層' | '開発系' | '攻め系' | 'ペルソナ系'

export type 部門定義型 = {
  id: 部門ID
  名前: string
  アイコン: string
  カテゴリ: 部門カテゴリ
  色: string
  システムプロンプト: string
}

export type プロジェクトカテゴリ = 'フロントエンド' | 'バックエンド' | 'データ収集' | 'DevOps' | '企画' | 'その他'

export type 案件 = {
  id: number
  タイトル: string
  説明: string
  優先度: '高' | '中' | '低'
  ステータス: '稼働中' | '完了' | '保留'
  カテゴリ: プロジェクトカテゴリ
  URL?: string | null  // アプリのURL（例: http://localhost:5174）
  投稿数?: number
  作成日時: string
}

export type 投稿 = {
  id: number | string
  案件ID: number
  会議ID?: number | null   // AI会議から生成された場合に付与
  部門ID: string           // ファイルシステムID（例: "05_心理部"）または旧ハードコードID
  内容: string
  種別: '意見' | '通知' | 'AI生成'
  作成日時: string
}

export type 会議 = {
  id: number
  案件ID: number
  テーマ: string
  開始日時: string
  判断?: string | null          // AIの最終判定（実行/保留/見送り/条件付き実行）
  確信度?: number | null        // AIの確信度（0-100）
  実行アクション?: string | null // 人間が記録したアクション
}

// 判断→絵文字・色のマッピング
export const 判断スタイル: Record<string, { emoji: string; color: string }> = {
  '実行':       { emoji: '✅', color: 'text-green-600' },
  '保留':       { emoji: '⏸️', color: 'text-yellow-600' },
  '見送り':     { emoji: '❌', color: 'text-red-500' },
  '条件付き実行': { emoji: '⚠️', color: 'text-orange-500' },
}

export type APIレスポンス<T> = {
  success: boolean
  data?: T
  error?: string
}

// ─── マーケティングタブ用型定義 ─────────────────────────

export type 公開済み投稿 = {
  通し番号: string
  日付: string
  タイトル: string
  内容: string
  ハッシュタグ: string[]
  ツイートID?: string
  反応?: string
  連動note?: string
}

export type ネタ候補 = {
  ID: string
  タイトル: string
  カテゴリ: string
  評価: 'S' | 'A' | 'B' | '不明'
  草稿あり: boolean
  生成日?: string
}

export type マーケティングサマリ = {
  公開済み投稿数: number
  公開済み最新日付: string | null
  ネタサマリ: {
    総数: number
    S級: number
    A級: number
    B級: number
    不明: number
    草稿あり: number
    カテゴリ別: Record<string, number>
  }
  KPI: {
    TODO: string
    現在の取得元: string
  }
}

export type 画面モード = 'HQ' | 'Marketing' | 'Progress'

// ─── プロジェクト進捗（管理者ダッシュボード）─────────────────
export type プロジェクト進捗 = {
  名前: string
  稼働: string
  最終コミット日時: string | null
  最終コミットハッシュ: string | null
  最終コミットメッセージ: string | null
  ブランチ: string | null
  未コミット数: number
  テスト数: number
  状態: '活発' | '安定' | '停滞' | '不明'
  取得失敗: boolean
}
