import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let db: DatabaseSync

export function データベース初期化(): void {
  const dataDir = path.join(__dirname, '../../data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const dbパス = path.join(dataDir, 'hq.db')
  db = new DatabaseSync(dbパス)
  db.exec(`
    CREATE TABLE IF NOT EXISTS 案件 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      タイトル TEXT NOT NULL,
      説明 TEXT DEFAULT '',
      優先度 TEXT NOT NULL DEFAULT '中',
      ステータス TEXT NOT NULL DEFAULT '稼働中',
      カテゴリ TEXT NOT NULL DEFAULT 'その他',
      作成日時 TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
    );
    CREATE TABLE IF NOT EXISTS 会議 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      案件ID INTEGER NOT NULL REFERENCES 案件(id) ON DELETE CASCADE,
      テーマ TEXT NOT NULL,
      開始日時 TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
    );
    CREATE TABLE IF NOT EXISTS 投稿 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      案件ID INTEGER NOT NULL REFERENCES 案件(id) ON DELETE CASCADE,
      会議ID INTEGER REFERENCES 会議(id) ON DELETE SET NULL,
      部門ID TEXT NOT NULL,
      内容 TEXT NOT NULL,
      種別 TEXT NOT NULL DEFAULT '意見',
      作成日時 TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
    );
  `)

  // 既存DBへの安全なマイグレーション（未追加カラムのみ追加）
  const マイグレーション: { sql: string; 説明: string }[] = [
    {
      sql: 'ALTER TABLE 案件 ADD COLUMN URL TEXT',
      説明: '案件.URL（アプリのURL）',
    },
    {
      sql: 'ALTER TABLE 投稿 ADD COLUMN 会議ID INTEGER REFERENCES 会議(id) ON DELETE SET NULL',
      説明: '投稿.会議ID',
    },
    {
      sql: 'ALTER TABLE 会議 ADD COLUMN 判断 TEXT',
      説明: '会議.判断（AIの最終判定）',
    },
    {
      sql: 'ALTER TABLE 会議 ADD COLUMN 確信度 INTEGER',
      説明: '会議.確信度（0-100）',
    },
    {
      sql: 'ALTER TABLE 会議 ADD COLUMN 実行アクション TEXT',
      説明: '会議.実行アクション（人間の記録）',
    },
  ]
  for (const m of マイグレーション) {
    try {
      db.exec(m.sql)
      console.log(`[DB] マイグレーション完了: ${m.説明}`)
    } catch {
      // すでに存在する場合はスキップ
    }
  }

  // 既存プロジェクトのデフォルトURL設定（未設定のもののみ）
  const URLデフォルト: { タイトル: string; URL: string }[] = [
    { タイトル: 'ai-company-hq',        URL: 'http://localhost:5174' },
    { タイトル: 'lottery-app',           URL: 'http://localhost:4000' },
    { タイトル: 'pokeca-price-monitor',  URL: 'https://pokeca-price-monitor-production.up.railway.app' },
  ]
  for (const p of URLデフォルト) {
    db.prepare(
      "UPDATE 案件 SET URL = ? WHERE タイトル = ?"
    ).run(p.URL, p.タイトル)
  }

  // 初回のみ実プロジェクトを初期データとして投入
  const 件数 = (db.prepare('SELECT COUNT(*) AS n FROM 案件').get() as { n: number }).n
  if (件数 === 0) {
    const 初期プロジェクト = [
      { タイトル: 'pokeca-price-monitor', 説明: 'ポケカ価格監視・アラート・ポートフォリオ管理', 優先度: '高', ステータス: '稼働中', カテゴリ: 'データ収集' },
      { タイトル: 'lottery-app', 説明: 'ポケカ抽選情報管理・Discord通知', 優先度: '高', ステータス: '稼働中', カテゴリ: 'バックエンド' },
      { タイトル: 'landing-page', 説明: 'バニラHTML/CSSのランディングページ', 優先度: '中', ステータス: '保留', カテゴリ: 'フロントエンド' },
      { タイトル: 'scraper', 説明: 'Python製買取比較ツール（tkinter GUI）', 優先度: '低', ステータス: '稼働中', カテゴリ: 'データ収集' },
      { タイトル: 'ai-company-hq', 説明: 'AI16部門による社内HQダッシュボード（本プロジェクト）', 優先度: '高', ステータス: '稼働中', カテゴリ: 'フロントエンド' },
    ]
    const stmt = db.prepare("INSERT INTO 案件 (タイトル, 説明, 優先度, ステータス, カテゴリ) VALUES (?, ?, ?, ?, ?)")
    for (const p of 初期プロジェクト) {
      stmt.run(p.タイトル, p.説明, p.優先度, p.ステータス, p.カテゴリ)
    }
    console.log('[DB] 初期プロジェクト5件を投入しました')
  }
}

export function データベース取得(): DatabaseSync {
  return db
}
