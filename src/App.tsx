import { useEffect } from 'react'
import サイドバー from './components/サイドバー'
import ダッシュボード from './pages/ダッシュボード'
import マーケティング from './pages/marketing/マーケティング'
import 管理者ガード from './components/管理者ガード'
import プロジェクト進捗ページ from './pages/progress/プロジェクト進捗'
import { useストア } from './stores/ストア'
import { 案件一覧取得 } from './api/クライアント'
import type { 画面モード } from './types'

export default function App() {
  const { 案件一覧, 案件一覧設定, 画面モード, 画面モード設定 } = useストア()

  useEffect(() => {
    案件一覧取得().then(案件一覧設定).catch(() => {/* サーバー未起動時は無視 */})
  }, [])

  const 稼働中 = 案件一覧.filter(c => c.ステータス === '稼働中').length
  const 保留中 = 案件一覧.filter(c => c.ステータス === '保留').length

  const モードボタン = (モード: 画面モード, ラベル: string) => (
    <button
      onClick={() => 画面モード設定(モード)}
      className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
        画面モード === モード ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500'
      }`}
    >{ラベル}</button>
  )

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-900 tracking-tight">AI COMPANY HQ</span>
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold border border-purple-100">16部門</span>

            {/* モード切替 */}
            <div className="ml-3 flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
              {モードボタン('HQ', '🏢 HQ')}
              {モードボタン('Marketing', '📣 Marketing')}
              {モードボタン('Progress', '📊 Progress')}
            </div>
          </div>

          {/* ステータスバー（HQモードのみ）*/}
          {画面モード === 'HQ' && (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                総プロジェクト <span className="font-semibold text-gray-800">{案件一覧.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                稼働中 <span className="font-semibold text-green-700">{稼働中}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                保留 <span className="font-semibold text-yellow-700">{保留中}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ボディ */}
      <div className="max-w-7xl mx-auto px-5 py-5 flex gap-5">
        {画面モード === 'HQ' && <サイドバー />}
        <main className="flex-1 min-w-0">
          {画面モード === 'HQ' && <ダッシュボード />}
          {画面モード === 'Marketing' && <マーケティング />}
          {画面モード === 'Progress' && (
            <管理者ガード>
              <プロジェクト進捗ページ />
            </管理者ガード>
          )}
        </main>
      </div>
    </div>
  )
}
