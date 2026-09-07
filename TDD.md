# 排班管理系统技术设计文档（TDD）

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | 排班管理系统 |
| 文档版本 | v1.0.0 |
| 关联文档 | PRD.md |
| 编写日期 | 2025-01-16 |
| 目标读者 | 后端开发、前端开发、测试工程师、运维工程师 |
| 状态 | 初稿 |

---

## 2. 设计目标与范围

### 2.1 设计目标
- 基于 PRD 实现一个支持桌面端与手机 Web 端的排班管理系统。
- 前后端分离，接口统一采用 RESTful API + JSON。
- 保证核心数据一致性，尤其是排班填报、状态流转与换班交换逻辑。
- 优先保证手机端访问体验，前端采用响应式 + 移动端优先的组件方案。
- **采用云托管 / Serverless 优先的部署策略，无需自建服务器与运维基础设施，按量付费上线。**

### 2.2 范围边界

**在范围内：**
- 用户认证与授权（登录、改密、密码重置）
- 人员、角色、值班类型的 CRUD
- 月度排班的填报、提交、锁定与状态流转
- 换班申请的发起、同意/拒绝/撤回及排班交换
- 总排班与个人排班的多视图查询
- 手机 Web 端适配

**不在范围内（后续迭代）：**
- Excel/PDF 导出
- 邮件/短信/微信消息推送
- PWA 与微信小程序
- 自动排班算法
- 多组织/多租户

---

## 3. 技术选型

### 3.1 技术栈总览

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 前端框架 | Vue 3 | Composition API + `<script setup>` |
| 前端语言 | TypeScript | 强类型覆盖 |
| 构建工具 | Vite | 热更新、按需构建 |
| 状态管理 | Pinia | 替代 Vuex，支持 TS |
| 路由 | Vue Router 4 | 支持路由守卫 |
| UI 组件库（桌面） | Element Plus | 管理后台页面 |
| UI 组件库（移动） | Vant 4 | 手机端页面优先 |
| 响应式布局 | 自定义 CSS + Flex/Grid | 媒体查询断点 |
| HTTP 客户端 | Axios | 封装统一请求拦截 |
| 后端框架 | NestJS | Node.js 企业级框架 |
| ORM | Prisma | 类型安全、迁移方便 |
| 数据库 | PostgreSQL | 关系型数据库；与 Prisma、Serverless 平台配合更好 |
| 缓存 | Redis / 云数据库 | Session/缓存/锁（可选） |
| 密码加密 | bcrypt | 不可逆哈希 |
| 部署 | 云托管 / Serverless | 前端托管 + Serverless 函数 + 云数据库 |

### 3.2 选型理由
- **Vue 3 + Vite**：国内生态成熟，开发效率高，适合响应式与移动端优先。
- **Vant + Element Plus**：Vant 专注移动端交互，Element Plus 适合管理后台，两者可共存并按页面选择。
- **NestJS + Prisma**：TypeScript 全栈统一语言；Prisma 提供类型安全的数据库访问与迁移管理。
- **PostgreSQL**：满足关系型业务需求；Prisma 原生支持最好，与 Supabase、TDSQL-C PostgreSQL、阿里云 RDS PostgreSQL 等云数据库配合更佳。
- **云托管 / Serverless**：排班系统访问量低、无长连接需求，适合 Serverless 架构。无需购买服务器、配置 Nginx、维护数据库实例，按量付费即可运行。

---

## 4. 系统架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端 (Client)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 桌面浏览器    │  │ 手机浏览器    │  │ 平板浏览器    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
              ┌───────────────┼───────────────┐
              │               │               │
      ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
      │ 前端静态托管  │ │ Serverless  │ │  云数据库   │
      │ Vercel /    │ │   函数       │ │ PostgreSQL │
      │ CloudBase / │ │  NestJS API │ │  可选 Redis │
      │ Cloudflare  │ │   Edge /    │ │            │
      └─────────────┘ │   SCF / FC   │ └─────────────┘
                      └─────────────┘
