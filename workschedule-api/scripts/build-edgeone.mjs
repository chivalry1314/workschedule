import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(rootDir, 'workschedule-api');
const fnDir = resolve(rootDir, '.edgeone/cloud-functions/api-node');

await rm(fnDir, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

// 复制入口文件和构建产物
await cp(resolve(apiDir, 'edgeone/entry.js'), resolve(fnDir, 'index.mjs'));
await cp(resolve(apiDir, 'dist'), resolve(fnDir, 'dist'), { recursive: true });

// 复制 package.json、package-lock.json 并安装生产依赖
await cp(resolve(apiDir, 'package.json'), resolve(fnDir, 'package.json'));
await cp(resolve(apiDir, 'package-lock.json'), resolve(fnDir, 'package-lock.json'));

const { execSync } = await import('node:child_process');
execSync('npm ci --omit=dev', { cwd: fnDir, stdio: 'inherit' });

// EdgeOne Pages Cloud Functions 路由配置
await writeFile(
  resolve(fnDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: '^/api/(.*)$', dest: '/api/$1' }],
    },
    null,
    2,
  ),
);

console.log('EdgeOne Cloud Function package prepared successfully');
