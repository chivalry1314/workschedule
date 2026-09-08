import type { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { UsersService } from './users/users.service.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

export async function createNestApp(existingApp?: Express, prefix = 'api/v1') {
  const t0 = Date.now();
  const app = existingApp
    ? await NestFactory.create(AppModule, new ExpressAdapter(existingApp))
    : await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  // 等待 CloudBase SDK 初始化完成
  await app.init();

  // 插入默认管理员（需先在 CloudBase 控制台执行 schema.sql 建表）
  try {
    const usersService = app.get(UsersService);
    await usersService.seedAdmin();
  } catch (err: any) {
    console.error(
      '[Bootstrap] 初始化默认管理员失败，请确认已在 CloudBase 控制台执行 scripts/schema.sql：',
      err?.message || err,
    );
  }

  console.log(`[Bootstrap] NestJS 应用初始化完成，prefix=${prefix}，耗时 ${Date.now() - t0}ms`);
  return app;
}