```

> 说明：前端静态资源由云托管平台直接分发；业务 API 运行在 Serverless 函数中；数据持久化到云数据库。全程无需自建服务器与 Nginx。

### 4.2 前端工程结构

```
workschedule-web/
├── public/
├── src/
│   ├── api/                 # API 请求封装
│   ├── assets/              # 静态资源
│   ├── components/          # 通用组件
│   │   ├── common/          # 公共组件
│   │   ├── mobile/          # 移动端专用组件
│   │   └── desktop/         # 桌面端专用组件
│   ├── composables/         # 组合式函数
│   ├── layouts/             # 布局组件
│   │   ├── MobileLayout.vue
│   │   └── DesktopLayout.vue
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   ├── styles/              # 全局样式、变量
│   ├── utils/               # 工具函数
│   ├── views/               # 页面视图
│   │   ├── auth/            # 登录、改密
│   │   ├── dashboard/       # 首页
│   │   ├── schedule/        # 我的排班、总排班
│   │   ├── swap/            # 换班申请
│   │   ├── admin/           # 人员、角色、类型管理
│   │   └── settings/        # 系统设置
│   ├── App.vue
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 4.3 后端工程结构

```
workschedule-api/
├── prisma/
│   ├── schema.prisma        # 数据库模型定义
│   └── migrations/          # 数据库迁移文件
├── src/
│   ├── auth/                # 认证模块
│   ├── users/               # 用户模块
│   ├── roles/               # 角色模块
│   ├── shift-types/         # 值班类型模块
│   ├── schedules/           # 排班模块
│   ├── swaps/               # 换班模块
│   ├── settings/            # 系统设置模块
│   ├── common/              # 通用装饰器、过滤器、拦截器、守卫
│   ├── prisma/              # Prisma 服务封装
│   └── main.ts              # 应用入口
├── test/                    # 测试文件
├── package.json
├── tsconfig.json
├── nest-cli.json
└── serverless/                # 云平台入口适配
    ├── vercel-handler.ts      # Vercel Serverless Functions 入口
    ├── scf-handler.ts         # 腾讯云 SCF 入口
    └── fc-handler.ts          # 阿里云 FC 入口
```

> **Serverless 适配说明**：NestJS 应用可通过导出平台对应的 Handler 函数部署到各云平台的 Serverless 运行时中。业务代码与平台无关，仅需在入口层做少量适配。数据库连接建议使用连接池代理服务（如 Prisma Accelerate、PlanetScale Serverless Driver、腾讯云数据库代理）以解决云函数短时连接问题。

---

## 5. 数据库设计

### 5.1 ER 图概述

```
┌──────────────┐       ┌───────────────────┐       ┌────────────────┐
│     users    │       │ role_shift_type   │       │  shift_types   │
├──────────────┤       ├───────────────────┤       ├────────────────┤
│ id (PK)      │◄──────┤ role_id (FK)      │       │ id (PK)        │
│ role_id (FK) │       │ shift_type_id(FK) ├──────►│ id (PK)        │
└──────────────┘       └───────────────────┘       └────────────────┘
        │
        │ 1:N
        ▼
┌──────────────┐       ┌───────────────────┐
│   schedules  │◄────►│   shift_swaps     │
├──────────────┤       ├───────────────────┤
│ id (PK)      │       │ id (PK)           │
│ user_id (FK) │       │ applicant_id (FK) │
│ shift_type_id│       │ target_user_id(FK)│
└──────────────┘       └───────────────────┘
```

### 5.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            BigInt @id @default(autoincrement())
  username      String @unique
  passwordHash  String @map("password_hash")
  realName      String @map("real_name")
  roleId        BigInt @map("role_id")
  phone         String? remark        String?
  isAdmin       Boolean @default(false) @map("is_admin")
  status        Int @default(1) // 0-禁用，1-启用
  firstLogin    Boolean @default(true) @map("first_login")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  role          Role @relation(fields: [roleId], references: [id])
  schedules     Schedule[]
  appliedSwaps  ShiftSwap[] @relation("ApplicantSwaps")
  receivedSwaps ShiftSwap[] @relation("TargetSwaps")

  @@map("users")
}

model Role {
  id          BigInt @id @default(autoincrement())
  name        String @unique
  remark      String? createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  users       User[]
  shiftTypes  RoleShiftType[]

  @@map("roles")
}

model ShiftType {
  id          BigInt @id @default(autoincrement())
  name        String code        String            @unique
  color       String timeRange   String?           @map("time_range")
  remark      String? status      Int               @default(1) // 0-禁用，1-启用
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  roles       RoleShiftType[]
  schedules   Schedule[]

  @@map("shift_types")
}

