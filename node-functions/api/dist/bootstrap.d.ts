import type { Express } from 'express';
export declare function createNestApp(existingApp?: Express, prefix?: string): Promise<import("@nestjs/common").INestApplication<any>>;
