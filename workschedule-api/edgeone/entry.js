import express from 'express';
import { createNestApp } from './dist/bootstrap.js';

const app = express();
let ready = false;
const readyPromise = createNestApp(app, 'v1')
  .then(() => {
    ready = true;
  })
  .catch((err) => {
    console.error('[EdgeOne Entry] 初始化 NestJS 应用失败：', err?.message || err);
    throw err;
  });

// 在 NestJS 初始化完成前暂存请求
app.use((req, res, next) => {
  if (ready) {
    return next();
  }
  readyPromise.then(() => next()).catch(next);
});

export default app;
