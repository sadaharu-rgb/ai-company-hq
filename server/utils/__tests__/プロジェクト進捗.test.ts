/**
 * プロジェクト進捗 純関数テスト
 * 状態判定の境界・git出力パース（subjectの|混入）・取得失敗フォールバックを固定。
 */
import { describe, it, expect } from 'vitest'
import { 状態を判定する, 進捗を整形する, type git生出力 } from '../プロジェクト進捗'

const 基準 = Date.parse('2026-05-30T12:00:00+09:00')

describe('状態を判定する', () => {
  it('3日以内は活発', () =>
    expect(状態を判定する('2026-05-29T12:00:00+09:00', 基準)).toBe('活発'))
  it('3日ちょうどは活発（境界）', () =>
    expect(状態を判定する('2026-05-27T12:00:00+09:00', 基準)).toBe('活発'))
  it('30日以内は安定', () =>
    expect(状態を判定する('2026-05-15T12:00:00+09:00', 基準)).toBe('安定'))
  it('30日超は停滞', () =>
    expect(状態を判定する('2026-04-01T12:00:00+09:00', 基準)).toBe('停滞'))
  it('null/不正は不明', () => {
    expect(状態を判定する(null, 基準)).toBe('不明')
    expect(状態を判定する('not-a-date', 基準)).toBe('不明')
  })
})

describe('進捗を整形する', () => {
  const 生 = (上書き: Partial<git生出力>): git生出力 => ({
    名前: 'X', 稼働: 'ローカル',
    log: '2026-05-29T12:00:00+09:00|abc1234|観測メモを接続',
    ブランチ: 'main', status: '', テストファイル: '',
    ...上書き,
  })

  it('正常な git 出力をパースする', () => {
    const [r] = 進捗を整形する([生({})], 基準)
    expect(r.最終コミット日時).toBe('2026-05-29T12:00:00+09:00')
    expect(r.最終コミットハッシュ).toBe('abc1234')
    expect(r.最終コミットメッセージ).toBe('観測メモを接続')
    expect(r.状態).toBe('活発')
    expect(r.取得失敗).toBe(false)
  })

  it('subject に | が含まれても壊れない', () => {
    const [r] = 進捗を整形する([生({ log: '2026-05-29T12:00:00+09:00|abc1234|fix: a|b|c' })], 基準)
    expect(r.最終コミットメッセージ).toBe('fix: a|b|c')
  })

  it('status の非空行を未コミット数として数える', () => {
    const [r] = 進捗を整形する([生({ status: ' M file1.ts\n?? file2.ts\n' })], 基準)
    expect(r.未コミット数).toBe(2)
  })

  it('テストファイル行数をテスト数として数える', () => {
    const [r] = 進捗を整形する([生({ テストファイル: 'a.test.ts\nb.test.ts\nc.test.ts' })], 基準)
    expect(r.テスト数).toBe(3)
  })

  it('log が null は取得失敗として不明状態', () => {
    const [r] = 進捗を整形する([生({ log: null })], 基準)
    expect(r.取得失敗).toBe(true)
    expect(r.状態).toBe('不明')
    expect(r.未コミット数).toBe(0)
  })

  it('テスト無し（空文字）は0件', () => {
    const [r] = 進捗を整形する([生({ テストファイル: '' })], 基準)
    expect(r.テスト数).toBe(0)
  })
})
