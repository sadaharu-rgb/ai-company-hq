import { useEffect, useState, type ReactNode } from 'react'
import ログイン画面 from './ログイン画面'
import { セッション有効確認, セッション破棄 } from '../api/クライアント'

type 認証状態 = '確認中' | '未認証' | '認証済'

/**
 * 管理者専用ガード（UI層の防御）
 * 起動時にセッションを verify し、無効ならログイン画面のみ表示（中身を一切描画しない）。
 * API 側でも 認証必須 が効くため、UI を突破してもデータは取れない（多層防御）。
 */
export default function 管理者ガード({ children }: { children: ReactNode }) {
  const [状態, 状態設定] = useState<認証状態>('確認中')

  useEffect(() => {
    セッション有効確認().then(有効 => 状態設定(有効 ? '認証済' : '未認証'))
  }, [])

  if (状態 === '確認中') {
    return <div className="text-center text-gray-400 py-20 text-sm">認証を確認中…</div>
  }
  if (状態 === '未認証') {
    return <ログイン画面 onログイン成功={() => 状態設定('認証済')} />
  }
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => { セッション破棄(); 状態設定('未認証') }}
          className="text-[11px] text-gray-400 hover:text-gray-600 underline"
        >ログアウト</button>
      </div>
      {children}
    </div>
  )
}