model RoleShiftType {
  id            BigInt @id @default(autoincrement())
  roleId        BigInt @map("role_id")
  shiftTypeId   BigInt @map("shift_type_id")

  role          Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  shiftType     ShiftType @relation(fields: [shiftTypeId], references: [id], onDelete: Cascade)

  @@unique([roleId, shiftTypeId])
  @@map("role_shift_type")
}

model Schedule {
  id            BigInt @id @default(autoincrement())
  userId        BigInt @map("user_id")
  shiftTypeId   BigInt? @map("shift_type_id") // null 表示休息/无排班
  workDate      DateTime @map("work_date") @db.Date
  monthKey      String @map("month_key") // YYYY-MM
  status        Int @default(0) // 0-草稿，1-已提交，2-已锁定
  source        Int @default(0) // 0-手动填报，1-换班
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  shiftType     ShiftType? @relation(fields: [shiftTypeId], references: [id])

  applicantSwaps ShiftSwap[] @relation("ApplicantSchedule")
  targetSwaps    ShiftSwap[] @relation("TargetSchedule")

  @@unique([userId, workDate])
  @@index([userId, monthKey])
  @@index([monthKey, status])
  @@map("schedules")
}

model ShiftSwap {
  id                    BigInt @id @default(autoincrement())
  applicantId           BigInt @map("applicant_id")
  applicantScheduleId   BigInt @map("applicant_schedule_id")
  targetUserId          BigInt? @map("target_user_id")
  targetScheduleId      BigInt? @map("target_schedule_id")
  swapType              Int @map("swap_type") // 0-指定对象，1-公开换班
  reason                String status                Int         @default(0) // 0-待处理，1-同意，2-拒绝，3-撤回，4-管理员审批中，5-已完成
  adminApproved         Boolean? @map("admin_approved")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  resolvedAt            DateTime? @map("resolved_at")

  applicant             User @relation("ApplicantSwaps", fields: [applicantId], references: [id], onDelete: Cascade)
  targetUser            User? @relation("TargetSwaps", fields: [targetUserId], references: [id], onDelete: SetNull)
  applicantSchedule     Schedule @relation("ApplicantSchedule", fields: [applicantScheduleId], references: [id])
  targetSchedule        Schedule? @relation("TargetSchedule", fields: [targetScheduleId], references: [id])

  @@index([applicantId, status])
  @@index([targetUserId, status])
  @@map("shift_swaps")
}

model Setting {
  id            BigInt @id @default(autoincrement())
  settingKey    String @unique @map("setting_key")
  settingValue  String? @map("setting_value")
  remark        String? @@map("settings")
}
```

### 5.3 索引说明

| 表 | 索引 | 用途 |
|----|------|------|
| users | username UNIQUE | 登录查询 |
| roles | name UNIQUE | 角色名称唯一校验 |
| shift_types | code UNIQUE | 类型编码唯一校验 |
| role_shift_type | (roleId, shiftTypeId) UNIQUE | 防止重复关联 |
| schedules | (userId, workDate) UNIQUE | 同一人同一天唯一 |
| schedules | (userId, monthKey) | 快速查询个人整月排班 |
| schedules | (monthKey, status) | 管理员按月份查看排班 |
| shift_swaps | (applicantId, status) | 查询我发起的换班 |
| shift_swaps | (targetUserId, status) | 查询我收到的换班 |

---

## 6. API 接口设计

### 6.1 接口规范
- 基础路径：`/api/v1`
- 请求/响应格式：JSON
- 认证方式：JWT（Access Token + Refresh Token）或 Session Cookie；本方案采用 **JWT + HttpOnly Cookie**。
- 响应结构：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {}
  }
  ```
- 分页参数：`page`（默认1）、`pageSize`（默认20，最大100）。
- 分页响应：`{ list: [], pagination: { page, pageSize, total, totalPages } }`

### 6.2 认证模块（auth）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录，返回 JWT |
| POST | `/auth/logout` | 登出 |
| POST | `/auth/password` | 修改密码 |
| POST | `/auth/refresh` | 刷新 Token |

### 6.3 用户模块（users）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 人员列表（管理员） |
| POST | `/users` | 新增人员（管理员） |
| GET | `/users/:id` | 人员详情（管理员/自己） |
| PUT | `/users/:id` | 编辑人员（管理员） |
| DELETE | `/users/:id` | 删除人员（管理员） |
| POST | `/users/:id/reset-password` | 重置密码（管理员） |
| GET | `/users/me` | 当前登录人信息 |

