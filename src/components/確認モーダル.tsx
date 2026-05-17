type Props = {
  タイトル: string
  説明: string
  詳細?: { ラベル: string; 値: string }[]
  種別: '通常' | '危険'
  確認ラベル: string
  キャンセルラベル?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function 確認モーダル({ タイトル, 説明, 詳細, 種別, 確認ラベル, キャンセルラベル = 'キャンセル', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className={`px-5 py-4 border-b ${種別 === '危険' ? 'border-red-100' : 'border-gray-100'}`}>
          <h2 className={`font-semibold text-base ${種別 === '危険' ? 'text-red-600' : 'text-gray-900'}`}>{タイトル}</h2>
          <p className="text-sm text-gray-500 mt-1">{説明}</p>
        </div>
        {詳細 && 詳細.length > 0 && (
          <div className="px-5 py-3 space-y-2 bg-gray-50">
            {詳細.map((d, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-gray-400 shrink-0">{d.ラベル}</span>
                <span className="text-gray-800 font-medium">{d.値}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 ボタン副"
          >{キャンセルラベル}</button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${種別 === '危険' ? 'ボタン危険' : 'ボタン主'}`}
          >{確認ラベル}</button>
        </div>
      </div>
    </div>
  )
}
