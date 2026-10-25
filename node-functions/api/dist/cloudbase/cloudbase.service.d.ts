import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class CloudBaseService implements OnModuleInit {
    private config;
    private app;
    private pgClient;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    db(): any;
    from(table: string): any;
}
