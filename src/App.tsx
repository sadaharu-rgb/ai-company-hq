import { useEffect } from 'react'
import サイドバー from './components/サイドバー'
import ダッシュボード from './pages/ダッシュボード'
import { useストア } from './stores/ストア'
import { 案件一覧取得 } from './api/クライアント'

export default function App() {
  const { 案件一覧, 案件一覧設定, 選択案件ID } = useストア()

  useEffect(() => {
    案件一覧取得().then(案件一覧設定)
  }, [])

  const 稼働中 = 案件一覧.filter(c => c.ステータス === '稼働中').length
  const 保留中 = 案件一覧.filter(c => c.ステータス === '保留').length

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-900 tracking-tight">AI COMPANY HQ</span>
            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold border border-purple-100">16部門</span>
          </div>
          {/* ステータスバー */}
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
        </div>
      </header>

      {/* ボディ */}
      <div className="max-w-7xl mx-auto px-5 py-5 flex gap-5">
        <サイドバー />
        <main className="flex-1 min-w-0">
          <ダッシュボード />
        </main>
      </div>
    </div>
  )
}
