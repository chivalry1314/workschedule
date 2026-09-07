import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudBaseService implements OnModuleInit {
  private app: any;
  private pgClient: any;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const cloudbase = (await import('@cloudbase/js-sdk')).default;
    const envId = this.config.get('CLOUDBASE_ENV_ID');
    const accessKey = this.config.get('CLOUDBASE_APIKEY');

    if (!envId) {
      throw new Error('Missing CLOUDBASE_ENV_ID in environment variables');
    }
    if (!accessKey) {
      throw new Error('Missing CLOUDBASE_APIKEY in environment variables');
    }

    this.app = cloudbase.init({
      env: envId,
      accessKey,
    });

    // app.rdb() 在 PG 模式下返回 PostgREST 客户端
    this.pgClient = (this.app as any).rdb();
  }

  db() {
    return this.pgClient;
  }

  from(table: string) {
    return this.pgClient.from(table);
  }
}
