/**
 * 管理者認証 単体テスト
 *
 * 「管理者以外はほぼ入れない」要件の心臓部。改竄・期限切れ・欠損・env未設定を
 * すべて弾くことを回帰固定する。このテストが落ちる＝認証が破れる。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  定数時間一致,
  シークレット検証,
  セッション発行,
  セッション検証,
  認証必須,
} from '../管理者認証'

const 元env = { ...process.env }

beforeEach(() => {
  process.env.ADMIN_SECRET = 'test-admin-secret-0123456789abcdef'
  process.env.SESSION_SECRET = 'test-session-secret-0123456789abcdef'
})
afterEach(() => {
  process.env = { ...元env }
})

describe('定数時間一致', () => {
  it('同一文字列は true', () => expect(定数時間一致('abc', 'abc')).toBe(true))
  it('異なる文字列は false', () => expect(定数時間一致('abc', 'abd')).toBe(false))
  it('長さ違いは false', () => expect(定数時間一致('ab', 'abc')).toBe(false))
  it('正が空なら常に false（env未設定フェイルセーフ）', () =>
    expect(定数時間一致('abc', '')).toBe(false))
})

describe('シークレット検証', () => {
  it('正しい secret は true', () =>
    expect(シークレット検証('test-admin-secret-0123456789abcdef')).toBe(true))
  it('誤った secret は false', () => expect(シークレット検証('wrong')).toBe(false))
  it('ADMIN_SECRET 未設定なら拒否', () => {
    delete process.env.ADMIN_SECRET
    expect(シークレット検証('anything')).toBe(false)
  })
})

describe('セッション発行・検証', () => {
  it('発行したセッションは検証を通る', () => {
    expect(セッション検証(セッション発行())).toBe(true)
  })

  it('署名改竄は弾く', () => {
    const t = セッション発行()
    const 改竄 = t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a')
    expect(セッション検証(改竄)).toBe(false)
  })

  it('payload（exp）だけ書き換えても署名不一致で弾く', () => {
    const [, 署名] = セッション発行().split('.')
    const 偽 = `${Date.now() + 999999999}.${署名}`
    expect(セッション検証(偽)).toBe(false)
  })

  it('期限切れセッションは弾く', () => {
    const 失効 = セッション発行(Date.now() - 9 * 60 * 60 * 1000) // 8h前発行＝now時点で失効
    expect(セッション検証(失効)).toBe(false)
  })

  it('不正形式・空・欠損は弾く', () => {
    expect(セッション検証('garbage')).toBe(false)
    expect(セッション検証('')).toBe(false)
    expect(セッション検証('a.b.c')).toBe(false)
  })

  it('SESSION_SECRET 未設定なら検証 false（フェイルセーフ）', () => {
    const t = セッション発行()
    delete process.env.SESSION_SECRET
    expect(セッション検証(t)).toBe(false)
  })

  it('別の署名鍵で発行されたセッションは弾く（鍵ローテで旧失効）', () => {
    const t = セッション発行()
    process.env.SESSION_SECRET = 'different-secret-key-9999'
    expect(セッション検証(t)).toBe(false)
  })
})

describe('認証必須ミドルウェア', () => {
  const モックレス = () => {
    const res: { statusCode: number; body: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
      statusCode: 0,
      body: null,
      status(c: number) { this.statusCode = c; return this },
      json(b: unknown) { this.body = b; return this },
    }
    return res
  }

  it('有効セッションは next() を呼ぶ', () => {
    let 通過 = false
    認証必須(
      { headers: { authorization: `Bearer ${セッション発行()}` } } as never,
      モックレス() as never,
      () => { 通過 = true },
    )
    expect(通過).toBe(true)
  })

  it('トークン無しは 401・next を呼ばない', () => {
    const res = モックレス()
    let 通過 = false
    認証必須({ headers: {} } as never, res as never, () => { 通過 = true })
    expect(通過).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('Bearer 形式でないヘッダーは 401', () => {
    const res = モックレス()
    認証必須({ headers: { authorization: 'Token xxx' } } as never, res as never, () => {})
    expect(res.statusCode).toBe(401)
  })
})
