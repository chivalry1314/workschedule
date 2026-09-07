# 部署指南（腾讯云 CloudBase）

> 如需将前端部署到 GitHub Pages，请参见 [DEPLOY_GITHUB_PAGES.md](DEPLOY_GITHUB_PAGES.md)（后端仍部署在 CloudBase）。

## 前置准备

1. 注册腾讯云账号，开通 [CloudBase 云开发](https://console.cloud.tencent.com/tcb)。
2. 安装 CloudBase CLI：
   ```bash
   npm install -g @cloudbase/cli
   ```
3. 登录 CloudBase：
   ```bash
   cloudbase login
   ```
4. 创建 CloudBase 环境，记录环境 ID（`envId`）。
5. 在 CloudBase 控制台开通 **PostgreSQL 云数据库**。
6. 准备一个已备案的域名（国内访问需要 ICP 备案）。
7. 准备腾讯云 API 密钥：
   - 访问 [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)
   - 创建 `SecretId` 和 `SecretKey`
   - 或创建 CloudBase **API Key**（推荐用于 Web 云函数）

## 环境变量配置

在 CloudBase 控制台 → 云函数 → 函数配置 → 环境变量中添加：

```
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_APIKEY=your-cloudbase-api-key
JWT_SECRET=你的JWT密钥（至少32位随机字符串）
JWT_EXPIRES_IN=2h
```

> Web 云函数（HTTP 云函数）不会自动注入 `TENCENTCLOUD_SECRETID`/`TENCENTCLOUD_SECRETKEY`，因此**推荐配置 `CLOUDBASE_APIKEY`**。

本地开发环境变量（`workschedule-api/.env`）：

```env
CLOUDBASE_ENV_ID=your-env-id
TENCENTCLOUD_SECRETID=your-secret-id
TENCENTCLOUD_SECRETKEY=your-secret-key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=2h
PORT=3000
```

## 修改配置

1. 修改 `workschedule-web/cloudbaserc.json` 中的 `envId` 和 `customDomains` 为你的实际环境 ID 和域名。
2. 修改 `workschedule-api/cloudbaserc.json` 中的 `envId` 为你的实际环境 ID。

## 本地开发

### 后端

```bash
cd workschedule-api

# 1. 创建 .env 文件（参考 .env.example）
# 2. 安装依赖（如果还没安装）
npm install

# 3. 启动开发服务器（启动时会自动创建表并插入默认管理员）
npm run start:dev
```

后端默认运行在 http://localhost:3000，API 前缀 `/api/v1`。

> 注意：本地开发通过 CloudBase SDK 访问 CloudBase PostgreSQL，需确保本地 IP 已加入数据库白名单。

### 前端

```bash
cd workschedule-web
npm run dev
```

前端默认运行在 http://localhost:5173，已配置代理到后端。

## 生产部署

### 方式一：GitHub Actions 自动部署（推荐）

本仓库已配置 `.github/workflows/deploy-cloudbase.yml`，push 到 `main` 分支且改动涉及 `workschedule-api/`、`workschedule-web/` 或 workflow 文件时，会自动触发部署。

#### 1. 配置仓库 Secrets

仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**，添加以下 secrets：

| Name | 说明 |
|------|------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `TENCENTCLOUD_SECRETID` | 腾讯云 API 密钥 SecretId（CloudBase CLI 登录用） |
| `TENCENTCLOUD_SECRETKEY` | 腾讯云 API 密钥 SecretKey（CloudBase CLI 登录用） |
| `CLOUDBASE_APIKEY` | CloudBase API Key（后端运行时初始化 SDK 使用） |
| `JWT_SECRET` | JWT 签名密钥（至少 32 位随机字符串） |
| `JWT_EXPIRES_IN` | JWT 有效期，如 `2h` |
| `API_BASE_URL` | 前端生产环境调用的后端地址，例如 `https://xxx.service.tcloudbase.com/api/v1` |

> 密钥获取方式见上文「前置准备」第 7 步。

#### 2. 首次部署（先部署后端，再获取 API_BASE_URL）

由于前端构建需要知道后端地址，而首次部署前还不知道，因此 workflow 会**先只部署后端，跳过前端**。等拿到后端访问地址后，再设置 `API_BASE_URL` 并重新触发部署。

**步骤如下：**

```bash
git add .
git commit -m "ci: setup cloudbase auto deploy"
git push origin main
```

push 后，在仓库 **Actions** 标签页可以看到：

1. `deploy-api` 任务：部署后端到 CloudBase 云托管（CloudBase Run）容器；
2. `deploy-web` 任务：检测到 `API_BASE_URL` 未配置，自动跳过，并在日志中提示后续操作。

> **首次自动部署前必读：**
> - 必须先在 CloudBase 控制台执行 `scripts/schema.sql` 建表，否则后端启动会失败。
> - 首次部署后，检查云托管服务环境变量是否已在 CloudBase 控制台正确写入（来自 `cloudbaserc.json` 的 `envVariables`）。

#### 3. 获取后端访问地址并配置 API_BASE_URL

后端部署成功后，需要拿到真实的后端入口地址：

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)。
2. 进入对应环境 → **云托管** → **服务列表** → 点击 `workschedule-api`。
3. 复制服务访问 URL。

