import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { UsersService } from '../src/users/users.service.js';

let app: any;

async function bootstrap() {
  if (app) return app;

  const server = await NestFactory.create(AppModule);

  server.enableCors({
    origin: true,
    credentials: true,
  });

  server.setGlobalPrefix('api/v1');

  server.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const usersService = server.get(UsersService);
  await usersService.seedAdmin();

  await server.init();
  app = server.getHttpAdapter().getInstance();
  return app;
}

export const main_handler = async (event: any, context: any) => {
  const instance = await bootstrap();

  const serverlessHttp = (await import('serverless-http')).default;
  const handler = serverlessHttp(instance, {
    binary: ['application/octet-stream'],
  });

  return handler(event, context);
};
