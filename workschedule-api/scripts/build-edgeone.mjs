import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cp, rm, mkdir } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(rootDir, 'workschedule-api');
const outDir = resolve(rootDir, 'cloud-functions/api');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// 复制入口文件和构建产物
await cp(resolve(apiDir, 'edgeone/entry.js'), resolve(outDir, '[[default]].js'));
await cp(resolve(apiDir, 'dist'), resolve(outDir, 'dist'), { recursive: true });

// 复制 package.json 并安装生产依赖
await cp(resolve(apiDir, 'package.json'), resolve(outDir, 'package.json'));

const { execSync } = await import('node:child_process');
execSync('npm install --omit=dev', { cwd: outDir, stdio: 'inherit' });

console.log('EdgeOne Cloud Function package prepared successfully');
