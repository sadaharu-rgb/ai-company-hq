/**
 * 管理者認証 API
 *  - POST /api/auth/login   secret 検証 → セッション発行（総当たり対策の rate-limit 付き）
 *  - GET  /api/auth/verify  セッションの有効性を返す（フロントの起動時チェック用）
 */
import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { シークレット検証, セッション発行, セッション検証 } from '../utils/管理者認証.js'

const router = Router()

// 総当たり対策：同一IP 15分あたり 5 回まで
const ログイン制限 = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: '試行回数が多すぎます。15分後に再試行してください' },
})

// POST /api/auth/login  body: { secret }
router.post('/login', ログイン制限, (req: Request, res: Response) => {
  const secret = typeof req.body?.secret === 'string' ? req.body.secret : ''
  if (!シークレット検証(secret)) {
    res.status(401).json({ success: false, error: '認証に失敗しました' })
    return
  }
  res.json({ success: true, session: セッション発行() })
})

// GET /api/auth/verify  header: Authorization: Bearer <session>
router.get('/verify', (req: Request, res: Response) => {
  const ヘッダー = req.headers.authorization ?? ''
  const token = ヘッダー.startsWith('Bearer ') ? ヘッダー.slice(7) : ''
  res.json({ success: true, valid: セッション検証(token) })
})

export default router
