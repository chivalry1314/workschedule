# 排班管理系统

基于 NestJS + CloudBase SDK + Vue 3 + Vant 的排班管理系统，采用 **EdgeOne Pages** 部署（前端静态托管 + Node Functions 后端），数据库使用 **腾讯云 CloudBase PostgreSQL**。

## 项目结构

```
workschedule/
├── workschedule-api/          # 后端 NestJS 项目
│   ├── src/                   # 业务代码
│   │   ├── auth/              # 登录、JWT、改密
│   │   ├── users/             # 人员管理
│   │   ├── roles/             # 角色管理
│   │   ├── shift-types/       # 值班类型管理
│   │   ├── schedules/         # 排班模块
│   │   ├── swaps/             # 换班申请模块
│   │   ├── settings/          # 系统设置
│   │   ├── cloudbase/         # CloudBase SDK 封装
│   │   ├── bootstrap.ts       # 应用创建（EdgeOne / 本地复用）
│   │   └── main.ts            # 本地开发入口
│   ├── edgeone/
│   │   └── entry.js           # EdgeOne Pages Node Functions 入口
│   └── scripts/
│       └── build-edgeone.mjs  # EdgeOne 函数包构建脚本
│
├── workschedule-web/          # 前端 Vue 3 项目
│   └── src/
│       ├── api/               # API 接口封装
│       ├── views/             # 页面视图
│       ├── stores/            # Pinia 状态管理
│       ├── router/            # 路由配置
│       ├── layouts/           # 布局组件
│       └── utils/             # 工具函数
│
├── node-functions/            # EdgeOne Pages Node Functions 输出目录（构建生成）
│   └── api/
│       ├── [[default]].js     # 函数入口
│       ├── dist/              # NestJS 构建产物
│       └── node_modules/      # 生产依赖
│
├── edgeone.json               # EdgeOne Pages 构建配置
├── package.json               # 根目录构建脚本
├── PRD.md                      # 产品需求文档
├── TDD.md                      # 技术设计文档
├── DEPLOY.md                   # 部署指南
└── README.md                   # 本文件
```

## 快速启动

### 1. 启动后端

```bash
cd workschedule-api

# 1. 创建 .env 文件（参考 .env.example）
cp .env.example .env

# 2. 安装依赖
npm install

# 3. 启动开发服务器（启动时会自动插入默认管理员）
npm run start:dev
```

后端默认地址：http://localhost:3000，API 前缀 `/api/v1`。

默认管理员账号：
- 用户名：`admin`
- 密码：`Admin1234`

> 注意：本地开发通过 CloudBase SDK 访问 CloudBase PostgreSQL，需在 `.env` 中配置 CloudBase 环境 ID 和 API Key，并确保本地 IP 已加入数据库白名单。

### 2. 启动前端

```bash
cd workschedule-web

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

前端默认地址：http://localhost:5173

### 3. 构建 EdgeOne Pages 函数包

```bash
cd workschedule-api
npm run build:edgeone
```

构建成功后在仓库根目录生成 `node-functions/api/`，即为 EdgeOne Pages Node Functions 部署包。

## 功能模块

- [x] 登录与首次强制修改密码
- [x] 人员管理（添加、编辑、删除、重置密码）
- [x] 角色管理（关联多个值班类型）
- [x] 值班类型管理（颜色、时间段、启用/禁用）
- [x] 月度排班填报（手机端月历视图）
- [x] 排班规则校验（每月每人值班类型数量、每天各类型人数上下限）
- [x] 排班窗口（管理员配置每月可排班时间段，超时自动锁定）
- [x] 换班申请（发起、同意、拒绝、撤回）
- [x] 个人排班查看
- [x] 总排班查看与 Excel 导出
- [x] EdgeOne Pages 部署配置

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Vant 4 + Pinia + Vue Router
- **后端**：NestJS + TypeScript + CloudBase SDK（`@cloudbase/js-sdk`）
- **数据库**：CloudBase PostgreSQL 云数据库
- **部署**：EdgeOne Pages（静态托管 + Node Functions）

## 注意事项

- 首次登录会强制要求修改密码。
- 添加人员时需先创建角色和值班类型。
- 排班规则、排班窗口按月配置，未配置窗口的月份默认不可排班。
- 换班时会校验排班规则与排班窗口，管理员在总排班表直接修改排班时也会触发规则校验。