地址格式通常为：

```
https://<service-id>.service.tcloudbase.com/api/v1
```

> 其中 `/api` 来自 `workschedule-api/cloudbaserc.json` 中配置的 `servicePath`，`/v1` 是后端 API 版本前缀。

复制地址后，在 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加名为 `API_BASE_URL` 的 secret，值为完整地址。

#### 4. 重新触发前端部署

设置 `API_BASE_URL` 后，重新触发 workflow 的两种方式：

**方式 A（推荐）：push 一个空提交**

```bash
git commit --allow-empty -m "ci: trigger frontend deploy with API_BASE_URL"
git push origin main
```

**方式 B：在 GitHub Actions 页面手动重新运行**

进入仓库 **Actions → Deploy to CloudBase → 最新的一次运行 → Re-run all jobs**。

重新运行后，`deploy-web` 会正常构建并部署前端。

### 方式二：手动部署

如果暂时不想配置 Actions，仍可手动部署：

#### 1. 部署后端云托管

```bash
cd workschedule-api
cloudbase framework:deploy -e your-env-id
```

#### 2. 部署前端静态网站

```bash
cd workschedule-web
npm run build
cloudbase framework:deploy -e your-env-id
```

### 配置域名

1. 在 CloudBase 控制台为前端静态网站绑定自定义域名。
2. 为后端云托管服务配置访问路径 `/api`。
3. 在前端 `.env.production` 中配置生产环境 API 地址。

## 部署验证

1. 访问前端域名，使用默认管理员账号登录：
   - 用户名：`admin`
   - 密码：`Admin1234`
2. 首次登录后强制修改密码。
3. 进入「管理 → 值班类型」添加值班类型。
4. 进入「管理 → 角色」创建角色并关联值班类型。
5. 进入「管理 → 人员」添加人员。
6. 进入「我的排班」填写排班。

## 常见问题

### 云函数冷启动慢
- 提高云函数内存或配置预置并发（会产生额外费用）。
- 首次访问可能有 1-3 秒延迟，后续正常。

### CloudBase SDK 初始化失败
- 确认环境变量 `CLOUDBASE_ENV_ID` 已配置。
- Web 云函数必须配置 `CLOUDBASE_APIKEY` 或显式传入 `secretId`/`secretKey`。
- 确认 API 密钥有权限访问当前 CloudBase 环境。

### 数据库操作失败
- 确认 CloudBase PostgreSQL 数据库已开通。
- 确认数据库白名单已允许 CloudBase 云函数访问。
- 查看云函数日志获取详细错误信息。

### 前端 API 请求失败
- 确认前端请求地址正确。
- 如果使用同域名部署，需配置 API 网关或 Nginx 规则将 `/api` 转发到云函数。
- 如果使用独立域名，修改 `src/utils/request.ts` 中的 `baseURL`。

## 成本估算

| 项目 | 费用 |
|------|------|
| CloudBase 静态托管 | 免费额度内约 0 元 |
| CloudBase 云函数 | 免费额度 100 万次/月，超出约 0.0133 元/万次 |
| CloudBase PostgreSQL | 按实际使用计费，小团队每月约 10-50 元 |
| 域名 | 约 60-100 元/年 |
| **合计** | **约 10-100 元/月 + 域名费用** |
