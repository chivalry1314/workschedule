-- SQLite 初始化脚本
-- 在首次启动时会自动执行；已有数据的数据库不会重复创建表（IF NOT EXISTS）

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(64) UNIQUE NOT NULL,
  remark VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
  time_range VARCHAR(64),
  remark VARCHAR(255),
  status INTEGER DEFAULT 1,
  attendance_type INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_shift_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  shift_type_id INTEGER NOT NULL,
  UNIQUE(role_id, shift_type_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(64) NOT NULL,
  role_id INTEGER NOT NULL,
  phone VARCHAR(20),
  remark VARCHAR(255),
  is_admin INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1,
  first_login INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  shift_type_id INTEGER,
  work_date DATE NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  status INTEGER DEFAULT 0,
  source INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_schedules_user_month ON schedules(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_schedules_month_status ON schedules(month_key, status);

CREATE TABLE IF NOT EXISTS shift_swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id INTEGER NOT NULL,
  applicant_schedule_id INTEGER NOT NULL,
  applicant_shift_type_id INTEGER,
  target_user_id INTEGER,
  target_schedule_id INTEGER,
  target_shift_type_id INTEGER,
  swap_type INTEGER NOT NULL,
  reason VARCHAR(500),
  status INTEGER DEFAULT 0,
  admin_approved INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_swaps_applicant_status ON shift_swaps(applicant_id, status);
CREATE INDEX IF NOT EXISTS idx_swaps_target_status ON shift_swaps(target_user_id, status);

CREATE TABLE IF NOT EXISTS schedule_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_key VARCHAR(7) NOT NULL,
  rule_type INTEGER NOT NULL,
  shift_type_id INTEGER,
  attendance_type INTEGER,
  max_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_key VARCHAR(7) NOT NULL,
  start_at DATETIME,
  end_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_windows_month ON schedule_windows (month_key);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key VARCHAR(128) UNIQUE NOT NULL,
  setting_value TEXT,
  remark VARCHAR(255)
);

-- 插入系统默认班次：休息
INSERT INTO shift_types (name, code, color, status, attendance_type)
VALUES ('休息', '休', '#FFD700', 1, 0)
ON CONFLICT (code) DO NOTHING;
