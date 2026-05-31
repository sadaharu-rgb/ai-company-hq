import { useState, type FormEvent } from 'react'
import { 管理者ログイン } from '../api/クライアント'

/** 管理者シークレット入力 → ログイン。成功で onログイン成功 を呼ぶ */
export default function ログイン画面({ onログイン成功 }: { onログイン成功: () => void }) {
  const [secret, secret設定] = useState('')
  const [エラー, エラー設定] = useState('')
  const [送信中, 送信中設定] = useState(false)

  const 送信 = async (e: FormEvent) => {
    e.preventDefault()
    送信中設定(true)
    エラー設定('')
    const 成功 = await 管理者ログイン(secret)
    送信中設定(false)
    if (成功) onログイン成功()
    else エラー設定('認証に失敗しました（試行回数が多い場合はしばらくお待ちください）')
  }

  return (
    <div className="max-w-sm mx-auto mt-20 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="text-2xl mb-1">🔒</div>
        <h2 className="text-base font-bold text-gray-900">管理者認証</h2>
        <p className="text-[11px] text-gray-400 mt-1">プロジェクト進捗は管理者のみ閲覧できます</p>
      </div>
      <form onSubmit={送信} className="space-y-3">
        <input
          type="password"
          value={secret}
          onChange={e => secret設定(e.target.value)}
          placeholder="管理者シークレット"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
          autoFocus
        />
        {エラー && <p className="text-[11px] text-red-500">{エラー}</p>}
        <button
          type="submit"
          disabled={送信中 || !secret}
          className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >{送信中 ? '確認中…' : 'ログイン'}</button>
      </form>
    </div>
  )
}