### 6.4 角色模块（roles）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/roles` | 角色列表 |
| POST | `/roles` | 新增角色 |
| GET | `/roles/:id` | 角色详情 |
| PUT | `/roles/:id` | 编辑角色 |
| DELETE | `/roles/:id` | 删除角色 |

### 6.5 值班类型模块（shift-types）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/shift-types` | 值班类型列表 |
| POST | `/shift-types` | 新增值班类型 |
| GET | `/shift-types/:id` | 值班类型详情 |
| PUT | `/shift-types/:id` | 编辑值班类型 |
| DELETE | `/shift-types/:id` | 删除值班类型 |
| PATCH | `/shift-types/:id/status` | 启用/禁用 |

### 6.6 排班模块（schedules）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/schedules/mine` | 我的排班列表（按年月） |
| POST | `/schedules/mine` | 批量保存我的排班 |
| POST | `/schedules/mine/submit` | 提交我的排班 |
| GET | `/schedules/all` | 总排班列表（管理员/所有人可见） |
| GET | `/schedules/all/summary` | 总排班汇总（按日期） |
| POST | `/schedules/:id/lock` | 锁定排班（管理员） |
| POST | `/schedules/:id/unlock` | 解锁排班（管理员） |
| POST | `/schedules/:id/reject` | 驳回排班（管理员） |
| GET | `/schedules/available-swap-users` | 获取可换班人员与日期 |

### 6.7 换班模块（swaps）

| 方法 | 路径 | 说明 |
|------|------|
| GET | `/swaps` | 换班申请列表 |
| POST | `/swaps` | 发起换班申请 |
| POST | `/swaps/:id/approve` | 同意换班 |
| POST | `/swaps/:id/reject` | 拒绝换班 |
| POST | `/swaps/:id/withdraw` | 撤回申请 |
| POST | `/swaps/:id/admin-approve` | 管理员审批（锁定月份） |
| POST | `/swaps/:id/admin-reject` | 管理员驳回（锁定月份） |

### 6.8 系统设置模块（settings）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/settings` | 获取系统设置 |
| PUT | `/settings` | 更新系统设置（管理员） |

---

## 7. 关键业务逻辑实现

### 7.1 登录与密码安全

```
1. 用户输入 username + password
2. 查询 users 表，校验状态为启用
3. bcrypt.compare 校验密码
4. 若 firstLogin=true，返回标志强制跳转改密
5. 生成 JWT（包含 userId, isAdmin, roleId）
6. 写入 HttpOnly Cookie 或返回 Token
```

密码规则：长度 ≥ 8，同时包含字母与数字。使用 `bcrypt` 哈希，cost factor 建议 10-12。

### 7.2 排班保存与状态流转

```
POST /schedules/mine
Body: { monthKey: "2025-01", items: [{ workDate, shiftTypeId|null }] }

后端逻辑：
1. 校验 monthKey 格式。
2. 检查该月是否已锁定：若存在 status=2 的记录，拒绝修改。
3. 检查是否超过填报截止时间（读取 settings）。
4. 校验每个 shiftTypeId 是否属于当前用户的 role。
5. 对每条记录执行 upsert（userId + workDate 唯一键）。
6. 更新后该月状态保持为草稿（0）。
```

### 7.3 提交排班

```
POST /schedules/mine/submit
Body: { monthKey: "2025-01" }

后端逻辑：
1. 校验该月是否存在排班记录。
2. 校验是否已锁定或已提交。
3. 将该用户该月所有记录 status 更新为 1（已提交）。
```

### 7.4 锁定/驳回排班（管理员）

- 锁定：将某用户某月所有排班 status 更新为 2。
- 驳回：将 status 从 1 回退到 0。
- 解锁：将 status 从 2 回退到 1 或 0（根据业务决定，建议回退到 0）。

### 7.5 换班流程核心逻辑

#### 发起换班

```
POST /swaps
Body: {
  applicantScheduleId: 1,
  targetUserId: 2,
  targetScheduleId: 3,
  swapType: 0, // 0-指定，1-公开
  reason: "家中有事"
}

后端逻辑：
1. 校验 applicantSchedule 属于当前用户且 targetSchedule 属于 targetUser。
2. 校验两日期均不是休息日（shiftTypeId 非空）。
3. 校验两日期无进行中的换班申请。
4. 校验换班后类型仍属于双方 role 允许范围。
5. 查询月份是否已锁定：若锁定，status=4（管理员审批中）；否则 status=0（待处理）。
6. 创建换班记录。
7. 可选：将相关 schedule 标记临时状态（如 isSwapping=true）或在查询中通过 join swaps 表判断。
```

