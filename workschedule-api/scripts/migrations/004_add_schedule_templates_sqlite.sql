-- 新增初始化模板表（SQLite 版本）

CREATE TABLE IF NOT EXISTS schedule_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(128) NOT NULL,
  status INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_template_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  shift_type_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON schedule_template_items(template_id);
