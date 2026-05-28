import { create } from 'zustand'
import type { 案件, 投稿, 画面モード } from '../types'

type ストア型 = {
  画面モード: 画面モード
  案件一覧: 案件[]
  投稿一覧: 投稿[]
  選択案件ID: number | null
  選択部門ID: string | null
  AI会議中: boolean
  画面モード設定: (v: 画面モード) => void
  案件一覧設定: (v: 案件[]) => void
  投稿一覧設定: (v: 投稿[]) => void
  選択案件ID設定: (id: number | null) => void
  選択部門ID設定: (id: string | null) => void
  AI会議中設定: (v: boolean) => void
  投稿追加: (p: 投稿) => void
}

export const useストア = create<ストア型>((set) => ({
  画面モード: 'HQ',
  案件一覧: [],
  投稿一覧: [],
  選択案件ID: null,
  選択部門ID: null,
  AI会議中: false,
  画面モード設定: (v) => set({ 画面モード: v }),
  案件一覧設定: (v) => set({ 案件一覧: v }),
  投稿一覧設定: (v) => set({ 投稿一覧: v }),
  選択案件ID設定: (id) => set({ 選択案件ID: id }),
  選択部門ID設定: (id) => set({ 選択部門ID: id }),
  AI会議中設定: (v) => set({ AI会議中: v }),
  投稿追加: (p) => set((s) => ({ 投稿一覧: [...s.投稿一覧, p] })),
}))
