import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const apiDir = resolve(rootDir, 'workschedule-api');
const fnDir = resolve(rootDir, 'node-functions/api');

await rm(fnDir, { recursive: true, force: true });
await mkdir(fnDir, { recursive: true });

// 复制入口文件和构建产物
await cp(resolve(apiDir, 'edgeone/entry.js'), resolve(fnDir, '[[default]].js'));
await cp(resolve(apiDir, 'dist'), resolve(fnDir, 'dist'), { recursive: true });

// 读取根 package.json，生成仅含生产依赖的函数 package.json
const rootPkg = JSON.parse(
  await (await import('node:fs/promises')).readFile(resolve(apiDir, 'package.json'), 'utf8'),
);
const fnPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  private: true,
  type: 'module',
  dependencies: rootPkg.dependencies,
};
await writeFile(resolve(fnDir, 'package.json'), JSON.stringify(fnPkg, null, 2));

// 生成与精简 package.json 匹配的 lockfile（不安装 node_modules）
const { execSync } = await import('node:child_process');
execSync('npm install --package-lock-only', { cwd: fnDir, stdio: 'inherit' });

console.log('EdgeOne Cloud Function source package prepared successfully');
