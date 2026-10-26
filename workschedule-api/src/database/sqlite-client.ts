import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type DbValue = string | number | boolean | null | bigint;

interface Filter {
  column: string;
  operator: string;
  value: string;
}

function toSqlParam(value: DbValue): DbValue {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function splitFilter(filter: string): Filter {
  const idx1 = filter.indexOf('.');
  if (idx1 === -1) throw new Error(`Invalid filter: ${filter}`);
  const idx2 = filter.indexOf('.', idx1 + 1);
  if (idx2 === -1) throw new Error(`Invalid filter: ${filter}`);
  return {
    column: filter.slice(0, idx1),
    operator: filter.slice(idx1 + 1, idx2),
    value: filter.slice(idx2 + 1),
  };
}

function parseFilters(filterString: string): Filter[] {
  const filters: Filter[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < filterString.length; i++) {
    const ch = filterString[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      filters.push(splitFilter(filterString.slice(start, i)));
      start = i + 1;
    }
  }
  filters.push(splitFilter(filterString.slice(start)));
  return filters;
}

function buildFilterSql(filter: Filter, params: DbValue[]): string {
  const { column, operator, value } = filter;
  switch (operator) {
    case 'eq': {
      if (value === 'null') return `${column} IS NULL`;
      params.push(toSqlParam(value));
      return `${column} = ?`;
    }
    case 'neq': {
      if (value === 'null') return `${column} IS NOT NULL`;
      params.push(toSqlParam(value));
      return `${column} != ?`;
    }
    case 'gt':
      params.push(toSqlParam(value));
      return `${column} > ?`;
    case 'gte':
      params.push(toSqlParam(value));
      return `${column} >= ?`;
    case 'lt':
      params.push(toSqlParam(value));
      return `${column} < ?`;
    case 'lte':
      params.push(toSqlParam(value));
      return `${column} <= ?`;
    case 'like': {
      params.push(toSqlParam(value));
      return `${column} LIKE ?`;
    }
    case 'ilike': {
      params.push(toSqlParam(value.toLowerCase()));
      return `LOWER(${column}) LIKE ?`;
    }
    case 'in': {
      const inner = value.startsWith('(') && value.endsWith(')')
        ? value.slice(1, -1)
        : value;
      const items = inner.length === 0 ? [] : inner.split(',').map((v) => v.trim());
      if (items.length === 0) return '1=0';
      const placeholders = items.map(() => '?').join(',');
      params.push(...items.map(toSqlParam));
      return `${column} IN (${placeholders})`;
    }
    case 'is':
      if (value === 'null') return `${column} IS NULL`;
      params.push(toSqlParam(value));
      return `${column} IS ?`;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
}

interface OrderOptions {
  ascending?: boolean;
}

export interface QueryResult {
  data: any[] | null;
  error: Error | null;
  count?: number | null;
}

export class SqliteQueryBuilder {
  private tableName = '';
  private columns: string[] = [];
  private selectOptions: SelectOptions = {};
  private conditions: { sql: string; params: DbValue[] }[] = [];
  private orConditions: { sql: string; params: DbValue[] }[] = [];
  private orderColumn?: string;
  private orderAscending = true;
  private limitValue?: number;
  private rangeFrom?: number;
  private rangeTo?: number;
  private insertData?: Record<string, DbValue> | Record<string, DbValue>[];
  private updateData?: Record<string, DbValue>;
  private isDelete = false;

  constructor(private db: Database) {}

  from(table: string): this {
    this.tableName = table;
    return this;
  }

  select(columns: string | string[], options: SelectOptions = {}): this {
    if (Array.isArray(columns)) {
      this.columns = columns;
    } else if (columns === '*') {
      this.columns = [];
    } else {
      this.columns = columns.split(',').map((c) => c.trim());
    }
    this.selectOptions = options;
    return this;
  }

  eq(column: string, value: DbValue): this {
    const params: DbValue[] = [];
    const sql = buildFilterSql({ column, operator: 'eq', value: String(value ?? '') }, params);
    this.conditions.push({ sql, params });
    return this;
  }

  in(column: string, values: DbValue[]): this {
    const params: DbValue[] = [];
    const valueStr = `(${values.map((v) => String(v ?? '')).join(',')})`;
    const sql = buildFilterSql({ column, operator: 'in', value: valueStr }, params);
    this.conditions.push({ sql, params });
    return this;
  }

  or(filterString: string): this {
    const params: DbValue[] = [];
    const filters = parseFilters(filterString);
    const sql = filters.map((f) => buildFilterSql(f, params)).join(' OR ');
    this.orConditions.push({ sql, params });
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  order(column: string, options: OrderOptions = {}): this {
    this.orderColumn = column;
    this.orderAscending = options.ascending !== false;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  insert(data: Record<string, DbValue> | Record<string, DbValue>[]): this {
    this.insertData = data;
    return this;
  }

  update(data: Record<string, DbValue>): this {
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.isDelete = true;
    return this;
  }

  private buildWhere(): { sql: string; params: DbValue[] } {
    const params: DbValue[] = [];
    const parts: string[] = [];
    for (const cond of this.conditions) {
      parts.push(cond.sql);
      params.push(...cond.params);
    }
    for (const cond of this.orConditions) {
      parts.push(`(${cond.sql})`);
      params.push(...cond.params);
    }
    if (parts.length === 0) return { sql: '', params };
    return { sql: 'WHERE ' + parts.join(' AND '), params };
  }

  private executeSelect(): QueryResult {
    const where = this.buildWhere();
    const countOnly = this.selectOptions.head === true;

    if (this.selectOptions.count === 'exact') {
      const countSql = `SELECT COUNT(*) AS cnt FROM ${this.tableName} ${where.sql}`.trim();
      const countStmt = this.db.prepare(countSql);
      const countRow = countStmt.get(...where.params) as { cnt: number };
      const count = Number(countRow.cnt);
      if (countOnly) {
        return { data: null, error: null, count };
      }
    }

    const colSql = this.columns.length > 0 ? this.columns.join(', ') : '*';
    let sql = `SELECT ${colSql} FROM ${this.tableName} ${where.sql}`.trim();
    if (this.orderColumn) {
      sql += ` ORDER BY ${this.orderColumn} ${this.orderAscending ? 'ASC' : 'DESC'}`;
    }

    let limit: number | undefined;
    let offset: number | undefined;
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      limit = this.rangeTo - this.rangeFrom + 1;
      offset = this.rangeFrom;
    } else if (this.limitValue !== undefined) {
      limit = this.limitValue;
    }
    if (limit !== undefined) sql += ` LIMIT ${limit}`;
    if (offset !== undefined) sql += ` OFFSET ${offset}`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...where.params) as any[];

    let count: number | undefined;
    if (this.selectOptions.count === 'exact') {
      const countSql = `SELECT COUNT(*) AS cnt FROM ${this.tableName} ${where.sql}`.trim();
      const countStmt = this.db.prepare(countSql);
      const countRow = countStmt.get(...where.params) as { cnt: number };
      count = Number(countRow.cnt);
    }

    return { data: rows, error: null, count };
  }

  private executeInsert(): QueryResult {
    if (!this.insertData) return { data: null, error: null };
    const rows = Array.isArray(this.insertData)
      ? this.insertData
      : [this.insertData];
    if (rows.length === 0) return { data: null, error: null };

    const firstRow = rows[0] as Record<string, DbValue>;
    const keys = Object.keys(firstRow);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const colSql = this.columns.length > 0 ? this.columns.join(', ') : '*';
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING ${colSql}`;
    const stmt = this.db.prepare(sql);

    const inserted: any[] = [];
    for (const row of rows) {
      const record = row as Record<string, DbValue>;
      const values = keys.map((k) => toSqlParam(record[k]));
      const result = stmt.get(...values) as any;
      if (result) inserted.push(result);
    }

    return { data: inserted.length > 0 ? inserted : null, error: null };
  }

  private executeUpdate(): QueryResult {
    if (!this.updateData) return { data: null, error: null };
    const keys = Object.keys(this.updateData);
    if (keys.length === 0) return { data: null, error: null };

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const where = this.buildWhere();
    const sql = `UPDATE ${this.tableName} SET ${setClause} ${where.sql}`.trim();
    const values = keys.map((k) => toSqlParam(this.updateData![k]));
    const stmt = this.db.prepare(sql);
    stmt.run(...values, ...where.params);
    return { data: null, error: null };
  }

  private executeDelete(): QueryResult {
    const where = this.buildWhere();
    const sql = `DELETE FROM ${this.tableName} ${where.sql}`.trim();
    const stmt = this.db.prepare(sql);
    stmt.run(...where.params);
    return { data: null, error: null };
  }

  execute(): QueryResult {
    try {
      if (this.insertData) return this.executeInsert();
      if (this.updateData) return this.executeUpdate();
      if (this.isDelete) return this.executeDelete();
      return this.executeSelect();
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  // 让 query builder 支持 await，模拟 PostgREST 返回 Promise 的行为
  // eslint-disable-next-line unicorn/no-thenable
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export class SqliteClient {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  from(table: string): SqliteQueryBuilder {
    return new SqliteQueryBuilder(this.db).from(table);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): any {
    return this.db.prepare(sql);
  }

  close(): void {
    this.db.close();
  }
}

export function createSqliteClient(dbPath: string): SqliteClient {
  return new SqliteClient(dbPath);
}

export function runSchema(client: SqliteClient): void {
  const schemaPath = resolve(__dirname, '../../scripts/schema-sqlite.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  client.exec(sql);
}
