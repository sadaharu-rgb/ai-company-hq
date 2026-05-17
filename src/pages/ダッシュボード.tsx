/**
 * HQダッシュボード — プロジェクト一覧 + フィード
 */
import { useState, useEffect, useMemo } from 'react'
import { useストア } from '../stores/ストア'
import { 案件作成, 案件削除, 投稿一覧取得, 投稿追加, AI会議開始, 部門一覧取得, 会議一覧取得, 実行アクション記録 } from '../api/クライアント'
import type { プロジェクトカテゴリ, 会議 } from '../types'
import { 判断スタイル } from '../types'
import 確認モーダル from '../components/確認モーダル'
import 投稿カード from '../components/投稿カード'
import axios from 'axios'

const カテゴリ色: Record<string, string> = {
  'フロントエンド': 'bg-blue-50 text-blue-700 border-blue-100',
  'バックエンド':   'bg-indigo-50 text-indigo-700 border-indigo-100',
  'データ収集':     'bg-teal-50 text-teal-700 border-teal-100',
  'DevOps':         'bg-orange-50 text-orange-700 border-orange-100',
  '企画':           'bg-purple-50 text-purple-700 border-purple-100',
  'その他':         'bg-gray-50 text-gray-600 border-gray-100',
}
const カテゴリアイコン: Record<string, string> = {
  'フロントエンド': '🎨', 'バックエンド': '⚙️', 'データ収集': '📡',
  'DevOps': '🚀', '企画': '💡', 'その他': '📁',
}
const ステータス色 = {
  '稼働中': 'text-green-600',
  '保留':   'text-yellow-600',
  '完了':   'text-gray-400',
}
const 優先度色 = {
  '高': 'bg-red-100 text-red-700',
  '中': 'bg-yellow-50 text-yellow-700',
  '低': 'bg-gray-100 text-gray-500',
}

const カテゴリ一覧: プロジェクトカテゴリ[] = ['フロントエンド', 'バックエンド', 'データ収集', 'DevOps', '企画', 'その他']

