import { useState } from 'react'
import type { 投稿, 会議 } from '../types'
import { 判断スタイル } from '../types'
import { 部門マップ } from '../data/部門定義'
import 確認モーダル from './確認モーダル'
import { 投稿削除 } from '../api/クライアント'

type Props = {
  投稿: 投稿
  onDeleted: () => void
  // CEO カード専用（会議情報・アクション）
  会議情報?: 会議
  onアクション?: (meetingId: number, action: string) => void
}

// CEO判定（フォルダ名 "00_HQ" または 旧ID "CEO"）
function CEOか(部門ID: string): boolean {
  return 部門ID.startsWith('00_') || 部門ID === 'CEO'
}

// 確信度を星表示（0-100 → ★×5）
function 確信度星(確信度: number): string {
  const 星数 = Math.round(確信度 / 20)
  return '★'.repeat(星数) + '☆'.repeat(5 - 星数)
}

const アクション一覧 = [
  { key: '実行',       label: '✅ 実行する',   style: 'bg-green-600 text-white hover:bg-green-700' },
  { key: '保留',       label: '⏸️ 保留',       style: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300' },
  { key: '見送り',     label: '❌ 見送り',     style: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' },
]

export default function 投稿カード({ 投稿: p, onDeleted, 会議情報, onアクション }: Props) {
  const [削除確認, 削除確認設定] = useState(false)
  const [削除中, 削除中設定] = useState(false)
  const [アクション中, アクション中設定] = useState(false)
  const 部門 = 部門マップ[p.部門ID]
  const 部門表示名 = 部門?.名前 ?? p.部門ID.replace(/^\d+_/, '')
  const isCEO = CEOか(p.部門ID)

  const 削除実行 = async () => {
    削除中設定(true)
    try {
      await 投稿削除(p.案件ID, p.id)
      削除確認設定(false)
      onDeleted()
    } finally {
      削除中設定(false)
    }
  }

  const アクション実行 = async (action: string) => {
    if (!会議情報 || !onアクション) return
    アクション中設定(true)
    try {
      await onアクション(会議情報.id, action)
    } finally {
      アクション中設定(false)
    }
  }

  const 日時 = new Date(p.作成日時).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  // ── CEO カード（特別スタイル）──────────────────────────────
  if (isCEO) {
    const 判定スタイル = 会議情報?.判断 ? 判断スタイル[会議情報.判断] : null
    const 確信度 = 会議情報?.確信度 ?? null
    const 現在アクション = 会議情報?.実行アクション ?? null

    return (
      <>
        <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white shadow-md p-5 group">
          {/* CEO ヘッダー */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                👑 CEO 統合判断
              </span>
              {p.種別 === 'AI生成' && (
                <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">🤖 Sonnet</span>
              )}
              {/* AI判定バッジ */}
              {会議情報?.判断 && 判定スタイル && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border ${判定スタイル.color}`}>
                  {判定スタイル.emoji} {会議情報.判断}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{日時}</span>
              <button
                onClick={() => 削除確認設定(true)}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm"
              >✕</button>
            </div>
          </div>

          {/* 確信度バー */}
          {確信度 != null && (
            <div className="flex items-center gap-2 mb-3 bg-white rounded-lg px-3 py-2 border border-yellow-100">
              <span className="text-[10px] text-gray-500 shrink-0">確信度</span>
              <span className="text-amber-500 text-sm tracking-widest">{確信度星(確信度)}</span>
              <span className="text-[11px] font-bold text-amber-600 ml-auto">{確信度}%</span>
            </div>
          )}

          {/* 本文 */}
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mb-4">{p.内容}</p>

          {/* 行動ボタン */}
          {onアクション && 会議情報 && (
            <div className="border-t border-yellow-100 pt-3">
              {現在アクション ? (
                // 記録済み
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">記録済み：</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    現在アクション === '実行' ? 'bg-green-100 text-green-700' :
                    現在アクション === '保留' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {判断スタイル[現在アクション]?.emoji ?? ''} {現在アクション}
                  </span>
                  <button
                    onClick={() => アクション実行('')}
                    className="text-[10px] text-gray-300 hover:text-gray-500 ml-auto"
                    disabled={アクション中}
                  >取消</button>
                </div>
              ) : (
                // 未記録 → ボタン表示
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 shrink-0">あなたの判断：</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {アクション一覧.map(a => (
                      <button
                        key={a.key}
                        onClick={() => アクション実行(a.key)}
                        disabled={アクション中}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${a.style} disabled:opacity-50`}
                      >{a.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {削除確認 && (
          <確認モーダル
            タイトル="CEO投稿を削除しますか？"
            説明="この操作は取り消せません。"
            詳細={[{ ラベル: '部門', 値: '👑 CEO 統合判断' }]}
            種別="危険"
            確認ラベル="削除する"
            実行中={削除中}
            onConfirm={削除実行}
            onCancel={() => 削除確認設定(false)}
          />
        )}
      </>
    )
  }

  // ── 通常カード ──────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 group">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${部門?.色 ?? 'bg-gray-100 text-gray-700'}`}>
              {部門?.アイコン && `${部門.アイコン} `}{部門表示名}
            </span>
            {p.種別 === 'AI生成' && (
              <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">🤖 AI生成</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{日時}</span>
            <button
              onClick={() => 削除確認設定(true)}
              className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm"
            >✕</button>
          </div>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{p.内容}</p>
      </div>

      {削除確認 && (
        <確認モーダル
          タイトル="投稿を削除しますか？"
          説明="この操作は取り消せません。"
          詳細={[{ ラベル: '部門', 値: `${部門?.アイコン ?? ''} ${部門表示名}`.trim() }]}
          種別="危険"
          確認ラベル="削除する"
          onConfirm={削除実行}
          onCancel={() => 削除確認設定(false)}
        />
      )}
    </>
  )
}
