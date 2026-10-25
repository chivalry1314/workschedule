var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
let CloudBaseService = class CloudBaseService {
    config;
    app;
    pgClient;
    constructor(config) {
        this.config = config;
    }
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
        this.pgClient = this.app.rdb();
    }
    db() {
        return this.pgClient;
    }
    from(table) {
        return this.pgClient.from(table);
    }
};
CloudBaseService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], CloudBaseService);
export { CloudBaseService };
//# sourceMappingURL=cloudbase.service.js.map