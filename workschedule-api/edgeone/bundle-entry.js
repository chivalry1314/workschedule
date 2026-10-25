import express from 'express';
import { createNestApp } from '../dist/bootstrap.js';

process.on('unhandledRejection', (reason) => {
  console.error('[EdgeOne Entry] 未处理的 Promise 拒绝：', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[EdgeOne Entry] 未捕获的异常：', err?.message || err);
});

const app = express();
let ready = false;
let initError = null;

const INIT_TIMEOUT_MS = 30000;
const REQUEST_TIMEOUT_MS = 30000;

const initWithTimeout = async () => {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`NestJS 应用初始化超过 ${INIT_TIMEOUT_MS}ms`));
    }, INIT_TIMEOUT_MS);

    createNestApp(app, 'v1')
      .then((nestApp) => {
        clearTimeout(timer);
        console.log(`[EdgeOne Entry] NestJS 初始化成功，耗时 ${Date.now() - t0}ms`);
        resolve(nestApp);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const readyPromise = initWithTimeout()
  .then(() => {
    ready = true;
  })
  .catch((err) => {
    initError = err;
    console.error('[EdgeOne Entry] 初始化 NestJS 应用失败：', err?.message || err);
  });

// 请求日志，便于排查卡死/超时请求
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`[EdgeOne Entry] 慢请求 ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  next();
});

// 单请求超时中间件：防止下游（如云数据库请求）挂起导致页面卡死
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[EdgeOne Entry] 请求超时: ${req.method} ${req.url}`);
      res.status(504).json({ code: 504, message: '请求处理超时，请稍后重试' });
    }
  }, REQUEST_TIMEOUT_MS);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
});

// 等待 NestJS 初始化完成后才进入 NestJS 路由
app.use((req, res, next) => {
  if (ready) {
    return next();
  }
  if (initError) {
    return res.status(503).json({
      code: 503,
      message: '服务初始化失败，请稍后重试',
    });
  }
  readyPromise.then(() => {
    if (ready) {
      next();
    } else {
      res.status(503).json({ code: 503, message: '服务初始化失败，请稍后重试' });
    }
  });
});

// 全局错误处理，避免未捕获异常导致请求挂起
app.use((err, req, res, _next) => {
  console.error('[EdgeOne Entry] 未捕获异常：', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export { app };
