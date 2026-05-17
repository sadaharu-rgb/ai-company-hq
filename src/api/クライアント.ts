import axios from 'axios'
import type { APIレスポンス, 案件, 投稿, 会議 } from '../types'

const クライアント = axios.create({ baseURL: '/api', timeout: 30000, headers: { 'Content-Type': 'application/json' } })

// 案件
export async function 案件一覧取得(): Promise<案件[]> {
  const { data } = await クライアント.get<APIレスポンス<案件[]>>('/cases')
  return data.data ?? []
}
export async function 案件作成(入力: { タイトル: string; 説明: string; 優先度: string; カテゴリ?: string; URL?: string }): Promise<案件> {
  const { data } = await クライアント.post<APIレスポンス<案件>>('/cases', 入力)
  if (!data.success || !data.data) throw new Error(data.error ?? '作成失敗')
  return data.data
}
export async function 案件削除(id: number): Promise<void> {
  await クライアント.delete(`/cases/${id}`)
}

// 投稿
export async function 投稿一覧取得(案件ID: number): Promise<投稿[]> {
  const { data } = await クライアント.get<APIレスポンス<投稿[]>>(`/cases/${案件ID}/posts`)
  return data.data ?? []
}
export async function 投稿追加(案件ID: number, 入力: { 部門ID: string; 内容: string; 種別: string }): Promise<投稿> {
  const { data } = await クライアント.post<APIレスポンス<投稿>>(`/cases/${案件ID}/posts`, 入力)
  if (!data.success || !data.data) throw new Error(data.error ?? '投稿失敗')
  return data.data
}
export async function 投稿削除(案件ID: number, 投稿ID: number | string): Promise<void> {
  await クライアント.delete(`/cases/${案件ID}/posts/${投稿ID}`)
}

// 会議一覧
export async function 会議一覧取得(案件ID: number): Promise<会議[]> {
  const { data } = await クライアント.get<APIレスポンス<会議[]>>(`/cases/${案件ID}/meetings`)
  return data.data ?? []
}

// 実行アクションを記録
export async function 実行アクション記録(案件ID: number, 会議ID: number, アクション: string): Promise<void> {
  await クライアント.patch(`/cases/${案件ID}/meetings/${会議ID}`, { 実行アクション: アクション })
}

// 部門一覧（ファイルシステムから動的取得）
export async function 部門一覧取得(): Promise<{ id: string; 名前: string }[]> {
  const { data } = await クライアント.get<APIレスポンス<{ id: string; 名前: string }[]>>('/departments')
  return data.data ?? []
}

// AI会議（参加部門IDs省略 = Projects配下の全部門）
export async function AI会議開始(
  案件ID: number,
  テーマ: string,
  参加部門IDs: string[] | null,
  コールバック: (部門ID: string, 内容: string, ステータス?: string) => void,
  進行コールバック?: (完了: number, 合計: number) => void
): Promise<void> {
  const res = await fetch(`/api/cases/${案件ID}/meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ テーマ, 参加部門IDs }),
  })
  if (!res.body) throw new Error('ストリームなし')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(line.slice(6))
        if (parsed.部門ID === 'status') {
          コールバック('status', parsed.内容, parsed.内容)
        } else if (parsed.部門ID === 'progress') {
          // 進行度イベント
          const { 完了, 合計 } = JSON.parse(parsed.内容) as { 完了: number; 合計: number }
          進行コールバック?.(完了, 合計)
        } else if (parsed.部門ID && parsed.部門ID !== 'done' && parsed.部門ID !== 'エラー') {
          コールバック(parsed.部門ID, parsed.内容)
        }
      } catch { /* ignore */ }
    }
  }
}
