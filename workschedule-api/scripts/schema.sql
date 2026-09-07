-- 在 CloudBase 控制台 PostgreSQL 执行器中一次性执行此脚本
-- 执行后，后端启动时会自动插入默认管理员账号 admin / Admin1234

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  remark VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
  time_range VARCHAR(64),
  remark VARCHAR(255),
  status INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_shift_type (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL,
  shift_type_id BIGINT NOT NULL,
  UNIQUE(role_id, shift_type_id)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(64) NOT NULL,
  role_id BIGINT NOT NULL,
  phone VARCHAR(20),
  remark VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  status INT DEFAULT 1,
  first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shift_type_id BIGINT,
  work_date DATE NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  status INT DEFAULT 0,
  source INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_schedules_user_month ON schedules(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_schedules_month_status ON schedules(month_key, status);

CREATE TABLE IF NOT EXISTS shift_swaps (
  id BIGSERIAL PRIMARY KEY,
  applicant_id BIGINT NOT NULL,
  applicant_schedule_id BIGINT NOT NULL,
  target_user_id BIGINT,
  target_schedule_id BIGINT,
  swap_type INT NOT NULL,
  reason VARCHAR(500),
  status INT DEFAULT 0,
  admin_approved BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_swaps_applicant_status ON shift_swaps(applicant_id, status);
CREATE INDEX IF NOT EXISTS idx_swaps_target_status ON shift_swaps(target_user_id, status);

CREATE TABLE IF NOT EXISTS schedule_rules (
  id BIGSERIAL PRIMARY KEY,
  month_key VARCHAR(7) NOT NULL,       -- 规则生效月份，如 2026-09
  rule_type INT NOT NULL,              -- 1: 每人每月每班次数量上限; 2: 每天每班次人数上限; 3: 每天每班次人数下限
  shift_type_id BIGINT NOT NULL,
  max_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_rules_unique ON schedule_rules (month_key, rule_type, shift_type_id);

CREATE TABLE IF NOT EXISTS schedule_windows (
  id BIGSERIAL PRIMARY KEY,
  month_key VARCHAR(7) NOT NULL,          -- 排班月份，如 2026-09
  start_at TIMESTAMPTZ,                   -- 排班开启时间，为空表示不限制
  end_at TIMESTAMPTZ,                     -- 排班结束时间，超过后自动锁定
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_windows_month ON schedule_windows (month_key);

CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(128) UNIQUE NOT NULL,
  setting_value TEXT,
  remark VARCHAR(255)
);

-- 权限说明：
-- CloudBase PostgreSQL 使用 API Key 访问 PostgREST 时，具体使用的数据库角色
-- 由 CloudBase 控制台中 API Key 的权限配置决定，通常无需在此处显式 GRANT。
-- 如果后续接口返回权限不足错误，请在 CloudBase 控制台检查 API Key 的权限范围，
-- 或使用控制台提供的角色名替换后再执行 GRANT 语句。

-- 插入系统默认班次：休息
INSERT INTO shift_types (name, code, color, status)
VALUES ('休息', '休', '#FFD700', 1)
ON CONFLICT (code) DO NOTHING;
