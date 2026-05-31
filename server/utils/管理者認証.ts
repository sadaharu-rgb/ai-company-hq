/**
 * 管理者認証（多層セキュリティの中核）
 *
 * 「管理者以外はほぼ入れない」要件のための堅牢な認証ロジック。
 *  - secret は定数時間比較（タイミング攻撃対策）
 *  - セッションは HMAC-SHA256 署名＋有効期限（改竄・期限切れを弾く）
 *  - secret/署名鍵は env のみ（コード直書き禁止）。未設定時は常に拒否（フェイルセーフ）
 *
 * 本体は純関数＋Expressミドルウェア。crypto 以外に依存しない（テスト可能）。
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

const セッション有効時間ミリ秒 = 8 * 60 * 60 * 1000 // 8時間

function 管理シークレット(): string {
  return process.env.ADMIN_SECRET ?? ''
}
function 署名鍵(): string {
  return process.env.SESSION_SECRET ?? ''
}

/**
 * 文字列を定数時間で比較する（タイミング攻撃対策）
 * - 正が空（env未設定）なら常に false（フェイルセーフ）
 * - 長さが違ってもダミー比較で処理時間を一定化し、長さ情報を漏らさない
 */
export function 定数時間一致(入力: string, 正: string): boolean {
  if (!正) return false
  const a = Buffer.from(入力, 'utf8')
  const b = Buffer.from(正, 'utf8')
  if (a.length !== b.length) {
    timingSafeEqual(b, b) // ダミー比較で時間一定化
    return false
  }
  return timingSafeEqual(a, b)
}

/** 入力 secret が管理シークレットと一致するか（定数時間・env未設定なら拒否） */
export function シークレット検証(入力: string): boolean {
  return 定数時間一致(入力, 管理シークレット())
}

/** HMAC-SHA256 署名セッショントークンを発行（形式: "<exp>.<署名hex>"） */
export function セッション発行(now: number = Date.now()): string {
  const exp = now + セッション有効時間ミリ秒
  const payload = String(exp)
  const 署名 = createHmac('sha256', 署名鍵()).update(payload).digest('hex')
  return `${payload}.${署名}`
}

/** セッショントークンの署名と有効期限を検証する（改竄・期限切れ・欠損を弾く） */
export function セッション検証(token: string, now: number = Date.now()): boolean {
  if (!署名鍵()) return false // 鍵未設定なら常に拒否（フェイルセーフ）
  if (typeof token !== 'string') return false
  const パーツ = token.split('.')
  if (パーツ.length !== 2) return false
  const [payload, 署名] = パーツ
  const 期待署名 = createHmac('sha256', 署名鍵()).update(payload).digest('hex')
  if (!定数時間一致(署名, 期待署名)) return false // 署名改竄を弾く
  const exp = Number(payload)
  if (!Number.isFinite(exp) || exp < now) return false // 期限切れ・不正payloadを弾く
  return true
}

/**
 * Express ミドルウェア：Authorization: Bearer <session> を検証。
 * 無効・期限切れ・欠損はすべて 401（汎用メッセージで内部情報を漏らさない）。
 */
export function 認証必須(req: Request, res: Response, next: NextFunction): void {
  const ヘッダー = req.headers.authorization ?? ''
  const token = ヘッダー.startsWith('Bearer ') ? ヘッダー.slice(7) : ''
  if (!セッション検証(token)) {
    res.status(401).json({ success: false, error: '認証が必要です' })
    return
  }
  next()
}
