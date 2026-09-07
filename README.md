# 排班管理系统

基于 NestJS + CloudBase SDK + Vue 3 + Vant 的排班管理系统，采用腾讯云 CloudBase 云托管部署。

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
│   │   ├── cloudbase/         # CloudBase SDK 封装与数据库初始化
│   │   └── main.ts            # 应用入口
│   ├── serverless/
│   │   └── scf-handler.ts     # 腾讯云云函数入口
│   └── cloudbaserc.json       # CloudBase 部署配置
│
├── workschedule-web/          # 前端 Vue 3 项目
│   ├── src/
│   │   ├── api/               # API 接口封装
│   │   ├── views/             # 页面视图
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── router/            # 路由配置
│   │   ├── layouts/           # 布局组件
│   │   └── utils/             # 工具函数
│   └── cloudbaserc.json       # CloudBase 部署配置
│
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

# 2. 安装依赖（如果还没安装）
npm install

# 3. 启动开发服务器（启动时会自动创建表并插入默认管理员）
npm run start:dev
```

后端默认地址：http://localhost:3000，API 前缀 `/api/v1`。

默认管理员账号：
- 用户名：`admin`
- 密码：`Admin1234`

> 注意：本地开发通过 CloudBase SDK 访问 CloudBase PostgreSQL，需在 `.env` 中配置 CloudBase 环境 ID 和 API 密钥，并确保本地 IP 已加入数据库白名单。

### 2. 启动前端

```bash
cd workschedule-web

# 安装依赖（如果还没安装）
npm install

# 启动开发服务
npm run dev
```

前端默认地址：http://localhost:5173

## 功能模块

- [x] 登录与首次强制修改密码
- [x] 人员管理（添加、编辑、删除、重置密码）
- [x] 角色管理（关联多个值班类型）
- [x] 值班类型管理（颜色、时间段、启用/禁用）
- [x] 月度排班填报（手机端月历视图）
- [x] 排班状态流转（草稿 → 已提交 → 已锁定）
- [x] 换班申请（发起、同意、拒绝、撤回）
- [x] 个人排班查看
- [x] 总排班查看
- [x] 腾讯云 CloudBase 部署配置

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Vant 4 + Pinia + Vue Router
- **后端**：NestJS + TypeScript + CloudBase SDK（`@cloudbase/manager-node`）
- **数据库**：CloudBase PostgreSQL 云数据库
- **部署**：腾讯云 CloudBase（静态托管 + 云函数 + 云数据库）

## 注意事项

- 首次登录会强制要求修改密码。
- 添加人员时需先创建角色和值班类型。
- 换班功能目前为简化版，支持指定日期发起公开换班；完整指定对象换班可在后续迭代中完善。
- 当前 SQL 字符串拼接方式主要用于 CloudBase SDK 示例，生产环境建议增加输入校验与 SQL 转义。
