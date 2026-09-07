# 部署指南（EdgeOne Pages + CloudBase PostgreSQL）

本项目采用 **EdgeOne Pages** 作为前端静态托管与后端函数运行时，数据库继续使用 **腾讯云 CloudBase PostgreSQL**。

## 部署架构

```
用户 ──► EdgeOne Pages（域名）
        ├── 静态页面 /api/* 以外的请求 → 前端 Vue 3 应用
        └── /api/* 请求 → EdgeOne Pages Cloud Functions（NestJS）
                        └── CloudBase SDK ──► CloudBase PostgreSQL
```

- **前端**：EdgeOne Pages 静态站点（`.edgeone/assets/`）
- **后端**：EdgeOne Pages Cloud Functions（`.edgeone/cloud-functions/api-node/`）
- **数据库**：CloudBase PostgreSQL（云数据库）

## 前置准备

1. 一个已推送到 GitHub 的仓库（例如 `https://github.com/chivalry1314/workschedule.git`）。
2. 注册/登录 [腾讯云 EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)。
3. 注册/登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)，创建环境并开通 **PostgreSQL 云数据库**。
4. 在 CloudBase 控制台获取：
   - **环境 ID**（`envId`，如 `inworkscheduler-d9faw584aa2515b9`）
   - **API Key**：进入对应环境 → 云后台 → API Key → 新建/复制 Key
5. 准备一个已备案的域名（国内访问需要 ICP 备案），EdgeOne Pages 支持绑定自定义域名。

## 环境变量

### 线上（EdgeOne Pages 控制台）

在 EdgeOne Pages 项目 → **设置 → 环境变量** 中添加：

```
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_APIKEY=your-cloudbase-api-key
JWT_SECRET=你的JWT密钥（至少32位随机字符串）
JWT_EXPIRES_IN=2h
```

> 前端构建不需要 `VITE_API_BASE_URL`，因为前端默认走同域名相对路径 `/api/v1`，由 EdgeOne Pages 的函数路由接管。

### 本地开发（workschedule-api/.env）

```env
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_APIKEY=your-api-key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=2h
PORT=3000
```

> 本地开发通过 CloudBase SDK 访问 CloudBase PostgreSQL，需确保本地 IP 已加入数据库白名单。

## 数据库初始化

首次部署前，必须在 CloudBase 控制台执行 `scripts/schema.sql` 建表：

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)。
2. 进入对应环境 → **云数据库 PostgreSQL** → **SQL 执行器**。
3. 打开 `scripts/schema.sql`，复制全部 SQL 内容并执行。
4. 后端首次启动时会自动插入默认管理员账号：
   - 用户名：`admin`
   - 密码：`Admin1234`

## EdgeOne Pages 部署

### 1. 创建 EdgeOne Pages 项目

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) → **Pages**。
2. 点击 **新建项目** → 选择 **从 Git 仓库导入**。
3. 授权 GitHub 并选择仓库：`chivalry1314/workschedule`。
4. 分支选择 `main`，构建配置如下：

| 配置项 | 值 |
|--------|-----|
| 构建命令 | `npm run build:edgeone` |
| 输出目录 | `./.edgeone` |
| Node 版本 | `22.11.0`（或更高） |

5. 在环境变量面板添加上述 4 个环境变量。
6. 保存并触发首次构建。

### 2. 等待构建完成

首次构建会执行：

```bash
npm install        # 根目录依赖
npm run build:edgeone
```

`build:edgeone` 内部逻辑：

```bash
cd workschedule-web && rm -f package-lock.json && rm -rf node_modules && npm install && if [ "$(uname -s)" = "Linux" ]; then npm install --no-save @rolldown/binding-linux-x64-gnu; fi && npm run build
cd .. && rm -rf .edgeone && mkdir -p .edgeone/assets && cp -r workschedule-web/dist/* .edgeone/assets/
cd workschedule-api && npm ci && npm run build:edgeone
```

> 前端 `package-lock.json` 在 Windows 本地生成，锁的是 Windows 原生依赖；EdgeOne Pages 构建环境为 Linux，直接沿用 lockfile 会导致 `rolldown` 找不到 Linux 绑定。因此前端构建时会先删除 lockfile 与 `node_modules`，并在 Linux 下显式补装 `@rolldown/binding-linux-x64-gnu`。
> 后端仍使用 `npm ci` 沿用现有 `package-lock.json`，避免无锁安装导致 transitive 依赖版本漂移。

