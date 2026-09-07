# 排班系统后端

基于 [NestJS](https://nestjs.com/) + [腾讯云 CloudBase PostgreSQL](https://docs.cloudbase.net/database/postgresql/) 构建。

## 技术栈

- NestJS 11 + TypeScript
- 腾讯云 CloudBase JS SDK v3（PostgREST 访问 PostgreSQL）
- JWT 认证
- bcrypt 密码加密

## 前置准备

1. 注册/登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 创建一个 **PostgreSQL 环境**（PG 模式）
3. 在控制台获取：
   - 环境 ID（`CLOUDBASE_ENV_ID`）
   - 服务端 API Key（`CLOUDBASE_APIKEY`）：控制台 → 环境 → 云后台 → API Key

## 环境配置

```bash
cp .env.example .env
```

编辑 `.env`：

```env
CLOUDBASE_ENV_ID="你的环境ID"
CLOUDBASE_APIKEY="你的服务端API Key"
JWT_SECRET="自定义JWT密钥"
JWT_EXPIRES_IN="2h"
PORT=3000
```

> 本项目不再使用腾讯云 SecretId/SecretKey，仅用 CloudBase API Key。

## 数据库初始化

**第一步**：在 CloudBase 控制台打开 PostgreSQL 执行器，将 `scripts/schema.sql` 完整执行一次，创建业务表并授权 `service_role`。

**第二步**：启动后端时会自动检测并插入默认管理员账号：

- 用户名：`admin`
- 初始密码：`Admin1234`

> 首次登录后请立即修改密码。

## 本地运行

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run start:dev

# 普通启动
npm run start

# 生产构建
npm run build
npm run start:prod
```

服务启动后访问：http://localhost:3000/api/v1

## 目录结构

```
workschedule-api/
├── scripts/schema.sql      # 数据库初始化脚本（仅执行一次）
├── src/
│   ├── auth/               # 登录、JWT、改密
│   ├── cloudbase/          # CloudBase SDK 封装
│   ├── roles/              # 角色与值班类型关联
│   ├── schedules/          # 排班计划
│   ├── settings/           # 系统设置
│   ├── shift-types/        # 值班类型
│   ├── swaps/              # 换班申请
│   └── users/              # 人员管理
```

## 部署到 CloudBase 云托管（可选）

部署到 CloudBase 云托管时：

1. 代码中无需写任何 API Key，云托管运行环境会自动注入临时凭证
2. 将 `CLOUDBASE_ENV_ID` 和 `CLOUDBASE_APIKEY` 配置到云托管环境变量（首次初始化用）
3. 上传代码并发布版本

## 安全说明

- `.env` 已加入 `.gitignore`，请勿提交到代码仓库
- API Key 泄露后可在 CloudBase 控制台单独撤销并重新生成
- 生产环境建议将 API Key 替换为云托管角色临时凭证

## 常见问题

### 启动时报 “初始化默认管理员失败”

说明 `scripts/schema.sql` 尚未在 CloudBase 控制台执行，或表权限未正确授予 `service_role`。请检查控制台执行结果，确认表已创建。

### PostgREST 错误 `{}`

通常是表不存在或 `service_role` 没有该表的权限。请重新执行 `scripts/schema.sql` 中的 `GRANT` 语句。
