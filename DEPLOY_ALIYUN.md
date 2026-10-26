# 部署指南（阿里云 ECS 99 元/年服务器 + SQLite）

本项目支持部署到**阿里云轻量应用服务器 / ECS 入门级实例**（俗称 99 元/年机型）。采用前后端统一部署在同一台服务器上的方案：

- **前端**：Nginx 托管静态文件（`workschedule-web/dist`）
- **后端**：Node.js + PM2 运行 NestJS（`workschedule-api/dist`）
- **数据库**：服务器本地 **SQLite**（零月租、适合小团队）
- **反向代理 / 静态托管**：Nginx

> 如果你希望继续用腾讯云 CloudBase PostgreSQL，请参考 `.env.example` 中的“方式二”配置，后端同样适用本部署流程。

## 部署架构

```
用户 ──► 域名（已备案）
        └── Nginx（80/443）
            ├── /api/* ──► Node.js 后端（127.0.0.1:3000）
            └── 其他请求 ──► 前端 Vue 3 静态页面
                         └── SQLite 数据文件
```

## 前置准备

1. 一台阿里云国内服务器（99 元/年入门机型即可，建议 1 核 1GB 内存以上）。
2. 一个**已备案**的域名，并解析到服务器公网 IP。
3. 本地已安装 Node.js 22+，代码已推送到 GitHub。
4. 服务器已开放 80/443 端口（安全组 + 系统防火墙）。

## 环境变量

### 线上（服务器 `.env`）

`workschedule-api/.env.example` 已提供默认模板，部署时复制为 `.env` 并修改：

```env
DATABASE_URL="sqlite:./data/workschedule.db"
JWT_SECRET=你的JWT密钥（至少32位随机字符串）
JWT_EXPIRES_IN=2h
PORT=3000
```

- `DATABASE_URL`：SQLite 数据库文件路径。首次启动会自动建表并插入默认数据。
- `JWT_SECRET`：务必替换为随机长字符串，可使用 `openssl rand -base64 32` 生成。

### 本地开发（workschedule-api/.env）

```bash
cd workschedule-api
cp .env.example .env
# 按需修改 JWT_SECRET
npm install
npm run start:dev
```

本地同样使用 SQLite，数据文件保存在 `workschedule-api/data/workschedule.db`。

## 服务器初始化

以 root 登录服务器，执行项目内的初始化脚本：

```bash
cd /opt/workschedule/workschedule-api
bash scripts/setup-server.sh
```

脚本会完成：
- 识别系统类型（Ubuntu/Debian 或 Alibaba Cloud Linux/CentOS/RHEL）并安装依赖
- 安装 Node.js 22 LTS、PM2、Nginx
- 创建 `/opt/workschedule/logs`、`/opt/workschedule/workschedule-api/data` 目录
- 配置 Nginx 站点（需手动修改 `server_name` 为你的域名）
- 放行 80/443 端口

> 目前脚本已适配 Alibaba Cloud Linux 的 `yum`/`dnf` 包管理器和 `/etc/nginx/conf.d/` 配置路径。

## 首次部署

### 方式一：GitHub Actions 自动部署（推荐）

#### 1. 配置仓库 Secret

在 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret** 中添加：


| Name | Value |
|------|-------|
| `ALIYUN_HOST` | 服务器公网 IP 或域名 |
| `ALIYUN_USER` | 登录用户名（通常为 `root` 或自定义用户） |
| `ALIYUN_SSH_KEY` | 私钥内容（推荐用密钥登录，不要密码） |
| `ALIYUN_SSH_PORT` | SSH 端口，默认 22 |
| `DATABASE_URL` | `sqlite:./data/workschedule.db` |
| `JWT_SECRET` | 你的 JWT 密钥 |
| `JWT_EXPIRES_IN` | `2h` |
| `PORT` | `3000` |

> 如果继续使用 CloudBase，再添加 `CLOUDBASE_ENV_ID` 和 `CLOUDBASE_APIKEY`。

#### 2. 触发部署

```bash
git add .
git commit -m "deploy: aliyun ecs"
git push origin main
```

Actions 会：
1. 构建前端与后端
2. 裁剪开发依赖
3. 打包上传到服务器 `/opt/workschedule`
4. 写入 `.env` 并平滑重启 PM2

### 方式二：手动部署

```bash
# 本地构建
cd workschedule-web && npm ci && npm run build
cd ../workschedule-api && npm ci && npm run build && npm prune --omit=dev

# 上传到服务器（示例使用 rsync）
rsync -avz --delete workschedule-web/dist root@YOUR_SERVER_IP:/opt/workschedule/workschedule-web/
rsync -avz --delete workschedule-api/dist workschedule-api/scripts workschedule-api/ecosystem.config.cjs workschedule-api/package.json workschedule-api/package-lock.json workschedule-api/node_modules root@YOUR_SERVER_IP:/opt/workschedule/workschedule-api/

# 登录服务器启动
ssh root@YOUR_SERVER_IP
cd /opt/workschedule/workschedule-api
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 等
pm2 start ecosystem.config.cjs
pm2 save
```

## Nginx 与域名

1. 修改 `workschedule-api/scripts/nginx.conf` 中的 `server_name` 为你的域名。
2. 复制到服务器：

   **Ubuntu / Debian：**
   ```bash
   cp /opt/workschedule/workschedule-api/scripts/nginx.conf /etc/nginx/sites-available/workschedule
   ln -sf /etc/nginx/sites-available/workschedule /etc/nginx/sites-enabled/workschedule
   rm -f /etc/nginx/sites-enabled/default
   nginx -t && systemctl reload nginx
   ```

   **Alibaba Cloud Linux / CentOS / RHEL：**
   ```bash
   cp /opt/workschedule/workschedule-api/scripts/nginx.conf /etc/nginx/conf.d/workschedule.conf
   nginx -t && systemctl reload nginx
   ```
