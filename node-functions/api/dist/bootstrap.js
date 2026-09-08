import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { UsersService } from './users/users.service.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
export async function createNestApp(existingApp, prefix = 'api/v1') {
    const app = existingApp
        ? await NestFactory.create(AppModule, new ExpressAdapter(existingApp))
        : await NestFactory.create(AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.setGlobalPrefix(prefix);
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    try {
        const usersService = app.get(UsersService);
        await usersService.seedAdmin();
    }
    catch (err) {
        console.error('[Bootstrap] 初始化默认管理员失败，请确认已在 CloudBase 控制台执行 scripts/schema.sql：', err?.message || err);
    }
    return app;
}
//# sourceMappingURL=bootstrap.js.map