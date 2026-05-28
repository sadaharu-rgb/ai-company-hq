/**
 * マーケティングパーサのスモークテスト
 * 実際の .md ファイルでパーサを動かし、件数と先頭サンプルを表示する
 * 実行：npx tsx server/utils/マーケティングパーサ_スモークテスト.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  公開済み投稿を抽出する,
  ネタ候補を抽出する,
  ネタサマリを集計する,
} from './マーケティングパーサ.js'

// PROJECTS_DIR の .env 値を尊重・なければ相対パスで Projects/docs/コンテンツネタ を解決
const ベース = process.env.PROJECTS_DIR
  ? resolve(process.env.PROJECTS_DIR, 'docs/コンテンツネタ')
  : resolve(process.cwd(), '../../docs/コンテンツネタ')

console.log('=== 公開済み.md ===')
const 公開済みMD = readFileSync(resolve(ベース, '公開済み.md'), 'utf-8')
const 投稿一覧 = 公開済み投稿を抽出する(公開済みMD)
console.log(`抽出件数: ${投稿一覧.length}`)
for (const 投稿 of 投稿一覧) {
  console.log(`  ${投稿.通し番号} ${投稿.日付} ${投稿.タイトル} [${投稿.ハッシュタグ.join(',')}] ID=${投稿.ツイートID ?? '—'}`)
}

console.log('\n=== X投稿アイデア.md ===')
const アイデアMD = readFileSync(resolve(ベース, 'X投稿アイデア.md'), 'utf-8')
const ネタ一覧 = ネタ候補を抽出する(アイデアMD)
console.log(`抽出件数: ${ネタ一覧.length}`)

const サマリ = ネタサマリを集計する(ネタ一覧)
console.log(`評価別: S=${サマリ.S級} A=${サマリ.A級} B=${サマリ.B級} 不明=${サマリ.不明}`)
console.log(`草稿あり: ${サマリ.草稿あり}`)
console.log('カテゴリ別:')
for (const [カテゴリ, 件数] of Object.entries(サマリ.カテゴリ別)) {
  console.log(`  ${件数}件 → ${カテゴリ}`)
}

console.log('\n先頭10件サンプル:')
for (const n of ネタ一覧.slice(0, 10)) {
  console.log(`  [${n.評価}] ${n.ID} ${n.タイトル}${n.草稿あり ? ' ✍️' : ''} | ${n.カテゴリ}`)
}
