import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(rootDir, 'workschedule-api');
const fnDir = resolve(rootDir, 'node-functions/api');

// 这些模块不打包，保留为 node_modules 依赖：
// - express：含动态 require 和模板文件，打包容易出问题
// - @nestjs/microservices / @nestjs/websockets：NestJS 的可选依赖，按需加载
// - @cloudbase/js-sdk：浏览器/Node 混合 SDK，含动态导入，外部化更安全
const EXTERNAL_MODULES = [
  'express',
  '@nestjs/microservices',
  '@nestjs/websockets',
];

await rm(fnDir, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

// 将入口文件复制到 dist 目录下再打包，使相对路径 ./bootstrap.js 能正确解析
const bundledEntry = resolve(apiDir, 'dist', '__edgeone_entry__.js');
let originalEntry = await readFile(resolve(apiDir, 'edgeone/entry.js'), 'utf8');
// 入口文件原位于 workschedule-api/edgeone/entry.js，导入 ./dist/bootstrap.js；
// 复制到 dist/ 后需改为 ./bootstrap.js
originalEntry = originalEntry.replace(
  "from './dist/bootstrap.js'",
  "from './bootstrap.js'",
);
await writeFile(bundledEntry, originalEntry);

// 使用 esbuild 把后端打包成单个文件，显著减少冷启动时的文件 IO
await build({
  entryPoints: [bundledEntry],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: resolve(fnDir, '[[default]].js'),
  external: EXTERNAL_MODULES,
  keepNames: true,
  sourcemap: false,
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

// 清理临时入口文件
await rm(bundledEntry, { force: true });

// 读取 api package.json，生成仅含生产依赖 + 外部化模块的函数 package.json
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
