// node:sqlite の型宣言（@types/node v20 には含まれていないため手動定義）
// Node.js v22.5+ で利用可能な実験的モジュール

declare module 'node:sqlite' {
  interface StatementResultingChanges {
    changes: number
    lastInsertRowid: number | bigint
  }

  interface DatabaseOptions {
    open?: boolean
    enableForeignKeyConstraints?: boolean
  }

  interface StatementOptions {
    allowBareNamedParameters?: boolean
    useBigIntParameters?: boolean
  }

  class StatementSync {
    all(...args: unknown[]): unknown[]
    get(...args: unknown[]): unknown | undefined
    run(...args: unknown[]): StatementResultingChanges
    setAllowBareNamedParameters(allow: boolean): void
    setReadBigInts(enabled: boolean): void
    readonly sourceSQL: string
    readonly expandedSQL: string
  }

  class DatabaseSync {
    constructor(location: string, options?: DatabaseOptions)
    open(): void
    close(): void
    prepare(sql: string, options?: StatementOptions): StatementSync
    exec(sql: string): void
    function(name: string, fn: (...args: unknown[]) => unknown): void
    readonly isOpen: boolean
  }
}
