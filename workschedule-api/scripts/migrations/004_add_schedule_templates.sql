-- 新增初始化模板表（PostgreSQL / CloudBase 版本）

CREATE TABLE IF NOT EXISTS schedule_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_template_items (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  day_of_week INT NOT NULL,
  shift_type_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON schedule_template_items(template_id);
