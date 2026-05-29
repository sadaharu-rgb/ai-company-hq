/**
 * マーケティングパーサ 単体テスト
 *
 * .md を正本とする読み取り専用ビューの心臓部。パース崩れ＝UIに誤データが出るため、
 * 見出し形式（### #001: / ### Q-01: / #### N1:）・評価記号・草稿マークの抽出を回帰固定する。
 */
import { describe, it, expect } from 'vitest'
import {
  公開済み投稿を抽出する,
  ネタ候補を抽出する,
  ネタサマリを集計する,
  type ネタ候補,
} from '../マーケティングパーサ'

describe('公開済み投稿を抽出する', () => {
  const 本文 = `# 公開済みコンテンツ

## 🐦 X投稿（時系列）

### #001: 2026-05-11 Rei統合発表 ⭐ 1本目
**内容**：感情ではなく、データで読む。
**ハッシュタグ**：\`#ポケカ #個人開発\`
**ツイートID**：\`123456789012\`
**反応**：いいね10・RT2
**連動note**：\`https://note.com/xxx\`

### #002: 2026-05-14 第二弾
**内容**：二本目の内容
**ハッシュタグ**：\`#Claude活用\`

## 📝 note（別セクション）
ここは拾わない
`

  it('X投稿セクションが無ければ空配列', () => {
    expect(公開済み投稿を抽出する('## 何か別のもの\n本文')).toEqual([])
  })

  it('複数投稿を抽出する', () => {
    expect(公開済み投稿を抽出する(本文)).toHaveLength(2)
  })

  it('ヘッダーから通し番号・日付・タイトルを分離（⭐注記はタイトルに混ぜない）', () => {
    const [一] = 公開済み投稿を抽出する(本文)
    expect(一.通し番号).toBe('#001')
    expect(一.日付).toBe('2026-05-11')
    expect(一.タイトル).toBe('Rei統合発表') // 「⭐ 1本目」は除去
  })

  it('内容・ツイートID・反応・連動noteを抽出', () => {
    const [一] = 公開済み投稿を抽出する(本文)
    expect(一.内容).toBe('感情ではなく、データで読む。')
    expect(一.ツイートID).toBe('123456789012')
    expect(一.反応).toBe('いいね10・RT2')
    expect(一.連動note).toBe('https://note.com/xxx')
  })

  it('ハッシュタグは # で始まるものだけ配列化', () => {
    const [一] = 公開済み投稿を抽出する(本文)
    expect(一.ハッシュタグ).toEqual(['#ポケカ', '#個人開発'])
  })

  it('省略可能フィールドが無い投稿は undefined / 空', () => {
    const [, 二] = 公開済み投稿を抽出する(本文)
    expect(二.タイトル).toBe('第二弾')
    expect(二.ツイートID).toBeUndefined()
    expect(二.反応).toBeUndefined()
    expect(二.ハッシュタグ).toEqual(['#Claude活用'])
  })

  it('🐦 セクション外の note 見出しは拾わない', () => {
    const 投稿 = 公開済み投稿を抽出する(本文)
    expect(投稿.every(p => p.通し番号.startsWith('#'))).toBe(true)
    expect(投稿.find(p => p.タイトル.includes('note'))).toBeUndefined()
  })
})

describe('ネタ候補を抽出する', () => {
  const 本文 = `# X投稿アイデア

## 🛡️ セキュリティ系

### Q-01: axios脆弱性、自分の本番アプリにもあった 【草稿あり】
本文の説明。

### S-01: サイレント失敗の罠 ⭐2026-05-15生成
本文。

## 🤖 Claude活用系

#### N1: AI会議 15部門プロンプト + CEO統合判定 ⭐⭐⭐
本文。

#### N2: 普通のネタ ⭐⭐
本文。

### 🥇 S級
このグループ見出しは ID 形式でないので無視されるべき
`

  it('### 3つ# と #### 4つ# の両方の見出しを抽出', () => {
    const ネタ = ネタ候補を抽出する(本文)
    const IDs = ネタ.map(n => n.ID)
    expect(IDs).toContain('Q-01') // ###
    expect(IDs).toContain('N1')   // ####
  })

  it('ID 形式でないグループ見出し（### 🥇 S級）は無視', () => {
    const ネタ = ネタ候補を抽出する(本文)
    expect(ネタ).toHaveLength(4) // Q-01 / S-01 / N1 / N2 のみ
    expect(ネタ.find(n => n.タイトル.includes('S級'))).toBeUndefined()
  })

  it('【草稿あり】を検出しタイトルから除去', () => {
    const q01 = ネタ候補を抽出する(本文).find(n => n.ID === 'Q-01')!
    expect(q01.草稿あり).toBe(true)
    expect(q01.タイトル).not.toContain('【草稿あり】')
    expect(q01.タイトル).toContain('axios脆弱性')
  })

  it('⭐⭐⭐=S / ⭐⭐=A の評価を判定', () => {
    const ネタ = ネタ候補を抽出する(本文)
    expect(ネタ.find(n => n.ID === 'N1')!.評価).toBe('S')
    expect(ネタ.find(n => n.ID === 'N2')!.評価).toBe('A')
  })

  it('⭐日付生成 は評価ではなく生成日として抽出（評価は不明）', () => {
    const s01 = ネタ候補を抽出する(本文).find(n => n.ID === 'S-01')!
    expect(s01.評価).toBe('不明')
    expect(s01.生成日).toBe('2026-05-15')
    expect(s01.タイトル).toContain('サイレント失敗の罠')
  })

  it('カテゴリをセクション見出しから推定', () => {
    const q01 = ネタ候補を抽出する(本文).find(n => n.ID === 'Q-01')!
    const n1 = ネタ候補を抽出する(本文).find(n => n.ID === 'N1')!
    expect(q01.カテゴリ).toContain('セキュリティ')
    expect(n1.カテゴリ).toContain('Claude活用')
  })

  it('空文字列は空配列', () => {
    expect(ネタ候補を抽出する('')).toEqual([])
  })
})

describe('ネタサマリを集計する', () => {
  const ネタ: ネタ候補[] = [
    { ID: 'A', タイトル: '', カテゴリ: 'X', 評価: 'S', 草稿あり: true },
    { ID: 'B', タイトル: '', カテゴリ: 'X', 評価: 'A', 草稿あり: false },
    { ID: 'C', タイトル: '', カテゴリ: 'Y', 評価: 'B', 草稿あり: false },
    { ID: 'D', タイトル: '', カテゴリ: 'Y', 評価: '不明', 草稿あり: true },
  ]

  it('評価別・草稿あり・カテゴリ別を集計', () => {
    const s = ネタサマリを集計する(ネタ)
    expect(s.総数).toBe(4)
    expect(s.S級).toBe(1)
    expect(s.A級).toBe(1)
    expect(s.B級).toBe(1)
    expect(s.不明).toBe(1)
    expect(s.草稿あり).toBe(2)
    expect(s.カテゴリ別).toEqual({ X: 2, Y: 2 })
  })

  it('空配列は総数0・カテゴリ別は空オブジェクト', () => {
    const s = ネタサマリを集計する([])
    expect(s.総数).toBe(0)
    expect(s.カテゴリ別).toEqual({})
  })
})