#### 同意换班

```
POST /swaps/:id/approve

后端逻辑：
1. 校验当前用户是 targetUser。
2. 若月份未锁定：
   - 直接交换 applicantSchedule 与 targetSchedule 的 shiftTypeId。
   - 更新 source=1。
   - 更新 swap status=5（已完成），resolvedAt=now()。
3. 若月份已锁定：
   - 仅更新 swap status=1（同意），等待管理员审批。
```

#### 管理员审批（锁定月份）

```
POST /swaps/:id/admin-approve

后端逻辑：
1. 校验当前用户为管理员。
2. 执行排班交换。
3. 更新 adminApproved=true, status=5。
```

### 7.6 防止并发冲突

- 排班保存：使用数据库唯一键 `(userId, workDate)` 防止重复写入。
- 换班交换：使用数据库事务包裹「校验 → 更新 swaps → 交换 schedules」；可通过 Redis 分布式锁或 PostgreSQL `SELECT FOR UPDATE` 对两条 schedule 加行锁，避免同一日期被多笔换班同时处理。

---

## 8. 前端架构设计

### 8.1 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| xs | < 576px | 手机端，底部 Tab，单列卡片 |
| sm | 576px - 767px | 大屏手机/小平板 |
| md | 768px - 991px | 平板/小桌面，左侧导航 |
| lg | ≥ 992px | 桌面端，左侧固定导航 |

### 8.2 路由结构

```ts
const routes = [
  { path: '/login', component: Login },
  { path: '/change-password', component: ChangePassword },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard },
      { path: 'my-schedule', component: MySchedule },
      { path: 'all-schedule', component: AllSchedule },
      { path: 'swaps', component: SwapList },
      { path: 'profile', component: Profile },
      // 管理员
      { path: 'admin/users', component: UserManagement },
      { path: 'admin/roles', component: RoleManagement },
      { path: 'admin/shift-types', component: ShiftTypeManagement },
      { path: 'admin/settings', component: SystemSettings },
    ]
  }
]
```

### 8.3 状态管理（Pinia）

| Store | 作用 |
|-------|------|
| `useUserStore` | 登录状态、当前用户信息、权限判断 |
| `useScheduleStore` | 当前月份、我的排班数据、总排班数据 |
| `useSwapStore` | 换班申请列表、待处理数量 |
| `useMetaStore` | 角色列表、值班类型列表（全局下拉） |

### 8.4 移动端交互策略

- **我的排班**：默认采用「周视图 + 左右滑动切换周」，顶部可切换为月视图；点击日期底部弹出选择面板。
- **总排班**：默认按人员列表，点击人员展开当月排班；提供「按日期查看」切换。
- **换班申请**：分步表单（Stepper）：
  1. 选择自己的日期
  2. 选择对方与日期
  3. 填写原因并确认
- **底部 Tab**：首页、我的排班、总排班、换班、我的。
- **管理功能**：收纳在「我的 → 管理员专区」。

---

## 9. 安全设计

### 9.1 认证与授权
- JWT 存储在 HttpOnly Cookie 中，降低 XSS 窃取风险。
- Access Token 有效期 2 小时，Refresh Token 有效期 7 天。
- 每个受保护接口使用 `JwtAuthGuard` 鉴权。
- 管理员接口额外使用 `AdminGuard` 鉴权。

### 9.2 权限校验
- 普通用户只能操作自己的排班、换班。
- 后端对每个带 `:id` 的接口校验资源归属或管理员身份。
- 越权访问返回 403。

### 9.3 数据校验
- 所有入参使用 NestJS `class-validator` + DTO 校验。
- 前端同步校验，但后端校验为最终依据。

### 9.4 防暴力破解
- 登录失败 5 次后，账户锁定 30 分钟；可通过 Redis 计数。

### 9.5 敏感操作
- 删除、重置密码、锁定排班需二次确认。
- 操作日志记录到数据库（可选），包含操作人、时间、IP、变更内容。

---

## 10. 性能设计

### 10.1 数据库优化
- 为高频查询字段建立索引（见 5.3）。
- 总排班查询按 `monthKey` 过滤，避免全表扫描。
- 换班查询加入 `status` 索引，快速过滤待处理。

