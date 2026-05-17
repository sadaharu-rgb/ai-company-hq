import { 部門一覧 } from '../data/部門定義'
import { useストア } from '../stores/ストア'

const カテゴリ順 = ['経営層', '開発系', '攻め系', 'ペルソナ系'] as const

export default function サイドバー() {
  const { 選択部門ID, 選択部門ID設定 } = useストア()

  return (
    <aside className="w-52 shrink-0 flex flex-col gap-4">
      <button
        onClick={() => 選択部門ID設定(null)}
        className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          選択部門ID === null ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🏢 全部門
      </button>
      {カテゴリ順.map(カテゴリ => (
        <div key={カテゴリ}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">{カテゴリ}</p>
          <div className="space-y-0.5">
            {部門一覧.filter(d => d.カテゴリ === カテゴリ).map(部門 => (
              <button
                key={部門.id}
                onClick={() => 選択部門ID設定(部門.id === 選択部門ID ? null : 部門.id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  選択部門ID === 部門.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{部門.アイコン}</span>
                <span className="truncate">{部門.名前}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