3. 申请 SSL 证书（推荐阿里云免费证书或 certbot），开启 HTTPS。

## 重新绑定域名

如果后续需要更换域名，按以下步骤操作即可：

### 1. 域名解析指向服务器 IP

在域名 DNS 管理后台添加一条 A 记录：

| 主机记录 | 记录类型 | 记录值 | 说明 |
|---------|---------|--------|------|
| `www`、`@` 或自定义子域名 | A | 服务器公网 IP | `@` 表示主域名 |

例如要绑定 `workschedule.yourdomain.com`：

- 主机记录：`workschedule`
- 记录类型：`A`
- 记录值：`123.45.67.89`

DNS 生效后可用 `nslookup workschedule.yourdomain.com` 检查。

### 2. 修改 Nginx 配置

编辑服务器上的 Nginx 配置文件：

- **Alibaba Cloud Linux**：`/etc/nginx/conf.d/workschedule.conf`
- **Ubuntu / Debian**：`/etc/nginx/sites-available/workschedule`

将 `server_name` 改为新域名：

```nginx
server_name workschedule.yourdomain.com;
```

然后测试并重载：

```bash
nginx -t && systemctl reload nginx
```

### 3. 重新申请 SSL 证书

SSL 证书与域名绑定，换域名后必须重新申请。

**使用 acme.sh + 阿里云 DNS：**

```bash
export Ali_Key="你的 AccessKey ID"
export Ali_Secret="你的 AccessKey Secret"

~/.acme.sh/acme.sh --issue --dns dns_ali -d workschedule.yourdomain.com

~/.acme.sh/acme.sh --install-cert -d workschedule.yourdomain.com \
  --key-file /etc/nginx/ssl/workschedule.yourdomain.com.key \
  --fullchain-file /etc/nginx/ssl/workschedule.yourdomain.com.pem \
  --reloadcmd "nginx -t && systemctl reload nginx"
```

然后更新 Nginx 中的证书路径：

```nginx
ssl_certificate /etc/nginx/ssl/workschedule.yourdomain.com.pem;
ssl_certificate_key /etc/nginx/ssl/workschedule.yourdomain.com.key;
```

### 4. 更新 GitHub Actions Secret

如果之前 `ALIYUN_HOST` 填的是 IP 或旧域名，在仓库 **Settings → Secrets and variables → Actions** 中找到 `ALIYUN_HOST` 并更新为新域名。

### 5. 清理旧证书（可选）

```bash
~/.acme.sh/acme.sh --remove -d 旧域名.com
```

本项目前端使用相对路径 `/api/v1` 请求接口，换域名后**前端代码无需修改**。

## 验证部署

1. 访问你的域名，使用默认管理员账号登录：
   - 用户名：`admin`
   - 密码：`Admin1234`
2. 首次登录后强制修改密码。
3. 进入「管理 → 值班类型」添加值班类型。
4. 进入「管理 → 角色」创建角色并关联值班类型。
5. 进入「管理 → 人员」添加人员。
6. 进入「我的排班」填写排班。

## 日常更新

- **GitHub Actions 方式**：`git push` 到 `main` 分支即可自动部署。
- **手动方式**：重新执行构建 + 上传 + `pm2 reload ecosystem.config.cjs`。

## 备份 SQLite 数据库

数据库文件位于服务器：

```
/opt/workschedule/workschedule-api/data/workschedule.db
```

建议配置定时备份（如 crontab 每天凌晨备份到 OSS 或本地）：

```bash
0 3 * * * cp /opt/workschedule/workschedule-api/data/workschedule.db /backup/workschedule-$(date +\%Y\%m\%d).db
```

## 常见问题

### 1. 服务器内存不足，better-sqlite3 编译失败

CI 已在 `ubuntu-latest` 上构建并裁剪依赖，默认会把 `node_modules` 一起上传到服务器。如果服务器是 ARM 架构，CI 的 x64 二进制无法运行，需要：

- 在 GitHub Actions runner 中选择 `runs-on: ubuntu-22.04-arm`（如果可用），或
- 在服务器上执行 `npm ci --omit=dev` 让 better-sqlite3 下载/编译对应平台的二进制。

### 2. 首次访问 500 / 数据库错误

- 确认 `.env` 中 `DATABASE_URL` 已设置。
- 确认 `data/` 目录存在且 PM2 进程有写入权限。
- 查看日志：`pm2 logs workschedule-api` 或 `tail -f /opt/workschedule/logs/error.log`。

### 3. 前端刷新 404

确认 Nginx 配置中 `location / { try_files $uri $uri/ /index.html; }` 已生效。

### 4. 接口跨域错误

Nginx 和后端都在同一域名下，通常不会有跨域问题。如果单独访问后端 IP，请确保 `bootstrap.ts` 中的 `enableCors` 配置满足需求。

## 成本估算（99 元/年服务器场景）

| 项目 | 费用 |
|------|------|
| 阿里云 ECS / 轻量服务器 | 约 99 元/年 |
| 域名 + ICP 备案 | 约 60-100 元/年 |
| SQLite 数据库 | 0 元 |
| SSL 证书 | 阿里云免费证书 0 元 |
| **合计** | **约 160-200 元/年** |

> 具体计费以阿里云官方文档为准。