### 10.2 接口优化
- 排班接口一次性返回整月数据，减少请求次数。
- 总排班接口默认返回当月数据，支持分页或按用户分组。
- 静态资源启用 gzip/brotli 压缩。

### 10.3 缓存策略
- 值班类型、角色等低频变更数据可缓存 10 分钟。
- 用户会话信息可缓存于 Redis。

### 10.4 前端优化
- Vite 按需加载组件，路由懒加载。
- 图片/图标使用 SVG 或字体图标。
- 月历数据本地缓存，切换月份时减少重复请求。

---

## 11. 测试策略

### 11.1 后端测试
- **单元测试**：服务层核心业务逻辑（排班保存、换班交换、状态流转）。
- **集成测试**：API 端到端测试，使用独立测试数据库。
- **关键用例**：
  - 登录成功/失败、首次登录改密
  - 排班 CRUD 与状态流转
  - 越权访问被拒绝
  - 换班前后排班数据正确交换
  - 锁定月份换班需管理员审批

### 11.2 前端测试
- **单元测试**：组合式函数、工具函数。
- **组件测试**：月历组件、排班选择弹窗、换班申请表单。
- **E2E 测试**：登录 → 填报排班 → 提交 → 发起换班 → 同意的完整流程。

### 11.3 兼容性测试
- 手机端：iOS Safari、Android Chrome。
- 桌面端：Chrome、Edge、Firefox、Safari。
- 不同分辨率：320px、375px、414px、768px、1920px。

---

## 12. 部署方案

> 本系统采用 **云托管 / Serverless** 架构，无需购买服务器、安装 Nginx、维护数据库，按量付费即可上线。

### 12.1 部署架构选型

| 方案 | 适用场景 | 运维成本 | 成本预估 |
|------|----------|----------|----------|
| **方案 A：国内访问（推荐）** | 主要用户在国内，需要稳定访问与备案 | 极低 | 每月几十元起 |
| **方案 B：海外 / 全球化访问** | 团队有海外访问条件，或需要全球 CDN 加速 | 极低 | 免费起步 |
| **方案 C：BaaS 一体化** | 想最快上线，少写后端代码 | 极低 | 免费起步 |

### 12.2 方案 A：国内访问（腾讯云 CloudBase / 阿里云 Serverless）

**适用**：主要用户在国内，需要稳定的网络访问、备案支持与低运维成本。**本项目优先推荐此方案。**

#### 推荐组合 1：腾讯云 CloudBase

| 层级 | 服务 | 说明 |
|------|------|------|
| 前端托管 | **CloudBase 静态网站托管** | 国内 CDN，自动 HTTPS，按流量计费 |
| 后端 API | **CloudBase 云函数** | Node.js 运行时，按调用次数计费 |
| 数据库 | **CloudBase 云数据库 PostgreSQL** 或 **腾讯云 TDSQL-C PostgreSQL Serverless** | 推荐 TDSQL-C PostgreSQL，按实际使用计费 |
| 缓存 | **Redis 云数据库** | 可选 |

**部署方式：**
- 前端：通过 CloudBase CLI 或控制台部署 `dist` 目录到静态托管。
- 后端：将 NestJS 导出为 CloudBase 云函数 Handler，每个模块可打包为一个或多个函数。
- 数据库：Prisma 连接腾讯云 TDSQL-C PostgreSQL 或 CloudBase PostgreSQL 云数据库 URL，运行 `prisma migrate deploy`。
- 域名：购买国内域名并做 ICP 备案，配置自定义域名到 CloudBase。

**成本估算：**
- 静态托管：免费额度通常够用，超出后按流量约 0.2-0.5 元/GB。
- 云函数：免费额度 100 万次/月，超出约 0.0133 元/万次。
- TDSQL-C PostgreSQL Serverless：按实际存储与计算量计费，小团队每月约 10-50 元。
- Redis：若使用，最小型号约 20-50 元/月；排班系统可选。
- 域名：约 60-100 元/年，国内需 ICP 备案。
- **合计：每月 10-100 元 + 域名费用。**

#### 推荐组合 2：阿里云 Serverless

| 层级 | 服务 |
|------|------|
| 前端托管 | 阿里云 OSS + CDN |
| 后端 API | 函数计算 FC |
| 数据库 | 阿里云 RDS PostgreSQL Serverless / PolarDB PostgreSQL Serverless |

