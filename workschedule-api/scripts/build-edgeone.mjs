import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(rootDir, 'workschedule-api');
const fnDir = resolve(rootDir, 'node-functions/api');

// 以下模块不打包，保持外部安装：
// - express：EdgeOne 框架模式入口必须显式 import express + const app = express()，
//   由 EdgeOne 通过 externalNodeModules 提供运行时依赖
// - @nestjs/microservices / @nestjs/websockets：@nestjs/core 会动态 import，但项目未使用
// - @cloudbase/js-sdk / ws：cloudbase sdk 在 Node 环境下会动态 require('ws')，
//   把它整体外部化可以避免打包后 eval 动态 require 找不到模块的问题
const EXTERNAL_MODULES = [
  'express',
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@cloudbase/js-sdk',
  'ws',
];

await rm(fnDir, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

// 把业务代码（dist/bootstrap.js 及其所有依赖）打包成单文件，减少冷启动文件 IO
const bundlePath = resolve(apiDir, 'dist', 'bootstrap.bundle.js');
await build({
  entryPoints: [resolve(apiDir, 'dist', 'bootstrap.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: bundlePath,
  external: EXTERNAL_MODULES,
  keepNames: true,
  sourcemap: false,
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

// 复制入口文件到云函数目录，EdgeOne 框架模式要求入口文件显式包含：
// import express from 'express'; const app = express(); export default app;
await cp(resolve(apiDir, 'edgeone', 'entry.js'), resolve(fnDir, '[[default]].js'));

// 复制打包后的入口 bundle
await cp(resolve(apiDir, 'dist'), resolve(fnDir, 'dist'), { recursive: true });

// 生成仅含外部化生产依赖的函数 package.json
const rootPkg = JSON.parse(
  await readFile(resolve(apiDir, 'package.json'), 'utf8'),
);
const fnDeps = {};
for (const name of EXTERNAL_MODULES) {
  if (rootPkg.dependencies[name]) {
    fnDeps[name] = rootPkg.dependencies[name];
  }
}
// express 是 @nestjs/platform-express 的 peer，必须显式安装
if (!fnDeps.express && rootPkg.dependencies['@nestjs/platform-express']) {
  fnDeps.express = '^5.0.1';
}

const fnPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  private: true,
  type: 'module',
  dependencies: fnDeps,
};
await writeFile(resolve(fnDir, 'package.json'), JSON.stringify(fnPkg, null, 2));

// 安装生产依赖到函数目录
const { execSync } = await import('node:child_process');
execSync('npm install --omit=dev', { cwd: fnDir, stdio: 'inherit' });

console.log('EdgeOne Cloud Function source package prepared successfully');
