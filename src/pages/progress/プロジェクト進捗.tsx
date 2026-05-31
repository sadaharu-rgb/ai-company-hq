import { useEffect, useState } from 'react'
import { プロジェクト進捗取得 } from '../../api/クライアント'
import type { プロジェクト進捗 } from '../../types'

const 状態スタイル: Record<string, { 色: string; ラベル: string }> = {
  活発: { 色: 'bg-green-50 text-green-700 border-green-100', ラベル: '🟢 活発' },
  安定: { 色: 'bg-blue-50 text-blue-700 border-blue-100', ラベル: '🔵 安定' },
  停滞: { 色: 'bg-red-50 text-red-600 border-red-100', ラベル: '🔴 停滞' },
  不明: { 色: 'bg-gray-50 text-gray-500 border-gray-200', ラベル: '⚪ 不明' },
}

function 相対日(iso: string | null): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const 日 = Math.floor((Date.now() - t) / 86400000)
  if (日 <= 0) return '今日'
  if (日 === 1) return '昨日'
  return `${日}日前`
}

/** 全プロジェクト進捗（閲覧専用・操作ボタンなし） */
export default function プロジェクト進捗ページ() {
  const [一覧, 一覧設定] = useState<プロジェクト進捗[]>([])
  const [読込中, 読込中設定] = useState(true)
  const [エラー, エラー設定] = useState('')

  useEffect(() => {
    プロジェクト進捗取得()
      .then(一覧設定)
      .catch(() => エラー設定('進捗の取得に失敗しました'))
      .finally(() => 読込中設定(false))
  }, [])

  if (読込中) return <div className="text-center text-gray-400 py-20 text-sm">読み込み中…</div>
  if (エラー) return <div className="text-center text-red-500 py-20 text-sm">{エラー}</div>

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">📊 プロジェクト進捗</h2>
      <p className="text-[11px] text-gray-400 mb-5">git からリアルタイム取得・閲覧専用</p>
      <div className="space-y-3">
        {一覧.map(p => {
          const st = 状態スタイル[p.状態] ?? 状態スタイル.不明
          return (
            <div key={p.名前} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm text-gray-900 truncate">{p.名前}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{p.稼働}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${st.色}`}>{st.ラベル}</span>
              </div>
              {p.取得失敗 ? (
                <p className="text-[11px] text-red-400">git 情報を取得できませんでした</p>
              ) : (
                <div className="text-[11px] text-gray-500 space-y-1">
                  <div className="truncate">
                    最終コミット：{相対日(p.最終コミット日時)}
                    <span className="font-mono text-gray-400"> {p.最終コミットハッシュ}</span>
                    {p.最終コミットメッセージ ? ` ${p.最終コミットメッセージ}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>ブランチ：<span className="font-mono">{p.ブランチ ?? '—'}</span></span>
                    <span>未コミット：<span className={p.未コミット数 > 0 ? 'text-orange-500 font-semibold' : ''}>{p.未コミット数}件</span></span>
                    <span>テスト：{p.テスト数}本</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
