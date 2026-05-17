import { Router, Request, Response } from 'express'
import { データベース取得 } from '../db/データベース.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = データベース取得()
  const 一覧 = db.prepare(`
    SELECT p.*, COUNT(t.id) AS 投稿数
    FROM 案件 p
    LEFT JOIN 投稿 t ON t.案件ID = p.id
    GROUP BY p.id
    ORDER BY p.作成日時 DESC
  `).all()
  res.json({ success: true, data: 一覧 })
})

router.patch('/:id', (req: Request, res: Response) => {
  const db = データベース取得()
  const body = req.body as { ステータス?: string; URL?: string }
  if (body.ステータス !== undefined) {
    db.prepare('UPDATE 案件 SET ステータス = ? WHERE id = ?').run(body.ステータス, req.params.id)
  }
  if (body.URL !== undefined) {
    db.prepare('UPDATE 案件 SET URL = ? WHERE id = ?').run(body.URL || null, req.params.id)
  }
  res.json({ success: true })
})

router.post('/', (req: Request, res: Response) => {
  const db = データベース取得()
  const { タイトル, 説明, 優先度, カテゴリ, URL } = req.body as { タイトル: string; 説明?: string; 優先度: string; カテゴリ?: string; URL?: string }
  if (!タイトル) return res.status(400).json({ success: false, error: 'タイトル必須' })
  const 結果 = db.prepare(
    "INSERT INTO 案件 (タイトル, 説明, 優先度, カテゴリ, URL) VALUES (?, ?, ?, ?, ?)"
  ).run(タイトル, 説明 ?? '', 優先度 ?? '中', カテゴリ ?? 'その他', URL ?? null)
  const 新案件 = db.prepare('SELECT * FROM 案件 WHERE id = ?').get(結果.lastInsertRowid)
  res.status(201).json({ success: true, data: 新案件 })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = データベース取得()
  db.prepare('DELETE FROM 案件 WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/:id/posts', (req: Request, res: Response) => {
  const db = データベース取得()
  const 投稿 = db.prepare('SELECT * FROM 投稿 WHERE 案件ID = ? ORDER BY 作成日時 ASC').all(req.params.id)
  res.json({ success: true, data: 投稿 })
})

router.post('/:id/posts', (req: Request, res: Response) => {
  const db = データベース取得()
  const { 部門ID, 内容, 種別 } = req.body as { 部門ID: string; 内容: string; 種別: string }
  if (!部門ID || !内容) return res.status(400).json({ success: false, error: '部門ID・内容必須' })
  const 結果 = db.prepare(
    "INSERT INTO 投稿 (案件ID, 部門ID, 内容, 種別) VALUES (?, ?, ?, ?)"
  ).run(req.params.id, 部門ID, 内容, 種別 ?? '意見')
  const 新投稿 = db.prepare('SELECT * FROM 投稿 WHERE id = ?').get(結果.lastInsertRowid)
  res.status(201).json({ success: true, data: 新投稿 })
})

router.delete('/:id/posts/:postId', (req: Request, res: Response) => {
  const db = データベース取得()
  db.prepare('DELETE FROM 投稿 WHERE id = ? AND 案件ID = ?').run(req.params.postId, req.params.id)
  res.json({ success: true })
})

// 会議一覧（プロジェクト内の全AI会議）
router.get('/:id/meetings', (req: Request, res: Response) => {
  const db = データベース取得()
  const 会議 = db.prepare(
    'SELECT * FROM 会議 WHERE 案件ID = ? ORDER BY 開始日時 ASC'
  ).all(req.params.id)
  res.json({ success: true, data: 会議 })
})

// 実行アクションを記録（人間の判断を保存）
router.patch('/:id/meetings/:mid', (req: Request, res: Response) => {
  const db = データベース取得()
  const { 実行アクション } = req.body as { 実行アクション: string }
  if (!実行アクション) return res.status(400).json({ success: false, error: '実行アクション必須' })
  db.prepare(
    'UPDATE 会議 SET 実行アクション = ? WHERE id = ? AND 案件ID = ?'
  ).run(実行アクション, req.params.mid, req.params.id)
  res.json({ success: true })
})

export default router