**成本与腾讯云类似，国内访问稳定。**

### 12.3 方案 B：海外访问（Vercel + Supabase / PlanetScale）

**适用**：用户可稳定访问海外服务，或团队位于海外。

| 层级 | 服务 | 说明 |
|------|------|------|
| 前端托管 | **Vercel** | 自动 CI/CD，全球 CDN，免费档足够 |
| 后端 API | **Vercel Serverless Functions** | NestJS 适配为 Serverless Handler，按调用次数计费 |
| 数据库 | **Supabase Postgres** 或 **PlanetScale** | 托管 Postgres，免费档包含 500MB-1GB 存储 |
| 缓存/会话 | **Upstash Redis** 或 Supabase 自带 | 可选，用于登录失败计数 |
| 文件/对象存储 | Supabase Storage | 头像、附件等（可选） |

**部署方式：**
- 前端：`git push` 到 GitHub + Vercel 自动构建部署。
- 后端：在 NestJS 中导出 Vercel Serverless Handler，通过 `vercel.json` 路由 `/api/*` 到函数。
- 数据库：Prisma 连接 Supabase Postgres/PlanetScale URL，运行 `prisma migrate deploy`。

**成本估算：**
- Vercel Hobby（免费）：个人/小团队够用，但函数执行时长 10s、并发有限。
- Vercel Pro（$20/月）：更稳定的构建与函数执行。
- Supabase 免费档：500MB 存储，足够 200 人以内团队使用数年。
- 域名：约 60-100 元/年。
- **合计：0-20 美元/月 + 域名费用。**

| 层级 | 服务 | 说明 |
|------|------|------|
| 前端托管 | **CloudBase 静态网站托管** | 国内 CDN，自动 HTTPS，按流量计费 |
| 后端 API | **CloudBase 云函数** | Node.js 运行时，按调用次数计费 |
| 数据库 | **CloudBase 云数据库 PostgreSQL** 或 **腾讯云 TDSQL-C PostgreSQL Serverless** | 推荐 TDSQL-C PostgreSQL，按实际使用计费 |
| 缓存 | **Redis 云数据库** | 可选 |

**成本估算：**
- 静态托管：免费额度通常够用，超出后按流量约 0.2-0.5 元/GB。
- 云函数：免费额度 100 万次/月，超出约 0.0133 元/万次。
- TDSQL-C PostgreSQL Serverless：按实际存储与计算量计费，小团队每月约 10-50 元。
- 域名：约 60-100 元/年，国内需 ICP 备案。
- **合计：每月 10-100 元 + 域名费用。**

#### 推荐组合 2：阿里云 Serverless

| 层级 | 服务 |
|------|------|
| 前端托管 | 阿里云 OSS + CDN |
| 后端 API | 函数计算 FC |
| 数据库 | 阿里云 RDS PostgreSQL Serverless / PolarDB PostgreSQL Serverless |

**成本与腾讯云类似，国内访问稳定。**

### 12.4 方案 C：BaaS 一体化（Supabase / 腾讯云 CloudBase）

**适用**：希望进一步减少后端开发工作量，快速上线 MVP。

#### Supabase 方案
- **认证**：使用 Supabase Auth 替代自实现 JWT（支持邮箱/密码）。
- **数据库**：直接使用 Supabase Postgres，通过 Prisma 或 Supabase JS Client 访问。
- **业务逻辑**：简单 CRUD 直接通过 Supabase JS Client 调用；复杂逻辑（换班交换、锁定校验）使用 **Supabase Edge Functions**。
- **前端**：Vercel / Cloudflare Pages。

**优点**：进一步减少后端代码量，自带认证、数据库、存储。
**限制**：Edge Functions 执行环境受限，复杂事务需小心处理；国内访问可能不稳定。

#### 腾讯云 CloudBase 方案
- 前端：CloudBase 静态托管。
- 后端：CloudBase 云函数 + 云数据库。
- 自带用户认证、数据库、存储、CDN，开发体验接近 BaaS。

### 12.5 推荐结论

| 场景 | 推荐方案 |
|------|----------|
| 团队在国内、追求稳定访问、低运维（**本项目主推**） | **腾讯云 CloudBase + 云数据库** |
| 团队有海外访问条件、追求最低成本 | **Vercel + Supabase Postgres** |
| 想最快上线、最少后端代码 | **腾讯云 CloudBase BaaS** 或 **Supabase + Vercel** |