export default function ダッシュボード() {
  const {
    案件一覧, 案件一覧設定,
    投稿一覧, 投稿一覧設定,
    選択案件ID, 選択案件ID設定,
    選択部門ID,
    AI会議中, AI会議中設定,
    投稿追加: ストア投稿追加,
  } = useストア()

  // 新規プロジェクトフォーム
  const [フォーム表示, フォーム表示設定] = useState(false)
  const [新タイトル, 新タイトル設定] = useState('')
  const [新説明, 新説明設定] = useState('')
  const [新優先度, 新優先度設定] = useState<'高' | '中' | '低'>('中')
  const [新カテゴリ, 新カテゴリ設定] = useState<プロジェクトカテゴリ>('その他')
  const [新URL, 新URL設定] = useState('')
  const [作成確認, 作成確認設定] = useState(false)
  const [削除確認ID, 削除確認ID設定] = useState<number | null>(null)

  // 投稿フォーム
  const [投稿フォーム, 投稿フォーム設定] = useState(false)
  const [投稿部門, 投稿部門設定] = useState('')
  const [投稿内容, 投稿内容設定] = useState('')
  const [投稿確認, 投稿確認設定] = useState(false)

  // AI会議フォーム（部門はファイルシステムから動的取得）
  const [AI会議フォーム, AI会議フォーム設定] = useState(false)
  const [会議テーマ, 会議テーマ設定] = useState('')
  const [利用可能部門, 利用可能部門設定] = useState<{ id: string; 名前: string }[]>([])
  const [参加部門IDs, 参加部門IDs設定] = useState<string[]>([])
  const [全部門使用, 全部門使用設定] = useState(true) // true = Projects配下の全CLAUDE.mdを使用
  const [AI会議確認, AI会議確認設定] = useState(false)
  const [会議ステータス, 会議ステータス設定] = useState('')

  // 会議グルーピング用
  const [会議一覧, 会議一覧設定] = useState<会議[]>([])
  const [進行度, 進行度設定] = useState<{ 完了: number; 合計: number } | null>(null)

  // 利用可能な部門をサーバーから取得
  useEffect(() => {
    部門一覧取得().then(部門 => {
      利用可能部門設定(部門.filter(d => !d.id.startsWith('00_')))
    }).catch(() => {/* サーバー未起動時は無視 */})
  }, [])

  const 選択プロジェクト = 案件一覧.find(c => c.id === 選択案件ID)

  const プロジェクトを開く = async (id: number) => {
    選択案件ID設定(id)
    const [一覧, 会議] = await Promise.all([投稿一覧取得(id), 会議一覧取得(id)])
    投稿一覧設定(一覧)
    会議一覧設定(会議)
  }

  const プロジェクト作成実行 = async () => {
    try {
      const c = await 案件作成({ タイトル: 新タイトル, 説明: 新説明, 優先度: 新優先度, カテゴリ: 新カテゴリ, URL: 新URL || undefined })
      案件一覧設定([{ ...c, 投稿数: 0 }, ...案件一覧])
      作成確認設定(false)
      フォーム表示設定(false)
      新タイトル設定(''); 新説明設定(''); 新優先度設定('中'); 新カテゴリ設定('その他'); 新URL設定('')
      await プロジェクトを開く(c.id)
    } catch (e) {
      alert(`作成に失敗しました: ${String(e)}`)
    }
  }

  const プロジェクト削除実行 = async (id: number) => {
    await 案件削除(id)
    案件一覧設定(案件一覧.filter(c => c.id !== id))
    削除確認ID設定(null)
    if (選択案件ID === id) { 選択案件ID設定(null); 投稿一覧設定([]) }
  }

  const ステータス変更 = async (id: number, ステータス: string) => {
    await axios.patch(`/api/cases/${id}`, { ステータス })
    案件一覧設定(案件一覧.map(c => c.id === id ? { ...c, ステータス: ステータス as '稼働中' | '完了' | '保留' } : c))
  }

  const 投稿追加実行 = async () => {
    if (!選択案件ID) return
    const p = await 投稿追加(選択案件ID, { 部門ID: 投稿部門, 内容: 投稿内容, 種別: '意見' })
    ストア投稿追加(p)
    案件一覧設定(案件一覧.map(c => c.id === 選択案件ID ? { ...c, 投稿数: (c.投稿数 ?? 0) + 1 } : c))
    投稿確認設定(false)
    投稿フォーム設定(false)
    投稿内容設定('')
  }

  const AI会議実行 = async () => {
    if (!選択案件ID) return
    AI会議確認設定(false)
    AI会議フォーム設定(false)
    AI会議中設定(true)
    会議ステータス設定('準備中...')
    進行度設定(null)

    try {
      await AI会議開始(
        選択案件ID,
        会議テーマ,
        全部門使用 ? null : 参加部門IDs, // null = 全部門
        (部門ID, 内容, ステータス) => {
          if (部門ID === 'status') {
            会議ステータス設定(ステータス ?? 内容)
            return
          }
          const 仮投稿 = {
            id: Date.now() + Math.random(),
            案件ID: 選択案件ID!,
            部門ID,
            内容,
            種別: 'AI生成' as const,
            作成日時: new Date().toISOString(),
          }
          ストア投稿追加(仮投稿)
        },
        // 進行度コールバック
        (完了, 合計) => 進行度設定({ 完了, 合計 })
      )
      // 会議完了後にDBから最新データを取得（会議IDが付いた正式データ）
      const [最新投稿, 最新会議] = await Promise.all([
        投稿一覧取得(選択案件ID),
        会議一覧取得(選択案件ID),
      ])
      投稿一覧設定(最新投稿)
      会議一覧設定(最新会議)
      案件一覧設定(案件一覧.map(c =>
        c.id === 選択案件ID ? { ...c, 投稿数: 最新投稿.length } : c
      ))
    } finally {
      AI会議中設定(false)
      会議ステータス設定('')
      進行度設定(null)
    }
  }

  const 部門トグル = (id: string) =>
    参加部門IDs設定(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const 表示投稿 = 選択部門ID
    ? 投稿一覧.filter(p => p.部門ID === 選択部門ID)
    : 投稿一覧

  // 投稿を会議IDでグループ化（null = 手動投稿 or 旧データ）
  const 会議グループ = useMemo(() => {
    const map = new Map<number | null, typeof 表示投稿>()
    for (const p of 表示投稿) {
      const key = p.会議ID ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [表示投稿])

  // ─── プロジェクト一覧ビュー ───────────────────────────────
  if (!選択プロジェクト) {
    return (
      <div className="space-y-5">
        {/* 上部アクション */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Projects</h2>
          <button
            className="ボタン主 text-xs"
            onClick={() => フォーム表示設定(!フォーム表示)}
          >+ 新規プロジェクト</button>
        </div>

        {/* 新規作成フォーム */}
        {フォーム表示 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">新規プロジェクト</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="ラベル">プロジェクト名</label>
                <input className="入力欄" value={新タイトル} onChange={e => 新タイトル設定(e.target.value)} placeholder="例: my-new-app" />
              </div>
              <div className="col-span-2">
                <label className="ラベル">概要</label>
                <input className="入力欄" value={新説明} onChange={e => 新説明設定(e.target.value)} placeholder="何を作るか一言で" />
              </div>
              <div>
                <label className="ラベル">カテゴリ</label>
                <select className="入力欄" value={新カテゴリ} onChange={e => 新カテゴリ設定(e.target.value as プロジェクトカテゴリ)}>
                  {カテゴリ一覧.map(k => <option key={k} value={k}>{カテゴリアイコン[k]} {k}</option>)}
                </select>
              </div>
              <div>
                <label className="ラベル">優先度</label>
                <select className="入力欄" value={新優先度} onChange={e => 新優先度設定(e.target.value as '高' | '中' | '低')}>
                  <option value="高">🔴 高</option>
                  <option value="中">🟡 中</option>
                  <option value="低">⚪ 低</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="ラベル">URL（任意）</label>
                <input className="入力欄" value={新URL} onChange={e => 新URL設定(e.target.value)} placeholder="例: http://localhost:5174" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="ボタン主" onClick={() => 作成確認設定(true)} disabled={!新タイトル}>作成</button>
              <button className="ボタン副" onClick={() => フォーム表示設定(false)}>キャンセル</button>
            </div>
          </div>
        )}

        {/* プロジェクトグリッド */}
        {案件一覧.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">プロジェクトがありません</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {案件一覧.map(proj => (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
                onClick={() => プロジェクトを開く(proj.id)}
              >
                {/* カードヘッダー */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${カテゴリ色[proj.カテゴリ]}`}>
                      {カテゴリアイコン[proj.カテゴリ]} {proj.カテゴリ}
                    </span>
                  </div>
                  <button
                    className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm p-0.5"
                    onClick={e => { e.stopPropagation(); 削除確認ID設定(proj.id) }}
                  >✕</button>
                </div>

                {/* プロジェクト名 */}
                <h3 className="text-base font-bold text-gray-900 mb-1 font-mono">{proj.タイトル}</h3>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{proj.説明 || '説明なし'}</p>

                {/* URL行 */}
                {proj.URL && (
                  <div className="mb-3">
                    <a
                      href={proj.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                    >
                      🔗 {proj.URL}
                    </a>
                  </div>
                )}

                {/* ステータス行 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <select
                      value={proj.ステータス}
                      className={`text-xs font-semibold bg-transparent border-none outline-none cursor-pointer ${ステータス色[proj.ステータス]}`}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); ステータス変更(proj.id, e.target.value) }}
                    >
                      <option value="稼働中">● 稼働中</option>
                      <option value="保留">● 保留</option>
                      <option value="完了">● 完了</option>
                    </select>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${優先度色[proj.優先度]}`}>{proj.優先度}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">💬 {proj.投稿数 ?? 0}</span>
                    {proj.URL ? (
                      <a
                        href={proj.URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[11px] font-semibold text-white bg-gray-800 hover:bg-gray-600 px-2.5 py-1 rounded-lg transition-colors"
                      >開く →</a>
                    ) : (
                      <span className="text-xs text-gray-400 group-hover:text-gray-700 transition-colors">→</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* モーダル */}
        {作成確認 && (
          <確認モーダル
            タイトル="プロジェクトを作成しますか？"
            説明="新しいプロジェクトをHQに追加します。"
            詳細={[
              { ラベル: '名前', 値: 新タイトル },
              { ラベル: 'カテゴリ', 値: `${カテゴリアイコン[新カテゴリ]} ${新カテゴリ}` },
              { ラベル: '優先度', 値: 新優先度 },
            ]}
            種別="通常"
            確認ラベル="作成する"
            onConfirm={プロジェクト作成実行}
            onCancel={() => 作成確認設定(false)}
          />
        )}
        {削除確認ID && (
          <確認モーダル
            タイトル="プロジェクトを削除しますか？"
            説明="このプロジェクトのすべての投稿も削除されます。取り消せません。"
            詳細={[{ ラベル: '名前', 値: 案件一覧.find(c => c.id === 削除確認ID)?.タイトル ?? '' }]}
            種別="危険"
            確認ラベル="削除する"
            onConfirm={() => プロジェクト削除実行(削除確認ID)}
            onCancel={() => 削除確認ID設定(null)}
          />
        )}
      </div>
    )
  }

  // ─── プロジェクト詳細・フィードビュー ─────────────────────────
  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-start gap-3">
          <button
            className="text-gray-400 hover:text-gray-700 text-sm mt-0.5 shrink-0"
            onClick={() => { 選択案件ID設定(null); 投稿一覧設定([]) }}
          >← 戻る</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${カテゴリ色[選択プロジェクト.カテゴリ]}`}>
                {カテゴリアイコン[選択プロジェクト.カテゴリ]} {選択プロジェクト.カテゴリ}
              </span>
              <h2 className="text-base font-bold text-gray-900 font-mono">{選択プロジェクト.タイトル}</h2>
              <span className={`text-xs font-semibold ${ステータス色[選択プロジェクト.ステータス]}`}>
                ● {選択プロジェクト.ステータス}
              </span>
            </div>
            {選択プロジェクト.説明 && <p className="text-xs text-gray-400 mt-1">{選択プロジェクト.説明}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="ボタン副 text-xs" onClick={() => 投稿フォーム設定(!投稿フォーム)}>✍️ 投稿</button>
            <button
              className="ボタン主 text-xs"
              onClick={() => AI会議フォーム設定(!AI会議フォーム)}
              disabled={AI会議中}
            >{AI会議中 ? '🤖 会議中...' : '🤖 AI会議'}</button>
          </div>
        </div>
      </div>

      {/* 投稿フォーム */}
      {投稿フォーム && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">手動投稿</h3>
          <div>
            <label className="ラベル">部門</label>
            <select className="入力欄" value={投稿部門} onChange={e => 投稿部門設定(e.target.value)}>
              {利用可能部門.map(d => <option key={d.id} value={d.id}>{d.名前}</option>)}
            </select>
          </div>
          <div>
            <label className="ラベル">内容</label>
            <textarea className="入力欄 resize-none" rows={3} value={投稿内容} onChange={e => 投稿内容設定(e.target.value)} placeholder="部門としての意見・メモを入力..." />
          </div>
          <div className="flex gap-2">
            <button className="ボタン主" onClick={() => 投稿確認設定(true)} disabled={!投稿内容}>投稿</button>
            <button className="ボタン副" onClick={() => { 投稿フォーム設定(false); 投稿内容設定('') }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* AI会議フォーム */}
      {AI会議フォーム && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">🤖 AI自動会議</h3>
          <div>
            <label className="ラベル">テーマ・質問</label>
            <input
              className="入力欄"
              value={会議テーマ}
              onChange={e => 会議テーマ設定(e.target.value)}
              placeholder={`「${選択プロジェクト.タイトル}」について聞きたいことを入力...`}
            />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="ラベル mb-0">参加部門</label>
              <button
                onClick={() => 全部門使用設定(!全部門使用)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  全部門使用 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >{全部門使用 ? '✅ 全部門（Projects/配下）' : '全部門を使う'}</button>
            </div>
            {!全部門使用 && (
              <div className="flex flex-wrap gap-1.5">
                {利用可能部門.length > 0
                  ? 利用可能部門.map(d => (
                      <button
                        key={d.id}
                        onClick={() => 部門トグル(d.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          参加部門IDs.includes(d.id)
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                        }`}
                      >{d.名前}</button>
                    ))
                  : <p className="text-xs text-gray-400">部門読み込み中...</p>
                }
              </div>
            )}
            {全部門使用 && (
              <p className="text-xs text-gray-400">
                Projects/ 配下の CLAUDE.md を持つ全フォルダが参加。CEOが最後に統合します。
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="ボタン主"
              onClick={() => AI会議確認設定(true)}
              disabled={!会議テーマ || (!全部門使用 && 参加部門IDs.length === 0)}
            >会議を開始</button>
            <button className="ボタン副" onClick={() => AI会議フォーム設定(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* フィルター状態 */}
      {選択部門ID && (
        <div className="text-xs text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
          <span>{利用可能部門.find(d => d.id === 選択部門ID)?.名前 ?? 選択部門ID}</span>
          <span className="text-gray-300">の投稿を絞り込み中</span>
        </div>
      )}

      {/* 会議中インジケーター＋プログレスバー */}
      {AI会議中 && (
        <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block shrink-0" />
              <span className="text-xs text-blue-600">{会議ステータス || '🤖 AI部門が回答中... CEOが最後に統合判断を出します'}</span>
            </div>
            {進行度 && (
              <span className="text-xs text-blue-500 font-semibold shrink-0">
                {進行度.完了}/{進行度.合計}
              </span>
            )}
          </div>
          {進行度 && (
            <div className="w-full bg-blue-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((進行度.完了 / 進行度.合計) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* フィード（会議ごとにグルーピング）*/}
      {表示投稿.length === 0 && !AI会議中 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
          <p className="text-sm text-gray-400">まだ投稿はありません</p>
          <p className="text-xs text-gray-300 mt-1">「AI会議」ボタンから各部門の意見を自動生成できます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(会議グループ.entries()).map(([会議ID, 投稿群], groupIndex) => {
            const 会議情報 = 会議ID != null ? 会議一覧.find(m => m.id === 会議ID) : null
            const 会議インデックス = 会議ID != null ? 会議一覧.findIndex(m => m.id === 会議ID) : -1
            const 会議番号 = 会議インデックス >= 0 ? 会議インデックス + 1 : null

            // 差分：前回会議の判断 vs 今回の判断
            const 前回会議 = 会議インデックス > 0 ? 会議一覧[会議インデックス - 1] : null
            const 判断変化あり = 前回会議?.判断 && 会議情報?.判断 && 前回会議.判断 !== 会議情報.判断

            const 投稿削除後リロード = async () => {
              const [最新投稿, 最新会議] = await Promise.all([
                投稿一覧取得(選択案件ID!),
                会議一覧取得(選択案件ID!),
              ])
              投稿一覧設定(最新投稿)
              会議一覧設定(最新会議)
            }

            const アクション記録 = async (meetingId: number, action: string) => {
              await 実行アクション記録(選択案件ID!, meetingId, action)
              const 最新会議 = await 会議一覧取得(選択案件ID!)
              会議一覧設定(最新会議)
            }

            return (
              <div key={会議ID ?? 'manual'} className="space-y-3">
                {/* 会議セパレーター（AI会議グループのみ表示）*/}
                {会議ID != null && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-center">
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        🤖 第{会議番号}回 AI会議
                      </span>
                      {/* 判断バッジ */}
                      {会議情報?.判断 && 判断スタイル[会議情報.判断] && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border ${判断スタイル[会議情報.判断].color}`}>
                          {判断スタイル[会議情報.判断].emoji} {会議情報.判断}
                        </span>
                      )}
                      {/* 差分バッジ（前回と変化があった場合のみ）*/}
                      {判断変化あり && (
                        <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                          {判断スタイル[前回会議!.判断!]?.emoji} {前回会議!.判断} → {判断スタイル[会議情報!.判断!]?.emoji} {会議情報!.判断}
                        </span>
                      )}
                      {会議情報 && (
                        <span className="text-[10px] text-gray-400 hidden sm:block">
                          {会議情報.テーマ.slice(0, 28)}{会議情報.テーマ.length > 28 ? '…' : ''}
                        </span>
                      )}
                      {会議情報 && (
                        <span className="text-[10px] text-gray-300">
                          {new Date(会議情報.開始日時).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                {/* 手動投稿のセパレーター */}
                {会議ID == null && groupIndex > 0 && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-300 shrink-0">手動投稿</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                {投稿群.map(p => (
                  <投稿カード
                    key={p.id}
                    投稿={p}
                    onDeleted={投稿削除後リロード}
                    会議情報={会議情報 ?? undefined}
                    onアクション={会議情報 ? アクション記録 : undefined}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* モーダル */}
      {投稿確認 && (
        <確認モーダル
          タイトル="投稿しますか？"
          説明="以下の内容をこのプロジェクトに投稿します。"
          詳細={[
            { ラベル: '部門', 値: 利用可能部門.find(d => d.id === 投稿部門)?.名前 ?? 投稿部門 },
            { ラベル: '内容', 値: 投稿内容.slice(0, 60) + (投稿内容.length > 60 ? '…' : '') },
          ]}
          種別="通常"
          確認ラベル="投稿する"
          onConfirm={投稿追加実行}
          onCancel={() => 投稿確認設定(false)}
        />
      )}
      {AI会議確認 && (
        <確認モーダル
          タイトル="AI自動会議を開始しますか？"
          説明="選択した部門がテーマに対して自動回答します。CEOは最後に全部門の意見を統合します。"
          詳細={[
            { ラベル: 'プロジェクト', 値: 選択プロジェクト.タイトル },
            { ラベル: 'テーマ', 値: 会議テーマ },
            { ラベル: '参加部門', 値: 参加部門IDs.map(id => 利用可能部門.find(d => d.id === id)?.名前 ?? id).join(' / ') },
          ]}
          種別="通常"
          確認ラベル="会議を開始する"
          onConfirm={AI会議実行}
          onCancel={() => AI会議確認設定(false)}
        />
      )}
    </div>
  )
}
