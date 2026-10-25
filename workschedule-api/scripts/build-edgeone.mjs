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
// - @nestjs/microservices / @nestjs/websockets：@nestjs/core 会动态 import，但项目未使用
// - @cloudbase/js-sdk / ws：cloudbase sdk 在 Node 环境下会动态 require('ws')，
//   把它整体外部化可以避免打包后 eval 动态 require 找不到模块的问题
const EXTERNAL_MODULES = [
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@cloudbase/js-sdk',
  'ws',
];

await rm(fnDir, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

// 把 EdgeOne 入口逻辑（含 express、超时中间件、NestJS 初始化）一起打包成单文件，
// 这样运行时除了少数外部化模块外不再依赖 node_modules。
const bundlePath = resolve(apiDir, 'dist', 'bootstrap.bundle.js');
await build({
  entryPoints: [resolve(apiDir, 'edgeone', 'bundle-entry.js')],
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

// 保留一个可读的云函数入口文件，确保 EdgeOne 能静态分析出 export default app
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
