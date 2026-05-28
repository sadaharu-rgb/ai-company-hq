/**
 * マーケティング — 3画面（読み取り専用ビュー）
 *
 * 構成：
 * - 📦 ネタストック    アイデア.md パース・S/A/B評価別表示
 * - 📤 公開済み投稿    公開済み.md パース・時系列表示
 * - 📊 KPIサマリ      投稿/ネタ数の集計（pokeca KPIは Phase 2 で接続）
 *
 * 設計：
 * - .md は正本のまま編集可（テキストエディタ）
 * - UI は読み取り専用（Phase 1）
 */
import { useState, useEffect, useMemo } from 'react'
import {
  公開済み投稿一覧取得,
  ネタ候補一覧取得,
  マーケティングサマリ取得,
} from '../../api/クライアント'
import type { 公開済み投稿, ネタ候補, マーケティングサマリ } from '../../types'

type タブ = 'ネタストック' | '公開済み投稿' | 'KPIサマリ'

const 評価色: Record<string, string> = {
  S: 'bg-amber-100 text-amber-800 border-amber-200',
  A: 'bg-blue-50 text-blue-700 border-blue-100',
  B: 'bg-gray-100 text-gray-600 border-gray-200',
  不明: 'bg-gray-50 text-gray-400 border-gray-100',
}

const 評価アイコン: Record<string, string> = {
  S: '🥇',
  A: '🥈',
  B: '🥉',
  不明: '・',
}

export default function マーケティング() {
  const [タブ選択, タブ選択設定] = useState<タブ>('ネタストック')
  const [公開済み, 公開済み設定] = useState<公開済み投稿[]>([])
  const [ネタ, ネタ設定] = useState<ネタ候補[]>([])
  const [サマリ, サマリ設定] = useState<マーケティングサマリ | null>(null)
  const [読込中, 読込中設定] = useState(true)
  const [エラー, エラー設定] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      公開済み投稿一覧取得(),
      ネタ候補一覧取得(),
      マーケティングサマリ取得(),
    ])
      .then(([投稿, ネタ一覧, サマリ結果]) => {
        公開済み設定(投稿)
        ネタ設定(ネタ一覧)
        サマリ設定(サマリ結果)
      })
      .catch((e) => エラー設定(String(e)))
      .finally(() => 読込中設定(false))
  }, [])

  if (読込中) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
        読み込み中...
      </div>
    )
  }

  if (エラー) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 text-sm text-red-600">
        <p className="font-semibold mb-2">読み込みエラー</p>
        <p className="text-xs">{エラー}</p>
        <p className="text-xs text-gray-400 mt-3">
          .md ファイルパスを確認してください：<br />
          <code>$PROJECTS_DIR/docs/コンテンツネタ/</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー＋サマリカード */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Marketing</h2>
          <p className="text-[10px] text-gray-400">
            .md を正本としたビュー・編集はテキストエディタで
          </p>
        </div>

        {サマリ && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <統計カード ラベル="公開済み投稿" 値={サマリ.公開済み投稿数} 副次={サマリ.公開済み最新日付 ?? '—'} />
            <統計カード ラベル="ネタストック" 値={サマリ.ネタサマリ.総数} 副次={`S級 ${サマリ.ネタサマリ.S級} / A級 ${サマリ.ネタサマリ.A級}`} />
            <統計カード ラベル="草稿あり" 値={サマリ.ネタサマリ.草稿あり} 副次="即投稿可" />
            <統計カード ラベル="週あたり消化目安" 値={2} 副次={`残 ${Math.round(サマリ.ネタサマリ.総数 / 2)} 週分`} />
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b border-gray-100">
        {(['ネタストック', '公開済み投稿', 'KPIサマリ'] as タブ[]).map(t => (
          <button
            key={t}
            onClick={() => タブ選択設定(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              タブ選択 === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t === 'ネタストック' && '📦 '}
            {t === '公開済み投稿' && '📤 '}
            {t === 'KPIサマリ' && '📊 '}
            {t}
          </button>
        ))}
      </div>

      {/* 各タブ */}
      {タブ選択 === 'ネタストック' && <ネタストックビュー ネタ={ネタ} />}
      {タブ選択 === '公開済み投稿' && <公開済みビュー 投稿={公開済み} />}
      {タブ選択 === 'KPIサマリ' && <KPIビュー サマリ={サマリ} />}
    </div>
  )
}

// ─── サブコンポーネント：統計カード ──────────────────────────

function 統計カード({ ラベル, 値, 副次 }: { ラベル: string; 値: number | string; 副次?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{ラベル}</p>
      <p className="text-2xl font-bold text-gray-900 font-mono">{値}</p>
      {副次 && <p className="text-[10px] text-gray-400 mt-1">{副次}</p>}
    </div>
  )
}

// ─── ネタストックビュー ────────────────────────────────────

