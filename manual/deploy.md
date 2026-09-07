# 手册部署与维护

本手册基于 [VitePress](https://vitepress.dev/) 构建，源文件为 `manual/` 目录下的 Markdown。

## 本地预览

```bash
cd manual
npm install        # 首次运行需要
npm run dev        # 启动后访问 http://localhost:5173
```

## 构建

```bash
cd manual
npm run build      # 产物输出到 manual/.vitepress/dist
npm run preview    # 本地预览构建产物
```

## 部署到 GitHub Pages

### 方式一：GitHub Actions 自动部署（推荐）

在仓库根目录创建 `.github/workflows/deploy-manual.yml`：

```yaml
name: Deploy Manual to GitHub Pages

on:
  push:
    branches: [main]
    paths: ['manual/**', '.github/workflows/deploy-manual.yml']

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: 构建手册
        run: |
          cd manual
          npm ci
          npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: manual/.vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

然后在仓库 **Settings → Pages** 中把 Source 选为 **GitHub Actions**。

> 注意 `.vitepress/config.mts` 中的 `base` 必须等于 `/<仓库名>/`，否则页面资源 404。

### 方式二：手动推送 gh-pages 分支

```bash
cd manual
npm ci && npm run build
cd .vitepress/dist
git init
git add -A && git commit -m "deploy manual"
git branch -M gh-pages
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -f origin gh-pages
```

然后在 **Settings → Pages** 中选择 `gh-pages` 分支、根目录。

## 更新手册内容

- 功能说明、操作步骤：直接修改对应 `.md` 文件，push 后 Actions 自动构建发布。
- 截图：将真实截图保存为 `images/` 下对应 `.png` 文件并覆盖；或用 `manual/scripts/capture-screenshots.mjs` 自动重新生成。
- 新增章节：新建 `.md` 文件，并在 `.vitepress/config.mts` 的 `sidebar` 中登记。