### 12.7 部署方式（以 CloudBase 为例）

```bash
# 1. 安装 CloudBase CLI
npm i -g @cloudbase/cli

# 2. 登录
cloudbase login

# 3. 部署前端
cloudbase hosting:deploy dist -e your-env-id

# 4. 部署云函数
cloudbase functions:deploy --all -e your-env-id

# 5. 数据库迁移
# 在本地或 CI 中运行
npx prisma migrate deploy
```

### 12.8 运行环境
- 生产环境：Serverless Node.js 运行时 + 云数据库。
- 启用 HTTPS：由云平台自动提供并续期。
- 数据库自动备份：由云数据库服务提供。
- 监控告警：使用云平台内置监控（函数调用量、错误率、响应时间、数据库慢查询）。

### 12.9 国内部署注意事项

| 事项 | 说明 |
|------|------|
| **ICP 备案** | 使用国内服务器或国内 CDN 加速的自定义域名，必须进行 ICP 备案。CloudBase / 阿里云均提供备案引导。 |
| **域名购买** | 建议在国内服务商（腾讯云、阿里云、华为云）购买域名，便于备案与解析管理。 |
| **HTTPS** | 云平台通常提供免费 HTTPS 证书并自动续期；若使用自定义域名需上传证书或申请免费证书。 |
| **访问速度** | 国内用户访问 CloudBase / 阿里云 Serverless 速度稳定；若用户分布海外，建议额外配置海外 CDN 或选用海外方案。 |
| **数据合规** | 人员信息、排班数据属于业务数据，建议数据库位于国内地域（如广州、上海、北京）。 |
| **备用方案** | 若云平台出现故障，可在同一平台新建环境或迁移至其他云托管平台；业务代码与平台无关，便于迁移。 |

---

## 13. 风险与限制

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 手机端月历交互复杂 | 中 | 采用周视图/卡片式，简化月历展示；充分测试 |
| 换班并发冲突 | 中 | 使用数据库事务 + 行锁/分布式锁 |
| 首次改密流程被绕过 | 高 | 路由守卫统一拦截，未改密禁止进入主页面 |
| 管理员误操作锁定/删除 | 中 | 二次确认 + 操作日志 |
| 大量排班数据查询慢 | 低 | 按月份索引、分页、缓存 |
| 多组织需求后期变更 | 中 | 当前 schema 预留 role/setting 扩展空间 |
| 云函数冷启动延迟 | 低 | 选择常驻实例或预热；核心接口响应仍可接受 |
| 云数据库连接数限制 | 低 | 使用数据库连接池（如 Prisma Accelerate / PlanetScale Serverless Driver） |
| 云平台厂商锁定 | 低 | 业务代码保持与平台无关，必要时可迁移至其他云托管平台 |

---

## 14. 后续技术任务

| 序号 | 任务 | 优先级 |
|------|------|--------|
| 1 | 初始化 NestJS + Prisma 项目，完成数据库迁移 | 高 |
| 2 | 实现认证模块（登录、改密、JWT） | 高 |
| 3 | 实现用户、角色、值班类型管理接口 | 高 |
| 4 | 实现排班填报与状态流转接口 | 高 |
| 5 | 实现换班申请与交换逻辑 | 高 |
| 6 | 初始化 Vue 3 + Vite + Vant 项目 | 高 |
| 7 | 实现登录页、改密页、主布局 | 高 |
| 8 | 实现我的排班（移动端月历/周视图） | 高 |
| 9 | 实现总排班、换班申请页面 | 高 |
| 10 | 实现管理员后台页面 | 中 |
| 11 | 云平台部署配置（CloudBase / Vercel） | 中 |
| 12 | 单元测试与 E2E 测试覆盖 | 中 |

---

## 15. 修订记录

| 版本 | 日期 | 修订人 | 修订内容 |
|------|------|--------|----------|
| v1.0.0 | 2025-01-16 | - | 初稿完成 |
| v1.1.0 | 2025-01-16 | - | 部署方案改为云托管 / Serverless 优先，补充成本估算与多平台方案 |
| v1.2.0 | 2025-01-16 | - | 明确主要面向国内用户，主推腾讯云 CloudBase 方案，补充 ICP 备案与域名注意事项 |
| v1.2.1 | 2025-01-16 | - | 删除自托管服务器方案，统一为云托管 / Serverless 架构 |
