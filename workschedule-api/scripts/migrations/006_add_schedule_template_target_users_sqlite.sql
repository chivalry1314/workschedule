-- 新增初始化模板适用用户组关联表（SQLite 版本）

CREATE TABLE IF NOT EXISTS schedule_template_target_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_target_users_template ON schedule_template_target_users(template_id);
