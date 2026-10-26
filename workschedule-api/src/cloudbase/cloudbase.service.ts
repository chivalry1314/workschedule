import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createSqliteClient,
  runSchema,
  type SqliteClient,
  type SqliteQueryBuilder,
} from '../database/sqlite-client.js';

type DbClient = SqliteClient | any;
type QueryBuilder = SqliteQueryBuilder | any;

@Injectable()
export class CloudBaseService implements OnModuleInit {
  private client: DbClient;
  private sqlite: SqliteClient | null = null;
  private useSqlite = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.config.get('DATABASE_URL');

    if (databaseUrl && databaseUrl.startsWith('sqlite:')) {
      this.useSqlite = true;
      const dbPath = databaseUrl.replace(/^sqlite:/, '');
      this.sqlite = createSqliteClient(dbPath);
      this.client = this.sqlite;
      runSchema(this.sqlite);
      return;
    }

    const cloudbase = (await import('@cloudbase/js-sdk')).default;
    const envId = this.config.get('CLOUDBASE_ENV_ID');
    const accessKey = this.config.get('CLOUDBASE_APIKEY');

    if (!envId) {
      throw new Error('Missing CLOUDBASE_ENV_ID in environment variables');
    }
    if (!accessKey) {
      throw new Error('Missing CLOUDBASE_APIKEY in environment variables');
    }

    const app = cloudbase.init({ env: envId, accessKey });
    this.client = app.rdb();
  }

  db() {
    return this.client;
  }

  from(table: string): QueryBuilder {
    if (this.useSqlite && this.sqlite) {
      return this.sqlite.from(table);
    }
    return this.client.from(table);
  }
}
