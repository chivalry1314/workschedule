declare module 'better-sqlite3' {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface ColumnDefinition {
    name: string;
    column: string | null;
    table: string | null;
    database: string | null;
    type: string | null;
  }

  class Statement {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    each(params: any, cb: (row: any) => void): void;
    each(cb: (row: any) => void): void;
    pluck(toggleState?: boolean): this;
    expand(toggleState?: boolean): this;
    raw(toggleState?: boolean): this;
    bind(...params: any[]): this;
    columns(): ColumnDefinition[];
    safeIntegers(toggleState?: boolean): this;
    readonly source: string;
    readonly database: Database;
  }

  class Database {
    constructor(filename: string, options?: Database.Options);
    prepare(sql: string): Statement;
    exec(sql: string): this;
    pragma(source: string, options?: Database.PragmaOptions): any;
    close(): this;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly name: string;
    readonly memory: boolean;
    readonly readonly: boolean;
  }

  namespace Database {
    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (message?: any, ...additionalArgs: any[]) => void;
      nativeBinding?: string;
    }
    interface PragmaOptions {
      simple?: boolean;
    }
  }

  export = Database;
}
