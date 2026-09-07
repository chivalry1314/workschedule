# 部署指南（GitHub Pages）

本文档介绍如何将**前端**部署到 GitHub Pages。**GitHub Pages 只托管前端静态文件，后端 API 仍需部署在公网可访问的服务上**（推荐继续使用腾讯云 CloudBase 云函数，见 [DEPLOY.md](DEPLOY.md)）。

## 前置准备

1. 前端代码已推送到 GitHub 仓库。
2. 后端已部署到公网，并拥有 HTTPS 访问地址，例如：
   `https://your-backend-domain.com/api/v1`
   - 后端 CORS 已放开（`origin: true`），允许 GitHub Pages 域名跨域访问。
   - 注意：后端地址必须配置为**环境变量**，绝不能把 CloudBase 的 SecretId/SecretKey 写进前端代码。
3. 本地安装 Node.js 18+。

## 前端已内置的 Pages 适配

以下改动已在代码中完成，无需手动修改：

- `vite.config.ts`：`base: './'`，资源使用相对路径，兼容 `https://<用户名>.github.io/<仓库名>/` 子路径。
- `src/router/index.ts`：使用 **hash 路由**（`#/dashboard` 形式）。GitHub Pages 是纯静态托管、无法配置 SPA 回退，hash 路由可以保证刷新页面、直接访问深层链接都不会 404。
- `src/utils/request.ts`：API 地址优先读取环境变量 `VITE_API_BASE_URL`，未配置时回退到本地代理 `/api/v1`。
- `index.html`：favicon 改为相对路径。

## 配置生产环境 API 地址

在项目根目录执行：

```bash
cd workschedule-web
# 参考示例文件创建生产环境配置
cp env.production.example.txt .env.production
```

编辑 `.env.production`，把地址改成你的公网后端地址：

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
```

> `.env.production` 含有你的后端地址，建议不要提交到仓库（已在 `.gitignore` 时需确认），或使用 GitHub Secrets 在 CI 中注入（见下文方式一）。

## 部署方式一：GitHub Actions 自动部署（推荐）

### 1. 配置仓库 Secret

仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**：

| Name | Value |
|------|-------|
| `API_BASE_URL` | 你的公网后端地址，如 `https://your-backend-domain.com/api/v1` |

### 2. 添加工作流

在仓库根目录创建 `.github/workflows/deploy-web.yml`：

```yaml
name: Deploy Web to GitHub Pages

on:
  push:
    branches: [main]
    paths: ['workschedule-web/**', '.github/workflows/deploy-web.yml']

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 注入生产环境 API 地址
        run: echo "VITE_API_BASE_URL=${{ secrets.API_BASE_URL }}" > workschedule-web/.env.production

      - name: 安装依赖并构建
        run: |
          cd workschedule-web
          npm ci
          npm run build

      - name: 部署到 gh-pages 分支
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: workschedule-web/dist
```

### 3. 开启 GitHub Pages

仓库 → **Settings → Pages**：

- Source 选择 **Deploy from a branch**
- Branch 选择 `gh-pages`，目录选 `/ (root)`，保存。

### 4. 触发部署

```bash
git add .
git commit -m "deploy: trigger pages build"
git push
```

Actions 运行完成后，访问 `https://<用户名>.github.io/<仓库名>/` 即可。

## 部署方式二：手动推送 gh-pages 分支

```bash
cd workschedule-web

# 1. 配置生产环境变量（见上文），然后构建
npm run build

# 2. 将 dist 内容推送到 gh-pages 分支
cd dist
git init
git add -A
git commit -m "deploy pages"
git branch -M gh-pages
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -f origin gh-pages
```

然后在仓库 **Settings → Pages** 中选择 `gh-pages` 分支作为来源。

## 部署验证

1. 打开 `https://<用户名>.github.io/<仓库名>/`，应自动跳转到登录页（`#/login`）。
2. 使用管理员账号登录：`admin` / `Admin1234`（首次登录强制修改密码）。
3. 重点验证：
   - 登录成功后能正常加载排班数据（确认 `VITE_API_BASE_URL` 配置正确、后端 CORS 已放开）；
   - 浏览器直接刷新任意页面（如 `#/all-schedule`）不报错；
   - 手机浏览器访问页面排版正常。

## 日常更新流程

前端代码修改后：

- **方式一**：`git push` 到 main 分支，Actions 自动构建部署。
- **方式二**：重新执行“构建 + 推送 gh-pages 分支”的命令。

后端接口变更不需要重新部署前端（除非 API 地址变化）。

## 注意事项

- **国内访问**：GitHub Pages 服务器在海外，国内访问可能不稳定或较慢。如果使用者主要在国内，建议优先使用腾讯云 CloudBase 静态托管（见 [DEPLOY.md](DEPLOY.md)），GitHub Pages 适合作为备用或演示环境。
- **HTTPS  Mixed Content**：Pages 站点是 HTTPS，后端地址也必须用 HTTPS，否则浏览器会拦截请求。
- **接口安全**：所有业务接口仍需登录 token 鉴权，前端只做静态托管不影响安全性；但 CloudBase 密钥只应存在于后端环境变量中。
- **仓库可见性**：Public 仓库的 Pages 免费；Private 仓库需要 GitHub Pro 才能开 Pages。