最终会在仓库根目录生成 `.edgeone/` 目录，符合 EdgeOne Pages [Build Output API](https://pages.edgeone.ai/document/building-output-configuration) 标准：

```
.edgeone/
├── assets/                              # 前端静态资源
│   └── index.html
└── cloud-functions/
    └── api-node/                        # Node.js API 函数
        ├── index.mjs                    # 函数入口
        ├── dist/                        # NestJS 构建产物
        ├── node_modules/                # 生产依赖
        ├── package.json
        ├── package-lock.json
        └── config.json                  # 函数路由配置
```

> 当前生产依赖包体积约 106MB，低于 EdgeOne Pages Cloud Functions 128MB 限制。

### 3. 绑定自定义域名

构建成功后，EdgeOne Pages 会分配一个默认域名。如需国内访问：

1. 在 EdgeOne Pages 项目 → **域名** → **添加域名**。
2. 按提示在 DNS 服务商添加 CNAME 记录。
3. 等待证书自动签发（EdgeOne Pages 提供免费 SSL 证书）。

### 4. 验证部署

1. 访问前端域名，使用默认管理员账号登录：
   - 用户名：`admin`
   - 密码：`Admin1234`
2. 首次登录后强制修改密码。
3. 进入「管理 → 值班类型」添加值班类型。
4. 进入「管理 → 角色」创建角色并关联值班类型。
5. 进入「管理 → 人员」添加人员。
6. 进入「我的排班」填写排班。

## 本地开发

### 后端

```bash
cd workschedule-api

# 1. 创建 .env 文件（参考 .env.example）
cp .env.example .env

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run start:dev
```

后端默认运行在 http://localhost:3000，API 前缀 `/api/v1`。

### 前端

```bash
cd workschedule-web
npm install
npm run dev
```

前端默认运行在 http://localhost:5173，已配置代理到后端。

### 本地验证 EdgeOne 函数包

```bash
cd workschedule-api
npm run build:edgeone

# 本地启动函数入口（需配置真实 CLOUDBASE_ENV_ID / CLOUDBASE_APIKEY）
cd ..
CLOUDBASE_ENV_ID=xxx CLOUDBASE_APIKEY=xxx JWT_SECRET=xxx JWT_EXPIRES_IN=2h node cloud-functions/api/[[default]].js
```

## 重新部署

后续推送到 `main` 分支后，EdgeOne Pages 会自动触发重新构建和部署。如果某次提交没有自动触发，可在 EdgeOne Pages 控制台点击 **重新部署**。

## 常见问题

### 1. 构建失败：函数包超过 128MB

当前生产包约 106MB，仍有 22MB 余量。若后续依赖增加导致超限：

- 检查是否误将 devDependencies 打包进 `cloud-functions/api/node_modules`。
- 在 `workschedule-api/scripts/build-edgeone.mjs` 中增加依赖裁剪逻辑。
- 使用 esbuild/rollup 将后端打包为单文件，减少 `node_modules` 体积。

### 2. 首次访问 500 / 数据库错误

- 确认已在 CloudBase 控制台执行 `scripts/schema.sql`。
- 确认 EdgeOne Pages 环境变量 `CLOUDBASE_ENV_ID` 和 `CLOUDBASE_APIKEY` 已配置。
- 确认 CloudBase PostgreSQL 白名单允许 EdgeOne Pages 函数访问（通常 CloudBase 内网互通，无需额外配置）。

### 3. 前端请求 404

- 确认 `edgeone.json` 中 `/api/*` rewrite 规则存在。
- 确认 `cloud-functions/api/[[default]].js` 已生成并部署。

### 4. 冷启动慢

EdgeOne Pages Cloud Functions 首次访问可能有 1-3 秒冷启动，后续正常。如不能忍受，可在 EdgeOne 控制台查看是否支持预热/常驻配置（可能产生额外费用）。

### 5. 日志中出现 "缺少依赖 ws"

`@cloudbase/js-sdk` 在 Node.js 环境下会打印一条提示：`缺少依赖 ws，请执行以下命令安装：npm install ws`。该警告来自 SDK 内部，不影响数据库 HTTP 请求。生产包中已包含 `ws` 依赖，可忽略此提示。如果后续需要用到 SDK 的 WebSocket 能力（本项目目前仅使用 PostgREST/HTTP），请确认 `ws` 已存在于 `cloud-functions/api/node_modules` 中。

## 成本估算

| 项目 | 费用 |
|------|------|
| EdgeOne Pages 静态托管 | 免费额度内约 0 元 |
| EdgeOne Pages Cloud Functions | 免费额度内约 0 元，超出按调用次数与资源使用计费 |
| CloudBase PostgreSQL | 按实际使用计费，小团队每月约 10-50 元 |
| 域名 | 约 60-100 元/年 |
| SSL 证书 | EdgeOne Pages 免费提供 |
| **合计** | **约 10-100 元/月 + 域名费用** |

> 具体计费以腾讯云官方文档为准。