function ネタストックビュー({ ネタ }: { ネタ: ネタ候補[] }) {
  const [評価フィルタ, 評価フィルタ設定] = useState<'S' | 'A' | 'B' | 'all'>('all')
  const [草稿のみ, 草稿のみ設定] = useState(false)

  const 表示ネタ = useMemo(() => {
    let 結果 = ネタ
    if (評価フィルタ !== 'all') {
      結果 = 結果.filter(n => n.評価 === 評価フィルタ)
    }
    if (草稿のみ) {
      結果 = 結果.filter(n => n.草稿あり)
    }
    return 結果
  }, [ネタ, 評価フィルタ, 草稿のみ])

  // カテゴリ別にグループ化
  const カテゴリ別 = useMemo(() => {
    const map = new Map<string, ネタ候補[]>()
    for (const n of 表示ネタ) {
      if (!map.has(n.カテゴリ)) map.set(n.カテゴリ, [])
      map.get(n.カテゴリ)!.push(n)
    }
    return map
  }, [表示ネタ])

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-gray-400">フィルタ：</span>
        {(['all', 'S', 'A', 'B'] as const).map(v => (
          <button
            key={v}
            onClick={() => 評価フィルタ設定(v)}
            className={`px-2.5 py-1 rounded-full border transition-colors ${
              評価フィルタ === v
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {v === 'all' ? 'すべて' : `${評価アイコン[v]} ${v}級`}
          </button>
        ))}
        <button
          onClick={() => 草稿のみ設定(!草稿のみ)}
          className={`px-2.5 py-1 rounded-full border transition-colors ${
            草稿のみ
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          ✍️ 草稿あり
        </button>
        <span className="ml-auto text-gray-400">{表示ネタ.length} 件</span>
      </div>

      {/* カテゴリ別一覧 */}
      {表示ネタ.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          該当ネタがありません
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(カテゴリ別.entries()).map(([カテゴリ, 一覧]) => (
            <div key={カテゴリ}>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {カテゴリ}（{一覧.length}）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {一覧.map(n => (
                  <div
                    key={`${n.カテゴリ}-${n.ID}`}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${評価色[n.評価]} shrink-0`}>
                        {評価アイコン[n.評価]} {n.評価 === '不明' ? '-' : n.評価}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 shrink-0">{n.ID}</span>
                      <p className="text-xs text-gray-800 flex-1">{n.タイトル}</p>
                    </div>
                    {(n.草稿あり || n.生成日) && (
                      <div className="flex items-center gap-2 mt-1.5 ml-1">
                        {n.草稿あり && (
                          <span className="text-[10px] text-emerald-600 font-semibold">✍️ 草稿あり</span>
                        )}
                        {n.生成日 && (
                          <span className="text-[10px] text-gray-400">{n.生成日}生成</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 公開済みビュー ────────────────────────────────────────

function 公開済みビュー({ 投稿 }: { 投稿: 公開済み投稿[] }) {
  if (投稿.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
        公開済み投稿がありません
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {投稿.map(p => (
        <div
          key={p.通し番号}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-mono text-gray-500 font-semibold">{p.通し番号}</span>
            <span className="text-[10px] text-gray-400">{p.日付}</span>
            <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{p.タイトル}</h3>
            {p.ツイートID && (
              <a
                href={`https://x.com/Rei_value/status/${p.ツイートID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:underline shrink-0"
              >
                X で開く →
              </a>
            )}
          </div>
          {p.内容 && (
            <p className="text-xs text-gray-600 mb-2 leading-relaxed line-clamp-3">{p.内容}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {p.ハッシュタグ.map(t => (
              <span key={t} className="text-[10px] text-blue-500">{t}</span>
            ))}
            {p.反応 && (
              <span className="text-[10px] text-gray-400 ml-auto">反応：{p.反応}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── KPIビュー（Phase 1 = サマリのみ・実数は Phase 2） ────────

function KPIビュー({ サマリ }: { サマリ: マーケティングサマリ | null }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📊 ネタストック内訳</h3>
        {サマリ && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <小カード ラベル="🥇 S級" 値={サマリ.ネタサマリ.S級} />
            <小カード ラベル="🥈 A級" 値={サマリ.ネタサマリ.A級} />
            <小カード ラベル="🥉 B級" 値={サマリ.ネタサマリ.B級} />
            <小カード ラベル="✍️ 草稿あり" 値={サマリ.ネタサマリ.草稿あり} />
          </div>
        )}
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">カテゴリ別分布</h4>
          {サマリ && (
            <div className="space-y-1">
              {Object.entries(サマリ.ネタサマリ.カテゴリ別)
                .sort((a, b) => b[1] - a[1])
                .map(([カテゴリ, 件数]) => (
                  <div key={カテゴリ} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 flex-1 truncate">{カテゴリ}</span>
                    <span className="text-gray-400 font-mono">{件数}</span>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="bg-gray-900 h-full rounded-full"
                        style={{
                          width: `${Math.round((件数 / サマリ.ネタサマリ.総数) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">⏳ X投稿KPI実数（Phase 2 で接続予定）</h3>
        <p className="text-xs text-yellow-700 mb-2">
          impressions / 保存率 / note遷移CTR は <code className="text-[11px] bg-white px-1 py-0.5 rounded">pokeca-price-monitor</code> の
          X投稿KPI履歴テーブルに保存されています。
        </p>
        <p className="text-xs text-yellow-600">
          現在の取得元：<code className="text-[11px]">{サマリ?.KPI.現在の取得元 ?? 'N/A'}</code>
        </p>
        <p className="text-xs text-yellow-600 mt-2">
          Phase 2 完了条件：N ≥ 10 投稿到達後に時系列グラフ・タイプ別比較を実装。
        </p>
      </div>
    </div>
  )
}

function 小カード({ ラベル, 値 }: { ラベル: string; 値: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-[10px] text-gray-500 mb-1">{ラベル}</p>
      <p className="text-xl font-bold text-gray-900 font-mono">{値}</p>
    </div>
  )
}
